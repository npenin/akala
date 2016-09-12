"use strict";
function command($inject, f) {
    return function (request, response, next) {
        var injector = request['injector'];
        injector.injectWithName($inject, f)(this);
    };
}
exports.command = command;
//# sourceMappingURL=web.js.map