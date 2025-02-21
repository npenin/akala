import { Binding, EmptyBinding, Event, Parser } from "@akala/core";
import { DataContext, WebComponent } from "../common.js";
import { TeardownManager } from '@akala/core';
import { a } from "../dom-helpers.js";

export class Control<TBindings extends Record<string, unknown> = Record<string, unknown>, TElement extends HTMLElement = HTMLElement> extends TeardownManager implements Partial<WebComponent>
{
    constructor(protected readonly element: TElement)
    {
        super();
    }

    protected readonly attributeBindings: { [key in keyof TBindings]: Binding<string> } = {} as any;
    protected readonly bindings: { [key in keyof TBindings]: Binding<TBindings[key]> } = {} as any;

    protected inheritStylesheets(shadow: ShadowRoot)
    {
        shadow.adoptedStyleSheets = Array.from(document.styleSheets).map(sheet =>
        {
            // Create a new constructed stylesheet
            const css = new CSSStyleSheet();

            try
            {
                css.replaceSync(Array.from(sheet.cssRules).map(rule => rule.cssText).join("\n"));
            } catch (e)
            {
                // Ignore CORS-restricted stylesheets
            }
            return css;
        })

        // document.querySelectorAll('style').forEach(style =>
        // {
        //     shadow.appendChild(style.cloneNode(true));
        // })
    }

    public attribute(name: string): string
    public attribute(name: string, value: string): this
    public attribute(record: Record<string, string>): this
    public attribute(record: string[]): string[]
    public attribute(name: string | string[] | Record<string, string>, value?: string | null)
    public attribute(name: string | string[] | Record<string, string>, value?: string | null)
    {
        return a(this.element, name, value);
    }

    attributeChangedCallback<const TKey extends keyof TBindings>(name: TKey, oldValue: string, newValue: string): void
    {
        if (this.bindings[name] && oldValue != newValue)
        {
            const oldBinding = this.bindings[name];
            this.bindings[name] = DataContext.find(this.element).pipe(Parser.parameterLess.parse(newValue));
            this.bindings[name].set('change', (oldBinding.get('change') as Event<[{ oldValue: TBindings[TKey], value: TBindings[TKey] }]>).clone())
            this.bindings[name].emit('change', { value: this.bindings[name].getValue(), oldValue: oldBinding.getValue() })
            oldBinding[Symbol.dispose]();
        }
        if (this.attributeBindings[name])
        {
            this.attributeBindings[name].setValue(newValue);
        }
    }

    public bindAttribute<const TKey extends Extract<keyof TBindings, string>>(attributeName: TKey): Binding<string> 
    {
        if (this.attributeBindings[attributeName])
            return this.attributeBindings[attributeName];

        return this.attributeBindings[attributeName] = new EmptyBinding<string>();
    }

    public bind<const TKey extends Extract<keyof TBindings, string>>(attributeName: TKey, error: Error): Binding<TBindings[TKey]>
    public bind<const TKey extends Extract<keyof TBindings, string>>(attributeName: TKey): Binding<TBindings[TKey]> | null
    public bind<const TKey extends Extract<keyof TBindings, string>>(attributeName: TKey, error?: Error): Binding<TBindings[TKey]> | null
    {
        const attributeValue = a(this.element, attributeName);
        if (!attributeValue)
            if (error)
                throw error;
            else
                return null;
        if (!Reflect.has(this.element, 'controller'))
        {
            if (!this.bindings[attributeName])
                // const controllerBinding = this.teardown(Binding.defineProperty(this.element, 'controller'));
                return this.teardown(this.bindings[attributeName] = DataContext.find(this.element).pipe(Parser.parameterLess.parse(attributeValue || '')));

        }
        if (!this.bindings[attributeName])
            return this.teardown(this.bindings[attributeName] = DataContext.extend(DataContext.find(this.element), { controller: this.element['controller'] }).pipe(Parser.parameterLess.parse(attributeValue || '')));
        return this.bindings[attributeName];
    }

    public connectedCallback(): void
    {
        if (this.subscriptions.length)
            this[Symbol.dispose]();

    }

    public disconnectedCallback(): void
    {
        this[Symbol.dispose]();
    }

    public static nearest(node: Element, selector: string): Element
    {
        if (!selector)
            return;
        do
        {
            const result = node.querySelector(selector);
            if (result)
                return result;
        }
        while (node.parentElement);
    }
}