/// <reference types="node" resolution-mode="require"/>
import { SerializableObject } from '@akala/core';
import * as stream from 'stream';
import { Connection as BaseConnection, PayloadDataType, SocketAdapter, Parent } from './shared-connection.js';
export declare class Connection extends BaseConnection<stream.Readable> {
    constructor(socket: SocketAdapter, parent: Parent<stream.Readable, Connection>);
    protected isStream(result?: PayloadDataType<stream.Readable>): result is stream.Readable;
    protected sendStream(id: string | number, params: stream.Readable): void;
    protected buildStream(this: Connection, id: string | number, result: PayloadDataType<stream.Readable>): SerializableObject & stream.Readable;
}
