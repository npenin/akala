"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@akala/core");
const fs = require("fs");
const http = require("http");
exports.api = {};
['all'].concat(http.METHODS).forEach(function (method) {
    method = method.toLowerCase();
    exports.api[method] = function (path, $inject, ...handlers) {
        return core_1.injectWithName(['$router'], function (router) {
            var args = [path];
            args.concat(handlers);
            handlers.forEach(function (handler) {
                router[method](path, function (request) {
                    var requestInjector = request.injector;
                    if (request.params)
                        for (var i in request.params)
                            requestInjector.register('param.' + i, request.params[i], true);
                    if (request.query)
                        for (var i in request.query)
                            requestInjector.register('query.' + i, request.query[i], true);
                    requestInjector.injectWithName($inject, handler)();
                });
            });
            return exports.api;
        })(exports.api);
    };
});
function command($inject, f) {
    return function (request, next) {
        var injector = request.injector;
        var injectable = injector.injectWithName($inject, f);
        injectable(this);
    };
}
exports.command = command;
function registerCommandsIn(folder) {
    fs.stat(folder, function (error, stats) {
        if (error) {
            console.error(error);
            return;
        }
        if (stats.isDirectory()) {
            fs.readdir(folder, function (error, files) {
                if (error) {
                    console.error(error);
                    return;
                }
                var extensions = Object.keys(require.extensions);
                files.forEach(function (file) {
                    if (extensions.indexOf(file.substring(file.length - 3)) > -1)
                        require(folder + '/' + file);
                });
            });
        }
    });
}
exports.registerCommandsIn = registerCommandsIn;
//# sourceMappingURL=api.js.map