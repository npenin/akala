"use strict";
var reflect_1 = require('./reflect');
var Injector = (function () {
    function Injector(parent) {
        this.parent = parent;
        this.injectables = {};
        if (this.parent == null)
            this.parent = defaultInjector;
    }
    Injector.prototype.inject = function (a) {
        return this.injectWithName(a['$inject'] || reflect_1.getParamNames(a), a);
    };
    Injector.prototype.resolve = function (param) {
        if (typeof (this.injectables[param]) != 'undefined')
            return this.injectables[param];
        if (this.parent)
            return this.parent.resolve(param);
        return null;
    };
    Injector.prototype.inspect = function () {
        console.log(this.injectables);
    };
    Injector.prototype.injectWithName = function (toInject, a) {
        var paramNames = reflect_1.getParamNames(a);
        var self = this;
        if (paramNames.length == toInject.length) {
            return function (instance) {
                var args = [];
                for (var _i = 0, toInject_1 = toInject; _i < toInject_1.length; _i++) {
                    var param = toInject_1[_i];
                    args[args.length] = self.resolve(param);
                }
                return a.apply(instance, args);
            };
        }
        else
            return function (instance) {
                var args = [];
                var unknownArgIndex = 0;
                for (var _i = 0, paramNames_1 = paramNames; _i < paramNames_1.length; _i++) {
                    var param = paramNames_1[_i];
                    if (param in toInject)
                        args[args.length] = self.resolve(param);
                    else if (typeof (arguments[unknownArgIndex]) != 'undefined')
                        args[args.length] = arguments[unknownArgIndex++];
                    else
                        args[args.length] = null;
                }
                return a.apply(instance, args);
            };
    };
    Injector.prototype.register = function (name, value, override) {
        this.registerDescriptor(name, { value: value, writable: false }, override);
        return value;
    };
    Injector.prototype.registerFactory = function (name, value, override) {
        this.registerDescriptor(name, {
            get: function () {
                return value();
            }
        }, override);
        return value;
    };
    Injector.prototype.registerDescriptor = function (name, value, override) {
        if (override || typeof (this.injectables[name]) == 'undefined')
            Object.defineProperty(this.injectables, name, value);
        else
            throw new Error('There is already a registered item for ' + name);
    };
    return Injector;
}());
exports.Injector = Injector;
if (!global['$$defaultInjector'])
    global['$$defaultInjector'] = new Injector();
var defaultInjector = global['$$defaultInjector'];
function resolve(name) {
    return defaultInjector.resolve(name);
}
exports.resolve = resolve;
function inspect() {
    return defaultInjector.inspect();
}
exports.inspect = inspect;
function inject(a) {
    return defaultInjector.inject(a);
}
exports.inject = inject;
function injectWithName(toInject, a) {
    return defaultInjector.injectWithName(toInject, a);
}
exports.injectWithName = injectWithName;
function register(name, value, override) {
    return defaultInjector.register(name, value, override);
}
exports.register = register;
function registerFactory(name, value, override) {
    return defaultInjector.registerFactory(name, value, override);
}
exports.registerFactory = registerFactory;
//# sourceMappingURL=injector.js.map