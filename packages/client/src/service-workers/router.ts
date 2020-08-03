import * as akala from '@akala/core'

export type workerHandler = (req: Request & { method: string }, ev: ExtendableEvent, next: akala.NextFunction) => void;
export type workerErrorHandler = (err: any, req: Request, res: ExtendableEvent, next: akala.NextFunction) => void;

export class workerLayer extends akala.Layer<workerHandler> implements akala.IRoutable<workerHandler>
{
    public route: akala.Route<workerHandler, workerLayer>;
    public method?: string;
    constructor(path: string, options: akala.LayerOptions, handler: workerHandler)
    {
        super(path, options, handler);
    }
}
export class workerRoute extends akala.Route<workerHandler, workerLayer>
{
    constructor(path: string)
    {
        super(path);
    }

    public methods: { [key: string]: boolean };

    public buildLayer(path: string, options: akala.LayerOptions, callback: workerHandler)
    {
        return new workerLayer('/', options, callback);
    }
}
export class Router extends akala.Router<workerHandler, workerErrorHandler, workerLayer, workerRoute>
{
    constructor(options?: akala.RouterOptions)
    {
        super(options)
    }

    protected buildLayer(path: string, options: akala.LayerOptions, handler: workerHandler): workerLayer
    {
        return new workerLayer(path, options, handler);
    }
    protected buildRoute(path: string): workerRoute
    {
        return new workerRoute(path);
    }

    public install(this: Router, ...handlers: workerHandler[])
    {
        var route = this.route('/');
        route.addHandler((layer: workerLayer) =>
        {
            layer.method = 'install';
            route.methods.install = true;
            return layer;
        }, ...handlers);
        return this;
    }
    public activate(this: Router, ...handlers: workerHandler[])
    {
        var route = this.route('/');
        route.addHandler((layer: workerLayer) =>
        {
            layer.method = 'activate';
            route.methods.activate = true;
            return layer;
        }, ...handlers);
        return this;
    }
    public message(this: Router, ...handlers: workerHandler[])
    {
        var route = this.route('/');
        route.addHandler((layer: workerLayer) =>
        {
            layer.method = 'install';
            route.methods.install = true;
            return layer;
        }, ...handlers);
        return this;
    }

