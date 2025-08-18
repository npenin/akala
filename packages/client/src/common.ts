import { ctorToFunction, EventEmitter, defaultInjector, module, Event as klEvent, } from '@akala/core';
import type { Module, SpecialNextParam, MiddlewarePromise, Subscription, IEventSink, IEvent } from '@akala/core';

/**
 * The main module for bootstrapping Akala client-side services.
 */
export const bootstrapModule: Module = module('akala', 'akala-services', 'controls');

bootstrapModule.activateEvent.maxListeners = 100;

/**
 * Module for registering core Akala services.
 */
const serviceModule: Module = module('akala-services');

export { serviceModule };

/**
 * Resolves a relative URL against the base URL defined in the document's <base> tag.
 * @param namespace The relative URL path to resolve.
 * @returns The full resolved URL string.
 */
export function resolveUrl(namespace: string): string
{
    const root = document.head.querySelector('base').href;
    return new URL(namespace, root).toString();
}

defaultInjector.register('$resolveUrl', resolveUrl);

/**
 * Decorator for registering a service with dependency injection.
 * @param name The service identifier.
 * @param toInject Dependency names to inject into the service constructor.
 */
export function service(name: string | symbol, ...toInject: string[])
{
    return function (target: new (...args: unknown[]) => unknown)
    {
        let instance: unknown = null;
        if (toInject == null || (toInject.length === 0 && target.length > 0))

            throw new Error('missing inject names');
        else
            serviceModule.registerFactory(name, () =>
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
import { Container, type ICommandProcessor, Metadata, type StructuredParameters } from '@akala/commands/browser';
// export { component, webComponent };
export { AttributeComposer, type WebComponent, webComponent, wcObserve, databind, type HtmlControlElement } from './behaviors/shared.js';

/**
 * Command processor that handles events after remote processing.
 */
export class LocalAfterRemoteProcessor implements ICommandProcessor
{
    constructor(
        private readonly inner: ICommandProcessor,
        public readonly eventEmitter: EventEmitter<Record<string, klEvent<[any, StructuredParameters<unknown[]>, Metadata.Command]>>> = new EventEmitter()
    ) { }

    /**
     * Handles a command and emits events on failure.
     * @param origin The command origin container.
     * @param cmd The command metadata.
     * @param param The structured command parameters.
     */
    async handle(
        origin: Container<unknown>,
        cmd: Metadata.Command,
        param: StructuredParameters<unknown[]>
    ): MiddlewarePromise<SpecialNextParam>
    {
        try
        {
            const error = await this.inner.handle(origin, cmd, param);
            return error;
        }
        catch (e)
        {
            try
            {
                this.eventEmitter.emit(cmd.name, e, param, cmd);
            }
            catch (e)
            {
                return e;
            }
            throw e;
        }
    }
}

export { FormInjector, FormComposer } from './behaviors/form.js';
export { IfComposer } from './behaviors/if.js';
export { DataBind, DataContext } from './behaviors/context.js';
export { EventComposer } from './behaviors/events.js';
export { CssClass, CssClassComposer } from './behaviors/cssClass.js';
export { I18nComposer } from './behaviors/i18n.js';
export { SwitchComposer } from './behaviors/switch.js';
export { ClientBindings } from './client-bindings.js';
export * from './dom-helpers.js';

/**
 * Event sink for client-side events.
 */
export type IClientEventSink<TEvent extends Event> = IEventSink<[TEvent], void, { once?: boolean }>;

/**
 * Event type for client-side events.
 */
export type IClientEvent<TEvent extends Event> = IEvent<[TEvent], void>;

/**
 * Base class for client-side events with disposal support.
 */
export class ClientEvent<TEvent extends Event> extends klEvent<[TEvent], void> { }

/**
 * Subscribes to DOM events with cleanup management.
 * @param item The HTML element to observe.
 * @param eventName The event name or object mapping names to handlers.
 * @param handler The event handler function.
 * @returns Subscription(s) to manage event listeners.
 */
export function subscribe<T extends Partial<{ [key in keyof HTMLElementEventMap]: (ev: HTMLElementEventMap[key]) => void }>>(
    item: HTMLElement,
    eventHandlers: T
): Record<keyof T, Subscription>;

export function subscribe<T extends keyof HTMLElementEventMap>(
    item: HTMLElement,
    eventName: T,
    handler: (ev: HTMLElementEventMap[T]) => void
): Subscription;

export function subscribe<T extends keyof HTMLElementEventMap>(
    item: HTMLElement,
    eventNameOrHandlers: T | { [key in T]: (ev: HTMLElementEventMap[key]) => void },
    handler?: (ev: HTMLElementEventMap[T]) => void
): Subscription | Record<T, Subscription>
{
    if (typeof (eventNameOrHandlers) == 'string' && handler)
    {
        item.addEventListener(eventNameOrHandlers, handler);
        let removed = false;
        return () => { if (removed) return false; removed = true; item.removeEventListener(eventNameOrHandlers, handler) };
    }
    else if (typeof (eventNameOrHandlers) == 'object')
    {
        return Object.fromEntries(Object.entries(eventNameOrHandlers).map(([eventName, handler]) =>
        {
            return [eventName, subscribe(item, eventName as T, handler as (ev: HTMLElementEventMap[T]) => void) as Subscription]
        })) as Record<T, Subscription>;
    }
}

/**
 * Creates an `IClientEventSink` that listens for a specified event on a given `EventTarget`.
 *
 * @template TEventName - The name of the event to listen for, which must be a key of `HTMLElementEventMap`.
 * @template TEvent - The type of the event object, which defaults to the event type corresponding to `TEventName` in `HTMLElementEventMap`.
 *
 * @param {EventTarget} x - The target to listen for events on.
 * @param {TEventName} eventName - The name of the event to listen for.
 * @returns {IClientEventSink<TEvent>} An `IClientEventSink` that emits the specified event.
 */
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

/**
 * Creates a client event sink that pipes events from a specified event target.
 *
 * @param source - The source event sink that controls the subscription.
 * @param x - The event target from which to listen for events.
 * @param eventName - The name of the event to listen for on the event target.
 * @returns A client event sink that emits events from the specified event target.
 *
 * @template TEventName - The type of the event name.
 * @template TEvent - The type of the event.
 */
export function pipefromEvent<const TEventName extends keyof HTMLElementEventMap, TEvent extends Event = HTMLElementEventMap[TEventName]>(source: IEventSink<[boolean], void, { once?: boolean }>, x: EventTarget, eventName: TEventName): IClientEventSink<TEvent>
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
