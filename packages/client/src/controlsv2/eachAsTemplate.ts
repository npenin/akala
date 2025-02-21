import { Binding, ObservableArray, Subscription } from "@akala/core";
import { Control } from "./shared.js";
import { Template } from "../template.js";
import { DataContext } from "../common.js";

export class EachAsTemplate extends Control
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
        super.connectedCallback();
        this.each = this.bind('each');
        if (!(this.element instanceof HTMLTemplateElement))
            throw new Error('This control is meant to be used with a template element');
        this.template = this.element.content;
        const endNode = document.createTextNode('');
        if (this.element.parentElement.lastElementChild == this.element)
            this.element.parentElement.appendChild(endNode);
        else
            this.element.parentElement.insertBefore(endNode, this.element.nextElementSibling);

        if (Array.from(this.template.childNodes).filter(c => c instanceof HTMLElement).length > 1)
            throw new Error('Each control can only have one child element');

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
                                this.element.parentElement.removeChild(endNode.previousElementSibling);
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
                                this.element.parentElement.insertBefore(item, endNode);
                                this.teardown(Template.composeAll([item], this.element, options));
                            }
                            break;
                        case "shift":
                            for (let i = 0; i < arg.oldItems.length; i++)
                            {
                                this.element.parentElement.removeChild(this.element.nextSibling);
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
                                this.element.parentElement.insertBefore(item, this.element);
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
                                const item = (this.template.cloneNode(true) as HTMLElement).firstElementChild as HTMLElement;
                                const options = {};
                                Binding.defineProperty(options, this.indexPropertyName, i);
                                Binding.defineProperty(options, this.valuePropertyName, arg.newItems[i]);
                                this.options.push(options);
                                this.element.parentElement.insertBefore(item, endNode);
                                DataContext.define(item, options);
                                this.teardown(Template.composeAll([item], this.element, options));
                            }
                            break;
                    }
                }, { triggerAtRegistration: true }));
            }
        }, true)
    }

    disconnectedCallback()
    {
    }
}