import * as ws from 'ws';
import { Connection, Handler, PayloadDataType } from './connection';
/**
 * Base functionality shared by client and server
 *
 * @constructor
 * @public
 */
export declare class Base<TConnection extends Connection> {
    type: string;
    constructor(type: string);
    id: string;
    browser: boolean;
    private requestHandlers;
    protected connections: {
        [id: string]: TConnection;
    };
    /**
     * Add a handler function for a given method
     *
     * @param {String} method - name of the method to add handler for.
     * @param {function} handler - function to be passed params for given method.
     * @todo enforce handler w/ two-param callback
     * @public
     */
    expose<TParamType extends PayloadDataType, TReplyType extends PayloadDataType>(method: string, handler: Handler<TConnection, TParamType, TReplyType>): void;
    /**
     * Connected event handler
     *
     * @param {Object} socket - new socket connection
     * @private
     */
    connected(socket: ws | WebSocket): void;
    /**
     * Disconnected event handler
     *
     * @param {Object} connection - connection object that has been closed
     * @private
     */
    disconnected(connection: TConnection): void;
    /**
     * Test if a handler exists for a given method
     *
     * @param {String} method - name of method
     * @returns {Boolean} whether or not there are any handlers for the given method
     * @public
     */
    hasHandler(method: string): boolean;
    /**
     * Get handler for a given method
     *
     * @param {String} method - name of method
     * @returns {Array}  - handler for given method
     * @public
     */
    getHandler(method: string): Handler<TConnection, any, any>;
    /**
     * Get a connection by id
     *
     * @param {id} id - id of the connection to get
     * @returns {Connection} - Connection
     * @public
     */
    getConnection(id: string): TConnection;
    /**
     * Shut down all existing connections
     *
     * @public
     */
    hangup(): void;
}
