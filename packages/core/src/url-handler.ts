import { Middleware, MiddlewareComposite, MiddlewarePromise, Routable, Router } from "./index.js";

export class UrlHandler<T extends [URL, ...unknown[]]> implements Middleware<T>
{
    protocol: MiddlewareComposite<unknown[]>;
    host: MiddlewareComposite<unknown[]>;
    router: Router<[Routable, ...T]>;
    constructor()
    {
        this.protocol = new MiddlewareComposite('protocols');
        this.host = new MiddlewareComposite('domains');
        this.router = new Router('path');
    }

    public process(...context: T)
    {
        return this.handle(...context).then(v => { throw v }, e => e);
    }

    public async handle(...context: T): MiddlewarePromise
    {
        let error = this.protocol.handle(context);
        if (error)
            return error;
        error = this.host.handle(context);
        if (error)
            return error;
        let params: Routable['params'];
        error = this.router.handle({
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
    export class Protocol<T extends [URL, ...unknown[]]> extends MiddlewareComposite<T>
    {
        constructor(private protocol: string)
        {
            super();
            //safeguarding protocol
            if (!protocol.endsWith(':'))
                this.protocol = protocol + ':';
        }

        handle(...context: T): MiddlewarePromise
        {
            if (context[0].protocol === this.protocol)
            {
                return super.handle(...context);
            }
            return;
        }

    }
    export class Host<T extends [URL, ...unknown[]]> extends MiddlewareComposite<T>
    {
        constructor(private host: string)
        {
            super();
        }

        handle(...context: T): MiddlewarePromise
        {
            if (context[0].host === this.host)
            {
                return super.handle(...context);
            }
            return;
        }

    }
}