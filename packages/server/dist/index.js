"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
__export(require("./SharedComponent"));
var router_1 = require("./router");
exports.router = router_1.router;
exports.wrouter = router_1.wrouter;
exports.HttpRouter = router_1.HttpRouter;
var core_1 = require("@akala/core");
exports.Injector = core_1.Injector;
exports.injectWithName = core_1.injectWithName;
exports.injectNewWithName = core_1.injectNewWithName;
exports.inject = core_1.inject;
exports.register = core_1.register;
exports.factory = core_1.factory;
exports.Promisify = core_1.Promisify;
exports.module = core_1.module;
exports.isPromiseLike = core_1.isPromiseLike;
exports.service = core_1.service;
exports.resolve = core_1.resolve;
exports.Deferred = core_1.Deferred;
__export(require("./api"));
const worker = require("./worker-meta");
exports.worker = worker;
const st = require("serve-static");
exports.static = st;
//# sourceMappingURL=index.js.map