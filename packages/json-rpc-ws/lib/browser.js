'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var shared_client_1 = require("./shared_client");
var Client = shared_client_1.JsonRpcWs(WebSocket, true);
exports.Client = Client;
exports.default = Client;
//# sourceMappingURL=browser.js.map