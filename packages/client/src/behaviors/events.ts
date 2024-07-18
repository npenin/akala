import { Composer } from "../template.js";
import { DataContext } from "./context.js";
import { AttributeComposer } from "./shared.js";

export class EventComposer<T extends Partial<Disposable>> extends AttributeComposer<T> implements Composer<T>
{
    getContext(item: HTMLElement, options?: T)
    {
        return {
            controller: options, get dataContext() { return DataContext.find(item) }
        };
    }
    constructor()
    {
        super('on')
    }

    optionName = 'controller';

    applyInternal(item, _options, event, handler)
    {
        item.addEventListener(event, handler as (...args: unknown[]) => unknown);
        return () => { item.removeEventListener(event, handler as (...args: unknown[]) => unknown); return true; };
    }
}