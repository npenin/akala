import { defaultInjector } from './injectors/simple-injector.js';
import { ctorToFunction } from './injectors/shared.js';

/** 
 * Decorator factory for creating injectable factories.
 * @param name - Unique identifier for the factory in the dependency injection container.
 * @param toInject - Names of dependencies to inject into the factory constructor.
 */
export function factory(name: string, ...toInject: string[])
{
    return function (target: new (...args: unknown[]) => IFactory<unknown>)
    {
        let instance: IFactory<unknown> | null = null;
        const ctor = ctorToFunction(target);
        const factory = (...parameters: unknown[]) =>
        {
            if (!instance) instance = ctor(...parameters);
            return instance.build();
        };

        if (toInject.length === 0)
        {
            defaultInjector.registerFactory(name, defaultInjector.inject(factory));
        } else
        {
            defaultInjector.registerFactory(name, defaultInjector.injectWithName(toInject, factory));
        }
    };
}

/** 
 * Base interface for factory classes.
 * @template T - Type of the object produced by the factory.
 */
export interface IFactory<T>
{
    /** 
     * Builds and returns an instance of the target type.
     * @returns - The created instance.
     */
    build(): T;
}
