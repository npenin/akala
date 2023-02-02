import { Error as ConnectionError, ErrorTypes } from './errors.js';
import { SerializableObject } from '@akala/core';
export type PayloadDataType<T> = number | SerializableObject | SerializableObject[] | boolean | boolean[] | number[] | string | string[] | null | undefined | void | {
    event: string;
    isBuffer: boolean;
    data: string | SerializedBuffer;
} | T;
export type SerializedBuffer = {
    type: 'Buffer';
    data: Uint8Array | number[];
};
export type Payload<T> = SerializablePayload | StreamPayload<T>;
interface CommonPayload {
    jsonrpc?: '2.0';
    id?: string | number;
    method?: string;
    error?: ConnectionError;
}
export interface SerializablePayload extends CommonPayload {
    params?: PayloadDataType<void>;
    result?: PayloadDataType<void>;
    stream?: false;
}
export interface StreamPayload<T> extends CommonPayload {
    params?: T;
    result?: PayloadDataType<T>;
    stream?: true;
}
export type Handler<TConnection extends Connection<TStreamable>, TStreamable, ParamType extends PayloadDataType<TStreamable>, ParamCallbackType extends PayloadDataType<TStreamable>> = (this: TConnection, params: ParamType, reply: ReplyCallback<ParamCallbackType>) => void;
export type ReplyCallback<ParamType> = (error: ConnectionError, params?: ParamType) => void;
export interface SocketAdapterEventMap {
    message: string;
    open: Event;
    error: Event;
    close: CloseEvent;
}
export interface SocketAdapter<TSocket = unknown> {
    readonly open: boolean;
    close(): void;
    send(data: string): void;
    on<K extends keyof SocketAdapterEventMap>(event: K, handler: (this: TSocket, ev: SocketAdapterEventMap[K]) => void): void;
    once<K extends keyof SocketAdapterEventMap>(event: K, handler: (this: TSocket, ev: SocketAdapterEventMap[K]) => void): void;
    off<K extends keyof SocketAdapterEventMap>(event: K, handler?: (this: TSocket, ev: SocketAdapterEventMap[K]) => void): void;
    pipe(socket: SocketAdapter): void;
}
export interface Parent<TStreamable, TConnection extends Connection<TStreamable>> {
    type: string;
    getHandler: (method: string) => Handler<TConnection, TStreamable, PayloadDataType<TStreamable>, PayloadDataType<TStreamable>>;
    disconnected: (connection: TConnection) => void;
}
/**
 * json-rpc-ws connection
 *
 * @constructor
 * @param {SocketAdapter} socket - socket adapter for this connection
 * @param {Object} parent - parent that controls this connection
 */
export declare abstract class Connection<TStreamable> {
    readonly socket: SocketAdapter;
    readonly parent: Parent<TStreamable, Connection<TStreamable>>;
    /**
     *
     */
    constructor(socket: SocketAdapter, parent: Parent<TStreamable, Connection<TStreamable>>);
    on<K extends keyof SocketAdapterEventMap>(event: K, handler: (ev: SocketAdapterEventMap[K]) => void): void;
    once<K extends keyof SocketAdapterEventMap>(event: K, handler: (ev: SocketAdapterEventMap[K]) => void): void;
    readonly id: string;
    protected readonly responseHandlers: {
        [messageId: string]: ReplyCallback<unknown>;
    };
    /**
     * Send json payload to the socket connection
     *
     * @param {Object} payload - data to be stringified
     * @private
     * @todo validate payload
     * @todo make sure this.connection exists, is connected
     * @todo if we're not connected look up the response handler from payload.id
     */
    sendRaw(payload: Payload<TStreamable>): void;
    /**
     * Validate payload as valid jsonrpc 2.0
     * http://www.jsonrpc.org/specification
     * Reply or delegate as needed
     *
     * @param {Object} payload - payload coming in to be validated
     * @returns {void}
     */
    processPayload(payload: Payload<TStreamable>): void;
    protected abstract buildStream(id: string | number, result: PayloadDataType<TStreamable>): TStreamable;
    protected abstract sendStream(id: string | number, result: TStreamable): void;
    protected abstract isStream(result: PayloadDataType<TStreamable>): result is TStreamable;
    /**
     * Send a result message
     *
     * @param {String} id - id for the message
     * @param {Object} error - error for the message
     * @param {String|Object|Array|Number} result - result for the message
     * @public
     *
     */
    sendResult(id: string | number | undefined, error: ConnectionError | undefined, result?: PayloadDataType<TStreamable>, isStream?: boolean): void;
    /**
     * Send a method message
     *
     * @param {String} method - method for the message
     * @param {Array|Object|null} params  - params for the message
     * @param {function} callback - optional callback for a reply from the message
     * @public
     */
    sendMethod<TParamType extends PayloadDataType<TStreamable>, TReplyType extends PayloadDataType<TStreamable>>(method: string, params?: TParamType, callback?: ReplyCallback<TReplyType>): void;
    /**
     * Send an error message
     *
     * @param {Object} error - json-rpc error object (See Connection.errors)
     * @param {String|Number|null} id - Optional id for reply
     * @param {Any} data - Optional value for data portion of reply
     * @public
     */
    sendError(error: ErrorTypes, id: number | string | undefined, data?: SerializableObject): void;
    /**
     * Called when socket gets 'close' event
     *
     * @param {ConnectionError} error - optional error object of close wasn't expected
     * @private
     */
    close(error?: ConnectionError | 1000 | Error | Event): void;
    /**
     * Hang up the current socket
     */
    hangup(): Promise<CloseEvent>;
    /**
     * Incoming message handler
     *
     * @param {String} data - message from the websocket
     * @returns {void}
     * @private
     */
    private message;
}
export {};
