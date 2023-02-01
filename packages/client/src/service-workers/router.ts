import * as akala from '@akala/core'
import { MiddlewareComposite } from '@akala/core';
import { MethodMiddleware, simpleRequest } from '../router.js';

export type workerHandler = (req: simpleRequest, ev: FetchEvent) => Promise<unknown>;


export class Router extends akala.MiddlewareComposite<[Request, FetchEvent]>
{
    procesUpdateFound(ev: Event): Promise<unknown>
    {
        return this.updateFoundMiddleware.process(ev);
    }
    processPush(ev: PushEvent): Promise<unknown>
    {
        return this.pushMiddleware.process(ev);
    }
    processInstall(ev: InstallEvent & ExtendableEvent): Promise<unknown>
    {
        return this.installMiddleware.process(ev);
    }
    processActivate(ev: Event): Promise<unknown>
    {
        return this.activateMiddleware.process(ev);
    }
    private installMiddleware = new MiddlewareComposite<[ServiceWorkerRegistrationEventMap['install']]>()
    private activateMiddleware = new MiddlewareComposite<[Event]>()
    private pushMiddleware = new MiddlewareComposite<[ServiceWorkerRegistrationEventMap['push']]>()
    private updateFoundMiddleware = new MiddlewareComposite<[Event]>()

    constructor()
    {
        super();
    }

    public install(...handlers: ((evt: ServiceWorkerRegistrationEventMap['install']) => Promise<unknown>)[]): this
    {
        this.installMiddleware.use(...handlers);
        return this;
    }


    public push(...handlers: ((evt: ServiceWorkerRegistrationEventMap['push']) => Promise<unknown>)[]): this
    {
        this.pushMiddleware.use(...handlers);
        return this;
    }


    public updateFound(...handlers: ((evt: Event) => Promise<unknown>)[]): this
    {
        this.updateFoundMiddleware.use(...handlers);
        return this;
    }

    public activate(...handlers: ((evt: Event) => Promise<unknown>)[]): this
    {
        this.activateMiddleware.use(...handlers);
        return this;
    }

    public 'checkout'(path: string, ...handlers: workerHandler[]): this { return this.useMiddleware(new MethodMiddleware('checkout', path).use(...handlers)) }
    public 'connect'(path: string, ...handlers: workerHandler[]): this { return this.useMiddleware(new MethodMiddleware('connect', path).use(...handlers)) }
    public 'copy'(path: string, ...handlers: workerHandler[]): this { return this.useMiddleware(new MethodMiddleware('copy', path).use(...handlers)) }
    public 'delete'(path: string, ...handlers: workerHandler[]): this { return this.useMiddleware(new MethodMiddleware('delete', path).use(...handlers)) }
    public 'get'(path: string, ...handlers: workerHandler[]): this { return this.useMiddleware(new MethodMiddleware('get', path).use(...handlers)) }
    public 'head'(path: string, ...handlers: workerHandler[]): this { return this.useMiddleware(new MethodMiddleware('head', path).use(...handlers)) }
    public 'lock'(path: string, ...handlers: workerHandler[]): this { return this.useMiddleware(new MethodMiddleware('lock', path).use(...handlers)) }
    public 'merge'(path: string, ...handlers: workerHandler[]): this { return this.useMiddleware(new MethodMiddleware('merge', path).use(...handlers)) }
    public 'mkactivity'(path: string, ...handlers: workerHandler[]): this { return this.useMiddleware(new MethodMiddleware('mkactivity', path).use(...handlers)) }
    public 'mkcalendar'(path: string, ...handlers: workerHandler[]): this { return this.useMiddleware(new MethodMiddleware('mkcalendar', path).use(...handlers)) }
    public 'mkcol'(path: string, ...handlers: workerHandler[]): this { return this.useMiddleware(new MethodMiddleware('mkcol', path).use(...handlers)) }
    public 'move'(path: string, ...handlers: workerHandler[]): this { return this.useMiddleware(new MethodMiddleware('move', path).use(...handlers)) }
    public 'notify'(path: string, ...handlers: workerHandler[]): this { return this.useMiddleware(new MethodMiddleware('notify', path).use(...handlers)) }
    public 'options'(path: string, ...handlers: workerHandler[]): this { return this.useMiddleware(new MethodMiddleware('options', path).use(...handlers)) }
    public 'patch'(path: string, ...handlers: workerHandler[]): this { return this.useMiddleware(new MethodMiddleware('patch', path).use(...handlers)) }
    public 'post'(path: string, ...handlers: workerHandler[]): this { return this.useMiddleware(new MethodMiddleware('post', path).use(...handlers)) }
    public 'prop'(path: string, ...handlers: workerHandler[]): this { return this.useMiddleware(new MethodMiddleware('prop', path).use(...handlers)) }
    public 'find'(path: string, ...handlers: workerHandler[]): this { return this.useMiddleware(new MethodMiddleware('find', path).use(...handlers)) }
    public 'proppatch'(path: string, ...handlers: workerHandler[]): this { return this.useMiddleware(new MethodMiddleware('proppatch', path).use(...handlers)) }
    public 'purge'(path: string, ...handlers: workerHandler[]): this { return this.useMiddleware(new MethodMiddleware('purge', path).use(...handlers)) }
    public 'put'(path: string, ...handlers: workerHandler[]): this { return this.useMiddleware(new MethodMiddleware('put', path).use(...handlers)) }
    public 'report'(path: string, ...handlers: workerHandler[]): this { return this.useMiddleware(new MethodMiddleware('report', path).use(...handlers)) }
    public 'search'(path: string, ...handlers: workerHandler[]): this { return this.useMiddleware(new MethodMiddleware('search', path).use(...handlers)) }
    public 'subscribe'(path: string, ...handlers: workerHandler[]): this { return this.useMiddleware(new MethodMiddleware('subscribe', path).use(...handlers)) }
    public 'trace'(path: string, ...handlers: workerHandler[]): this { return this.useMiddleware(new MethodMiddleware('trace', path).use(...handlers)) }
    public 'unlock'(path: string, ...handlers: workerHandler[]): this { return this.useMiddleware(new MethodMiddleware('unlock', path).use(...handlers)) }
    public 'unsubscribe'(path: string, ...handlers: workerHandler[]): this { return this.useMiddleware(new MethodMiddleware('unsubscribe', path).use(...handlers)) }
}

export const router = new Router();

// eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-namespace
namespace routerInit
{
    declare const self: ServiceWorkerGlobalScope;
    self.addEventListener('fetch', function (ev)
    {
        ev.waitUntil(router.process(ev.request, ev));
    }, { capture: true })
    self.addEventListener('activate', function (ev)
    {
        router.processActivate(ev);
    }, { capture: true })
    self.addEventListener('install', function (ev)
    {
        ev.waitUntil(router.processInstall(ev));
    }, { capture: true })
    self.addEventListener('push', function (ev)
    {
        ev.waitUntil(router.processPush(ev));
    }, { capture: true })
    self.addEventListener('updatefound', function (ev)
    {
        router.procesUpdateFound(ev);
    }, { capture: true })
}