/// <reference types="node" />
import { Error as ConnectionError, ErrorTypes } from './errors';
import * as ws from 'ws';
import * as stream from 'stream';
export declare type SerializableObject = {
    [key: string]: string | number | SerializableObject | SerializableObject[];
};
export declare type PayloadDataType = number | SerializableObject | SerializableObject[] | stream.Readable | null | undefined | void | {
    event: string;
    isBuffer: boolean;
    data: string | SerializedBuffer;
};
export declare type SerializedBuffer = {
    type: 'Buffer';
    data: number[];
};
export interface Payload {
    jsonrpc?: '2.0';
    id?: string | number;
    method?: string;
    params?: any;
    result?: PayloadDataType;
    error?: ConnectionError;
    stream?: boolean;
}
export declare type Handler<TConnection extends Connection, ParamType extends PayloadDataType, ParamCallbackType extends PayloadDataType> = (this: TConnection, params: ParamType, reply: ReplyCallback<ParamCallbackType>) => void;
export declare type ReplyCallback<ParamType> = (error: any, params?: ParamType) => void;
export declare function isBrowserSocket(parent: {
    browser: true;
}, socket: ws | WebSocket): socket is WebSocket;
export declare function isBrowserSocket(parent: {
    browser: false;
}, socket: ws | WebSocket): socket is WebSocket;
export declare function isBrowserSocket(parent: {
    browser: boolean;
}, socket: ws | WebSocket): socket is WebSocket;
/**
 * json-rpc-ws connection
 *
 * @constructor
 * @param {Socket} socket - web socket for this connection
 * @param {Object} parent - parent that controls this connection
 */
export declare class Connection {
    socket: ws | WebSocket;
    parent: {
        type: string;
        browser: boolean;
        getHandler: (id: string) => Handler<Connection, any, any>;
        disconnected: (connection: Connection) => void;
    };
    /**
     *
     */
    constructor(socket: ws | WebSocket, parent: {
        type: string;
        browser: boolean;
        getHandler: (id: string) => Handler<Connection, any, any>;
        disconnected: (connection: Connection) => void;
    });
    id: string;
    private responseHandlers;
    /**
     * Send json payload to the socket connection
     *
     * @param {Object} payload - data to be stringified
     * @private
     * @todo validate payload
     * @todo make sure this.connection exists, is connected
     * @todo if we're not connected look up the response handler from payload.id
     */
    sendRaw(payload: Payload): void;
    private buildStream;
    /**
     * Validate payload as valid jsonrpc 2.0
     * http://www.jsonrpc.org/specification
     * Reply or delegate as needed
     *
     * @param {Object} payload - payload coming in to be validated
     * @returns {void}
     */
    processPayload(payload: Payload): void;
    /**
     * Send a result message
     *
     * @param {String} id - id for the message
     * @param {Object} error - error for the message
     * @param {String|Object|Array|Number} result - result for the message
     * @public
     *
     */
    sendResult(id: string | number | undefined, error: ConnectionError | undefined, result?: PayloadDataType, isStream?: boolean): void;
    /**
     * Send a method message
     *
     * @param {String} method - method for the message
     * @param {Array|Object|null} params  - params for the message
     * @param {function} callback - optional callback for a reply from the message
     * @public
     */
    sendMethod<TParamType extends PayloadDataType, TReplyType extends PayloadDataType>(method: string, params?: TParamType, callback?: ReplyCallback<TReplyType>): void;
    /**
     * Send an error message
     *
     * @param {Object} error - json-rpc error object (See Connection.errors)
     * @param {String|Number|null} id - Optional id for reply
     * @param {Any} data - Optional value for data portion of reply
     * @public
     */
    sendError(error: ErrorTypes, id: number | string | undefined, data?: any): void;
    /**
     * Called when socket gets 'close' event
     *
     * @param {ConnectionError} error - optional error object of close wasn't expected
     * @private
     */
    close(error?: ConnectionError | 1000 | Error): void;
    /**
     * Hang up the current socket
     *
     * @param {function} callback - called when socket has been closed
     * @public
     */
    hangup(callback: () => void): void;
    /**
     * Incoming message handler
     *
     * @param {String} data - message from the websocket
     * @returns {void}
     * @private
     */
    private message;
}
