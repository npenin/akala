import { Subscription } from "@akala/core";
import { Composer } from "../template.js";
import { DataContext } from "./context.js";
import { AttributeComposer } from "./shared.js";

export class EventComposer<T extends Partial<Disposable>> extends AttributeComposer<T> implements Composer<T>
{
    getContext(item: HTMLElement, options?: T)
    {
        return DataContext.find(item);
    }

    constructor()
    {
        super('on')
    }

    optionName = 'controller';

    applyInternal<const TKey extends PropertyKey>(item: HTMLElement, options: T, event: TKey, handler: unknown): Subscription | void
    {
        item.addEventListener(event as any, handler as (...args: unknown[]) => unknown);
        return () => { item.removeEventListener(event as any, handler as (...args: unknown[]) => unknown); return true; };
    }
}
