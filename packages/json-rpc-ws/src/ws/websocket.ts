'use strict';

import { default as ClientBase } from './shared-client.js';
import type { SocketAdapter } from '@akala/core';
import { Connection, Payload } from '../browser.js'
import { WebSocketAdapter } from '@akala/core';
import debug from 'debug';
import { JsonNDRpcSocketAdapter } from '../shared-client.js';

export default class Client extends ClientBase<ReadableStream, { protocols?: string | string[] }>
{
    connection(socket: SocketAdapter<Payload<ReadableStream>>): Connection
    {
        return new Connection(socket, this);
    }

    constructor(options?: { protocols?: string | string[] })
    {
        super(Client.connect, options);
    }

    public static connect(address: string, options?: { protocols?: string | string[] }): SocketAdapter<Payload<ReadableStream>>
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
