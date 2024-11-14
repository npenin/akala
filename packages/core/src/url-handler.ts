import { Router } from "./router/router.js";
import { MiddlewareCompositeAsync } from "./middlewares/composite-async.js";
import { MiddlewareAsync, MiddlewarePromise } from "./middlewares/shared.js";
import { Routable } from "./router/route.js";

type MiddlewareError = 'break' | 'loop' | void;

export class UrlHandler<T extends [URL, ...unknown[], Partial<TResult>], TResult = object> implements MiddlewareAsync<T>
{
    protocol: MiddlewareCompositeAsync<T, MiddlewareError>;
    host: MiddlewareCompositeAsync<T>;
    router: Router<[Routable, ...T]>;
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
    public process(...context: T): Promise<TResult>
    {
        return this.handle(...context).then(v => { throw v }, () => context[1] as TResult);
    }

    public useProtocol(protocol: string, action: (...args: T) => Promise<TResult>)
    {
        const handler = new UrlHandler.Protocol<T>(protocol);
        this.protocol.useMiddleware(handler);
        return handler.use((...context) => action(...context).then(result => { if (typeof result !== 'undefined') Object.assign(context[context.length - 1] || {}, result) }));
    }

    public useHost(host: string, action: (...args: T) => Promise<TResult>)
    {
        const handler = new UrlHandler.Host<T>(host);
        this.host.useMiddleware(handler);
        return handler.use((...context) => action(...context).then(result => { if (typeof result !== 'undefined') Object.assign(context[context.length - 1] || {}, result) }));
    }

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

export namespace UrlHandler
{
    export class Protocol<T extends [URL, ...unknown[]]> extends MiddlewareCompositeAsync<T, MiddlewareError>
    {
        constructor(public readonly protocol: string)
        {
            super();
            if (protocol.endsWith(':'))
                this.protocol = protocol.substring(0, protocol.length - 1);
        }

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
    export class Host<T extends [URL, ...unknown[]]> extends MiddlewareCompositeAsync<T, MiddlewareError>
    {
        constructor(private host: string)
        {
            super();
        }

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