    public 'checkout'(this: Router, path: string, ...handlers: workerHandler[])
    {
        var route = this.route(path);
        route.addHandler((layer: workerLayer) =>
        {
            layer.method = 'checkout';
            route.methods['checkout'] = true;
            return layer;
        }, ...handlers);
        return this;
    }
    public 'connect'(this: Router, path: string, ...handlers: workerHandler[])
    {
        var route = this.route(path);
        route.addHandler((layer: workerLayer) =>
        {
            layer.method = 'connect';
            route.methods['connect'] = true;
            return layer;
        }, ...handlers);
        return this;
    }
    public 'copy'(this: Router, path: string, ...handlers: workerHandler[])
    {
        var route = this.route(path);
        route.addHandler((layer: workerLayer) =>
        {
            layer.method = 'copy';
            route.methods['copy'] = true;
            return layer;
        }, ...handlers);
        return this;
    }
    public 'delete'(this: Router, path: string, ...handlers: workerHandler[])
    {
        var route = this.route(path);
        route.addHandler((layer: workerLayer) =>
        {
            layer.method = 'delete';
            route.methods['delete'] = true;
            return layer;
        }, ...handlers);
        return this;
    }
    public 'get'(this: Router, path: string, ...handlers: workerHandler[])
    {
        var route = this.route(path);
        route.addHandler((layer: workerLayer) =>
        {
            layer.method = 'get';
            route.methods['get'] = true;
            return layer;
        }, ...handlers);
        return this;
    }
    public 'head'(this: Router, path: string, ...handlers: workerHandler[])
    {
        var route = this.route(path);
        route.addHandler((layer: workerLayer) =>
        {
            layer.method = 'head';
            route.methods['head'] = true;
            return layer;
        }, ...handlers);
        return this;
    }
    public 'lock'(this: Router, path: string, ...handlers: workerHandler[])
    {
        var route = this.route(path);
        route.addHandler((layer: workerLayer) =>
        {
            layer.method = 'lock';
            route.methods['lock'] = true;
            return layer;
        }, ...handlers);
        return this;
    }
    public 'm-search'(this: Router, path: string, ...handlers: workerHandler[])
    {
        var route = this.route(path);
        route.addHandler((layer: workerLayer) =>
        {
            layer.method = 'm-search';
            route.methods['m-search'] = true;
            return layer;
        }, ...handlers);
        return this;
    }
    public 'merge'(this: Router, path: string, ...handlers: workerHandler[])
    {
        var route = this.route(path);
        route.addHandler((layer: workerLayer) =>
        {
            layer.method = 'merge';
            route.methods['merge'] = true;
            return layer;
        }, ...handlers);
        return this;
    }
    public 'mkactivity'(this: Router, path: string, ...handlers: workerHandler[])
    {
        var route = this.route(path);
        route.addHandler((layer: workerLayer) =>
        {
            layer.method = 'mkactivity';
            route.methods['mkactivity'] = true;
            return layer;
        }, ...handlers);
        return this;
    }
    public 'mkcalendar'(this: Router, path: string, ...handlers: workerHandler[])
    {
        var route = this.route(path);
        route.addHandler((layer: workerLayer) =>
        {
            layer.method = 'mkcalendar';
            route.methods['mkcalendar'] = true;
            return layer;
        }, ...handlers);
        return this;
    }
    public 'mkcol'(this: Router, path: string, ...handlers: workerHandler[])
    {
        var route = this.route(path);
        route.addHandler((layer: workerLayer) =>
        {
            layer.method = 'mkcol';
            route.methods['mkcol'] = true;
            return layer;
        }, ...handlers);
        return this;
    }
    public 'move'(this: Router, path: string, ...handlers: workerHandler[])
    {
        var route = this.route(path);
        route.addHandler((layer: workerLayer) =>
        {
            layer.method = 'move';
            route.methods['move'] = true;
            return layer;
        }, ...handlers);
        return this;
    }
    public 'notify'(this: Router, path: string, ...handlers: workerHandler[])
    {
        var route = this.route(path);
        route.addHandler((layer: workerLayer) =>
        {
            layer.method = 'notify';
            route.methods['notify'] = true;
            return layer;
        }, ...handlers);
        return this;
    }
    public 'options'(this: Router, path: string, ...handlers: workerHandler[])
    {
        var route = this.route(path);
        route.addHandler((layer: workerLayer) =>
        {
            layer.method = 'options';
            route.methods['options'] = true;
            return layer;
        }, ...handlers);
        return this;
    }
    public 'patch'(this: Router, path: string, ...handlers: workerHandler[])
    {
        var route = this.route(path);
        route.addHandler((layer: workerLayer) =>
        {
            layer.method = 'patch';
            route.methods['patch'] = true;
            return layer;
        }, ...handlers);
        return this;
    }
    public 'post'(this: Router, path: string, ...handlers: workerHandler[])
    {
        var route = this.route(path);
        route.addHandler((layer: workerLayer) =>
        {
            layer.method = 'post';
            route.methods['post'] = true;
            return layer;
        }, ...handlers);
        return this;
    }
    public 'prop'(this: Router, path: string, ...handlers: workerHandler[])
    {
        var route = this.route(path);
        route.addHandler((layer: workerLayer) =>
        {
            layer.method = 'prop';
            route.methods['prop'] = true;
            return layer;
        }, ...handlers);
        return this;
    }
    public 'find'(this: Router, path: string, ...handlers: workerHandler[])
    {
        var route = this.route(path);
        route.addHandler((layer: workerLayer) =>
        {
            layer.method = 'find';
            route.methods['find'] = true;
            return layer;
        }, ...handlers);
        return this;
    }
    public 'proppatch'(this: Router, path: string, ...handlers: workerHandler[])
    {
        var route = this.route(path);
        route.addHandler((layer: workerLayer) =>
        {
            layer.method = 'proppatch';
            route.methods['proppatch'] = true;
            return layer;
        }, ...handlers);
        return this;
    }
    public 'purge'(this: Router, path: string, ...handlers: workerHandler[])
    {
        var route = this.route(path);
        route.addHandler((layer: workerLayer) =>
        {
            layer.method = 'purge';
            route.methods['purge'] = true;
            return layer;
        }, ...handlers);
        return this;
    }
    public 'put'(this: Router, path: string, ...handlers: workerHandler[])
    {
        var route = this.route(path);
        route.addHandler((layer: workerLayer) =>
        {
            layer.method = 'put';
            route.methods['put'] = true;
            return layer;
        }, ...handlers);
        return this;
    }
    public 'report'(this: Router, path: string, ...handlers: workerHandler[])
    {
        var route = this.route(path);
        route.addHandler((layer: workerLayer) =>
        {
            layer.method = 'report';
            route.methods['report'] = true;
            return layer;
        }, ...handlers);
        return this;
    }
    public 'search'(this: Router, path: string, ...handlers: workerHandler[])
    {
        var route = this.route(path);
        route.addHandler((layer: workerLayer) =>
        {
            layer.method = 'search';
            route.methods['search'] = true;
            return layer;
        }, ...handlers);
        return this;
    }
    public 'subscribe'(this: Router, path: string, ...handlers: workerHandler[])
    {
        var route = this.route(path);
        route.addHandler((layer: workerLayer) =>
        {
            layer.method = 'subscribe';
            route.methods['subscribe'] = true;
            return layer;
        }, ...handlers);
        return this;
    }
    public 'trace'(this: Router, path: string, ...handlers: workerHandler[])
    {
        var route = this.route(path);
        route.addHandler((layer: workerLayer) =>
        {
            layer.method = 'trace';
            route.methods['trace'] = true;
            return layer;
        }, ...handlers);
        return this;
    }
    public 'unlock'(this: Router, path: string, ...handlers: workerHandler[])
    {
        var route = this.route(path);
        route.addHandler((layer: workerLayer) =>
        {
            layer.method = 'unlock';
            route.methods['unlock'] = true;
            return layer;
        }, ...handlers);
        return this;
    }
    public 'unsubscribe'(this: Router, path: string, ...handlers: workerHandler[])
    {
        var route = this.route(path);
        route.addHandler((layer: workerLayer) =>
        {
            layer.method = 'unsubscribe';
            route.methods['unsubscribe'] = true;
            return layer;
        }, ...handlers);
        return this;
    }
}

export var router = new Router();

namespace routerInit
{
    declare var self: ServiceWorkerGlobalScope;
    self.addEventListener('fetch', function (ev)
    {
        router.handle(ev.request, ev, function (err)
        {
            console.log('deadend')
        });
    }, { capture: true })
    self.addEventListener('install', function (ev)
    {
        router.handle({ method: 'install', url: '/' }, ev, function ()
        {
            console.log('deadend')
        });
    }, { capture: true })
    self.addEventListener('push', function (ev)
    {
        router.handle({ method: 'push', url: '/' }, ev, function ()
        {
            console.log('deadend')
        });
    }, { capture: true })
    self.addEventListener('updatefound', function (ev)
    {
        router.handle({ method: 'updatefound', url: '/' }, ev, function ()
        {
            console.log('deadend')
        });
    }, { capture: true })
}