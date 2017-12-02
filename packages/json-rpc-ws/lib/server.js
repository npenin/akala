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
var errors_1 = require("./errors");
var WebSocket = require("ws");
var debug = require("debug");
var logger = debug('json-rpc-ws');
/**
 * json-rpc-ws server
 *
 */
var Server = /** @class */ (function (_super) {
    __extends(Server, _super);
    function Server() {
        var _this = _super.call(this, 'server') || this;
        logger('new Server');
        return _this;
    }
    /**
   * Start the server
   *
   * @param {Object} options - optional options to pass to the ws server.
   * @param {function} callback - optional callback which is called once the server has started listening.
   * @public
   */
    Server.prototype.start = function (options, callback) {
        logger('Server start');
        this.server = new WebSocket.Server(options);
        if (typeof callback === 'function') {
            this.server.once('listening', callback);
        }
        this.server.on('connection', this.connected.bind(this));
    };
    ;
    /**
     * Stop the server
     *
     * @todo param {function} callback - called after the server has stopped
     * @public
     */
    Server.prototype.stop = function () {
        logger('Server stop');
        this.hangup();
        this.server.close();
        delete this.server;
    };
    ;
    /**
     * Send a method request through a specific connection
     *
     * @param {String} id - connection id to send the request through
     * @param {String} method - name of method
     * @param {Array} params - optional parameters for method
     * @param {replyCallback} callback - optional reply handler
     * @public
     */
    Server.prototype.send = function (id, method, params, callback) {
        logger('Server send %s %s', id, method);
        var connection = this.getConnection(id);
        if (connection) {
            connection.sendMethod(method, params, callback);
        }
        else if (typeof callback === 'function') {
            callback(errors_1.default('serverError').error);
        }
    };
    ;
    Server.prototype.broadcast = function (method, params, callback) {
        var _this = this;
        Object.keys(this.connections).forEach(function (id) {
            _this.send(id, method, params, callback);
        });
    };
    return Server;
}(base_1.Base));
exports.default = Server;
//# sourceMappingURL=server.js.map