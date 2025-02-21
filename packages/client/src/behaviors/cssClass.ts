import { ObservableArray, ObservableArrayEventArgs, Binding, ParsedString, isPromiseLike, Subscription, map } from '@akala/core'
import { AttributeComposer, databind } from './shared.js';
import { DataContext } from './context.js';
import { MaybeBound } from '../clientify.js';
import { TeardownManager } from '../teardown-manager.js';

type classParamType = Binding<string> | Binding<string[]> | ParsedString | string[] | string | { [key: string]: boolean } | MaybeBound<{ [key: string]: boolean }>;

export class CssClassComposer extends AttributeComposer<unknown>
{
    constructor()
    {
        super('klass');
    }

    getContext(item: HTMLElement, options?: unknown)
    {
        return DataContext.find(item);
    }
    applyInternal<const TKey extends PropertyKey>(item: HTMLElement, options: unknown, subItem: TKey, value: unknown): Subscription | void
    {
        item.classList.toggle(subItem as string, !!value);
    }

}

@databind('class')
export class CssClass extends TeardownManager
{
    constructor(element: Element, parameter: classParamType)
    {
        super();
        // if (Array.isArray(parameter))
        // {
        //     parameter = new ObservableArray(parameter);
        // }
        if (parameter instanceof ObservableArray)
        {
            this.teardown(parameter.addListener(function (arg: ObservableArrayEventArgs<string>)
            {
                if (arg.newItems)
                    arg.newItems.forEach(function (item)
                    {
                        this.teardown(CssClass.add(element, item));
                    })
                if (arg.oldItems)
                    arg.oldItems.forEach(function (item)
                    {
                        this.teardown(CssClass.remove(element, item));
                    })
            }, { triggerAtRegistration: true }));
        }
        else
            this.teardown(CssClass.add(element, parameter));
    }


    public static add(element: Element, item: classParamType): Subscription | undefined
    {
        if (typeof (item) == 'undefined')
            return;
        if (typeof (item) == 'string')
        {
            if (~item.indexOf(' '))
                return CssClass.add(element, item.split(' '));
            element.classList.add(item);
        }
        else if (item instanceof ParsedString)
            return CssClass.add(element, item.value);
        else if (item instanceof Binding)
        {
            let oldValue = null;
            return item.onChanged(async function (ev)
            {
                if (oldValue)
                    CssClass.remove(element, oldValue);
                if (isPromiseLike(ev.value))
                    ev.value.then(function (value)
                    {
                        oldValue = value;
                        CssClass.add(element, value);
                    });
                else
                {
                    CssClass.add(element, ev.value);
                    oldValue = ev.value;
                }
            }, true);
        }
        else if (item instanceof ObservableArray)
            return item.addListener(ev =>
            {
                if ('oldItems' in ev)
                    CssClass.remove(element, ev.oldItems);

                else if ('newItems' in ev)
                    CssClass.add(element, ev.newItems);
                else
                {
                    ev.replacedItems.forEach(ri =>
                    {
                        CssClass.remove(element, ri.oldItem);
                        CssClass.add(element, ri.newItem)
                    })
                }
            }, { triggerAtRegistration: true })
        else
            map(item, function (toggle, key)
            {
                if (typeof (toggle) == 'string' && !isNaN(Number(key)))
                {
                    return CssClass.add(element, toggle);
                }
                else if (toggle instanceof Binding)
                    return toggle.onChanged(function (ev)
                    {
                        if (ev.value)
                            CssClass.add(element, key as string);
                        else
                            CssClass.remove(element, key as string);
                    }, true);
                else if (toggle)
                    return CssClass.add(element, key as string);
                else
                    return CssClass.remove(element, key as string);
            })
    }


    public static remove(element: Element, item: ParsedString | Array<string> | string | { [key: string]: boolean })
    {

        if (typeof (item) == 'undefined')
            return;
        if (typeof (item) == 'string')
            if (~item.indexOf(' '))
                CssClass.remove(element, item.split(' '));
            else
                element.classList.remove(item);
        else if (item instanceof ParsedString)
            return CssClass.remove(element, item.value);
        else if (item instanceof Binding)
        {
            CssClass.remove(element, item.getValue())
        }
    }


}
