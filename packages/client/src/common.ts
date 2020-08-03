import * as core from '@akala/core';

export var $$injector: core.Module = core.module('akala', 'akala-services', 'controls')

export var serviceModule: core.Module = core.module('akala-services')

export function resolveUrl(namespace: string)
{
    var root = document.head.querySelector('base').href;
    return new URL(namespace, root).toString();
}

core.defaultInjector.register('$resolveUrl', resolveUrl)

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