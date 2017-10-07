'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var WebSocket = require("ws");
var shared_client_1 = require("./shared_client");
var Client = shared_client_1.JsonRpcWs(WebSocket, false);
exports.Client = Client;
exports.default = Client;
//# sourceMappingURL=client.js.map