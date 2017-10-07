'use strict';
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var base_1 = require("./base");
var connection_1 = require("./connection");
var debug = require("debug");
var logger = debug('json-rpc-ws');
var assert_1 = require("assert");
/**
 * json-rpc-ws module
 *
 * @param {Object} WebSocket object to use
 * @param {Boolean} browser - true if WebSocket is from the browser
 * @returns {Object} Client - json-rpc-ws client
 */
function JsonRpcWs(socketConstructor, browser) {
    return /** @class */ (function (_super) {
        __extends(ClientImpl, _super);
        function ClientImpl() {
            return _super.call(this, socketConstructor, browser) || this;
        }
        return ClientImpl;
    }(Client));
}
exports.JsonRpcWs = JsonRpcWs;
var Client = /** @class */ (function (_super) {
    __extends(Client, _super);
    function Client(socketConstructor, browser) {
        var _this = _super.call(this, 'client') || this;
        _this.socketConstructor = socketConstructor;
        logger('new Client');
        _this.browser = browser;
        return _this;
    }
    ;
    /**
     * Connect to a json-rpc-ws server
     *
     * @param {String} address - url to connect to i.e. `ws://foo.com/`.
     * @param {function} callback - optional callback to call once socket is connected
     * @public
     */
    Client.prototype.connect = function (address, callback) {
        logger('Client connect %s', address);
        assert_1.ok(!this.isConnected(), 'Already connected');
        var self = this;
        var opened = false;
        var socket = this.socket = new this.socketConstructor(address);
        if (connection_1.isBrowserSocket(this, socket)) {
            socket.onerror = function onerror(err) {
                if (!opened && callback) {
                    delete socket.onopen;
                    callback(err);
                }
            };
            socket.onopen = function onopen() {
                opened = true;
                delete socket.onopen;
                self.connected(this);
                if (callback) {
                    callback();
                }
            };
        }
        else {
            socket.once('open', function clientConnected() {
                // The client connected handler runs scoped as the socket so we can pass
                // it into our connected method like thisk
                self.connected(this);
            });
            if (callback) {
                socket.once('open', function socketOpen() {
                    opened = true;
                    callback.apply(this, arguments);
                });
                socket.once('error', function socketError() {
                    if (!opened) {
                        callback.apply(this, arguments);
                    }
                });
            }
        }
    };
    ;
    /**
     * Test whether we have a connection or not
     *
     * @returns {Boolean} whether or not we have a connection
     * @public
     */
    Client.prototype.isConnected = function () {
        if (Object.keys(this.connections).length === 0) {
            return false;
        }
        return true;
    };
    ;
    /**
     * Return the current connection (there can be only one)
     *
     * @returns {Object} current connection
     * @public
     */
    Client.prototype.getConnection = function () {
        var ids = Object.keys(this.connections);
        return this.connections[ids[0]];
    };
    ;
    /**
     * Close the current connection
     *
     * @param {function} callback - called when the connection has been closed
     * @public
     */
    Client.prototype.disconnect = function (callback) {
        assert_1.ok(this.isConnected(), 'Not connected');
        var connection = this.getConnection();
        connection.hangup(callback);
    };
    ;
    /**
     * Send a method request
     *
     * @param {String} method - name of method
     * @param {Array} params - optional parameters for method
     * @param {function} callback - optional reply handler
     * @public
     * @todo allow for empty params aka arguments.length === 2
     */
    Client.prototype.send = function (method, params, callback) {
        logger('send %s', method);
        assert_1.ok(this.isConnected(), 'Not connected');
        var connection = this.getConnection();
        connection.sendMethod(method, params, callback);
    };
    ;
    return Client;
}(base_1.Base));
//# sourceMappingURL=shared_client.js.map