import { MiddlewareCompositeAsync } from "./middlewares/composite-async.js";
import type { MiddlewareAsync, MiddlewarePromise } from "./middlewares/shared.js";
import type { Routable } from "./router/route.js";
import ErrorWithStatus, { HttpStatusCode } from "./errorWithStatus.js";
import { RouterAsync } from "./router/router-async.js";

type MiddlewareError = 'break' | 'loop' | undefined;

/**
 * Handles URL routing and middleware processing for different protocol, host, and path components
 * @template T - Tuple type representing middleware context parameters [URL, ...unknown[], Partial<TResult>]
 * @template TResult - Result type for middleware processing (default: object)
 */
export class UrlHandler<T extends [URL, ...unknown[], Partial<TResult> | void], TResult = object> implements MiddlewareAsync<T>
{
    /**
     * Composite middleware stack for protocol-specific processing
     */
    protocol: MiddlewareCompositeAsync<T, MiddlewareError>;

    /**
     * Composite middleware stack for host-specific processing
     */
    host: MiddlewareCompositeAsync<T>;

    /** 
     * Router for path-based routing 
     */
    router: RouterAsync<[Routable, ...T]>;

    /**
     * Creates a new URL handler instance
     */
    constructor(private readonly noAssign: boolean = false)
    {
        this.protocol = new MiddlewareCompositeAsync('protocols');
        this.host = new MiddlewareCompositeAsync('domains');
        this.router = new RouterAsync('path');
    }

    /**
     * warning ! the second parameter needs to be not null as we will assign properties to it. 
     * Processes the URL through protocol, host, and path routing middleware
     * @param context - Middleware context parameters
     * @returns Promise resolving to the final TResult object
     */
    /**
     * Processes the URL through protocol, host, and path routing middleware
     * @param context - Middleware context parameters
     * @returns Promise resolving to the final TResult object
     */
    public process(...context: T): Promise<TResult>
    {
        return this.handle(...context).then(v => { throw v }, (result) => this.noAssign ? result : context[context.length - 1] as TResult);
    }

    /**
     * Adds a protocol handler middleware
     * @param protocol Protocol to handle (colon will be automatically stripped if present)
     * @param action Async handler function for protocol processing
     * @returns Registered protocol middleware instance
     */
    public useProtocol(protocol: string, action: (...args: T) => Promise<TResult>)
    {
        const handler = new UrlHandler.Protocol<T>(protocol);
        this.protocol.useMiddleware(handler);
        return handler.use((...context) => action(...context).then(result =>
        {
            if (!this.noAssign && typeof result !== 'undefined')
                if (context[context.length - 1])
                    return Object.assign(context[context.length - 1], result);
                else
                    return context[context.length - 1] = result;
            else if (this.noAssign)
                return result;
        }));
    }

    /**
     * Adds a host handler middleware
     * @param host Hostname to match
     * @param action Async handler function for host processing
     * @returns Registered host middleware instance
     */
    public useHost(host: string, action: (...args: T) => Promise<TResult>)
    {
        const handler = new UrlHandler.Host<T>(host);
        this.host.useMiddleware(handler);
        return handler.use((...context) => action(...context).then(result =>
        {
            if (!this.noAssign && typeof result !== 'undefined')
                Object.assign(context[context.length - 1] || {}, result)
            else if (this.noAssign)
                return result;
        }));
    }

    /**
     * Handles the URL processing pipeline
     * @param context - Middleware context parameters
     * @returns Promise that resolves when handling fails or rejects with the final result
     */
    public async handle(...context: T): MiddlewarePromise
    {
        let error = await this.protocol.handle(...context);
        while (error === 'loop')
            error = await this.handle(...context);
        if (error)
            return error;
        error = await this.host.handle(...context);
        if (error)
            return error;
        let params: Routable['params'];
        error = await this.router.handle({
            path: context[0].pathname, get params()
            {
                if (params)
                    return params;
                if (context[0].search)
                    return params;
                return params = Object.fromEntries(Array.from(context[0].searchParams.keys()).map(k =>
                {
                    const values = context[0].searchParams.getAll(k);
                    if (values.length == 1)
                        return [k, values[0]];
                    return [k, values];
                }));
            }
        }, ...context);
        if (error)
            return error;
        return new ErrorWithStatus(HttpStatusCode.NotFound, `${context[0]} is not supported`)
    }
}

/**
 * Namespace containing Protocol and Host middleware classes
 */
export namespace UrlHandler
{
    /**
     * Middleware for handling specific protocols
     * @template T - Middleware context type extending [URL, ...unknown[]]
     */
    export class Protocol<T extends [URL, ...unknown[]]> extends MiddlewareCompositeAsync<T, MiddlewareError>
    {
        /**
         * @param protocol - The protocol to handle (automatically strips trailing colon if present)
         */
        constructor(public readonly protocol: string)
        {
            super();
            if (protocol.endsWith(':'))
                this.protocol = protocol.substring(0, protocol.length - 1);
        }

        /**
         * Handles protocol matching and processing
         * @param context - Middleware context parameters
         * @returns Promise resolving to middleware error status or undefined
         */
        async handle(...context: T): MiddlewarePromise<MiddlewareError>
        {
            if (context[0].protocol == this.protocol + ':')
            {
                return super.handle(...context);
            }
            else if (context[0].protocol.startsWith(this.protocol + '+'))
            {
                return super.handle(...context).then(error => error, () => 
                {
                    context[0].protocol = context[0].protocol.substring(this.protocol.length + 2);
                    return 'loop';
                });
            }
            return;
        }
    }

    /**
     * Middleware for handling specific hosts
     * @template T - Middleware context type extending [URL, ...unknown[]]
     */
    export class Host<T extends [URL, ...unknown[]]> extends MiddlewareCompositeAsync<T, MiddlewareError>
    {
        /**
         * @param host - The host name to match
         */
        constructor(private host: string)
        {
            super();
        }

        /**
         * Handles host matching
         * @param context - Middleware context parameters
         * @returns Promise resolving to middleware error status or undefined
         */
        handle(...context: T): MiddlewarePromise<MiddlewareError>
        {
            if (context[0].host === this.host)
            {
                return super.handle(...context);
            }
            return;
        }
    }
}
