import { ctorToFunction, Module, module, defaultInjector, EventEmitter, SpecialNextParam, MiddlewarePromise, Event as klEvent, Subscription, IEventSink, IEvent } from '@akala/core';

export const bootstrapModule: Module = module('akala', 'akala-services', 'controls')

bootstrapModule.activateEvent.maxListeners = 100;

export const serviceModule: Module = module('akala-services')

export function resolveUrl(namespace: string)
{
    const root = document.head.querySelector('base').href;
    return new URL(namespace, root).toString();
}

defaultInjector.register('$resolveUrl', resolveUrl)

export function service(name, ...toInject: string[])
{
    return function (target: new (...args: unknown[]) => unknown)
    {
        let instance = null;
        if (toInject == null || toInject.length == 0 && target.length > 0)
            throw new Error('missing inject names');
        else
            serviceModule.registerFactory(name, function ()
            {
                return instance || serviceModule.injectWithName(toInject, (...args: unknown[]) =>
                {
                    instance = ctorToFunction(target)(...args);
                    return instance;
                })();
            });
    };
}

// import component, { webComponent } from './decorators/component.js';
import { Container, ICommandProcessor, Metadata, StructuredParameters } from '@akala/commands';
// export { component, webComponent };
export { AttributeComposer, WebComponent, webComponent, wcObserve, databind, HtmlControlElement } from './behaviors/shared.js'

export class LocalAfterRemoteProcessor implements ICommandProcessor
{
    constructor(private inner: ICommandProcessor, public readonly eventEmitter: EventEmitter<Record<string, klEvent<[any, StructuredParameters<unknown[]>, Metadata.Command]>>> = new EventEmitter())
    {
    }

    async handle(origin: Container<unknown>, cmd: Metadata.Command, param: StructuredParameters<unknown[]>): MiddlewarePromise<SpecialNextParam>
    {
        try
        {
            const error = await this.inner.handle(origin, cmd, param);
            return error;
        }
        catch (e)
        {
            if (!this.eventEmitter.emit(cmd.name, e, param, cmd))
                throw e;
        }
    }

}

export { FormInjector, FormComposer } from './behaviors/form.js'
export { DataBind, DataContext } from './behaviors/context.js'
export { EventComposer } from './behaviors/events.js'
export { I18nComposer } from './behaviors/i18n.js'

export class TeardownManager
{
    protected readonly subscriptions: Subscription[] = [];

    [Symbol.dispose]()
    {
        this.subscriptions.forEach(s => s());
        this.subscriptions.length = 0;
    }

    teardown<T extends Subscription | Disposable>(sub: T): T
    {
        if (Symbol.dispose in sub)
        {
            this.subscriptions.push(() =>
            {
                sub[Symbol.dispose]();
                return true;
            });
        }
        else
            this.subscriptions.push(sub);
        return sub;
    }
}

export type IClientEventSink = IEventSink<[Event], void>
export type IClientEvent = IEvent<[Event], void>
export class ClientEvent extends klEvent<[Event], void> { }

export function fromEvent(x: EventTarget, eventName: string): IClientEventSink
{
    const event = new ClientEvent();
    const handler = event.emit.bind(event);
    event[Symbol.dispose] = () =>
    {
        x.removeEventListener(eventName, handler);
        klEvent.prototype[Symbol.dispose].call(event);
    }
    x.addEventListener(eventName, handler);
    return event;
}

export function pipefromEvent(source: IEventSink<[boolean], void>, x: EventTarget, eventName: string): IClientEventSink
{
    const event = new ClientEvent();
    let sub: Subscription;
    let clientEvent: IClientEventSink;
    source.addListener(ev =>
    {
        if (ev && !sub)
        {
            sub = (clientEvent || (clientEvent = fromEvent(x, eventName))).addListener((ev) =>
            {
                event.emit(ev);
            })
        }
        else if (sub && !ev)
        {
            sub();
            sub = null;
        }
    });
    event[Symbol.dispose] = () =>
    {
        sub?.();
        clientEvent[Symbol.dispose]();
        ClientEvent.prototype[Symbol.dispose].call(event);
    }
    return event;
}

