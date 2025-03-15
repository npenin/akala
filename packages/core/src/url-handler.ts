import { Router } from "./router/router.js";
import { MiddlewareCompositeAsync } from "./middlewares/composite-async.js";
import { MiddlewareAsync, MiddlewarePromise } from "./middlewares/shared.js";
import { Routable } from "./router/route.js";

type MiddlewareError = 'break' | 'loop' | void;

/**
 * Handles URL routing and middleware processing for different protocol, host, and path components
 * @template T - Tuple type representing middleware context parameters [URL, ...unknown[], Partial<TResult>]
 * @template TResult - Result type for middleware processing (default: object)
 */
export class UrlHandler<T extends [URL, ...unknown[], Partial<TResult>], TResult = object> implements MiddlewareAsync<T>
{
    /** Composite middleware for protocol handling */
    protocol: MiddlewareCompositeAsync<T, MiddlewareError>;

    /** Composite middleware for host handling */
    host: MiddlewareCompositeAsync<T>;

    /** Router for path-based routing */
    router: Router<[Routable, ...T]>;

    /**
     * Creates a new UrlHandler instance
     */
    constructor()
    {
        this.protocol = new MiddlewareCompositeAsync('protocols');
        this.host = new MiddlewareCompositeAsync('domains');
        this.router = new Router('path');
    }

    /**
     * warning ! the second parameter needs to be not null as we will assign properties to it. 
     * @returns 
     */
    /**
     * Processes the URL through protocol, host, and path routing middleware
     * @param context - Middleware context parameters
     * @returns Promise resolving to the final TResult object
     */
    public process(...context: T): Promise<TResult>
    {
        return this.handle(...context).then(v => { throw v }, () => context[context.length - 1] as TResult);
    }

    /**
     * Registers a protocol handler middleware
     * @param protocol - The protocol to handle (e.g., 'http', 'https')
     * @param action - Async handler function for the protocol
     * @returns The created Protocol middleware instance
     */
    public useProtocol(protocol: string, action: (...args: T) => Promise<TResult>)
    {
        const handler = new UrlHandler.Protocol<T>(protocol);
        this.protocol.useMiddleware(handler);
        return handler.use((...context) => action(...context).then(result => { if (typeof result !== 'undefined') Object.assign(context[context.length - 1] || {}, result) }));
    }

    /**
     * Registers a host handler middleware
     * @param host - The host name to handle
     * @param action - Async handler function for the host
     * @returns The created Host middleware instance
     */
    public useHost(host: string, action: (...args: T) => Promise<TResult>)
    {
        const handler = new UrlHandler.Host<T>(host);
        this.host.useMiddleware(handler);
        return handler.use((...context) => action(...context).then(result => { if (typeof result !== 'undefined') Object.assign(context[context.length - 1] || {}, result) }));
    }

    /**
     * Handles the URL processing pipeline
     * @param context - Middleware context parameters
     * @returns Promise that resolves when handling completes or rejects with an error
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
                    return 'loop'
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
