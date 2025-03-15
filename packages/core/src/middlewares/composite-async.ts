import { each as eachAsync } from '../eachAsync.js';
import { AnyAsyncMiddleware, MiddlewareAsync, MiddlewarePromise, MiddlewareResult, OptionsResponse, SpecialNextParam, convertToErrorMiddleware, convertToMiddleware, isErrorMiddleware, isStandardMiddleware } from './shared.js';

// eslint-disable-next-line @typescript-eslint/no-empty-interface, @typescript-eslint/no-unused-vars
export interface ExtendableCompositeMiddlewareAsync<T extends unknown[], TSpecialNextParam extends string | void = SpecialNextParam> { }

/**
 * A class representing a composite middleware that handles asynchronous operations.
 */
export class MiddlewareCompositeAsync<T extends unknown[], TSpecialNextParam extends string | void = SpecialNextParam> implements MiddlewareAsync<T, TSpecialNextParam>, ExtendableCompositeMiddlewareAsync<T, TSpecialNextParam>
{
    public readonly name?: string

    /**
     * Creates an instance of MiddlewareCompositeAsync.
     * @param {string} [name] - The name of the middleware composite.
     */
    constructor(name?: string)
    {
        this.name = name;
    }

    /**
     * Creates a new MiddlewareCompositeAsync instance with the provided middlewares.
     * @param {...AnyAsyncMiddleware<T>[]} middlewares - The middlewares to be used.
     * @returns {MiddlewareCompositeAsync<T>} A new MiddlewareCompositeAsync instance.
     */
    public static new<T extends unknown[]>(...middlewares: AnyAsyncMiddleware<T>[])
    {
        return new MiddlewareCompositeAsync<T>().useMiddleware(...middlewares);
    }

    private readonly stack: AnyAsyncMiddleware<T, TSpecialNextParam>[] = [];

    /**
     * Adds middlewares to the stack.
     * @param {...AnyAsyncMiddleware<T, TSpecialNextParam>[]} middlewares - The middlewares to be added.
     * @returns {this} The current instance of MiddlewareCompositeAsync.
     */
    public useMiddleware(...middlewares: AnyAsyncMiddleware<T, TSpecialNextParam>[]): this
    {
        this.stack.push(...middlewares);
        return this;
    }

    /**
     * Adds standard middlewares to the stack.
     * @param {...((...args: T) => Promise<unknown>)[]} middlewares - The standard middlewares to be added.
     * @returns {this} The current instance of MiddlewareCompositeAsync.
     */
    public use(...middlewares: ((...args: T) => Promise<unknown>)[]): this
    {
        return this.useMiddleware(...middlewares.map(m => convertToMiddleware<T, TSpecialNextParam>(m)));
    }

    /**
     * Adds error middlewares to the stack.
     * @param {...((error: Error | OptionsResponse, ...args: T) => Promise<unknown>)[]} middlewares - The error middlewares to be added.
     * @returns {this} The current instance of MiddlewareCompositeAsync.
     */
    public useError(...middlewares: ((error: Error | OptionsResponse, ...args: T) => Promise<unknown>)[]): this
    {
        return this.useMiddleware(...middlewares.map(m => convertToErrorMiddleware<T, TSpecialNextParam>(m)));
    }

    /**
     * Processes the request and returns a promise.
     * @param {...T} req - The request parameters.
     * @returns {Promise<X>} A promise that resolves or rejects based on the middleware processing.
     */
    public process<X = unknown>(...req: T): Promise<X>
    {
        return this.handle(...req).then(x => Promise.reject(x), x => Promise.resolve(x));
    }

    /**
     * Handles errors in the middleware stack.
     * @param {MiddlewareResult} error - The error to be handled.
     * @param {...T} req - The request parameters.
     * @returns {MiddlewarePromise} A promise that resolves or rejects based on the error handling.
     */
    public async handleError(error: MiddlewareResult, ...req: T): MiddlewarePromise
    {
        let failed: boolean = !!error;
        try
        {
            await eachAsync(this.stack, async (middleware) =>
            {
                try
                {
                    if (failed && isErrorMiddleware(middleware))
                    {
                        const err = await middleware.handleError(error as Error, ...req);

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
     * @param {...T} req - The request parameters.
     * @returns {MiddlewarePromise<TSpecialNextParam>} A promise that resolves or rejects based on the middleware processing.
     */
    public async handle(...req: T): MiddlewarePromise<TSpecialNextParam>
    {
        let error: Error | OptionsResponse = undefined;
        let failed: boolean = undefined;
        try
        {
            await eachAsync(this.stack, (middleware) =>
            {
                if (failed && isErrorMiddleware(middleware))
                {
                    return middleware.handleError(error as Error, ...req).then(err =>
                    {
                        if (err === 'break')
                            throw err;
                        if (typeof err != 'string' && typeof err != 'undefined')
                            error = err;

                        failed = true;
                    })
                }
                else if (!failed && isStandardMiddleware(middleware))
                {
                    return middleware.handle(...req).then(err =>
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

                    }).catch(e => Promise.reject({ success: e }))
                }
                return Promise.resolve();
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



