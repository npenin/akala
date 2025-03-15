import { defaultInjector } from "./injectors/simple-injector.js";

/**
 * Decorator factory for registering a service with dependency injection
 * @param name - Unique service name for registration
 * @param toInject - Array of dependency names to inject into the service constructor
 * @returns Class decorator that registers the service with the default injector
 * @example
 * @service('myService', 'dep1', 'dep2')
 * class MyService {
 *   constructor(dep1, dep2) {...}
 * }
 */
export function service(name: string, ...toInject: string[])
{
    /** 
     * @param target - The class constructor to be registered as a service
     */
    return function (target: new (...args: unknown[]) => unknown)
    {
        let instance = null;
        if (toInject == null || toInject.length == 0 && target.length > 0)
            throw new Error('missing inject names');
        else
            defaultInjector.registerFactory(name, function ()
            {
                return instance || defaultInjector.injectWithName(toInject, function (...parameters: unknown[]) 
                {
                    const args = [null];
                    for (let i = 0; i < parameters.length; i++)
                        args[i + 1] = parameters[i];
                    return instance = new (Function.prototype.bind.apply(target, args));
                })();
            });
    }
}
