import { each as eachAsync } from '../eachAsync.js';
import { AnyAsyncMiddleware, MiddlewareAsync, MiddlewarePromise, NotHandled, OptionsResponse, SpecialNextParam, convertToErrorMiddleware, convertToMiddleware, isErrorMiddleware, isStandardMiddleware } from './shared.js';

/**
 * A composite middleware class with priority for asynchronous operations.
 * @template T - The type of the arguments.
 * @template TSpecialNextParam - The type of the special next parameter.
 */
export class MiddlewareCompositeWithPriorityAsync<T extends unknown[], TSpecialNextParam extends string | undefined = SpecialNextParam> implements MiddlewareAsync<T, TSpecialNextParam>//, ExtendableCompositeMiddleware<T>
{
    public readonly name?: string;

    /**
     * Creates an instance of MiddlewareCompositeWithPriorityAsync.
     * @param {string} [name] - The name of the middleware composite.
     */
    constructor(name?: string)
    {
        this.name = name;
    }

    private readonly stack: (readonly [number, AnyAsyncMiddleware<T, TSpecialNextParam>])[] = [];

    /**
     * Adds middleware to the stack with a specified priority.
     * @param {number} priority - The priority of the middleware (the lowest first).
     * @param {...AnyAsyncMiddleware<T, TSpecialNextParam>[]} middlewares - The middlewares to add.
     * @returns {this} The instance of the middleware composite.
     */
    public useMiddleware(priority: number, ...middlewares: AnyAsyncMiddleware<T, TSpecialNextParam>[]): this
    {
        this.stack.push(...middlewares.map(m => [priority, m] as const));
        return this;
    }

    /**
     * Adds standard middleware to the stack with a specified priority.
     * @param {number} priority - The priority of the middleware (the lowest first).
     * @param {...((...args: T) => Promise<unknown>)[]} middlewares - The middlewares to add.
     * @returns {this} The instance of the middleware composite.
     */
    public use(priority: number, ...middlewares: ((...args: T) => Promise<unknown>)[]): this
    {
        return this.useMiddleware(priority, ...middlewares.map(m => convertToMiddleware<T, TSpecialNextParam>(m)));
    }

    /**
     * Adds error middleware to the stack with a specified priority.
     * @param {number} priority - The priority of the middleware (the lowest first).
     * @param {...((error: Error | OptionsResponse, ...args: T) => Promise<unknown>)[]} middlewares - The middlewares to add.
     * @returns {this} The instance of the middleware composite.
     */
    public useError(priority: number, ...middlewares: ((error: Error | OptionsResponse, ...args: T) => Promise<unknown>)[]): this
    {
        return this.useMiddleware(priority, ...middlewares.map(m => convertToErrorMiddleware<T, TSpecialNextParam>(m)));
    }

    /**
     * Processes the request and returns a promise.
     * @template X - The type of the return value.
     * @param {...T} req - The request arguments.
     * @returns {Promise<X>} A promise that resolves or rejects with the result.
     */
    public process<X = unknown>(...req: T): Promise<X>
    {
        return this.handle(...req).then(x => Promise.reject(x), x => Promise.resolve(x));
    }

    /**
     * Handles errors in the middleware stack.
     * @param {Error | OptionsResponse} error - The error to handle.
     * @param {...T} req - The request arguments.
     * @returns {MiddlewarePromise} A promise that resolves or rejects with the result.
     */
    public async handleError(error: Error | OptionsResponse, ...req: T): MiddlewarePromise
    {
        let failed: boolean = !!error;
        this.stack.sort((a, b) => a[0] - b[0]);
        try
        {
            await eachAsync(this.stack, async (middleware) =>
            {
                try
                {
                    if (failed && isErrorMiddleware(middleware[1]))
                    {
                        const err = await middleware[1].handleError(error as Error, ...req);

                        if (err === 'break')
                            throw err;
                        if (typeof err != 'string' && typeof err != 'undefined')
                            error = err;

                        failed = true;
                    }
                }
                catch (x)
                {
                    throw { success: x };
                }
            }, true);
            return error;
        } catch (err)
        {
            switch (typeof err)
            {
                case 'string':
                    return;
                case 'undefined':
                    return error;
                default:
                    throw err.success;
            }
        }
    }

    /**
     * Handles the middleware stack.
     * @param {...T} req - The request arguments.
     * @returns {MiddlewarePromise<TSpecialNextParam>} A promise that resolves or rejects with the result.
     */
    public async handle(...req: T): MiddlewarePromise<TSpecialNextParam>
    {
        let error: Error | OptionsResponse = undefined;
        let failed: boolean = undefined;
        this.stack.sort((a, b) => a[0] - b[0]);
        try
        {
            await eachAsync(this.stack, (middleware) =>
            {
                if (failed && isErrorMiddleware(middleware[1]))
                {
                    return middleware[1].handleError(error as Error, ...req).then(err =>
                    {
                        if (err === 'break')
                            throw err;
                        if (typeof err != 'string' && typeof err != 'undefined')
                            error = err;

                        failed = true;
                    }, e => Promise.reject({ success: e }));
                }
                else if (!failed && isStandardMiddleware(middleware[1]))
                {
                    return middleware[1].handle(...req).then(err =>
                    {
                        if (err === 'break')
                            throw err;
                        if (typeof err != 'string' && typeof err != 'undefined')
                        {
                            if (err['allow'])
                                error['allow'].push(...err['allow']);

                            else
                                error = err;
                        }
                        failed = err instanceof Error;
                    }, e => Promise.reject({ success: e }));
                }

                else
                    return NotHandled;
            }, true);
            return error;
        }
        catch (err)
        {
            switch (typeof err)
            {
                case 'string':
                    return;
                case 'undefined':
                    return error;
                default:
                    throw err.success;
            }
        }
    }
}
