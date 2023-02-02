'use strict';
import debug from 'debug';
import { v4 as uuid } from 'uuid';
const logger = debug('json-rpc-ws');
/**
 * Base functionality shared by client and server
 *
 * @constructor
 * @public
 */
export class Base {
    type;
    constructor(type) {
        this.type = type;
    }
    id = uuid();
    browser = false;
    requestHandlers = {};
    connections = {};
    /**
     * Add a handler function for a given method
     *
     * @param {String} method - name of the method to add handler for.
     * @param {function} handler - function to be passed params for given method.
     * @todo enforce handler w/ two-param callback
     * @public
     */
    expose(method, handler) {
        logger('registering handler for %s', method);
        if (this.requestHandlers[method]) {
            throw Error('cannot expose handler, already exists ' + method);
        }
        this.requestHandlers[method] = handler;
    }
    /**
     * Connected event handler
     *
     * @param {Object} socket - new socket connection
     * @private
     */
    connected(socket) {
        const connection = this.connection(socket);
        logger('%s connected with id %s', this.type, connection.id);
        this.connections[connection.id] = connection;
    }
    /**
     * Disconnected event handler
     *
     * @param {Object} connection - connection object that has been closed
     * @private
     */
    disconnected(connection) {
        logger('disconnected');
        delete this.connections[connection.id];
    }
    /**
     * Test if a handler exists for a given method
     *
     * @param {String} method - name of method
     * @returns {Boolean} whether or not there are any handlers for the given method
     * @public
     */
    hasHandler(method) {
        if (this.requestHandlers[method] !== undefined) {
            return true;
        }
        return false;
    }
    /**
     * Get handler for a given method
     *
     * @param {String} method - name of method
     * @returns {Array}  - handler for given method
     * @public
     */
    getHandler(method) {
        return this.requestHandlers[method];
    }
    /**
     * Get a connection by id
     *
     * @param {id} id - id of the connection to get
     * @returns {Connection} - Connection
     * @public
     */
    getConnection(id) {
        return this.connections[id];
    }
    /**
     * Shut down all existing connections
     *
     * @public
     */
    hangup() {
        logger('hangup');
        const connections = Object.keys(this.connections);
        connections.forEach(function hangupConnection(id) {
            this.connections[id].close();
            delete this.connections[id];
        }, this);
    }
}
//# sourceMappingURL=base.js.map