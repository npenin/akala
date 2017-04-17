"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
function command($inject, f) {
    return function (request, next) {
        var injector = request['injector'];
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
                files.forEach(function (file) {
                    require(file);
                });
            });
        }
    });
}
exports.registerCommandsIn = registerCommandsIn;
//# sourceMappingURL=api.js.map