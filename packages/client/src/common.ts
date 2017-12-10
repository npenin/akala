import { Promisify, Binding, module, Module, ObservableArray, Translator, isPromiseLike, PromiseStatus, map, extend, each, eachAsync } from '@akala/core';
import '@akala/core'

export var $$injector: Module = window['akala'] = module('akala', 'akala-services', 'controls');
$$injector['promisify'] = Promisify;
$$injector['isPromiseLike'] = isPromiseLike;
$$injector['PromiseStatus'] = PromiseStatus;
$$injector['Binding'] = Binding;
$$injector['ObservableArray'] = ObservableArray;
$$injector['map']=map;
$$injector['each']=each;
$$injector['eachAsync']=eachAsync;
$$injector['extend']=extend;

export var serviceModule: Module = module('akala-services')

export { Translator, isPromiseLike, PromiseStatus }

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