'use strict';

import { default as ClientBase } from './shared-client.js';
import { WebSocketAdapter, type SocketAdapter } from '@akala/core';
import { Connection } from '../browser.js'
import debug from 'debug';

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
        return new WebSocketAdapter(new WebSocket(address.replace(/^http/, 'ws'), options?.protocols));
    }
}

const logger = debug('akala:json-rpc-ws');

export function createClient(options?: { protocols?: string | string[] }): Client
{
    logger('create ws client');
    return new Client(options);
}

export const connect = Client.connect;
