import * as core from '@akala/core';
import { ctorToFunction } from '@akala/core';

export var $$injector: core.Module = core.module('akala', 'akala-services', 'controls')

export var serviceModule: core.Module = core.module('akala-services')

export function resolveUrl(namespace: string)
{
    const root = document.head.querySelector('base').href;
    return new URL(namespace, root).toString();
}

core.defaultInjector.register('$resolveUrl', resolveUrl)

export function service(name, ...toInject: string[])
{
    return function (target: new (...args: unknown[]) => unknown)
    {
        let instance = null;
        if (toInject == null || toInject.length == 0 && target.length > 0)
            throw new Error('missing inject names');
        else
            serviceModule.registerFactory(name, function ()
            {
                return instance || serviceModule.injectWithName(toInject, (...args: unknown[]) =>
                {
                    instance = ctorToFunction(target)(...args);
                });
            })();
    };
}

import component from './component';
export { component };