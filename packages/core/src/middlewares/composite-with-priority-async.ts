import { each as eachAsync } from '../eachAsync.js';
import { AnyAsyncMiddleware, MiddlewareAsync, MiddlewarePromise, OptionsResponse, SpecialNextParam, convertToErrorMiddleware, convertToMiddleware, isErrorMiddleware, isStandardMiddleware } from './shared.js';



export class MiddlewareCompositeWithPriorityAsync<T extends unknown[], TSpecialNextParam extends string | void = SpecialNextParam> implements MiddlewareAsync<T, TSpecialNextParam>//, ExtendableCompositeMiddleware<T>
{
    public readonly name?: string;

    constructor(name?: string)
    {
        this.name = name;
    }

    private readonly stack: (readonly [number, AnyAsyncMiddleware<T, TSpecialNextParam>])[] = [];

    public useMiddleware(priority: number, ...middlewares: AnyAsyncMiddleware<T, TSpecialNextParam>[]): this
    {
        this.stack.push(...middlewares.map(m => [priority, m] as const));
        return this;
    }

    public use(priority: number, ...middlewares: ((...args: T) => Promise<unknown>)[]): this
    {
        return this.useMiddleware(priority, ...middlewares.map(m => convertToMiddleware<T, TSpecialNextParam>(m)));
    }

    public useError(priority: number, ...middlewares: ((error: Error | OptionsResponse, ...args: T) => Promise<unknown>)[]): this
    {
        return this.useMiddleware(priority, ...middlewares.map(m => convertToErrorMiddleware<T, TSpecialNextParam>(m)));
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
