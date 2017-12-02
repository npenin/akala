"use strict";
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
var uuid_1 = require("uuid");
var debug = require("debug");
var assert_1 = require("assert");
var errors_1 = require("./errors");
var stream = require("stream");
var logger = debug('json-rpc-ws');
/**
 * Quarantined JSON.parse try/catch block in its own function
 *
 * @param {String} data - json data to be parsed
 * @returns {Object} Parsed json data
 */
var jsonParse = function jsonParse(data) {
    var payload;
    try {
        payload = JSON.parse(data);
    }
    catch (error) {
        logger(error);
        payload = null;
    }
    return payload;
};
/**
 * JSON spec requires a reply for every request, but our lib doesn't require a
 * callback for every sendMethod. We need a dummy callback to throw into responseHandlers
 * for when the user doesn't supply callback to sendMethod
 */
var emptyCallback = function emptyCallback() {
    logger('emptycallback');
};
/**
 * Socket onclose handler for browser WebSocket
 */
var socketClosed = function socketClosed() {
    delete this.socket.onclose;
    this.close();
};
/**
 * Socket onerror handler for browser WebSocket
 */
var socketError = function socketError() {
    delete this.socket.onerror;
    this.close();
};
function isBrowserSocket(parent, socket) {
    return socket && parent.browser;
}
exports.isBrowserSocket = isBrowserSocket;
/**
 * json-rpc-ws connection
 *
 * @constructor
 * @param {Socket} socket - web socket for this connection
 * @param {Object} parent - parent that controls this connection
 */
