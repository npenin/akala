import { eachAsync } from '../helpers';
import { AnyMiddleware, ErrorMiddleware, Middleware, MiddlewareError, MiddlewarePromise, MiddlewareResult, MiddlewareSuccess, OptionsResponse } from './shared';


export function convertToMiddleware<T extends unknown[]>(fn: (...args: T) => Promise<unknown>): Middleware<T>
{
    return {
        async handle(...args: T)
        {
            try
            {
                return fn(...args).then(x => Promise.reject(x), x => Promise.resolve(x));
            }
            catch (e)
            {
                return Promise.resolve(e);
            }
        }
    };
}
export function convertToErrorMiddleware<T extends unknown[]>(fn: (error: Error | OptionsResponse, ...args: T) => Promise<unknown>): ErrorMiddleware<T>
{
    return {
        async handleError(error, ...args: T)
        {
            try
            {
                return fn(error, ...args).then(x => Promise.reject(x), x => Promise.resolve(x));
            }
            catch (e)
            {
                return Promise.resolve(e);
            }
        }
    };
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface, @typescript-eslint/no-unused-vars
export interface ExtendableCompositeMiddleware<T extends unknown[]> { }

export function isMiddlewareError(x: MiddlewareError<unknown> | MiddlewareSuccess<unknown>): x is MiddlewareError<unknown>
{
    return typeof x['error'] != 'undefined';
}

export class MiddlewareComposite<T extends unknown[]> implements Middleware<T>, ExtendableCompositeMiddleware<T>
{
    public readonly name?: string

    constructor(name?: string)
    {
        this.name = name;
    }

    public static new<T extends unknown[]>(...middlewares: AnyMiddleware<T>[])
    {
        return new MiddlewareComposite<T>().useMiddleware(...middlewares);
    }

    private readonly stack: AnyMiddleware<T>[] = [];

    public useMiddleware(...middlewares: AnyMiddleware<T>[]): this
    {
        this.stack.push(...middlewares);
        return this;
    }

    public use(...middlewares: ((...args: T) => Promise<unknown>)[]): this
    {
        return this.useMiddleware(...middlewares.map(convertToMiddleware));
    }

    public useError(...middlewares: ((error: Error | OptionsResponse, ...args: T) => Promise<unknown>)[]): this
    {
        return this.useMiddleware(...middlewares.map(convertToErrorMiddleware));
    }

    public process<X = unknown>(...req: T): Promise<X>
    {
        return this.handle(...req).then(x => Promise.reject(x), x => Promise.resolve(x));
    }


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

    public async handle(...req: T): MiddlewarePromise
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


export class MiddlewareCompositeWithPriority<T extends unknown[]> implements Middleware<T>, ExtendableCompositeMiddleware<T>
{
    public readonly name?: string

    constructor(name?: string)
    {
        this.name = name;
    }

    private readonly stack: [number, AnyMiddleware<T>][] = [];

    public useMiddleware(priority: number, ...middlewares: AnyMiddleware<T>[]): this
    {
        this.stack.push(...middlewares.map(m => [priority, m] as [number, Middleware<T>]));
        return this;
    }

    public use(priority: number, ...middlewares: ((...args: T) => Promise<unknown>)[]): this
    {
        return this.useMiddleware(priority, ...middlewares.map(convertToMiddleware));
    }

    public useError(priority: number, ...middlewares: ((error: Error | OptionsResponse, ...args: T) => Promise<unknown>)[]): this
    {
        return this.useMiddleware(priority, ...middlewares.map(convertToErrorMiddleware));
    }

    public process<X = unknown>(...req: T): Promise<X>
    {
        return this.handle(...req).then(x => Promise.reject(x), x => Promise.resolve(x));
    }

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
            }, true)
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

    public async handle(...req: T): MiddlewarePromise
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


export function isErrorMiddleware<T extends unknown[]>(middleware: AnyMiddleware<T>): middleware is ErrorMiddleware<T>
{
    return middleware && middleware['handleError'];
}

export function isStandardMiddleware<T extends unknown[]>(middleware: AnyMiddleware<T>): middleware is Middleware<T>
{
    return middleware && middleware['handle'];
}

