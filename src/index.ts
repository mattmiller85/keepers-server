import * as express from 'express';
import * as http from 'http';
import * as WebSocket from 'ws';
import { Config } from './config';
import { IMessage } from './core/messages';
import { MessageRouter } from './message-router';

const config = new Config();

const app = express();

const server = http.createServer(app);

const wss = new WebSocket.Server({ server });

const messageRouter = new MessageRouter(config);

const routeResponsesTo = new Map<string, WebSocket>();

messageRouter.on("response", (msg: IMessage) => {
    const sendTo = routeResponsesTo.get(msg.id);
    if (!sendTo) {
        return;
    }
    sendTo.send(JSON.stringify(msg));
    routeResponsesTo.delete(msg.id);
});

wss.on('connection', (ws: WebSocket) => {
    ws.on('message', async (message: string) => {
        routeResponsesTo.set((await messageRouter.route(JSON.parse(message))).message.id, ws);
    });
});

server.listen(process.env.PORT || 8999, () => {
    console.log(`Server started on port ${server.address().port}.`);
});
