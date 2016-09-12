"use strict";
var injector_1 = require('./injector');
function factory(name) {
    var toInject = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        toInject[_i - 1] = arguments[_i];
    }
    return function (target) {
        var instance = null;
        var factory = function () {
            if (!instance)
                instance = new (target.bind.apply(target, [null].concat(arguments)))();
            instance.build.bind(instance);
            return instance.build;
        };
        if (toInject == null || toInject.length == 0)
            injector_1.registerFactory(name, injector_1.inject(factory));
        else
            injector_1.registerFactory(name, injector_1.injectWithName(toInject, factory));
    };
}
exports.factory = factory;
//# sourceMappingURL=factory.js.map