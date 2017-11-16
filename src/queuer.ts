import * as amqp from 'amqplib';
import * as Bluebird from 'bluebird';
import { EventEmitter } from 'events';
import { IKeepersConfig } from './config';
import { IMessage } from './core/messages';

interface IQueuer {
    enqueue(item: any, queueName: string): PromiseLike<IQueuedResult>;
    listenToExchange(queueName: string): void;
}

interface IQueuedResult {
    success: boolean;
}

export class Queuer extends EventEmitter implements IQueuer {

    constructor(private config: IKeepersConfig) { super(); }

    public async enqueue(item: any, queueName: string): Promise<IQueuedResult> {
        const conn = await amqp.connect(this.config.rabbitUrl);
        const ch = await conn.createChannel();
        const queueResult = await ch.assertQueue(queueName);
        const queued = ch.sendToQueue(queueName, new Buffer(JSON.stringify(item)));
        return Promise.resolve({ success: queued });
    }

    public async startWorking<T>(queueName: string,
                                 processFunction: (item: T, done: () => void, error: (message: string) => void) => void): Promise<any> {

        const conn = await amqp.connect(this.config.rabbitUrl);
        const ch = await conn.createChannel();
        const queueResult = await ch.assertQueue(queueName);
        return ch.consume(queueName, (msg) => {
            if (msg) {
                processFunction(JSON.parse(msg.content.toString()) as T,
                    () => ch.ack(msg),
                    (message: string) => ch.nack(msg));
            }
        });
    }

    public async broadcastMessage(message: IMessage, queueName: string) {
        const conn = await amqp.connect(this.config.rabbitUrl);
        const ch = await conn.createChannel();
        const astResult = await ch.assertExchange(queueName, "fanout", {
            durable: false,
        });
        const messageStr = JSON.stringify(message);
        const ok = ch.publish(queueName, '', Buffer.from(messageStr));
        if (ok) {
            this.emit("sent", message);
        } else {
            this.emit("sendFailed", message);
        }
    }

    public async listenToExchange(queueName: string): Promise<string> {
        const emitReceived = (msg: amqp.Message) => {
            this.emit("received", { fromExchange: queueName, message: JSON.parse(msg.content.toString()) });
        };

        const ch = await amqp.connect(this.config.rabbitUrl).then((conn) => {
            return conn.createChannel();
        });
        const astExch = await ch.assertExchange(this.config.documentIndexedExchangeName, 'fanout', {
            durable: false,
        });
        const qok = await ch.assertQueue('', {
            exclusive: true,
        });
        const queue = await ch.bindQueue(qok.queue, this.config.documentIndexedExchangeName, '').then(() => {
            return qok.queue;
        });
        const consumeResp = await ch.consume(queue, emitReceived, {
            noAck: true,
        });

        return Promise.resolve(consumeResp.consumerTag);
    }
}
