import { Base } from './base.js';
import { SocketAdapter, PayloadDataType, Connection } from './shared-connection.js';
import { Error as MyError } from './errors.js';
export default abstract class Client<TStreamable> extends Base<TStreamable> {
    private socketConstructor;
    constructor(socketConstructor: (address: string) => SocketAdapter);
    socket?: SocketAdapter;
    /**
     * Connect to a json-rpc-ws server
     *
     * @param {String} address - url to connect to i.e. `ws://foo.com/`.
     * @param {function} callback - optional callback to call once socket is connected
     * @public
     */
    connect(address: string, callback: (err?: Event) => void): void;
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
    getConnection(): Connection<TStreamable>;
    /**
     * Close the current connection
     */
    disconnect(): Promise<CloseEvent>;
    /**
     * Send a method request
     *
     * @param {String} method - name of method
     * @param {Array} params - optional parameters for method
     * @param {function} callback - optional reply handler
     * @public
     * @todo allow for empty params aka arguments.length === 2
     */
    send<TParamType extends PayloadDataType<TStreamable>, TReplyType extends PayloadDataType<TStreamable>>(method: string, params: TParamType, callback?: (error?: MyError, result?: TReplyType) => void): void;
}
