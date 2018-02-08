import { EventEmitter } from 'events';
import { v4 as uuid } from 'uuid';

import { IKeepersConfig } from './config';
import {
    DeleteMessage,
    IMessage,
    MessageBase,
    MessageType,
    SearchRequestMessage,
    SearchResultsMessage,
    SearchResultsType,
    UpdateTagsMessage,
} from './core/messages';
import { Queuer } from './queuer';
import { Searcher } from './searcher';

export class MessageRouter extends EventEmitter {
    private queuer: Queuer;
    private searcher: Searcher;
    private messageIdsToListenFor = new Array < string > ();

    constructor(private config: IKeepersConfig) {
        super();
        this.queuer = new Queuer(config);
        this
            .queuer
            .on("received", (payload: {
                fromExchange: string,
                message: IMessage,
            }) => this.handleMessage(payload));
        this
            .queuer
            .listenToExchange(config.documentIndexedExchangeName);

        this.searcher = new Searcher(config);
    }

    public async handleMessage(payload: {
        fromExchange: string,
        message: IMessage,
    }) {
        if (!(this.config.documentIndexedExchangeName === payload.fromExchange)) {
            return;
        }
        if (this.messageIdsToListenFor.indexOf(payload.message.id) === -1) {
            return;
        }

        this.emit("response", payload.message);
    }

    public async route(message: IMessage): Promise <{
        message: IMessage,
        err?: any,
        success?: boolean,
    }> {
        // Assign guid to the message to respond to the message
        message.id = uuid();
        this
            .messageIdsToListenFor
            .push(message.id);

        // Giant switch for now
        switch (message.type) {
            case MessageType.queue_for_indexing:
                const result = await this
                    .queuer
                    .enqueue(message, this.config.readyToIndexQueueName);
                if (result.success) {
                    this.emit("messageRouted", message);
                } else {
                    this.emit("messageFailed", message);
                }
                return Promise.resolve({message, success: result.success});
            case MessageType.search_for_keeper:
                return this.routeSearchMessage(message);
            case MessageType.update_tags:
                const updateMsg = message as UpdateTagsMessage;
                const updateResult = await this.searcher.updateTags(updateMsg.keeperIds, updateMsg.tags);
                return Promise.resolve({ message, success: updateResult.ok, err: updateResult.message });
            case MessageType.remove_document:
                const deleteMsg = message as DeleteMessage;
                const deleteResult = await this.searcher.delete(deleteMsg.keeperIds);
                return Promise.resolve({ message, success: deleteResult.ok, err: deleteResult.message });
        }
    }

    private async routeSearchMessage(message: IMessage): Promise<{
        message: IMessage,
        err?: any,
        success?: boolean,
    }> {
        const searchRequestMessage = (message as SearchRequestMessage);
        if (searchRequestMessage.searchString && searchRequestMessage.searchString !== '') {
            const searchResults = await this.searcher.search(searchRequestMessage.searchString);
            const resultsMessage = new SearchResultsMessage(searchResults);
            resultsMessage.id = message.id;
            return Promise.resolve({ message: resultsMessage, success: true });
        } else {
            const searchResult = await this.searcher.getKeeper(searchRequestMessage.documentId);
            const resultsMessage = new SearchResultsMessage({ results: [searchResult], tookMs: 0 });
            resultsMessage.id = message.id;
            resultsMessage.resultsType = SearchResultsType.Single;
            return Promise.resolve({ message: resultsMessage, success: true });
        }
    }
}
