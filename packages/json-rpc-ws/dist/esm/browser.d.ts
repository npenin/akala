import { Connection as BaseConnection, PayloadDataType, SerializedBuffer, Payload, SocketAdapter, Parent } from './shared-connection.js';
import { default as Client } from './shared-client.js';
import { default as Errors, Payload as ErrorPayload } from './errors.js';
import { SerializableObject } from '@akala/core';
import * as ws from './ws/browser.js';
export { ws };
export { Client, SocketAdapter, Errors, BaseConnection, SerializableObject, PayloadDataType, SerializedBuffer, Payload, ErrorPayload };
export declare class Connection extends BaseConnection<ReadableStream<Uint8Array>> {
    constructor(socket: SocketAdapter, parent: Parent<ReadableStream, Connection>);
    protected sendStream(id: string | number, result: ReadableStream<Uint8Array>): Promise<void>;
    protected isStream(result: PayloadDataType<ReadableStream>): result is ReadableStream;
    protected buildStream(id: string | number, result: PayloadDataType<ReadableStream<Uint8Array>>): ReadableStream<Uint8Array>;
}
