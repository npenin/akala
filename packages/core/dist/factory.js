"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const injector_1 = require("./injector");
function factory(name, ...toInject) {
    return function (target) {
        var instance = null;
        var factory = function () {
            if (!instance) {
                var args = [null];
                for (var arg in arguments)
                    args.push(arguments[arg]);
                instance = new (target.bind.apply(target, args))();
            }
            return instance.build();
        };
        if (toInject == null || toInject.length == 0)
            injector_1.registerFactory(name, injector_1.inject(factory));
        else
            injector_1.registerFactory(name, injector_1.injectWithName(toInject, factory));
    };
}
exports.factory = factory;
//# sourceMappingURL=factory.js.map