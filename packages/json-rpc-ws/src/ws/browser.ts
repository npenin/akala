'use strict';

import { default as ClientBase } from './shared-client';
import { SocketAdapter, SocketAdapterEventMap } from '../shared-connection';
import { Connection } from '../browser'
/**
 * json-rpc-ws connection
 *
 * @constructor
 * @param {Socket} socket - web socket for this connection
 * @param {Object} parent - parent that controls this connection
 */

export class WebSocketAdapter implements SocketAdapter
{
    constructor(private socket: WebSocket)
    {

    }

    get open(): boolean
    {
        return this.socket.readyState == WebSocket.OPEN;
    }

    close(): void
    {
        this.socket.close();
    }

    send(data: string): void
    {
        this.socket.send(data);
    }

    public on<K extends keyof SocketAdapterEventMap>(event: K, handler: (ev: SocketAdapterEventMap[K]) => void): void
    {
        this.socket.addEventListener(event, handler);
    }
    public once<K extends keyof SocketAdapterEventMap>(event: K, handler: (ev: SocketAdapterEventMap[K]) => void): void
    {
        this.socket.addEventListener(event, handler, { once: true });
    }
}

export default class Client extends ClientBase<ReadableStream>
{
    connection(socket: SocketAdapter): Connection
    {
        return new Connection(socket, this);
    }

    constructor()
    {
        super(Client.connect);
    }

    public static connect(address: string): SocketAdapter { return new WebSocketAdapter(new WebSocket(address.replace(/^http/, 'ws'))); }
}

import debug from 'debug';
const logger = debug('json-rpc-ws');
export { SocketAdapter }

export function createClient(): Client
{
    logger('create ws client');
    return new Client();
}

export const connect = Client.connect;