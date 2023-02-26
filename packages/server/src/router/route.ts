import { MiddlewareRoute, MiddlewarePromise, RouteBuilderArguments } from "@akala/core";
import { Request, Response } from './shared.js'

export class HttpRouteMiddleware<T extends [Request, Response]> extends MiddlewareRoute<T>
{
    constructor(private method: string, ...args: RouteBuilderArguments)
    {
        super(...args);
        this.method = this.method.toLowerCase();
    }

    public isApplicable = (req: T[0]): boolean =>
    {
        return this.method === req.method.toLowerCase() || req.method == 'head' || req.method == 'options';
    }

    public handle(...context: T): MiddlewarePromise
    {
        let method = context[0].method && context[0].method.toLowerCase()
        if (method == 'options')
        {
            return Promise.resolve({ allow: [method] });
        }

        if (method === 'head')
        {
            method = 'get'
        }

        return super.handle(...context);
    }
}