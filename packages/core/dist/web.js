"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function command($inject, f) {
    return function (request, response, next) {
        var injector = request['injector'];
        var injectable = injector.injectWithName($inject, f);
        injectable(this);
    };
}
exports.command = command;
//# sourceMappingURL=web.js.map