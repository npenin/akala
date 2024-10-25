import { Binding, ObservableArray, Subscription } from "@akala/core";
import { Control } from "./shared.js";
import { Template } from "../template.js";
import { DataContext } from "../common.js";

export class Each extends Control
{
    each: Binding<unknown>;
    template: Node;

    get indexPropertyName()
    {
        return this.element.getAttribute('index-property-name') || '$index';
    }

    get valuePropertyName()
    {
        return this.element.getAttribute('item-property-name') || 'item';
    }

    private options: {}[] = []

    connectedCallback()
    {
        this.each = this.bind('each');
        if (this.element.childElementCount > 1)
            throw new Error('Each control can only have one child element');
        this.template = this.element.firstElementChild;
        if (this.template instanceof HTMLTemplateElement)
        {
            this.template = this.template.content;
            if (Array.from(this.template.childNodes).filter(c => c instanceof HTMLElement).length > 1)
                throw new Error('Each control can only have one child element');
        }
        this.element.removeChild(this.element.firstElementChild);
        let observableArraySubscription: Subscription;

        this.each.onChanged(ev =>
        {
            if (ev.value === ev.oldValue)
                return;
            observableArraySubscription?.();
            const observableArray = Array.isArray(ev.value) ? new ObservableArray(ev.value) : ev.value;
            if (observableArray instanceof ObservableArray)
            {
                observableArraySubscription = this.teardown(observableArray.addListener(arg =>
                {
                    switch (arg.action)
                    {
                        case "pop":
                            for (let i = 0; i < arg.oldItems.length; i++)
                                this.element.removeChild(this.element.lastElementChild);
                            break;
                        case "push":
                            for (let i = 0; i < arg.newItems.length; i++)
                            {
                                const item = this.template.cloneNode(true) as HTMLElement;
                                const options = {};
                                Binding.defineProperty(options, this.indexPropertyName, i);
                                Binding.defineProperty(options, this.valuePropertyName, arg.newItems[i]);
                                this.options.push(options);
                                DataContext.define(item, options);
                                this.element.appendChild(item);
                                this.teardown(Template.composeAll([item], this.element, options));
                            }
                            break;
                        case "shift":
                            for (let i = 0; i < arg.oldItems.length; i++)
                            {
                                this.element.removeChild(this.element.firstElementChild);
                                this.options.shift();
                            }
                            break;
                        case "unshift":
                            for (let i = 0; i < arg.newItems.length; i++)
                            {
                                const item = this.template.cloneNode(true) as HTMLElement;
                                const options = {};
                                Binding.defineProperty(options, this.indexPropertyName, i);
                                Binding.defineProperty(options, this.valuePropertyName, arg.newItems[i]);
                                this.options.unshift(options);
                                DataContext.define(item, options);
                                this.element.prepend(item);
                                this.teardown(Template.composeAll([item], this.element, options));
                            }
                            break;
                        case "replace":
                            for (let i = 0; i < arg.replacedItems.length; i++)
                            {
                                // const options = { [this.indexPropertyName]: observableArray.length, [this.valuePropertyName]: arg.replacedItems[i] }
                                this.options[arg.replacedItems[i].index][this.valuePropertyName] = arg.replacedItems[i].newItem;
                            }
                            break;
                        case "init":
                            for (let i = 0; i < arg.newItems.length; i++)
                            {
                                const item = this.template instanceof DocumentFragment ? (this.template.cloneNode(true) as DocumentFragment).firstElementChild as HTMLElement : this.template.cloneNode(true) as HTMLElement;
                                const options = {};
                                Binding.defineProperty(options, this.indexPropertyName, i);
                                Binding.defineProperty(options, this.valuePropertyName, arg.newItems[i]);
                                this.options.push(options);
                                this.element.appendChild(item);
                                DataContext.define(item, options);
                                this.teardown(Template.composeAll([item], this.element, options));
                            }
                            break;
                    }
                }));
                observableArray.init();
            }
        }, true)
    }

    disconnectedCallback()
    {
    }
}