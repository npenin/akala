'use strict';

import { default as ClientBase } from './shared-client.js';
import { SocketAdapter, SocketAdapterEventMap } from '../shared-connection.js';
import { Connection } from '../browser.js'
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

    pipe(socket: SocketAdapter<unknown>)
    {
        this.on('message', (message) => socket.send(message));
        this.on('close', () => socket.close());
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

    private messageListeners: [(ev: unknown) => void, (ev: unknown) => void][] = [];

    public off<K extends keyof SocketAdapterEventMap>(event: K, handler: (ev: SocketAdapterEventMap[K]) => void): void
    {
        switch (event)
        {
            case 'message': Function
                {
                    let listeners = this.messageListeners;
                    if (handler)
                        listeners = listeners.filter(f => f[0] == handler);
                    listeners.forEach(l => this.socket.removeEventListener('message', l[1]));
                }
                break;
            case 'close':
            case 'error':
            case 'open':
                //eslint-disable-next-line @typescript-eslint/no-explicit-any
                this.socket.removeEventListener(event, handler as any);
                break;
            default:
                throw new Error(`Unsupported event ${event}`);
        }
    }
    public on<K extends keyof SocketAdapterEventMap>(event: K, handler: (ev: SocketAdapterEventMap[K]) => void): void
    {
        switch (event)
        {
            case 'message':
                {
                    const x = function (ev) { return handler.call(this, ev.data) };
                    this.messageListeners.push([handler, x]);
                    this.socket.addEventListener('message', x);
                }
                break;
            case 'close':
            case 'error':
            case 'open':
                //eslint-disable-next-line @typescript-eslint/no-explicit-any
                this.socket.addEventListener(event, handler as any);
                break;
            default:
                throw new Error(`Unsupported event ${event}`);
        }
    }
    public once<K extends keyof SocketAdapterEventMap>(event: K, handler: (ev: SocketAdapterEventMap[K]) => void): void
    {
        switch (event)
        {
            case 'message':
                this.socket.addEventListener('message', function (ev) { return handler.call(this, ev.data) }, { once: true });
                break;
            case 'close':
            case 'error':
            case 'open':
                //eslint-disable-next-line @typescript-eslint/no-explicit-any
                this.socket.addEventListener(event, handler as any, { once: true });
                break;
            default:
                throw new Error(`Unsupported event ${event}`);
        }
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