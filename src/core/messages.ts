import { IDocument } from './document';

export enum MessageType {
    error = 1,
    queue_for_indexing = 2,
    indexing_finished = 3,
}

export function getTypedMessage(messageObj: { type?: MessageType }): IMessage {
    if (!messageObj || !messageObj.type) {
        throw new Error("Not a message");
    }

    switch (messageObj.type) {
        case MessageType.error:
            return new ErrorMessage(messageObj);
        case MessageType.queue_for_indexing:
            return new QueueForIndexingMessage(messageObj);
        case MessageType.indexing_finished:
            return new IndexingFinishedMessage(messageObj);
    }
}

export interface IMessage {
    readonly type: MessageType;
    id: string;
}

export interface IDocumentMessage extends IMessage {
    document: IDocument;
}

export abstract class MessageBase implements IMessage {
    public abstract readonly type: MessageType;
    public id: string;
    constructor(messageObj: any) {
        Object.assign(this, messageObj);
    }
}

// tslint:disable-next-line:max-classes-per-file
export class ErrorMessage extends MessageBase implements IMessage {
    public readonly type = MessageType.error;
    public error: any;
}

// tslint:disable-next-line:max-classes-per-file
export class QueueForIndexingMessage extends MessageBase implements IDocumentMessage {
    public readonly type = MessageType.queue_for_indexing;
    public document: IDocument;
}

// tslint:disable-next-line:max-classes-per-file
export class IndexingFinishedMessage extends MessageBase implements IDocumentMessage {
    public readonly type = MessageType.indexing_finished;
    public document: IDocument;
}

