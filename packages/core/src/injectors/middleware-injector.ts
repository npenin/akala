import { Middleware } from '../middlewares/shared.js';
import { Injector } from './shared.js';
import { process } from '../middlewares/shared.js';

/** 
 * An injector that processes dependency resolution through middleware pipelines.
 * This class extends Injector to allow middleware-based handling of dependency requests.
 */
export class MiddlewareInjector extends Injector
{
    public static inspect = Symbol('inspect');

    /**
     * Registers or retrieves a dependency resolution through middleware.
     * 
     * @template T - The type of the resolved dependency.
     * @param {string | symbol} name - The identifier of the dependency to resolve.
     * @param {((value: T) => void)} [handler] - Optional callback to handle the resolved value synchronously.
     * @returns {PromiseLike<T> | void} Returns a promise resolving the dependency value when no handler is provided, 
     * or executes the handler immediately when provided.
     */
    onResolve<T = unknown>(name: string | symbol): PromiseLike<T>;
    onResolve<T = unknown>(name: string | symbol, handler: (value: T) => void): void;
    onResolve<T>(name: string | symbol, handler?: (value: T) => void): void | PromiseLike<T>
    {
        if (handler)
        {
            this.onResolve(name).then(handler);
            return;
        }
        return process<PromiseLike<T>>(this.middleware, name, true);
    }

    /**
     * Initiates an inspection of the dependency resolution pipeline using registered middleware.
     * Triggers inspection middleware to analyze current state and dependencies.
     */
    inspect(): void
    {
        process(this.middleware, MiddlewareInjector.inspect);
    }

    /**
     * Creates an instance of MiddlewareInjector.
     */
    constructor()
    {
        super();
    }
    /**
     * Middleware pipeline handling dependency resolution operations.
     * This chain of middleware processes dependency requests, allowing for interception, modification, or delegation of resolution logic.
    * @type {Middleware<[param: string | symbol, sync?: boolean]>}
    */
    public middleware: Middleware<[param: string | symbol, sync?: boolean]>;

    /**
     * Resolves a dependency by executing the middleware chain.
     * 
     * @template T - The expected type of the resolved dependency.
     * @param {string | symbol} param - The identifier of the dependency to resolve.
     * @returns {T} The resolved dependency value after processing through all middleware.
     */
    public resolve<T = unknown>(param: string | symbol): T
    {
        return process<T>(this.middleware, param, true);
    }
}
