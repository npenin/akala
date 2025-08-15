'use strict';

import ws from 'ws';
import { Connection } from '../connection.js';
import { default as ClientBase } from './shared-client.js';

import * as stream from 'stream';
import { WebSocketAdapter, type SocketAdapter } from '@akala/core';


export default class Client extends ClientBase<stream.Readable, ws.ClientOptions>
{
    connection(socket: SocketAdapter): Connection
    {
        return new Connection(socket, this);
    }
    constructor(options?: ws.ClientOptions)
    {
        super(Client.connect, options);
    }

    public static connect(address: string, options?: ws.ClientOptions): SocketAdapter
    {
        return new WebSocketAdapter(new WebSocket(address));
    }
}
