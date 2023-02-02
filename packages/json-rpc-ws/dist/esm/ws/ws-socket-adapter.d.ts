/// <reference types="node" resolution-mode="require"/>
import ws from 'ws';
import { SocketAdapter, SocketAdapterEventMap } from '../shared-connection.js';
import { Readable } from 'stream';
/**
 * json-rpc-ws connection
 *
 * @constructor
 * @param {Socket} socket - web socket for this connection
 * @param {Object} parent - parent that controls this connection
 */
export default class WsSocketAdapter implements SocketAdapter<Readable> {
    private socket;
    constructor(socket: ws);
    pipe(socket: SocketAdapter<unknown>): void;
    get open(): boolean;
    close(): void;
    send(data: string): void;
    off<K extends keyof SocketAdapterEventMap>(event: K, handler?: (ev: SocketAdapterEventMap[K]) => void): void;
    on<K extends keyof SocketAdapterEventMap>(event: K, handler: (ev: SocketAdapterEventMap[K]) => void): void;
    once<K extends keyof SocketAdapterEventMap>(event: K, handler: (ev: SocketAdapterEventMap[K]) => void): void;
}
