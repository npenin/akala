import type { Subscription } from "@akala/core";
import type { Composer } from "../template.js";
import { DataContext } from "./context.js";
import { AttributeComposer } from "./shared.js";
import { fromEvent } from "../common.js";

export interface EventPlugin<TEvent extends PropertyKey>
{
    eventName: TEvent;
    beforeEventRegistration<T>(item: Element, options: T, handler: (...args: unknown[]) => unknown): void;
    afterEventRegistration<T>(item: Element, options: T, handler: (...args: unknown[]) => unknown, subscription: Subscription): void;
}

export class EventComposer<T extends Partial<Disposable>> extends AttributeComposer<T> implements Composer<T>
{
    public static readonly plugins: { [key in PropertyKey]: EventPlugin<key> } = {};

    getContext(item: HTMLElement, options?: T)
    {
        return DataContext.find(item);
    }

    constructor()
    {
        super('on')
    }

    optionName = 'controller';

    applyInternal<const TKey extends PropertyKey>(item: HTMLElement, options: T, event: TKey, handler: (...args: unknown[]) => unknown): Subscription | void
    {
        const ev = fromEvent(item, event as keyof HTMLElementEventMap);

        EventComposer.plugins[event]?.beforeEventRegistration?.(item, options, handler);

        const result = ev.addListener(handler);

        EventComposer.plugins[event]?.afterEventRegistration?.(item, options, handler, result)

        return result;
    }
}
