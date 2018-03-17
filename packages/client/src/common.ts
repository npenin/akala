import * as core from '@akala/core';

export var $$injector: core.Module = window['akala'] = core.extend(core.module('akala', 'akala-services', 'controls'),
    {
        promisify: core.Promisify,
        isPromiseLike: core.isPromiseLike,
        Binding: core.Binding,
        ObservableArray: core.ObservableArray,
        map: core.map,
        each: core.each,
        eachAsync: core.eachAsync,
        extend: core.extend
    });

export
{
    Promisify as promisify,
    isPromiseLike,
    map,
    each,
    eachAsync,
    extend,
    Binding,
    ObservableArray,
    Translator,
    inject,
    injectNew,
    injectNewWithName,
    injectWithName,
    injectWithNameAsync
} from '@akala/core';

export var serviceModule: core.Module = core.module('akala-services')

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