var Connection = /** @class */ (function () {
    /**
     *
     */
    function Connection(socket, parent) {
        this.socket = socket;
        this.parent = parent;
        this.id = uuid_1.v4();
        this.responseHandlers = {};
        logger('new Connection to %s', parent.type);
        if (isBrowserSocket(parent, socket)) {
            socket.onmessage = this.message.bind(this);
            socket.onclose = socketClosed.bind(this);
            socket.onerror = socketError.bind(this);
        }
        else {
            socket.on('message', this.message.bind(this));
            socket.once('close', this.close.bind(this));
            socket.once('error', this.close.bind(this));
        }
    }
    /**
     * Send json payload to the socket connection
     *
     * @param {Object} payload - data to be stringified
     * @private
     * @todo validate payload
     * @todo make sure this.connection exists, is connected
     * @todo if we're not connected look up the response handler from payload.id
     */
    Connection.prototype.sendRaw = function (payload) {
        payload.jsonrpc = '2.0';
        this.socket.send(JSON.stringify(payload));
    };
    ;
    Connection.prototype.buildStream = function (id, result) {
        var _this = this;
        var data = [];
        var canPush = true;
        var temp = /** @class */ (function (_super) {
            __extends(temp, _super);
            function temp() {
                var _this = _super.call(this, {
                    read: function () {
                        if (data.length) {
                            while (canPush)
                                canPush = s.push(data.shift());
                        }
                        canPush = true;
                    }
                }) || this;
                var o = _this;
                var src = result;
                Object.getOwnPropertyNames(src).forEach(function (p) {
                    if (Object.getOwnPropertyDescriptor(o, p) == null) {
                        if (src && src[p])
                            o[p] = src[p];
                    }
                });
                return _this;
            }
            return temp;
        }(stream.Readable));
        var s = result = new temp();
        var f = this.responseHandlers[id] = function (error, result) {
            if (!!error)
                s.emit('error', error);
            else
                switch (result.event) {
                    case 'data':
                        var d = undefined;
                        if (result.data) {
                            if (typeof (result.data) == 'string')
                                d = result.data;
                            else
                                d = Buffer.from(result.data.data);
                            if (canPush)
                                s.push(d);
                            else
                                data.push(d);
                        }
                        _this.responseHandlers[id] = f;
                        break;
                    case 'end':
                        if (canPush)
                            s.push(null);
                        else
                            data.push(null);
                        break;
                }
        };
        return result;
    };
    /**
     * Validate payload as valid jsonrpc 2.0
     * http://www.jsonrpc.org/specification
     * Reply or delegate as needed
     *
     * @param {Object} payload - payload coming in to be validated
     * @returns {void}
     */
    Connection.prototype.processPayload = function (payload) {
        var version = payload.jsonrpc;
        var id = payload.id;
        var method = payload.method;
        var params = payload.params;
        var result = payload.result;
        var error = payload.error;
        if (version !== '2.0') {
            return this.sendError('invalidRequest', id, { info: 'jsonrpc must be exactly "2.0"' });
        }
        //Will either have a method (request), or result or error (response)
        if (typeof method === 'string') {
            var handler = this.parent.getHandler(method);
            if (!handler) {
                return this.sendError('methodNotFound', id, { info: 'no handler found for method ' + method });
            }
            if (id !== undefined && id !== null && typeof id !== 'string' && typeof id !== 'number') {
                return this.sendError('invalidRequest', id, { info: 'id, if provided, must be one of: null, string, number' });
            }
            if (params !== undefined && params !== null && typeof params !== 'object') {
                return this.sendError('invalidRequest', id, { info: 'params, if provided, must be one of: null, object, array' });
            }
            logger('message method %s', payload.method);
            if (id === null || typeof id === 'undefined') {
                return handler.call(this, params, emptyCallback);
            }
            var handlerCallback = function handlerCallback(err, reply) {
                logger('handler got callback %j, %j', err, reply);
                return this.sendResult(id, err, reply);
            };
            if (payload.stream)
                params = this.buildStream(id, params);
            return handler.call(this, params, handlerCallback.bind(this));
        }
        // needs a result or error at this point
        if (result === undefined && error === undefined) {
            return this.sendError('invalidRequest', id, { info: 'replies must have either a result or error' });
        }
        if (typeof id === 'string' || typeof id === 'number') {
            logger('message id %s result %j error %j', id, result, error);
            var responseHandler = this.responseHandlers[id];
            if (!responseHandler) {
                return this.sendError('invalidRequest', id, { info: 'no response handler for id ' + id });
            }
            delete this.responseHandlers[id];
            if (payload.stream) {
                result = this.buildStream(id, result);
            }
            return responseHandler.call(this, error, result);
        }
    };
    /**
     * Send a result message
     *
     * @param {String} id - id for the message
     * @param {Object} error - error for the message
     * @param {String|Object|Array|Number} result - result for the message
     * @public
     *
     */
    Connection.prototype.sendResult = function (id, error, result, isStream) {
        logger('sendResult %s %s %j %j', id, isStream, error, result);
        // Assert(id, 'Must have an id.');
        // Assert(error || result, 'Must have an error or a result.');
        assert_1.ok(!(error && result), 'Cannot have both an error and a result');
        var response = { id: id, stream: !!isStream || result instanceof stream.Readable };
        if (result) {
            response.result = result;
            if (response.stream && result instanceof stream.Readable) {
                logger('result is stream');
                var self = this;
                var pt = new stream.PassThrough({ highWaterMark: 128 });
                result.pipe(pt);
                pt.on('data', function (chunk) {
                    if (Buffer.isBuffer(chunk))
                        self.sendResult(id, undefined, { event: 'data', isBuffer: true, data: chunk.toJSON() });
                    else
                        self.sendResult(id, undefined, { event: 'data', isBuffer: false, data: chunk });
                });
                pt.on('end', function () {
                    self.sendResult(id, undefined, { event: 'end' });
                });
            }
        }
        else {
            response.error = error;
        }
        this.sendRaw(response);
    };
    ;
    /**
     * Send a method message
     *
     * @param {String} method - method for the message
     * @param {Array|Object|null} params  - params for the message
     * @param {function} callback - optional callback for a reply from the message
     * @public
     */
    Connection.prototype.sendMethod = function (method, params, callback) {
        var id = uuid_1.v4();
        assert_1.ok((typeof method === 'string') && (method.length > 0), 'method must be a non-empty string');
        assert_1.ok(params === null || params === undefined || params instanceof Object, 'params, if provided,  must be an array, object or null');
        logger('sendMethod %s', method, id);
        if (callback) {
            this.responseHandlers[id] = callback;
        }
        else {
            this.responseHandlers[id] = emptyCallback;
        }
        var request = {
            id: id,
            method: method
        };
        if (params) {
            if (params instanceof stream.Readable) {
                var self = this;
                request.stream = true;
                var pt = new stream.PassThrough({ highWaterMark: 128 });
                params.pipe(pt);
                pt.on('data', function (chunk) {
                    if (Buffer.isBuffer(chunk))
                        self.sendRaw({ id: id, result: { event: 'data', isBuffer: true, data: chunk.toJSON() } });
                    else
                        self.sendRaw({ id: id, result: { event: 'data', isBuffer: false, data: chunk } });
                });
                pt.on('end', function () {
                    self.sendRaw({ id: id, result: { event: 'end' }, stream: false });
                });
            }
            request.params = params;
        }
        this.sendRaw(request);
    };
    ;
    /**
     * Send an error message
     *
     * @param {Object} error - json-rpc error object (See Connection.errors)
     * @param {String|Number|null} id - Optional id for reply
     * @param {Any} data - Optional value for data portion of reply
     * @public
     */
    Connection.prototype.sendError = function (error, id, data) {
        logger('sendError %s', error);
        //TODO if id matches a responseHandler, we should dump it right?
        this.sendRaw(errors_1.default(error, id, data));
    };
    ;
    /**
     * Called when socket gets 'close' event
     *
     * @param {ConnectionError} error - optional error object of close wasn't expected
     * @private
     */
    Connection.prototype.close = function (error) {
        logger('close');
        if (error && error !== 1000) {
            logger('close error %s', error.stack || error);
        }
        this.parent.disconnected(this); //Tell parent what went on so it can track connections
        delete this.socket;
    };
    /**
     * Hang up the current socket
     *
     * @param {function} callback - called when socket has been closed
     * @public
     */
    Connection.prototype.hangup = function (callback) {
        logger('hangup');
        assert_1.ok(this.socket, 'Not connected');
        if (typeof callback === 'function') {
            var socket = this.socket;
            if (isBrowserSocket(this.parent, socket)) {
                socket.onerror = function () {
                    delete socket.onerror;
                    callback();
                };
                socket.onclose = function () {
                    delete socket.onclose;
                    callback();
                };
            }
            else {
                socket.once('error', callback);
                socket.once('close', callback);
            }
        }
        this.socket.close();
    };
    ;
    /**
     * Incoming message handler
     *
     * @param {String} data - message from the websocket
     * @returns {void}
     * @private
     */
    Connection.prototype.message = function (data) {
        //Validate as json first, easy reply if it's not
        //If it's an array iterate and handle
        //If it's an object handle
        //name of handle function ?!?!?
        logger('message %j', data);
        var payload;
        if (this.parent.browser && typeof (data) !== 'string') {
            payload = jsonParse(data.data);
        }
        else if (typeof (data) == 'string') {
            payload = jsonParse(data);
        }
        if (payload === null) {
            return errors_1.default('parseError');
        }
        //Object or array
        if (payload instanceof Array) {
            payload.forEach(this.processPayload, this);
        }
        else {
            this.processPayload(payload);
        }
    };
    ;
    return Connection;
}());
exports.Connection = Connection;
//# sourceMappingURL=connection.js.map