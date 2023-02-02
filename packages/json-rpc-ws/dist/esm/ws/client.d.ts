/// <reference types="node" resolution-mode="require"/>
import { Connection } from '../connection.js';
import { default as ClientBase } from './shared-client.js';
import * as stream from 'stream';
import { SocketAdapter } from '../shared-connection.js';
export default class Client extends ClientBase<stream.Readable> {
    connection(socket: SocketAdapter): Connection;
    constructor();
    static connect(address: string): SocketAdapter;
}
