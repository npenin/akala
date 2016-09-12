"use strict";
var injector_1 = require('./injector');
function service(name) {
    var toInject = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        toInject[_i - 1] = arguments[_i];
    }
    return function (target) {
        if (toInject == null || toInject.length == 0)
            return injector_1.register(name, injector_1.inject(target));
        else
            return injector_1.register(name, injector_1.injectWithName(toInject, target));
    };
}
exports.service = service;
//# sourceMappingURL=service.js.map