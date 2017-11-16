import { EventEmitter } from 'events';
import { v4 as uuid } from 'uuid';
import { IKeepersConfig } from './config';
import { IMessage, MessageType } from './core/messages';
import { Queuer } from './queuer';

export class MessageRouter extends EventEmitter {
    private queuer: Queuer;
    private messageIdsToListenFor = new Array<string>();

    constructor(private config: IKeepersConfig) {
        super();
        this.queuer = new Queuer(config);
        this.queuer.on("received", (payload: { fromExchange: string, message: IMessage }) => this.handleMessage(payload));
        this.queuer.listenToExchange(config.documentIndexedExchangeName);
    }

    public async handleMessage(payload: { fromExchange: string, message: IMessage }) {
        if (!(this.config.documentIndexedExchangeName === payload.fromExchange)) {
            return;
        }
        if (this.messageIdsToListenFor.indexOf(payload.message.id) === -1) {
            return;
        }

        this.emit("response", payload.message);
    }

    public async route(message: IMessage): Promise<{ message: IMessage, err?: any, success?: boolean }> {
        // Assign guid to the message to respond to the message
        message.id = uuid();
        this.messageIdsToListenFor.push(message.id);

        // Giant switch for now
        switch (message.type) {
            case MessageType.queue_for_indexing:
                return this.queuer.enqueue(message, this.config.readyToIndexQueueName)
                    .then((result) => {
                        if (result.success) {
                            this.emit("messageRouted", message);
                        } else {
                            this.emit("messageFailed", message);
                        }
                        return Promise.resolve({ message, success: result.success});
                    });
        }
    }
}
