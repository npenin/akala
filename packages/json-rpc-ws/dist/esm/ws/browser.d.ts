import { default as ClientBase } from './shared-client.js';
import { SocketAdapter, SocketAdapterEventMap } from '../shared-connection.js';
import { Connection } from '../browser.js';
/**
 * json-rpc-ws connection
 *
 * @constructor
 * @param {Socket} socket - web socket for this connection
 * @param {Object} parent - parent that controls this connection
 */
export declare class WebSocketAdapter implements SocketAdapter {
    private socket;
    constructor(socket: WebSocket);
    pipe(socket: SocketAdapter<unknown>): void;
    get open(): boolean;
    close(): void;
    send(data: string): void;
    private messageListeners;
    off<K extends keyof SocketAdapterEventMap>(event: K, handler: (ev: SocketAdapterEventMap[K]) => void): void;
    on<K extends keyof SocketAdapterEventMap>(event: K, handler: (ev: SocketAdapterEventMap[K]) => void): void;
    once<K extends keyof SocketAdapterEventMap>(event: K, handler: (ev: SocketAdapterEventMap[K]) => void): void;
}
export default class Client extends ClientBase<ReadableStream> {
    connection(socket: SocketAdapter): Connection;
    constructor();
    static connect(address: string): SocketAdapter;
}
export { SocketAdapter };
export declare function createClient(): Client;
export declare const connect: typeof Client.connect;
