'use strict';

import * as WebSocket from 'ws';
import { Connection } from '../connection';
import { default as ClientBase } from './shared-client';

import * as stream from 'stream';
import WsSocketAdapter from './ws-socket-adapter';
import { SocketAdapter } from '../shared-connection';


export default class Client extends ClientBase<stream.Readable>
{
    connection(socket: SocketAdapter)
    {
        return new Connection(socket, this);
    }
    constructor()
    {
        super(function (address: string) { return new WsSocketAdapter(new WebSocket(address)); });
    }
}