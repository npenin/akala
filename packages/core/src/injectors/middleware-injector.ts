import { Middleware } from '../middlewares/shared.js';
import { Injector } from './shared.js';
import { process } from '../middlewares/shared.js';

/**
 * MiddlewareInjector class that extends Injector.
 */
export class MiddlewareInjector extends Injector
{
    public static inspect = Symbol('inspect');

    /**
     * Handles the resolution of a dependency.
     * @param {string | symbol} name - The name of the dependency.
     * @param {function} [handler] - Optional handler function to process the resolved value.
     * @returns {PromiseLike<T> | void} - A promise that resolves to the dependency value or void if a handler is provided.
     */
    onResolve<T = unknown>(name: string | symbol): PromiseLike<T>;
    onResolve<T = unknown>(name: string | symbol, handler: (value: T) => void): void;
    onResolve<T>(name: string | symbol, handler?: (value: T) => void): void | PromiseLike<T>
    {
        if (handler)
        {
            this.onResolve(name).then(handler)
            return;
        }
        return process<PromiseLike<T>>(this.middleware, name, true)
    }

    /**
     * Inspects the middleware.
     */
    inspect(): void
    {
        process(this.middleware, MiddlewareInjector.inspect)
    }

    constructor()
    {
        super();
    }

    public middleware: Middleware<[param: string | symbol, sync?: boolean]>;

    /**
     * Resolves a dependency.
     * @param {string} param - The name of the dependency.
     * @returns {T} - The resolved dependency.
     */
    public resolve<T = unknown>(param: string): T
    {
        return process<T>(this.middleware, param, true)
    }
}
