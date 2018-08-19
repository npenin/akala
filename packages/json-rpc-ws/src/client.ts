'use strict';

import * as WebSocket from 'ws';
import { Connection } from './connection';
import { default as ClientBase } from './shared_client';

export default class Client<TConnection extends Connection> extends ClientBase<TConnection>
{
    constructor()
    {
        super(function (address: string) { return new WebSocket(address); }, false);
    }
}