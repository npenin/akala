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
export { CssClass, CssClassComposer } from './behaviors/cssClass.js'
export { I18nComposer } from './behaviors/i18n.js'
export { TeardownManager } from './teardown-manager.js'
export { ClientBindings } from './client-bindings.js'
export * from './dom-helpers.js'


export type IClientEventSink<TEvent extends Event> = IEventSink<[TEvent], void>
export type IClientEvent<TEvent extends Event> = IEvent<[TEvent], void>
export class ClientEvent<TEvent extends Event> extends klEvent<[TEvent], void> { }

export function fromEvent<const TEventName extends keyof HTMLElementEventMap, TEvent extends Event = HTMLElementEventMap[TEventName]>(x: EventTarget, eventName: TEventName): IClientEventSink<TEvent>
{
    const event = new ClientEvent<TEvent>();
    const handler = event.emit.bind(event);
    event[Symbol.dispose] = () =>
    {
        x.removeEventListener(eventName, handler);
        klEvent.prototype[Symbol.dispose].call(event);
    }
    x.addEventListener(eventName, handler);
    return event;
}

export function pipefromEvent<const TEventName extends keyof HTMLElementEventMap, TEvent extends Event = HTMLElementEventMap[TEventName]>(source: IEventSink<[boolean], void>, x: EventTarget, eventName: TEventName): IClientEventSink<TEvent>
{
    const event = new ClientEvent<TEvent>();
    let sub: Subscription;
    let clientEvent: IClientEventSink<TEvent>;
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

