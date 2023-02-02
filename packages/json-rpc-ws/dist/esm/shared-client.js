import { Base } from './base.js';
import debug from 'debug';
const logger = debug('json-rpc-ws');
export default class Client extends Base {
    socketConstructor;
    constructor(socketConstructor) {
        super('client');
        this.socketConstructor = socketConstructor;
        logger('new Client');
    }
    socket;
    /**
     * Connect to a json-rpc-ws server
     *
     * @param {String} address - url to connect to i.e. `ws://foo.com/`.
     * @param {function} callback - optional callback to call once socket is connected
     * @public
     */
    connect(address, callback) {
        logger('Client connect %s', address);
        if (this.isConnected())
            throw new Error('Already connected');
        let opened = false;
        const socket = this.socket = this.socketConstructor(address);
        socket.once('open', () => {
            // The client connected handler runs scoped as the socket so we can pass
            // it into our connected method like thisk
            this.connected(socket);
            opened = true;
            if (callback)
                callback.call(this);
        });
        if (callback)
            this.socket.once('error', function socketError(err) {
                if (!opened) {
                    callback.call(self, err);
                }
            });
    }
    /**
     * Test whether we have a connection or not
     *
     * @returns {Boolean} whether or not we have a connection
     * @public
     */
    isConnected() {
        return Object.keys(this.connections).length !== 0;
    }
    /**
     * Return the current connection (there can be only one)
     *
     * @returns {Object} current connection
     * @public
     */
    getConnection() {
        const ids = Object.keys(this.connections);
        return this.connections[ids[0]];
    }
    /**
     * Close the current connection
     */
    disconnect() {
        if (!this.isConnected())
            throw new Error('Not connected');
        const connection = this.getConnection();
        return connection.hangup();
    }
    /**
     * Send a method request
     *
     * @param {String} method - name of method
     * @param {Array} params - optional parameters for method
     * @param {function} callback - optional reply handler
     * @public
     * @todo allow for empty params aka arguments.length === 2
     */
    send(method, params, callback) {
        logger('send %s', method);
        if (!this.isConnected())
            throw new Error('Not connected');
        const connection = this.getConnection();
        connection.sendMethod(method, params, callback);
    }
}
//# sourceMappingURL=shared-client.js.map