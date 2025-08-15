import type { Subscription } from "@akala/core";
import type { Composer } from "../template.js";
import { DataContext } from "./context.js";
import { AttributeComposer } from "./shared.js";

export class IfComposer<T extends Partial<Disposable>> extends AttributeComposer<T> implements Composer<T>
{
    getContext(item: HTMLElement, options?: T)
    {
        return DataContext.find(item);
    }

    constructor()
    {
        super('if');
        this.allowSubProperties = false;
    }

    optionName = 'controller';

    applyInternal<const TKey extends PropertyKey>(item: HTMLElement, options: T, event: TKey, value: unknown): Subscription | void
    {
        const beacon = item['replacedWith'] || document.createTextNode('');
        if (!value)
        {
            if (!item['replacedWith'])
            {
                item.replaceWith(beacon);
                item['replacedWith'] = beacon
            }
        }
        else if (beacon.parentElement)
            beacon.replaceWith(item);
    }
}
