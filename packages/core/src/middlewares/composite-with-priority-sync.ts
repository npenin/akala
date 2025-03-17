import { each } from '../each.js';
import { process, AnySyncMiddleware, Middleware, MiddlewareResult, OptionsResponse, SpecialNextParam, convertToErrorMiddleware, convertToMiddleware, isErrorMiddleware, isStandardMiddleware } from './shared.js';
import { ExtendableCompositeMiddleware } from './composite-sync.js';

/** 
 * A composite middleware class with priority for synchronous operations.
 * @template T - The type of the arguments.
 * @template TSpecialNextParam - The type of the special next parameter.
 */
export class MiddlewareCompositeWithPriority<T extends unknown[], TSpecialNextParam extends string | void = SpecialNextParam> implements Middleware<T, TSpecialNextParam>, ExtendableCompositeMiddleware<T>
{
    public readonly name?: string;

    constructor(name?: string)
    {
        this.name = name;
    }

    private readonly stack: (readonly [number, AnySyncMiddleware<T, TSpecialNextParam>])[] = [];

    /**
     * Adds middleware with a specified priority.
     * @param {number} priority - The priority of the middleware.
     * @param {...AnySyncMiddleware<T, TSpecialNextParam>} middlewares - The middlewares to add.
     * @returns {this} The instance of the middleware composite.
     */
    public useMiddleware(priority: number, ...middlewares: AnySyncMiddleware<T, TSpecialNextParam>[]): this
    {
        this.stack.push(...middlewares.map(m => [priority, m] as const));
        return this;
    }

    /**
     * Adds standard middleware with a specified priority.
     * @param {number} priority - The priority of the middleware.
     * @param {...Function} middlewares - The middlewares to add.
     * @returns {this} The instance of the middleware composite.
     */
    public use(priority: number, ...middlewares: ((...args: T) => unknown)[]): this
    {
        return this.useMiddleware(priority, ...middlewares.map(m => convertToMiddleware<T, TSpecialNextParam>(m)));
    }

    /**
     * Adds error middleware with a specified priority.
     * @param {number} priority - The priority of the middleware.
     * @param {...Function} middlewares - The middlewares to add.
     * @returns {this} The instance of the middleware composite.
     */
    public useError(priority: number, ...middlewares: ((error: Error | OptionsResponse, ...args: T) => unknown)[]): this
    {
        return this.useMiddleware(priority, ...middlewares.map(m => convertToErrorMiddleware<T, TSpecialNextParam>(m)));
    }

    /**
     * Processes the middleware stack.
     * @param {...T} req - The request parameters.
     * @returns {X} The result of the middleware processing.
     */
    public process<X = unknown>(...req: T): X
    {
        return process<X, T, TSpecialNextParam>(this, ...req);
    }

    /**
     * Handles errors in the middleware stack.
     * @param {Error | OptionsResponse} error - The error to handle.
     * @param {...T} req - The request parameters.
     * @returns {MiddlewareResult<TSpecialNextParam>} The result of the error handling.
     */
    public handleError(error: Error | OptionsResponse, ...req: T): MiddlewareResult<TSpecialNextParam>
    {
        let failed: boolean = !!error;
        this.stack.sort((a, b) => a[0] - b[0]);
        try
        {
            each(this.stack, (middleware) =>
            {
                try
                {
                    if (failed && isErrorMiddleware(middleware[1]))
                    {
                        const err = middleware[1].handleError(error as Error, ...req);

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
            });
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
     * @param {...T} req - The request parameters.
     * @returns {MiddlewareResult<TSpecialNextParam>} The result of the middleware handling.
     */
    public handle(...req: T): MiddlewareResult<TSpecialNextParam>
    {
        let error: Error | OptionsResponse = undefined;
        let failed: boolean = undefined;
        this.stack.sort((a, b) => a[0] - b[0]);
        try
        {
            each(this.stack, (middleware) =>
            {
                if (failed && isErrorMiddleware(middleware[1]))
                {
                    let err: MiddlewareResult<TSpecialNextParam>;
                    try
                    {
                        err = middleware[1].handleError(error as Error, ...req);
                    }
                    catch (e) { throw { success: e }; }
                    if (err === 'break')
                        throw err;
                    if (typeof err != 'string' && typeof err != 'undefined')
                        error = err;

                    failed = true;
                }
                else if (!failed && isStandardMiddleware(middleware[1]))
                {
                    let err: MiddlewareResult<TSpecialNextParam>;
                    try
                    {
                        err = middleware[1].handle(...req);
                    }
                    catch (e) { throw { success: e }; }
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
                }

                else
                    return;
            });
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
