'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var connection_1 = require("./connection");
exports.Connection = connection_1.Connection;
var client_1 = require("./client");
exports.Client = client_1.default;
var server_1 = require("./server");
exports.Server = server_1.default;
var errors_1 = require("./errors");
exports.Errors = errors_1.default;
var debug = require("debug");
var logger = debug('json-rpc-ws');
/**
 * Create a new server.
 *
 * @returns {Object} JsonRpcWs Server instance
 * @public
 */
function createServer() {
    logger('createServer');
    return new server_1.default();
}
exports.createServer = createServer;
;
/**
 * Create a new json-rpc websocket connection
 *
 * @returns {Object}JsonRpcWs Client instance
 * @public
 */
function createClient() {
    logger('createClient');
    return new client_1.default();
}
exports.createClient = createClient;
;
//# sourceMappingURL=index.js.map