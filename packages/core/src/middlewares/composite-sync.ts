import { each } from '../each.js';
import { process, AnySyncMiddleware, ErrorMiddleware, Middleware, MiddlewareResult, OptionsResponse, SpecialNextParam, convertToErrorMiddleware, convertToMiddleware, isErrorMiddleware, isStandardMiddleware } from './shared.js';

// eslint-disable-next-line @typescript-eslint/no-empty-interface, @typescript-eslint/no-unused-vars
export interface ExtendableCompositeMiddleware<T extends unknown[], TSpecialNextParam extends string | void = SpecialNextParam> { }

/**
 * A composite middleware class that allows for the composition of multiple middlewares.
 */
export class MiddlewareComposite<T extends unknown[], TSpecialNextParam extends string | void = SpecialNextParam> implements Middleware<T, TSpecialNextParam>, ExtendableCompositeMiddleware<T, TSpecialNextParam>
{
    public readonly name?: string

    /**
     * Creates an instance of MiddlewareComposite.
     * @param {string} [name] - The name of the middleware composite.
     */
    constructor(name?: string)
    {
        this.name = name;
    }

    /**
     * Creates a new MiddlewareComposite instance with the provided middlewares.
     * @param {...AnySyncMiddleware<T>[]} middlewares - The middlewares to be used.
     * @returns {MiddlewareComposite<T>} A new MiddlewareComposite instance.
     */
    public static new<T extends unknown[]>(...middlewares: AnySyncMiddleware<T>[])
    {
        return new MiddlewareComposite<T>().useMiddleware(...middlewares);
    }

    private readonly stack: AnySyncMiddleware<T, TSpecialNextParam>[] = [];

    /**
     * Adds middlewares to the stack.
     * @param {...AnySyncMiddleware<T, TSpecialNextParam>[]} middlewares - The middlewares to be added.
     * @returns {this} The current instance of MiddlewareComposite.
     */
    public useMiddleware(...middlewares: AnySyncMiddleware<T, TSpecialNextParam>[]): this
    {
        this.stack.push(...middlewares);
        return this;
    }

    /**
     * Adds middlewares to the stack.
     * @param {...((...args: T) => unknown)[]} middlewares - The middlewares to be added.
     * @returns {this} The current instance of MiddlewareComposite.
     */
    public use(...middlewares: ((...args: T) => unknown)[]): this
    {
        return this.useMiddleware(...middlewares.map(m => convertToMiddleware<T, TSpecialNextParam>(m)) as Middleware<T, TSpecialNextParam>[]);
    }

    /**
     * Adds error middlewares to the stack.
     * @param {...((error: Error | OptionsResponse, ...args: T) => unknown)[]} middlewares - The error middlewares to be added.
     * @returns {this} The current instance of MiddlewareComposite.
     */
    public useError(...middlewares: ((error: Error | OptionsResponse, ...args: T) => unknown)[]): this
    {
        return this.useMiddleware(...middlewares.map(convertToErrorMiddleware) as ErrorMiddleware<T, TSpecialNextParam>[]);
    }

    /**
     * Processes the request using the middlewares in the stack.
     * @param {...T} req - The request parameters.
     * @returns {X} The result of the processing.
     */
    public process<X = unknown>(...req: T): X
    {
        return process<X, T, TSpecialNextParam>(this, ...req);
    }

    /**
     * Handles errors using the error middlewares in the stack.
     * @param {MiddlewareResult<TSpecialNextParam>} error - The error to be handled.
     * @param {...T} req - The request parameters.
     * @returns {MiddlewareResult<TSpecialNextParam>} The result of the error handling.
     */
    public handleError(error: MiddlewareResult<TSpecialNextParam>, ...req: T): MiddlewareResult<TSpecialNextParam>
    {
        let failed: boolean = !!error;
        try
        {
            each(this.stack, async (middleware) =>
            {
                try
                {
                    if (failed && isErrorMiddleware(middleware))
                    {
                        const err = middleware.handleError(error as Error, ...req);

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
     * Handles the request using the middlewares in the stack.
     * @param {...T} req - The request parameters.
     * @returns {MiddlewareResult<TSpecialNextParam>} The result of the handling.
     */
    public handle(...req: T): MiddlewareResult<TSpecialNextParam>
    {
        let error: Error | OptionsResponse = undefined;
        let failed: boolean = undefined;
        try
        {
            each(this.stack, (middleware) =>
            {
                if (failed && isErrorMiddleware(middleware))
                {
                    const err = middleware.handleError(error as Error, ...req)

                    if (err === 'break')
                        throw err;
                    if (typeof err != 'string' && typeof err != 'undefined')
                        error = err;

                    failed = true;

                }
                else if (!failed && isStandardMiddleware(middleware))
                {
                    let err: MiddlewareResult<TSpecialNextParam>;
                    try
                    {
                        err = middleware.handle(...req)
                    }
                    catch (e)
                    {
                        throw { success: e };
                    }
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


