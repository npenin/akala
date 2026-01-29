'use strict';

import ws from 'ws';
import { Connection } from '../connection.js';
import { default as ClientBase } from './shared-client.js';

import * as stream from 'stream';
import { type SocketAdapter } from '@akala/core';
import WsSocketAdapter from './ws-socket-adapter.js';
import { JsonRpcSocketAdapter, Payload } from '../shared-connection.js';


export default class Client extends ClientBase<stream.Readable, ws.ClientOptions>
{
    connection(socket: SocketAdapter<Payload<stream.Readable>[]>): Connection
    {
        return new Connection(socket, this);
    }
    constructor(options?: ws.ClientOptions)
    {
        super(Client.connect, options);
    }

    public static connect(address: string, options?: ws.ClientOptions): SocketAdapter<Payload<stream.Readable>[]>
    {
        return new JsonRpcSocketAdapter(new WsSocketAdapter(new ws(address, options)));
    }
}
