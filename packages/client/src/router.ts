import * as url from 'url';
import * as akala from '@akala/core'

export class Request implements akala.Request
{
    constructor(loc: string)
    {
        this.url = loc || '/';
        this.uri = url.parse(this.url, true);
    }

    public url: string;
    public uri: url.Url;
    public params: { [key: string]: any };
};

if (!window['setImmediate'])
    window['setImmediate'] = function (fn)
    {
        var args = arguments.length && Array.prototype.slice.call(arguments, 1) || [];
        return <number><any>setTimeout(function ()
        {
            fn.apply(this, args)
        }, 0);
    } as any

export type browserHandler = (req: Request, next: akala.NextFunction) => void;
export type browserErrorHandler = (err: any, req: Request, next: akala.NextFunction) => void;

export class BrowserLayer extends akala.Layer<browserHandler> implements akala.IRoutable<browserHandler>
{
    public route: akala.Route<browserHandler, BrowserLayer>;
    constructor(path: string, options: akala.LayerOptions, handler: browserHandler)
    {
        super(path, options, handler);
    }
}
export class BrowserRoute extends akala.Route<browserHandler, BrowserLayer>
{
    constructor(path: string)
    {
        super(path);
    }

    public buildLayer(path: string, options: akala.LayerOptions, callback: browserHandler)
    {
        return new BrowserLayer('/', options, callback);
    }
}

export class Router extends akala.Router<browserHandler, browserErrorHandler, BrowserLayer, BrowserRoute>
{
    constructor(options?: akala.RouterOptions)
    {
        super(options)
    }

    protected buildLayer(path: string, options: akala.LayerOptions, handler: browserHandler): BrowserLayer
    {
        return new BrowserLayer(path, options, handler);
    }
    protected buildRoute(path: string): BrowserRoute
    {
        return new BrowserRoute(path);
    }

    public on(path: string, handler: browserHandler)
    {
        var route = super.route(path);
        route.addHandler((layer: BrowserLayer) =>
        {
            return layer;
        }, handler);
    }
}


export function router(): Router
{
    var proto = new Router();

    return proto;
}