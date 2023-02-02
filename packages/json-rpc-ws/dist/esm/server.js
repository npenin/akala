'use strict';
import { Base } from './base.js';
import { default as Errors } from './errors.js';
import { Connection } from './connection.js';
import debug from 'debug';
function assert(ok, message) {
    if (!ok)
        throw new Error(message);
}
const logger = debug('json-rpc-ws');
/**
 * json-rpc-ws server
 *
 */
export default class Server extends Base {
    server;
    constructor(server) {
        super('server');
        this.server = server;
        logger('new Server');
    }
    connection(socket) {
        return new Connection(socket, this);
    }
    /**
   * Start the server
   *
   * @param {Object} options - optional options to pass to the ws server.
   * @param {function} callback - optional callback which is called once the server has started listening.
   * @public
   */
    start(server, callback) {
        logger('Server start');
        if (server && this.server && server !== this.server)
            throw new Error('a ServerAdapter was already defined at construction, and a different server is provided at start');
        if (server)
            this.server = server;
        assert(this.server, 'no ServerAdapter was defined (neither at construction nor at start)');
        this.server?.start();
        if (typeof callback === 'function')
            this.server?.once('listening', callback);
        this.server?.onConnection(socket => {
            this.connected(socket);
        });
    }
    /**
     * Stop the server
     *
     * @todo param {function} callback - called after the server has stopped
     * @public
     */
    stop() {
        logger('Server stop');
        this.hangup();
        this.server?.close();
        delete this.server;
    }
    /**
     * Send a method request through a specific connection
     *
     * @param {String} id - connection id to send the request through
     * @param {String} method - name of method
     * @param {Array} params - optional parameters for method
     * @param {replyCallback} callback - optional reply handler
     * @public
     */
    send(id, method, params, callback) {
        logger('Server send %s %s', id, method);
        const connection = this.getConnection(id);
        if (connection) {
            connection.sendMethod(method, params, callback);
        }
        else if (typeof callback === 'function') {
            callback(Errors('serverError').error);
        }
    }
    broadcast(method, params, callback) {
        Object.keys(this.connections).forEach((id) => {
            this.send(id, method, params, callback);
        });
    }
}
//# sourceMappingURL=server.js.map