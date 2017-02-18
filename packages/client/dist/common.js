"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const akala_core_1 = require("akala-core");
require("akala-core");
exports.$$injector = window['akala'] = akala_core_1.module('akala', 'akala-services', 'controls');
exports.$$injector['promisify'] = akala_core_1.Promisify;
exports.$$injector['defer'] = akala_core_1.Deferred;
exports.$$injector['Binding'] = akala_core_1.Binding;
exports.$$injector['ObservableArray'] = akala_core_1.ObservableArray;
exports.serviceModule = akala_core_1.module('akala-services');
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