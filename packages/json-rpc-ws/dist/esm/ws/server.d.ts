import { ServerAdapter } from '../server.js';
import * as ws from 'ws';
import { SocketAdapter } from '../shared-connection.js';
export declare class Adapter implements ServerAdapter {
    private options?;
    server?: ws.WebSocketServer;
    close(): void;
    onConnection(handler: (socket: SocketAdapter<ws.WebSocket>) => void): void;
    once(event: 'listening', callback: () => void): void;
    start(): void;
    /**
     *
     */
    constructor(options?: ws.ServerOptions);
}
