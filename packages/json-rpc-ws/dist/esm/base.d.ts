import { Connection, Handler, PayloadDataType, Parent, SocketAdapter } from './shared-connection.js';
/**
 * Base functionality shared by client and server
 *
 * @constructor
 * @public
 */
export declare abstract class Base<TStreamable, TConnection extends Connection<TStreamable> = Connection<TStreamable>> implements Parent<TStreamable, TConnection> {
    type: string;
    constructor(type: string);
    id: string;
    browser: boolean;
    private requestHandlers;
    protected connections: {
        [id: string]: Connection<TStreamable>;
    };
    /**
     * Add a handler function for a given method
     *
     * @param {String} method - name of the method to add handler for.
     * @param {function} handler - function to be passed params for given method.
     * @todo enforce handler w/ two-param callback
     * @public
     */
    expose<TParamType extends PayloadDataType<TStreamable>, TReplyType extends PayloadDataType<TStreamable>>(method: string, handler: Handler<TConnection, TStreamable, TParamType, TReplyType>): void;
    /**
     * Connected event handler
     *
     * @param {Object} socket - new socket connection
     * @private
     */
    connected(socket: SocketAdapter): void;
    abstract connection(socket: SocketAdapter): Connection<TStreamable>;
    /**
     * Disconnected event handler
     *
     * @param {Object} connection - connection object that has been closed
     * @private
     */
    disconnected(connection: Connection<TStreamable>): void;
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
    getHandler(method: string): Handler<TConnection, TStreamable, PayloadDataType<TStreamable>, PayloadDataType<TStreamable>>;
    /**
     * Get a connection by id
     *
     * @param {id} id - id of the connection to get
     * @returns {Connection} - Connection
     * @public
     */
    getConnection(id: string): Connection<TStreamable>;
    /**
     * Shut down all existing connections
     *
     * @public
     */
    hangup(): void;
}
