"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@akala/core");
exports.isPromiseLike = core_1.isPromiseLike;
exports.PromiseStatus = core_1.PromiseStatus;
require("@akala/core");
exports.$$injector = window['akala'] = core_1.module('akala', 'akala-services', 'controls');
exports.$$injector['promisify'] = core_1.Promisify;
exports.$$injector['isPromiseLike'] = core_1.isPromiseLike;
exports.$$injector['PromiseStatus'] = core_1.PromiseStatus;
exports.$$injector['defer'] = core_1.Deferred;
exports.$$injector['Binding'] = core_1.Binding;
exports.$$injector['ObservableArray'] = core_1.ObservableArray;
exports.serviceModule = core_1.module('akala-services');
function service(name, ...toInject) {
    return function (target) {
        var instance = null;
        if (toInject == null || toInject.length == 0 && target.length > 0)
            throw new Error('missing inject names');
        else
            exports.serviceModule.registerFactory(name, function () {
                return instance || exports.serviceModule.injectWithName(toInject, function () {
                    var args = [null];
                    for (var i = 0; i < arguments.length; i++)
                        args[i + 1] = arguments[i];
                    return instance = new (Function.prototype.bind.apply(target, args));
                })();
            });
    };
}
exports.service = service;
//# sourceMappingURL=common.js.map