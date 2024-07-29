import { Binding, ExpressionsWithLength, ParsedAny, ParsedObject, ParsedString, Parser, SimpleInjector, Subscription, parser } from "@akala/core";
import { Composer } from "../template.js";

const databound = new SimpleInjector();

export function databind(name: string)
{
    return function <T>(target: new (element: HTMLElement, value: any) => T)
    {
        databound.register(name, target);
    }
}

export interface WebComponent
{
    connectedCallback(): void;
    disconnectedCallback(): void;
    adoptedCallback(): void;
    attributeChangedCallback(name: string, oldValue: string, newValue: string): void;
}

export function webComponent(tagName: string)
{
    return function <T extends Partial<WebComponent>>(target: (new (element: HTMLElement) => T) & { observedAttributes?: string[] })
    {
        customElements.define(tagName, class extends HTMLElement
        {
            control: T;
            constructor()
            {
                super();
                this.control = new target(this);
            }

            connectedCallback()
            {
                this.control.connectedCallback?.();
            }

            disconnectedCallback()
            {
                this.control.disconnectedCallback?.();
            }

            adoptedCallback()
            {
                this.control.adoptedCallback?.();
            }

            attributeChangedCallback(name: string, oldValue: string, newValue: string)
            {
                this.control.attributeChangedCallback?.(name, oldValue, newValue);
            }

            static readonly observedAttributes = target.observedAttributes;

        });
    }
}
export function wcObserve(name: string)
{
    return function <T>(target: (new (element: HTMLElement) => T) & { observedAttributes?: string[] })
    {
        if (!target.observedAttributes)
            target.observedAttributes = [name];
        else
            target.observedAttributes.push(name);
    }
}


export abstract class AttributeComposer<T extends Partial<Disposable>> implements Composer<T>
{
    static readonly default = Symbol('ParsedString case');

    protected readonly parser: Parser

    constructor(protected readonly attribute: string, parser?: Parser)
    {
        this.selector = '[' + attribute + ']';
        this.optionName = attribute;
        if (!parser)
            this.parser = Parser.parameterLess;
        else
            this.parser = parser;
    }

    abstract getContext(item: HTMLElement, options?: T);

    readonly selector: string;
    readonly optionName: string;

    static toCamelCase(s: string): string
    {
        return s.replace(/-([a-z])/g, (_all, letter) => letter.toUpperCase());
    }

    static fromCamlCase(s: string): string
    {
        return s.replace(/[A-Z]/g, letter => '-' + letter.toLowerCase());
    }

    abstract applyInternal<const TKey extends PropertyKey>(item: HTMLElement, options: T, subItem: TKey, value: unknown): Subscription | void;

    apply(item: HTMLElement, options: T, root: Element | ShadowRoot)
    {
        let bindings: Record<string, Binding<unknown>>;

        const properties: ParsedAny | undefined = (item.getAttribute(this.attribute) || undefined) && this.parser.parse(item.getAttribute(this.attribute)) as ParsedObject;

        const otherProperties = item.getAttributeNames().filter(att => att.startsWith(this.attribute + '-') && item.getAttribute(att)).map(att => [att.substring(this.attribute.length + 1), this.parser.parse(item.getAttribute(att))] as const);

        const context = new Binding(this.getContext(item, options), null);
        switch (true)
        {
            case properties instanceof ParsedObject:
                bindings = Object.fromEntries(properties.init.map(p =>
                {
                    const evaluator = new parser.EvaluatorAsFunction();
                    const member = evaluator.eval(p.member)(context) as string;
                    return this.getBindings(item, options, context, member, p.source);
                }));
                break;
            case properties instanceof ParsedString:
                bindings = Object.fromEntries([this.getBindings(item, options, context, AttributeComposer.default, properties)]);
                break;
        }

        bindings = Object.assign({}, bindings, Object.fromEntries(otherProperties.map(p =>
        {
            return this.getBindings(item, options, context, p[0], p[1]);
        })))

        return {
            [Symbol.dispose]()
            {
                Object.values(bindings).forEach(binding => binding[Symbol.dispose]());
            }
        }
    }

    getBindings<const TKey extends PropertyKey>(item: HTMLElement, options: T, context: Binding<unknown>, member: TKey, source: ExpressionsWithLength)
    {
        const binding = context.pipe<((...args: unknown[]) => unknown) | Record<string, (...args: unknown[]) => unknown>>(source);
        const subs: Subscription[] = [];
        binding.onChanged(ev =>
        {
            const sub = this.applyInternal(item, options, member, ev.value);
            if (sub)
                subs.push(sub);
        }, true);
        return [member, binding] as const

    }
}