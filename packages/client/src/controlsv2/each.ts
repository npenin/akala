import { TeardownManager, Binding, EmptyBinding, ErrorWithStatus, HttpStatusCode, ObservableArray, type Subscription } from "@akala/core";
import { Control } from "./shared.js";
import { Template } from "../template.js";
import { DataContext } from "../common.js";
import { a } from "../dom-helpers.js";

export type Bound<T> = { [key in keyof T]: Binding<T[key]> };
export type MaybeBound<T> = { [key in keyof T]: Binding<T[key]> | T[key] };

export class Each<T, const TOptionIndex extends PropertyKey = typeof Each.defaultIndexPropertyName, const TOptionItem extends PropertyKey = typeof Each.defaultItemPropertyName, TOption extends { [key in TOptionIndex]: number } & { [key in TOptionItem]: T } = { [key in TOptionIndex]: number } & { [key in TOptionItem]: T }> extends Control<{ each: Array<T> | ObservableArray<T>, [Each.indexPropertyNameAttribute]: keyof TOption, [Each.itemPropertyNameAttribute]: keyof TOption }>
{
    static readonly itemPropertyNameAttribute = 'item-property-name';
    static readonly indexPropertyNameAttribute = 'index-property-name';
    static readonly defaultItemPropertyName = 'item';
    static readonly defaultIndexPropertyName = '$index';

    each: Binding<Array<T> | ObservableArray<T>>;
    template: Element | DocumentFragment;

    get indexPropertyName()
    {
        return (a(this.element, Each.indexPropertyNameAttribute) || Each.defaultIndexPropertyName) as keyof TOption;
    }

    get itemPropertyName()
    {
        return (a(this.element, Each.itemPropertyNameAttribute) || Each.defaultItemPropertyName) as keyof TOption;
    }

    private readonly options = new ObservableArray<Bound<TOption>>([]);

