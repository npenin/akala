import { Binding, ExpressionsWithLength, ParsedAny, ParsedObject, ParsedString, Parser, SimpleInjector, Subscription, parser, toCamelCase, toKebabCase } from "@akala/core";
import { Composer } from "../template.js";
import { Control } from '../controlsv2/shared.js';

const databound = new SimpleInjector();

export function databind(name: string)
{
    return function <T>(target: new (element: Element, value: any) => T)
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

export type HtmlControlElement<T extends Partial<WebComponent> & Control, TElement extends HTMLElement = HTMLElement> = TElement & { control: T };

export function webComponent(tagName: string, options?: ElementDefinitionOptions)
{
    return function <T extends Partial<WebComponent>>(target: (new (element: HTMLElement) => T) & { observedAttributes?: string[] })
    {
        let parent = HTMLElement;
        if (options?.extends)
            parent = window[Object.getPrototypeOf(document.createElement(options.extends)).constructor.name] as any;

        customElements.define(tagName, class extends parent
        {
            public readonly control: T;
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

        }, options);
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

    optionGetter(options: object): T
    {
        return options[this.optionName];
    }

    abstract getContext(item: Element, options?: T): Binding<unknown>;

    readonly selector: string;
    readonly optionName: string;

    static toCamelCase(s: string): string
    {
        return toCamelCase(s)
    }

    static fromCamlCase(s: string): string
    {
        return toKebabCase(s);
    }

    abstract applyInternal<const TKey extends PropertyKey>(item: Element, options: T, subItem: TKey, value: unknown): Subscription | void;

    apply(item: Element, options: T, root: Element | ShadowRoot)
    {
        let bindings: Record<string, Binding<unknown>>;

        const properties: ParsedAny | undefined = (item.getAttribute(this.attribute) || undefined) && this.parser.parse(item.getAttribute(this.attribute)) as ParsedObject;

        const otherProperties = item.getAttributeNames().filter(att => att.startsWith(this.attribute + '-') && item.getAttribute(att)).map(att => [AttributeComposer.toCamelCase(att.substring(this.attribute.length + 1)), this.parser.parse(item.getAttribute(att))] as const);

        const context = this.getContext(item, options);
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

    getBindings<const TKey extends PropertyKey>(item: Element, options: T, context: Binding<unknown>, member: TKey, source: ExpressionsWithLength)
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