/// <reference types="ws" />
import { Base } from './base';
import { Connection, ReplyCallback, PayloadDataType } from './connection';
import * as WebSocket from 'ws';
/**
 * json-rpc-ws server
 *
 */
export default class Server<TConnection extends Connection> extends Base<TConnection> {
    constructor();
    server: WebSocket.Server;
    /**
   * Start the server
   *
   * @param {Object} options - optional options to pass to the ws server.
   * @param {function} callback - optional callback which is called once the server has started listening.
   * @public
   */
    start(options?: WebSocket.ServerOptions, callback?: () => void): void;
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