    connectedCallback()
    {
        this.each = this.bind('each');
        if (this.element.childElementCount > 1)
            throw new Error('Each control can only have one child element');
        this.template = this.element.firstElementChild;
        if (this.template instanceof HTMLTemplateElement)
        {
            this.template = this.template.content;
            if (this.template.childElementCount > 1)
                throw new Error('Each control can only have one child element');
        }
        this.element.firstElementChild.remove();

        this.teardown(Each.applyTemplate({ indexPropertyName: this.indexPropertyName, options: this.options, itemPropertyName: this.itemPropertyName, each: this.each, template: this.template, root: this.element, container: this.element, teardownManager: this }));

    }
    public static applyTemplate<T, TOption extends { [key in TOptionIndex]: number } & { [key in TOptionItem]: T }, const TOptionIndex extends PropertyKey = typeof Each.defaultIndexPropertyName, const TOptionItem extends PropertyKey = typeof Each.defaultItemPropertyName>(self: {
        root: Element | DocumentFragment, indexPropertyName: TOptionIndex, options?: ObservableArray<Bound<TOption>>, itemPropertyName: TOptionItem, optionsExtend?: (option: Bound<TOption>) => void, each: Binding<Array<T> | ObservableArray<T>>, template: Binding<Element | DocumentFragment> | Element | DocumentFragment | ((option: Bound<TOption>) => Binding<Element | DocumentFragment> | Element | DocumentFragment), container: Element, teardownManager: TeardownManager
    }): Subscription
    {
        if (!self.options)
            self.options = new ObservableArray([]);

        if (!self.itemPropertyName)
            self.itemPropertyName = 'item' as TOptionItem
        if (!self.indexPropertyName)
            self.indexPropertyName = '$index' as TOptionIndex;

        let items: { element: Element, item: T }[] = [];

        let observableArraySubscription: Subscription;
        let observableArray: ObservableArray<T>;

        const context = DataContext.find(self.container);

        return self.each.onChanged(ev =>
        {
            if (ev.value === ev.oldValue)
                return;
            observableArraySubscription?.();
            if (observableArray && ev.value)
            {
                observableArray.replaceArray(ev.value);
            }
            if (!observableArray && ev.value)
            {
                observableArray = Array.isArray(ev.value) ? new ObservableArray(ev.value) : ev.value;

                function getTemplate(option: Bound<TOption>)
                {
                    let template: Binding<Element | DocumentFragment> | Element | DocumentFragment;
                    if (typeof self.template == 'function')
                        template = self.template(option);
                    else
                        template = self.template;
                    if (template instanceof DocumentFragment)
                        return (template.cloneNode(true) as Element).firstElementChild
                    if (template instanceof Binding)
                    {
                        let item: Element;
                        const sub = template.onChanged(ev =>
                        {
                            if (ev.value instanceof DocumentFragment)
                            {
                                if (item)
                                    item.replaceWith(ev.value.firstElementChild);
                                item = ev.value.firstElementChild;
                            }
                            else
                            {
                                if (item)
                                    item.replaceWith(ev.value);
                                item = ev.value;
                            }
                        }, true);

                        return { subscription: sub, item }

                    }
                    if (typeof self.template == 'function')
                        return template;
                    return template.cloneNode(true) as Element;
                }
                // observableArraySubscription = 
                self.teardownManager.teardown(observableArray.addListener(arg =>
                {
                    switch (arg.action)
                    {
                        case "pop":
                            for (let i = 0; i < arg.oldItems.length; i++)
                            {
                                self.container.removeChild(items.pop().element);
                                self.options.pop();
                            }
                            break;
                        case "push":
                            for (let i = 0; i < arg.newItems.length; i++)
                            {
                                const option = {
                                    [self.indexPropertyName]: new EmptyBinding(i),
                                    [self.itemPropertyName]: new EmptyBinding(arg.newItems[i])
                                } as unknown as Bound<TOption>;
                                self.optionsExtend?.(option);
                                const item = getTemplate(option);
                                let el: Element;
                                if ('subscription' in item)
                                {
                                    self.teardownManager.teardown(item.subscription);
                                    el = item.item;
                                }
                                else
                                    el = item;
                                items.push({ element: el, item: arg.newItems[i] });
                                self.options.push(option);
                                if (!(el as HTMLElement).dataset?.context)
                                    DataContext.defineDirect(el, DataContext.extend(context, option));
                                self.teardownManager.teardown(Template.composeAll([el], self.root, option));
                                self.container.appendChild(el);
                            }
                            break;
                        case "shift":
                            for (let i = 0; i < arg.oldItems.length; i++)
                            {
                                if (typeof (self.template) == 'function')
                                    throw new ErrorWithStatus(HttpStatusCode.NotAcceptable);
                                self.container.firstElementChild.remove();
                                self.options.shift();
                                items.shift();
                            }
                            break;
                        case "unshift":
                            for (let i = 0; i < arg.newItems.length; i++)
                            {
                                if (typeof (self.template) == 'function')
                                    throw new ErrorWithStatus(HttpStatusCode.NotAcceptable);
                                const option = {
                                    [self.indexPropertyName]: new EmptyBinding(i),
                                    [self.itemPropertyName]: new EmptyBinding(arg.newItems[i])
                                } as unknown as Bound<TOption>;
                                self.optionsExtend?.(option);
                                const item = getTemplate(option);
                                let el: Element;
                                if ('subscription' in item)
                                {
                                    self.teardownManager.teardown(item.subscription);
                                    el = item.item;
                                }
                                else
                                    el = item;
                                items.unshift({ element: el, item: arg.newItems[i] });
                                self.options.unshift(option);
                                if (!(el as HTMLElement).dataset?.context)
                                    DataContext.defineDirect(el, DataContext.extend(context, option));
                                self.teardownManager.teardown(Template.composeAll([el], self.root, option));
                                self.container.prepend(el);
                            }
                            break;
                        case "replace":
                            for (let i = 0; i < arg.replacedItems.length; i++)
                            {
                                // const options = { [this.indexPropertyName]: observableArray.length, [this.valuePropertyName]: arg.replacedItems[i] }
                                self.options.array[arg.replacedItems[i].index][self.itemPropertyName].setValue(arg.replacedItems[i].newItem as TOption[TOptionItem]);
                                items[arg.replacedItems[i].index].item = arg.replacedItems[i].newItem;
                            }
                            break;
                        case "init":
                            for (let i = 0; i < arg.newItems.length; i++)
                            {
                                const option = {
                                    [self.indexPropertyName]: new EmptyBinding(i),
                                    [self.itemPropertyName]: new EmptyBinding(arg.newItems[i])
                                } as unknown as Bound<TOption>;
                                self.optionsExtend?.(option);
                                const item = getTemplate(option);
                                let el: Element;
                                if ('subscription' in item)
                                {
                                    self.teardownManager.teardown(item.subscription);
                                    el = item.item;
                                }
                                else
                                    el = item;
                                items.push({ element: el, item: arg.newItems[i] });
                                self.options.push(option);
                                if (!(el as HTMLElement).dataset?.context)
                                    DataContext.defineDirect(el, DataContext.extend(context, option));
                                self.teardownManager.teardown(Template.composeAll([el], self.root, option));
                                self.container.appendChild(el);
                            }
                            break;
                    }
                }, { triggerAtRegistration: true }));
            }
        }, true)
    }
}
