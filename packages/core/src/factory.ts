import { inject, injectWithName, registerFactory } from './global-injector.js'
import { ctorToFunction } from './injector.js';

export function factory(name: string, ...toInject: string[])
{
    return function (target: new (...args: unknown[]) => IFactory<unknown>)
    {
        let instance: IFactory<unknown> = null;
        const ctor = ctorToFunction(target)
        const factory = function (...parameters)
        {
            if (!instance)
                instance = ctor(...parameters)
            return instance.build();
        };

        if (toInject == null || toInject.length == 0)
            registerFactory(name, inject(factory));
        else
            registerFactory(name, injectWithName(toInject, factory));
    }
}

export interface IFactory<T>
{
    build(): T;
}

