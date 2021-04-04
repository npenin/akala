'use strict';

import ws from 'ws';
import { Connection } from '../connection';
import { default as ClientBase } from './shared-client';

import * as stream from 'stream';
import WsSocketAdapter from './ws-socket-adapter';
import { SocketAdapter } from '../shared-connection';


export default class Client extends ClientBase<stream.Readable>
{
    connection(socket: SocketAdapter): Connection
    {
        return new Connection(socket, this);
    }
    constructor()
    {
        super(Client.connect);
    }

    public static connect(address: string): SocketAdapter { return new WsSocketAdapter(new ws(address)); }
}