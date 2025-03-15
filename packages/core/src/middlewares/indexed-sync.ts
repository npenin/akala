import { convertToErrorMiddleware, isStandardMiddleware, isErrorMiddleware } from './shared.js';
import { process, AnySyncMiddleware, ErrorMiddleware, Middleware, MiddlewareResult, OptionsResponse, SpecialNextParam } from './shared.js';

/**
 * MiddlewareIndexed class that implements Middleware.
 * @template T
 * @template TMiddleware
 * @template TSpecialNextParam
 */
export class MiddlewareIndexed<T extends unknown[], TMiddleware extends AnySyncMiddleware<T, TSpecialNextParam>, TSpecialNextParam extends string | void = SpecialNextParam> implements Middleware<T, TSpecialNextParam>
{
    public readonly name?: string
    protected _delegate: Middleware<T, TSpecialNextParam>;

    /**
     * Constructor for MiddlewareIndexed.
     * @param {function} getIndexKey - Function to get the index key.
     * @param {string} [name] - Optional name for the middleware.
     */
    constructor(private getIndexKey: (...args: T) => string, name?: string)
    {
        this.name = name;
    }

    /**
     * Get the keys from the index.
     * @returns {string[]} Array of keys.
     */
    protected getKeys(): string[]
    {
        return Object.keys(this.index).filter(v => v !== '');
    }

    protected readonly index: Record<string, TMiddleware> & { ''?: ErrorMiddleware<T, TSpecialNextParam> } = {};

    /**
     * Use middleware for a specific key.
     * @param {string|null} key - The key for the middleware.
     * @param {AnySyncMiddleware} middleware - The middleware to use.
     * @returns {this} The current instance.
     */
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

    /**
     * Use an error handler.
     * @param {function} handler - The error handler function.
     * @returns {this} The current instance.
     */
    public useError(handler: ((error: Error | OptionsResponse, ...args: T) => unknown)): this
    {
        return this.useMiddleware('', convertToErrorMiddleware<T, TSpecialNextParam>(handler));
    }

    /**
     * Process the request.
     * @template X
     * @param {...T} req - The request parameters.
     * @returns {X} The result of the process.
     */
    public process<X = unknown>(...req: T): X
    {
        return process<X, T, TSpecialNextParam>(this, ...req);
    }

    /**
     * Handle an error.
     * @param {Error|OptionsResponse} error - The error to handle.
     * @param {...T} req - The request parameters.
     * @returns {MiddlewareResult<TSpecialNextParam>} The result of the error handling.
     */
    public handleError(error: Error | OptionsResponse, ...req: T): MiddlewareResult<TSpecialNextParam>
    {
        if (isErrorMiddleware(this.index['']))
            return this.index[''].handleError(error, ...req);
        return error;
    }

    /**
     * Handle the request.
     * @param {...T} req - The request parameters.
     * @returns {MiddlewareResult<TSpecialNextParam>} The result of the handling.
     */
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

