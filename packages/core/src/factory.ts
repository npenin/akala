import { inject, injectWithName, registerFactory } from './global-injector'
import { ctorToFunction } from './injector';

export function factory(name: string, ...toInject: string[])
{
    return function (target: new (...args: unknown[]) => IFactory<any>)
    {
        let instance: IFactory<any> = null;
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

