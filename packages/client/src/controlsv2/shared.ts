import { Binding, Event, Parser } from "@akala/core";
import { DataContext, TeardownManager, WebComponent } from "../common.js";

export class Control<TBindings extends Record<string, unknown> = Record<string, unknown>> extends TeardownManager implements Partial<WebComponent>
{
    constructor(protected readonly element: HTMLElement)
    {
        super();
    }

    protected readonly bindings: { [key in keyof TBindings]: Binding<TBindings[key]> } = {} as any;

    attributeChangedCallback<const TKey extends keyof TBindings>(name: TKey, oldValue: string, newValue: string): void
    {
        if (this.bindings[name] && oldValue != newValue)
        {
            const oldBinding = this.bindings[name];
            this.bindings[name] = new Binding({ controller: this, get context() { return DataContext.find(this.element) } }, Parser.parameterLess.parse(newValue));
            this.bindings[name].set('change', (oldBinding.get('change') as Event<[{ oldValue: TBindings[TKey], value: TBindings[TKey] }]>).clone())
            this.bindings[name].emit('change', { value: this.bindings[name].getValue(), oldValue: oldBinding.getValue() })
            oldBinding[Symbol.dispose]();
        }
    }

    public attrib(name: string): string
    {
        return this.element.getAttribute(name);
    }

    public bind<const TKey extends Extract<keyof TBindings, string>>(attributeName: TKey)
    {
        if (!Reflect.has(this.element, 'controller'))
        {
            const controllerBinding = this.teardown(Binding.defineProperty(this.element, 'controller'));
            return this.teardown(this.bindings[attributeName] = new Binding({ controller: controllerBinding, get context() { return DataContext.find(this.element) } }, Parser.parameterLess.parse(this.element.getAttribute(attributeName) || '')));

        }
        if (!this.bindings[attributeName])
            return this.teardown(this.bindings[attributeName] = new Binding({ controller: this.element['controller'], get context() { return DataContext.find(this.element) } }, Parser.parameterLess.parse(this.element.getAttribute(attributeName) || '')));
        return this.bindings[attributeName];
    }
}