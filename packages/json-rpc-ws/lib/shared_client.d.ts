import { Base } from './base';
import { Connection, PayloadDataType } from './connection';
import * as ws from 'ws';
export declare type SocketType = ws | WebSocket;
export default class Client<TClientConnection extends Connection> extends Base<TClientConnection> {
    private socketConstructor;
    constructor(socketConstructor: new (address: string) => SocketType, browser: boolean);
    private socket?;
    /**
     * Connect to a json-rpc-ws server
     *
     * @param {String} address - url to connect to i.e. `ws://foo.com/`.
     * @param {function} callback - optional callback to call once socket is connected
     * @public
     */
    connect(address: string, callback: (err?: any) => void): void;
    /**
     * Test whether we have a connection or not
     *
     * @returns {Boolean} whether or not we have a connection
     * @public
     */
    isConnected(): boolean;
    /**
     * Return the current connection (there can be only one)
     *
     * @returns {Object} current connection
     * @public
     */
    getConnection(): TClientConnection;
    /**
     * Close the current connection
     *
     * @param {function} callback - called when the connection has been closed
     * @public
     */
    disconnect(callback: () => void): void;
    /**
     * Send a method request
     *
     * @param {String} method - name of method
     * @param {Array} params - optional parameters for method
     * @param {function} callback - optional reply handler
     * @public
     * @todo allow for empty params aka arguments.length === 2
     */
    send<TParamType extends PayloadDataType, TReplyType extends PayloadDataType>(method: string, params: TParamType, callback?: (error?: any, result?: TReplyType) => void): void;
}
