import { ObservableArray, ObservableArrayEventArgs, Binding, ParsedString, isPromiseLike, Subscription, map, each } from '@akala/core';
import { AttributeComposer, databind } from './shared.js';
import { DataContext } from './context.js';
import { MaybeBound } from '../clientify.js';
import { TeardownManager } from '@akala/core';

/** Represents possible parameter types for CSS class binding */
type classParamType = Binding<string> | Binding<string[]> | ParsedString | string[] | string | { [key: string]: boolean } | MaybeBound<{ [key: string]: boolean }>;

/** Manages CSS class bindings for HTML elements */
export class CssClassComposer extends AttributeComposer<unknown>
{
    constructor()
    {
        super('klass');
    }

    getContext(item: HTMLElement, options?: unknown): Binding<unknown>
    {
        return DataContext.find(item);
    }

    applyInternal<const TKey extends PropertyKey>(item: HTMLElement, options: unknown, subItem: TKey, value: unknown): void
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
        if (parameter instanceof ObservableArray)
        {
            parameter.addListener(
                (arg: ObservableArrayEventArgs<string>) =>
                {
                    arg.newItems?.forEach(item => this.teardown(CssClass.add(element, item)!));
                    arg.oldItems?.forEach(item => CssClass.remove(element, item));
                },
                { triggerAtRegistration: true }
            );
        }
        else
            this.teardown(CssClass.add(element, parameter));
    }

    public static add(element: Element, item: classParamType): Subscription | undefined
    {
        if (typeof item === 'undefined') return;
        if (typeof item === 'string')
        {
            if (item.includes(' '))
                return CssClass.add(element, item.split(' '));
            element.classList.add(item);
        }
        else if (item instanceof ParsedString)
            return CssClass.add(element, item.value);
        else if (item instanceof Binding)
        {
            let oldValue = null;
            return item.onChanged(async (ev) =>
            {
                if (oldValue)
                    CssClass.remove(element, oldValue);
                if (isPromiseLike(ev.value))
                    await ev.value.then((value) =>
                    {
                        oldValue = value;
                        CssClass.add(element, value);
                    });
                else
                {
                    oldValue = ev.value;
                    CssClass.add(element, ev.value);
                }
            }, true);
        }
        else if (item instanceof ObservableArray)
            return item.addListener((ev) =>
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
                        CssClass.add(element, ri.newItem);
                    });
                }
            }, { triggerAtRegistration: true });
        else
        {
            const subscriptions: (Subscription | void)[] = map(item, (toggle, key) =>
            {
                if (typeof toggle === 'string' && !isNaN(Number(key)))
                    return CssClass.add(element, toggle);
                else if (toggle instanceof Binding)
                    return toggle.onChanged((ev) =>
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
            }, true);
            return (): boolean => 
            {
                subscriptions.forEach(s => s && s?.());
                return true;
            };
        }
    }

    public static remove(element: Element, item: ParsedString | string[] | string | { [key: string]: boolean }): void
    {
        if (typeof item === 'undefined') return;
        if (typeof item === 'string')
        {
            if (item.includes(' '))
                return CssClass.remove(element, item.split(' '));
            else
                element.classList.remove(item);
        }
        else if (item instanceof ParsedString)
            return CssClass.remove(element, item.value);
        else if (item instanceof Binding)
            return CssClass.remove(element, item.getValue());
        else if (Array.isArray(item))
            item.forEach(className => element.classList.remove(className));
        else if (typeof item === 'object')
        {
            return each(item, (value, key) =>
            {
                if (!value)
                    element.classList.remove(key as string);
            });
        }
    }
}
