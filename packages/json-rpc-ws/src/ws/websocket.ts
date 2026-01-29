'use strict';

import ClientBase from './shared-client.js';
import type { SocketAdapter } from '@akala/core';
import { Connection, Payload } from '../browser.js'
import { logger, LongMessageProtocolTransformer, SocketProtocolAdapter } from '@akala/core';
import * as ws from 'ws';
import WsSocketAdapter from './ws-socket-adapter.js';
import { MultiJsonRpcSocketTransformer } from '../shared-connection.js';

export default class Client extends ClientBase<ReadableStream, { protocols?: string | string[] }>
{
    connection(socket: SocketAdapter<Payload<ReadableStream>[]>): Connection
    {
        return new Connection(socket, this);
    }

    constructor(options?: { protocols?: string | string[] })
    {
        super(Client.connect, options);
    }

    public static connect(address: string, options?: { protocols?: string | string[] }): SocketAdapter<Payload<ReadableStream>[]>
    {
        return new SocketProtocolAdapter(LongMessageProtocolTransformer(MultiJsonRpcSocketTransformer<ReadableStream>()), new WsSocketAdapter(new ws.WebSocket(address.replace(/^http/, 'ws'), options?.protocols)));
    }
}

const log = logger.use('akala:json-rpc-ws');

export function createClient(options?: { protocols?: string | string[] }): Client
{
    log.debug('create ws client');
    return new Client(options);
}

export const connect = Client.connect;
