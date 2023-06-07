import { convertToErrorMiddleware, isStandardMiddleware, isErrorMiddleware } from './composite.js';
import { AnyMiddleware, ErrorMiddleware, Middleware, MiddlewarePromise, OptionsResponse } from './shared.js';


// eslint-disable-next-line @typescript-eslint/no-empty-interface, @typescript-eslint/no-unused-vars
export interface ExtendableIndexedMiddleware<T extends unknown[]> { }

export class MiddlewareIndexed<T extends unknown[], TMiddleware extends AnyMiddleware<T>> implements Middleware<T>, ExtendableIndexedMiddleware<T>
{
    public readonly name?: string
    protected _delegate: Middleware<T>;

    constructor(private getIndexKey: (...args: T) => string, name?: string)
    {
        this.name = name;
    }

    protected getKeys(): string[]
    {
        return Object.keys(this.index).filter(v => v !== '');
    }

    protected readonly index: Record<string, TMiddleware> & { ''?: ErrorMiddleware<T> } = {};

    public useMiddleware(key: null, middleware: Middleware<T>): this
    public useMiddleware(key: '', middleware: ErrorMiddleware<T>): this
    public useMiddleware(key: string, middleware: TMiddleware): this
    public useMiddleware(key: string, middleware: AnyMiddleware<T>): this
    {
        if (key === null)
            this._delegate = middleware as Middleware<T>;
        else
            this.index[key] = middleware as TMiddleware;
        return this;
    }

    public useError(handler: ((error: Error | OptionsResponse, ...args: T) => Promise<unknown>)): this
    {
        return this.useMiddleware('', convertToErrorMiddleware(handler));
    }

    public process<X = unknown>(...req: T): Promise<X>
    {
        return this.handle(...req).then(x => typeof x !== 'undefined' ? Promise.reject(x) : Promise.resolve(x), x => Promise.resolve(x));
    }

    public async handleError(error: Error | OptionsResponse, ...req: T): MiddlewarePromise
    {
        if (isErrorMiddleware(this.index['']))
            return this.index[''].handleError(error, ...req);
        return error;
    }

    public handle(...req: T): MiddlewarePromise
    {
        var key = this.getIndexKey(...req);
        if (!key || !this.index[key])
            if (this._delegate)
                return this._delegate.handle(...req);
            else
                return Promise.resolve();

        const middleware = this.index[key];
        if (isStandardMiddleware(middleware))
            return middleware.handle(...req).then(e => (typeof e === 'undefined') && this._delegate ? this._delegate.handle(...req) : e);
        return Promise.resolve();
    }
}

