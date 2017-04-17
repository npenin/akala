"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const reflect_1 = require("./reflect");
function ctorToFunction() {
    var args = [null];
    for (var i = 0; i < arguments.length; i++)
        args[i + 1] = arguments[i];
    return new (Function.prototype.bind.apply(this, args));
}
class Injector {
    constructor(parent) {
        this.parent = parent;
        this.injectables = {};
        if (this.parent == null)
            this.parent = defaultInjector;
        this.register('$injector', this);
    }
    keys() {
        return Object.keys(this.injectables);
    }
    merge(i) {
        var self = this;
        Object.getOwnPropertyNames(i.injectables).forEach(function (property) {
            if (property != '$injector')
                self.registerDescriptor(property, Object.getOwnPropertyDescriptor(i.injectables, property));
        });
    }
    inject(a) {
        return this.injectWithName(a['$inject'] || reflect_1.getParamNames(a), a);
    }
    resolve(param) {
        if (typeof (this.injectables[param]) != 'undefined')
            return this.injectables[param];
        if (this.parent)
            return this.parent.resolve(param);
        return null;
    }
    inspect() {
        console.log(this.injectables);
    }
    injectNewWithName(toInject, ctor) {
        return injectWithName(toInject, ctorToFunction.bind(ctor));
    }
    injectWithName(toInject, a) {
        var paramNames = reflect_1.getParamNames(a);
        var self = this;
        if (paramNames.length == toInject.length || paramNames.length == 0) {
            if (toInject.length == paramNames.length && paramNames.length == 0)
                return a;
            return function (instance) {
                var args = [];
                for (var param of toInject) {
                    args[args.length] = self.resolve(param);
                }
                return a.apply(instance, args);
            };
        }
        else
            return function (instance) {
                var args = [];
                var unknownArgIndex = 0;
                for (var param of paramNames) {
                    if (param in toInject)
                        args[args.length] = self.resolve(param);
                    else if (typeof (arguments[unknownArgIndex]) != 'undefined')
                        args[args.length] = arguments[unknownArgIndex++];
                    else
                        args[args.length] = null;
                }
                return a.apply(instance, args);
            };
    }
    unregister(name) {
        var registration = Object.getOwnPropertyDescriptor(this.injectables, name);
        if (registration)
            delete this.injectables[name];
    }
    register(name, value, override) {
        if (typeof (value) != 'undefined' && value !== null)
            this.registerDescriptor(name, { value: value, enumerable: true, configurable: true }, override);
        return value;
    }
    registerFactory(name, value, override) {
        this.register(name + 'Factory', value, override);
        this.registerDescriptor(name, {
            get: function () {
                return value();
            }, enumerable: true, configurable: true
        }, override);
        return value;
    }
    registerDescriptor(name, value, override) {
        if (!override && typeof (this.injectables[name]) != 'undefined')
            throw new Error('There is already a registered item for ' + name);
        if (typeof (this.injectables[name]) !== 'undefined')
            this.unregister(name);
        Object.defineProperty(this.injectables, name, value);
    }
}
exports.Injector = Injector;
if (!global['$$defaultInjector'])
    global['$$defaultInjector'] = new Injector();
var defaultInjector = global['$$defaultInjector'];
function resolve(name) {
    return defaultInjector.resolve(name);
}
exports.resolve = resolve;
function unregister(name) {
    return defaultInjector.unregister(name);
}
exports.unregister = unregister;
function merge(i) {
    return defaultInjector.merge(i);
}
exports.merge = merge;
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
function injectNewWithName(toInject, a) {
    return defaultInjector.injectNewWithName(toInject, a);
}
exports.injectNewWithName = injectNewWithName;
function register(name, value, override) {
    return defaultInjector.register(name, value, override);
}
exports.register = register;
function registerFactory(name, value, override) {
    return defaultInjector.registerFactory(name, value, override);
}
exports.registerFactory = registerFactory;
//# sourceMappingURL=injector.js.map