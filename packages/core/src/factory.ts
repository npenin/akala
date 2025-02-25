import { defaultInjector } from './injectors/simple-injector.js';
import { ctorToFunction } from './injectors/shared.js';

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
            defaultInjector.registerFactory(name, defaultInjector.inject(factory));
        else
            defaultInjector.registerFactory(name, defaultInjector.injectWithName(toInject, factory));
    }
}

export interface IFactory<T>
{
    build(): T;
}

