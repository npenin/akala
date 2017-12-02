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
var WebSocket = require("ws");
var shared_client_1 = require("./shared_client");
var Client = /** @class */ (function (_super) {
    __extends(Client, _super);
    function Client() {
        return _super.call(this, WebSocket, false) || this;
    }
    return Client;
}(shared_client_1.default));
exports.default = Client;
//# sourceMappingURL=client.js.map