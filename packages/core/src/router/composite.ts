import { eachAsync } from '../helpers.js';
import { AnyMiddleware, ErrorMiddleware, Middleware, MiddlewareError, MiddlewarePromise, MiddlewareSuccess, OptionsResponse, SpecialNextParam } from './shared.js';


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

    private readonly stack: AnyMiddleware<T>[] = [];

    public useMiddleware(...middlewares: Middleware<T>[]): this
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

    public handleError(error: Error | OptionsResponse, ...req: T): MiddlewarePromise
    {
        return new Promise<Error | SpecialNextParam | OptionsResponse>((resolve, reject) =>
        {
            let failed: boolean = undefined;
            eachAsync(this.stack, (middleware, _i, next) =>
            {
                if (failed && isErrorMiddleware(middleware))
                    middleware.handleError(error as Error, ...req).then(err =>
                    {
                        if (err === 'break')
                            return next(err);
                        if (typeof err != 'string' && typeof err != 'undefined')
                            error = err;

                        failed = true;
                        next();
                    }, x => next({ success: x }));
                else
                    next();
            }, function (err?: MiddlewareSuccess | SpecialNextParam)
            {
                switch (typeof err)
                {
                    case 'string':
                        resolve();
                        return;
                    case 'undefined':
                        resolve(error);
                        return;
                    default:
                        reject(err.success);
                        return;
                }
            }, true);
        });

    }

    public handle(...req: T): MiddlewarePromise
    {
        return new Promise<Error | SpecialNextParam | OptionsResponse>((resolve, reject) =>
        {
            let error: Error | OptionsResponse = undefined;
            let failed: boolean = undefined;
            eachAsync(this.stack, (middleware, _i, next) =>
            {
                if (failed && isErrorMiddleware(middleware))
                    middleware.handleError(error as Error, ...req).then(err =>
                    {
                        if (err === 'break')
                            return next(err);
                        if (typeof err != 'string' && typeof err != 'undefined')
                            error = err;

                        failed = true;
                        next();
                    }, x => next({ success: x }));
                else
                    try
                    {
                        if (!isStandardMiddleware(middleware))
                            next();
                        else
                            middleware.handle(...req).then(err =>
                            {
                                if (err === 'break')
                                    return next(err);
                                if (typeof err != 'string' && typeof err != 'undefined')
                                {
                                    if (err['allow'])
                                        error['allow'].push(...err['allow']);
                                    else
                                        error = err;
                                }
                                failed = err instanceof Error;
                                next();
                            }, x => next({ success: x })
                            );
                    }
                    catch (e)
                    {
                        error = e;
                        failed = true;
                        next();
                    }

            }, function (err?: MiddlewareSuccess | SpecialNextParam)
            {
                switch (typeof err)
                {
                    case 'string':
                        resolve();
                        return;
                    case 'undefined':
                        resolve(error);
                        return;
                    default:
                        reject(err.success);
                        return;
                }
            }, true);
        });
    }
}


export interface MiddlewareComposite<T extends unknown[]> extends Middleware<T>, ErrorMiddleware<T>, ExtendableCompositeMiddleware<T>
{
    readonly name?: string;
    useMiddleware(...middlewares: AnyMiddleware<T>[]): this;
    use(...middlewares: ((...args: T) => Promise<unknown>)[]): this;
    useError(...middlewares: ((error: Error | OptionsResponse, ...args: T) => Promise<unknown>)[]): this;
    process<X = unknown>(...req: T): Promise<X>;
    handleError(error: Error | OptionsResponse, ...req: T): MiddlewarePromise;
    handle(...req: T): MiddlewarePromise;
}
function isErrorMiddleware<T extends unknown[]>(middleware: AnyMiddleware<T>): middleware is ErrorMiddleware<T>
{
    return middleware && middleware['handleError'];
}

function isStandardMiddleware<T extends unknown[]>(middleware: AnyMiddleware<T>): middleware is Middleware<T>
{
    return middleware && middleware['handle'];
}

