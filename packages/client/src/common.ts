import { Promisify, Deferred, Binding, module, Module, ObservableArray } from 'akala-core';
import 'akala-core'

export var $$injector: Module = window['akala'] = module('akala', 'akala-services', 'controls');
$$injector['promisify'] = Promisify;
$$injector['defer'] = Deferred;
$$injector['Binding'] = Binding;
$$injector['ObservableArray'] = ObservableArray;

export var serviceModule: Module = module('akala-services')

export function service(name, ...toInject: string[])
{
    return function (target: new (...args: any[]) => any)
    {
        var instance = null;
        if (toInject == null || toInject.length == 0 && target.length > 0)
            throw new Error('missing inject names');
        else
            serviceModule.registerFactory(name, function ()
            {
                return instance || serviceModule.injectWithName(toInject, function () 
                {
                    var args = [null];
                    for (var i = 0; i < arguments.length; i++)
                        args[i + 1] = arguments[i];
                    return instance = new (Function.prototype.bind.apply(target, args));
                })();
            });
    };
}