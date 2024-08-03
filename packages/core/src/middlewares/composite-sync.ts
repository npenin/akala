import { each } from '../each.js';
import { process, AnySyncMiddleware, ErrorMiddleware, Middleware, MiddlewareResult, OptionsResponse, SpecialNextParam, convertToErrorMiddleware, convertToMiddleware, isErrorMiddleware, isStandardMiddleware } from './shared.js';

// eslint-disable-next-line @typescript-eslint/no-empty-interface, @typescript-eslint/no-unused-vars
export interface ExtendableCompositeMiddleware<T extends unknown[], TSpecialNextParam extends string | void = SpecialNextParam> { }

export class MiddlewareComposite<T extends unknown[], TSpecialNextParam extends string | void = SpecialNextParam> implements Middleware<T, TSpecialNextParam>, ExtendableCompositeMiddleware<T, TSpecialNextParam>
{
    public readonly name?: string

    constructor(name?: string)
    {
        this.name = name;
    }

    public static new<T extends unknown[]>(...middlewares: AnySyncMiddleware<T>[])
    {
        return new MiddlewareComposite<T>().useMiddleware(...middlewares);
    }

    private readonly stack: AnySyncMiddleware<T, TSpecialNextParam>[] = [];

    public useMiddleware(...middlewares: AnySyncMiddleware<T, TSpecialNextParam>[]): this
    {
        this.stack.push(...middlewares);
        return this;
    }

    public use(...middlewares: ((...args: T) => unknown)[]): this
    {
        return this.useMiddleware(...middlewares.map(m => convertToMiddleware<T, TSpecialNextParam>(m)) as Middleware<T, TSpecialNextParam>[]);
    }

    public useError(...middlewares: ((error: Error | OptionsResponse, ...args: T) => unknown)[]): this
    {
        return this.useMiddleware(...middlewares.map(convertToErrorMiddleware) as ErrorMiddleware<T, TSpecialNextParam>[]);
    }

    public process<X = unknown>(...req: T): X
    {
        return process<X, T, TSpecialNextParam>(this, ...req);
    }

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


