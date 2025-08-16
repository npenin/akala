'use strict';

import { default as ClientBase } from './shared-client.js';
import type { SocketAdapter } from '@akala/core';
import { Connection } from '../browser.js'
import { IsomorphicBuffer, SocketProtocolAdapter, WebSocketAdapter } from '@akala/core';
import debug from 'debug';

/**
 * json-rpc-ws connection
 *
 * @constructor
 * @param {Socket} socket - web socket for this connection
 * @param {Object} parent - parent that controls this connection
 */

export class JsonNDRpcSocketAdapter<T> extends SocketProtocolAdapter<T> implements SocketAdapter<T>
{
    constructor(socket: SocketAdapter)
    {
        super({
            receive: (data: string | IsomorphicBuffer) => JSON.parse((data instanceof IsomorphicBuffer ? data.toString('utf8') : data)),
            send: (data: T) => JSON.stringify(data) + '\n',
        }, socket);
    }

}

export default class Client extends ClientBase<ReadableStream, { protocols?: string | string[] }>
{
    connection(socket: SocketAdapter): Connection
    {
        return new Connection(socket, this);
    }

    constructor(options?: { protocols?: string | string[] })
    {
        super(Client.connect, options);
    }

    public static connect(address: string, options?: { protocols?: string | string[] }): SocketAdapter
    {
        return new JsonNDRpcSocketAdapter(new WebSocketAdapter(new WebSocket(address.replace(/^http/, 'ws'), options?.protocols)));
    }
}

const logger = debug('akala:json-rpc-ws');

export function createClient(options?: { protocols?: string | string[] }): Client
{
    logger('create ws client');
    return new Client(options);
}

export const connect = Client.connect;
