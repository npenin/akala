'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var debug = require("debug");
var uuid = require("uuid");
var logger = debug('json-rpc-ws');
var connection_1 = require("./connection");
/**
 * Base functionality shared by client and server
 *
 * @constructor
 * @public
 */
var Base = /** @class */ (function () {
    function Base(type) {
        this.type = type;
        this.id = uuid();
        this.browser = false;
        this.requestHandlers = {};
        this.connections = {};
    }
    /**
     * Add a handler function for a given method
     *
     * @param {String} method - name of the method to add handler for.
     * @param {function} handler - function to be passed params for given method.
     * @todo enforce handler w/ two-param callback
     * @public
     */
    Base.prototype.expose = function (method, handler) {
        logger('registering handler for %s', method);
        if (this.requestHandlers[method]) {
            throw Error('cannot expose handler, already exists ' + method);
        }
        this.requestHandlers[method] = handler;
    };
    ;
    /**
     * Connected event handler
     *
     * @param {Object} socket - new socket connection
     * @private
     */
    Base.prototype.connected = function (socket) {
        logger('%s connected', this.type);
        var connection = new connection_1.Connection(socket, this);
        this.connections[connection.id] = connection;
    };
    ;
    /**
     * Disconnected event handler
     *
     * @param {Object} connection - connection object that has been closed
     * @private
     */
    Base.prototype.disconnected = function (connection) {
        logger('disconnected');
        delete this.connections[connection.id];
    };
    ;
    /**
     * Test if a handler exists for a given method
     *
     * @param {String} method - name of method
     * @returns {Boolean} whether or not there are any handlers for the given method
     * @public
     */
    Base.prototype.hasHandler = function (method) {
        if (this.requestHandlers[method] !== undefined) {
            return true;
        }
        return false;
    };
    ;
    /**
     * Get handler for a given method
     *
     * @param {String} method - name of method
     * @returns {Array}  - handler for given method
     * @public
     */
    Base.prototype.getHandler = function (method) {
        return this.requestHandlers[method];
    };
    ;
    /**
     * Get a connection by id
     *
     * @param {id} id - id of the connection to get
     * @returns {Connection} - Connection
     * @public
     */
    Base.prototype.getConnection = function (id) {
        return this.connections[id];
    };
    ;
    /**
     * Shut down all existing connections
     *
     * @public
     */
    Base.prototype.hangup = function () {
        logger('hangup');
        var connections = Object.keys(this.connections);
        connections.forEach(function hangupConnection(id) {
            this.connections[id].close();
            delete this.connections[id];
        }, this);
    };
    ;
    return Base;
}());
exports.Base = Base;
//# sourceMappingURL=base.js.map