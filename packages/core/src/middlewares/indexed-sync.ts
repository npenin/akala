import { convertToErrorMiddleware, isStandardMiddleware, isErrorMiddleware } from './shared.js';
import { process, AnySyncMiddleware, ErrorMiddleware, Middleware, MiddlewareResult, OptionsResponse, SpecialNextParam } from './shared.js';

export class MiddlewareIndexed<T extends unknown[], TMiddleware extends AnySyncMiddleware<T, TSpecialNextParam>, TSpecialNextParam extends string | void = SpecialNextParam> implements Middleware<T, TSpecialNextParam>
{
    public readonly name?: string
    protected _delegate: Middleware<T, TSpecialNextParam>;

    constructor(private getIndexKey: (...args: T) => string, name?: string)
    {
        this.name = name;
    }

    protected getKeys(): string[]
    {
        return Object.keys(this.index).filter(v => v !== '');
    }

    protected readonly index: Record<string, TMiddleware> & { ''?: ErrorMiddleware<T, TSpecialNextParam> } = {};

    public useMiddleware(key: null, middleware: Middleware<T, TSpecialNextParam>): this
    public useMiddleware(key: '', middleware: ErrorMiddleware<T, TSpecialNextParam>): this
    public useMiddleware(key: string, middleware: TMiddleware): this
    public useMiddleware(key: string, middleware: AnySyncMiddleware<T, TSpecialNextParam>): this
    {
        if (key === null)
            this._delegate = middleware as Middleware<T, TSpecialNextParam>;
        else
            this.index[key] = middleware as TMiddleware;
        return this;
    }

    public useError(handler: ((error: Error | OptionsResponse, ...args: T) => unknown)): this
    {
        return this.useMiddleware('', convertToErrorMiddleware<T, TSpecialNextParam>(handler));
    }

    public process<X = unknown>(...req: T): X
    {
        return process<X, T, TSpecialNextParam>(this, ...req);
    }

    public handleError(error: Error | OptionsResponse, ...req: T): MiddlewareResult<TSpecialNextParam>
    {
        if (isErrorMiddleware(this.index['']))
            return this.index[''].handleError(error, ...req);
        return error;
    }

    public handle(...req: T): MiddlewareResult<TSpecialNextParam>
    {
        var key = this.getIndexKey(...req);
        if (!key || !this.index[key])
            if (this._delegate)
                return this._delegate.handle(...req);
            else
                return;

        const middleware = this.index[key];
        if (isStandardMiddleware(middleware))
        {
            const e = middleware.handle(...req)
            if (typeof e === 'undefined' && this._delegate)
                return this._delegate.handle(...req)
            return e;
        }
        return;
    }
}

