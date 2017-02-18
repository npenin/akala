"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
__export(require("./injector"));
__export(require("./factory"));
__export(require("./web"));
__export(require("./service"));
__export(require("./binder"));
__export(require("./parser"));
const module_1 = require("./module");
__export(require("./promiseHelpers"));
function module(name, ...dependencies) {
    return new module_1.Module(name, dependencies);
}
exports.module = module;
//# sourceMappingURL=akala-core.js.map