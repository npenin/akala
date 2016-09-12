import {inject, injectWithName, register} from './injector'

export function service(name: string, ...toInject: string[])
{
    return function (target: Function)
    {
        if (toInject == null || toInject.length == 0)
            return register(name, inject(target));
        else
            return register(name, injectWithName(toInject, target));
    }
}