import { each as eachAsync } from '../eachAsync.js';
import { AnyAsyncMiddleware, MiddlewareAsync, MiddlewarePromise, MiddlewareResult, OptionsResponse, SpecialNextParam, convertToErrorMiddleware, convertToMiddleware, isErrorMiddleware, isStandardMiddleware } from './shared.js';

// eslint-disable-next-line @typescript-eslint/no-empty-interface, @typescript-eslint/no-unused-vars
export interface ExtendableCompositeMiddlewareAsync<T extends unknown[], TSpecialNextParam extends string | void = SpecialNextParam> { }

export class MiddlewareCompositeAsync<T extends unknown[], TSpecialNextParam extends string | void = SpecialNextParam> implements MiddlewareAsync<T, TSpecialNextParam>, ExtendableCompositeMiddlewareAsync<T, TSpecialNextParam>
{
    public readonly name?: string

    constructor(name?: string)
    {
        this.name = name;
    }

    public static new<T extends unknown[]>(...middlewares: AnyAsyncMiddleware<T>[])
    {
        return new MiddlewareCompositeAsync<T>().useMiddleware(...middlewares);
    }

    private readonly stack: AnyAsyncMiddleware<T, TSpecialNextParam>[] = [];

    public useMiddleware(...middlewares: AnyAsyncMiddleware<T, TSpecialNextParam>[]): this
    {
        this.stack.push(...middlewares);
        return this;
    }

    public use(...middlewares: ((...args: T) => Promise<unknown>)[]): this
    {
        return this.useMiddleware(...middlewares.map(m => convertToMiddleware<T, TSpecialNextParam>(m)));
    }

    public useError(...middlewares: ((error: Error | OptionsResponse, ...args: T) => Promise<unknown>)[]): this
    {
        return this.useMiddleware(...middlewares.map(m => convertToErrorMiddleware<T, TSpecialNextParam>(m)));
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



