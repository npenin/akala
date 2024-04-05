'use strict';

import ws from 'ws';
import { Connection } from '../connection.js';
import { default as ClientBase } from './shared-client.js';

import * as stream from 'stream';
import WsSocketAdapter from './ws-socket-adapter.js';
import { SocketAdapter } from '../shared-connection.js';


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

    public static connect(address: string, options?: ws.ClientOptions): SocketAdapter { return new WsSocketAdapter(new ws(address, options)); }
}