import { convertToErrorMiddleware, isStandardMiddleware, isErrorMiddleware, NotHandled } from './shared.js';
import { AnyAsyncMiddleware, ErrorMiddleware, ErrorMiddlewareAsync, MiddlewareAsync, MiddlewarePromise, OptionsResponse, SpecialNextParam } from './shared.js';


// eslint-disable-next-line @typescript-eslint/no-empty-interface, @typescript-eslint/no-unused-vars
export interface ExtendableIndexedMiddleware<T extends unknown[]> { }

/**
 * MiddlewareIndexedAsync class that implements MiddlewareAsync and ExtendableIndexedMiddleware.
 * @template T - The type of the arguments.
 * @template TMiddleware - The type of the middleware.
 */
export class MiddlewareIndexedAsync<T extends unknown[], TMiddleware extends AnyAsyncMiddleware<T>> implements MiddlewareAsync<T>, ExtendableIndexedMiddleware<T>
{
    public readonly name?: string
    protected _delegate: MiddlewareAsync<T>;

    /**
     * Constructor for MiddlewareIndexedAsync.
     * @param {function} getIndexKey - Function to get the index key.
     * @param {string} [name] - Optional name for the middleware.
     */
    constructor(private getIndexKey: (...args: T) => string, name?: string)
    {
        this.name = name;
    }

    /**
     * Get the keys of the index.
     * @returns {string[]} The keys of the index.
     */
    protected getKeys(): string[]
    {
        return Object.keys(this.index).filter(v => v !== '');
    }

    protected readonly index: Record<string, TMiddleware> & { ''?: ErrorMiddleware<T> } = {};

    /**
     * Use middleware for a specific key.
     * @param {null|string} key - The key for the middleware.
     * @param {AnyAsyncMiddleware} middleware - The middleware to use.
     * @returns {this} The instance of MiddlewareIndexedAsync.
     */
    public useMiddleware(key: null, middleware: MiddlewareAsync<T>): this
    public useMiddleware(key: '', middleware: ErrorMiddlewareAsync<T>): this
    public useMiddleware(key: string, middleware: TMiddleware): this
    public useMiddleware(key: string, middleware: AnyAsyncMiddleware<T>): this
    {
        if (key === null)
            this._delegate = middleware as MiddlewareAsync<T>;
        else
            this.index[key] = middleware as TMiddleware;
        return this;
    }

    /**
     * Use an error handler.
     * @param {function} handler - The error handler function.
     * @returns {this} The instance of MiddlewareIndexedAsync.
     */
    public useError(handler: ((error: Error | OptionsResponse, ...args: T) => Promise<unknown>)): this
    {
        return this.useMiddleware('', convertToErrorMiddleware<T, SpecialNextParam>(handler));
    }

    /**
     * Process the request.
     * @template X - The type of the return value.
     * @param {...T} req - The request arguments.
     * @returns {Promise<X>} The result of the processing.
     */
    public process<X = unknown>(...req: T): Promise<X>
    {
        return this.handle(...req).then(x => typeof x !== 'undefined' ? Promise.reject(x) : Promise.resolve(x), x => Promise.resolve(x));
    }

    /**
     * Handle an error.
     * @param {Error|OptionsResponse} error - The error to handle.
     * @param {...T} req - The request arguments.
     * @returns {MiddlewarePromise} The result of the error handling.
     */
    public async handleError(error: Error | OptionsResponse, ...req: T): MiddlewarePromise
    {
        if (isErrorMiddleware(this.index['']))
            return this.index[''].handleError(error, ...req);
        return error;
    }

    /**
     * Handle the request.
     * @param {...T} req - The request arguments.
     * @returns {MiddlewarePromise} The result of the handling.
     */
    public handle(...req: T): MiddlewarePromise
    {
        var key = this.getIndexKey(...req);
        if (!key || !this.index[key])
            if (this._delegate)
                return this._delegate.handle(...req);
            else
                return NotHandled;

        const middleware = this.index[key];
        if (isStandardMiddleware(middleware))
            return middleware.handle(...req).then(e => (typeof e === 'undefined') && this._delegate ? this._delegate.handle(...req) : e);
        return NotHandled;
    }
}

