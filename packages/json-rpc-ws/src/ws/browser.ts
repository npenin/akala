'use strict';

import { default as ClientBase } from './shared-client';
import { SocketAdapter } from '../shared-connection';
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

    get open()
    {
        return this.socket.readyState == WebSocket.OPEN;
    };

    close(): void
    {
        this.socket.close();
    }

    send(data: string): void
    {
        this.socket.send(data);
    }

    public on(event: "open", handler: () => void): void;
    public on(event: "message", handler: (ev: MessageEvent) => void): void;
    public on(event: "error", handler: (ev: Event) => void): void;
    public on(event: "close", handler: (ev: CloseEvent) => void): void;
    public on(event: "message" | "error" | "close" | "open", handler: (ev?: any) => void): void
    {
        this.socket.addEventListener(event, handler);
    }
    public once(event: "open", handler: () => void): void;
    public once(event: "message", handler: (ev: MessageEvent) => void): void;
    public once(event: "error", handler: (ev: Event) => void): void;
    public once(event: "close", handler: (ev: CloseEvent) => void): void;
    public once(event: "message" | "error" | "close" | "open", handler: (ev?: any) => void): void
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

    public static connect(address: string) { return new WebSocketAdapter(new WebSocket(address.replace(/^http/, 'ws'))); }
}

import debug from 'debug';
const logger = debug('json-rpc-ws');
export { SocketAdapter }

export function createClient()
{
    logger('create ws client');
    return new Client();
};

export const connect = Client.connect;