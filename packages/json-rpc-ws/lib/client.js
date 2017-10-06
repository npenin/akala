'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var WebSocket = require("ws");
var jsonrpcws = require("./shared_client");
exports.default = jsonrpcws.JsonRpcWs(WebSocket, false);
//# sourceMappingURL=client.js.map