import { isPromiseLike, StatefulSubscription, type Subscription } from "@akala/core";
import type { Composer } from "../template.js";
import { DataContext } from "./context.js";
import { AttributeComposer } from "./shared.js";
import { isOutletDefined, OutletDefined, outletDefinition, OutletDefinition, OutletService } from "../outlet.js";

export class SwitchComposer extends AttributeComposer<void> implements Composer<void>
{
    getContext(item: HTMLElement)
    {
        return DataContext.find(item);
    }

    constructor(private outlsetService: OutletService)
    {
        super('switch');
        this.allowSubProperties = false;
    }

    optionName = 'controller';

    override applyInternal<const TKey extends PropertyKey>(item: HTMLElement, options: void, event: TKey, value: OutletDefinition<any> | OutletDefined<any>, oldValue: OutletDefinition<any> | OutletDefined<any>): Subscription | void
    {
        if (value === oldValue)
            return;

        if (isPromiseLike(value))
        {
            let sub: Subscription;
            value.then(r =>
            {
                if (r)
                    sub = this.applyInternal(item, options, event, r, oldValue) as Subscription;
            })
            return () => sub?.();
        }

        if (!value)
            return;

        if (isOutletDefined(value))
            value = value[outletDefinition];

        const result = this.outlsetService.apply(() => ({ element: item }), value, value);
        return new StatefulSubscription(() => result.then(r => r[Symbol.dispose]())).unsubscribe;

        // const beacon = item['replacedWith'] || document.createTextNode('');
        // if (!value)
        // {
        //     item.replaceWith(beacon);
        //     item['replacedWith'] = beacon
        // }
        // else if (beacon.parentElement)
        //     beacon.replaceWith(item);
    }
}
