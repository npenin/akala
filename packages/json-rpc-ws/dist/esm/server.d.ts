/// <reference types="node" resolution-mode="require"/>
import { Base } from './base.js';
import { ReplyCallback, PayloadDataType as BasePayloadDataType, SocketAdapter } from './shared-connection.js';
import { Connection } from './connection.js';
import * as stream from 'stream';
export interface ServerAdapter {
    close(): void;
    onConnection(arg1: (socket: SocketAdapter) => void): void;
    once(event: 'listening', callback: () => void): void;
    start(): void;
}
export type PayloadDataType = BasePayloadDataType<stream.Readable>;
/**
 * json-rpc-ws server
 *
 */
export default class Server<TConnection extends Connection> extends Base<stream.Readable, TConnection> {
    private server?;
    constructor(server?: ServerAdapter);
    connection(socket: SocketAdapter): Connection;
    /**
   * Start the server
   *
   * @param {Object} options - optional options to pass to the ws server.
   * @param {function} callback - optional callback which is called once the server has started listening.
   * @public
   */
    start(server?: ServerAdapter, callback?: () => void): void;
    /**
     * Stop the server
     *
     * @todo param {function} callback - called after the server has stopped
     * @public
     */
    stop(): void;
    /**
     * Send a method request through a specific connection
     *
     * @param {String} id - connection id to send the request through
     * @param {String} method - name of method
     * @param {Array} params - optional parameters for method
     * @param {replyCallback} callback - optional reply handler
     * @public
     */
    send<TParam extends PayloadDataType, TReplyParam extends PayloadDataType>(id: string, method: string, params?: TParam, callback?: ReplyCallback<TReplyParam>): void;
    broadcast<TParam extends PayloadDataType, TReplyParam extends PayloadDataType>(method: string, params: TParam, callback?: ReplyCallback<TReplyParam>): void;
}
