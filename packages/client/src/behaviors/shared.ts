import { Binding, ParsedObject, ParsedString, Parser, ReplaceableSubscription, SimpleInjector, type Subscription, lazy, parser, toCamelCase, toKebabCase } from "@akala/core";
import { type Composer } from "../template.js";
import { Control } from '../controlsv2/shared.js';
import { type Expressions } from "@akala/core/expressions";

const databound = new SimpleInjector();

export function databind(name: string)
{
    return function <T>(target: new (element: Element, value: unknown) => T)
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


// Feature detect support for customized built-in elements
const supportsCustomBuiltIn = (() =>
{
    const iframe = document.createElement('iframe');
    try
    {
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        const win = iframe.contentWindow as Window & typeof globalThis;
        const doc = win.document;

        class Test extends win.HTMLUListElement { }
        win.customElements.define('test-element', Test, { extends: 'ul' });
        return doc.createElement('ul', { is: 'test-element' }) instanceof Test;
    }
    catch
    {
        return false;
    }
    finally
    {
        iframe.remove();
    }
})();


declare global
{
    interface Element
    {
        akala?: Partial<WebComponent>;
    }
}
// Create an observer instance that handles both built-in elements and detachment
const builtinObserver = lazy(() =>
{
    const observed: Record<string, (new (element: Element) => Partial<WebComponent>) & { observedAttributes?: string[] }> = {};
    const builtins: Record<string, string[]> = {};

    function builtinSelector()
    {
        return Object.entries(builtins).flatMap(([builtin, children]) => children.map((child) => `${builtin}[is="${child}"]`)).join(',');
    }

    const observer = new MutationObserver((mutations) =>
    {
        mutations.forEach((mutation) =>
        {
            switch (mutation.type)
            {
                case "attributes":
                    if (mutation.target instanceof Element && mutation.target.getAttribute('is') in observed)
                    {
                        const target = observed[mutation.target.getAttribute('is')];
                        if (target.observedAttributes?.includes(mutation.attributeName))
                            mutation.target.akala?.attributeChangedCallback?.(mutation.attributeName, mutation.oldValue, mutation.target.getAttribute(mutation.attributeName));
                    }
                    break;
                case "childList":
                    // Handle removed nodes for cleanup
                    mutation.removedNodes.forEach((node) =>
                    {
                        if (node instanceof Element && node.getAttribute('is') in observed)
                            node.akala?.disconnectedCallback?.();
                        else if (node instanceof Element)
                            node.querySelectorAll(builtinSelector()).forEach((child) =>
                            {
                                if (child instanceof Element)
                                    child.akala?.disconnectedCallback?.();
                            });
                    });
                    // Handle added nodes for initialization
                    mutation.addedNodes.forEach((node) =>
                    {
                        if (node instanceof Element && node.getAttribute('is') in observed)
                        {
                            if (node.akala)
                            {
                                node.akala = new observed[node.getAttribute('is')](node);
                                if (node.isConnected)
                                    node.akala?.connectedCallback?.();
                            }
                        }
                        else if (node instanceof Element)
                            node.querySelectorAll(builtinSelector()).forEach((child) =>
                            {
                                child.akala = new observed[child.getAttribute('is')](child);
                                if (child instanceof Element)
                                    child.akala?.connectedCallback?.();
                            });
                    });
                    break;
            }
        });
    });

    // Start observing
    observer.observe(document.body, {
        attributes: true,
        attributeOldValue: true,
        childList: true,
        subtree: true
    });

    return {
        observe: (tagName: string, builtin: string, target: (new (element: HTMLElement) => Partial<WebComponent>) & { observedAttributes?: string[] }) =>
        {
            if (!observed[tagName])
                observed[tagName] = target;
            if (!builtins[builtin])
                builtins[builtin] = [];
            builtins[builtin].push(tagName);
        }
    }
});


export function webComponent(tagName: string, options?: ElementDefinitionOptions)
{
    return function <T extends Partial<WebComponent>>(target: (new (element: HTMLElement) => T) & { observedAttributes?: string[] })
    {
        let parent = HTMLElement;
        if (options?.extends)
        {
            parent = window[Object.getPrototypeOf(document.createElement(options.extends)).constructor.name] as unknown as typeof HTMLElement;
            if (!supportsCustomBuiltIn)
            {
                console.warn(`Customized built-in elements are not supported in this browser. Using polyfill for ${tagName}.`);
                // Start observing when the first custom built-in element is registered
                builtinObserver().observe(tagName, options.extends, target);
            }
        }

        customElements.define(tagName, class extends parent
        {
            public readonly akala: T;
            constructor()
            {
                super();
                this.akala = new target(this);
            }

            connectedCallback()
            {
                this.akala.connectedCallback?.();
            }

            disconnectedCallback()
            {
                this.akala.disconnectedCallback?.();
            }

            adoptedCallback()
            {
                this.akala.adoptedCallback?.();
            }

            attributeChangedCallback(name: string, oldValue: string, newValue: string)
            {
                this.akala.attributeChangedCallback?.(name, oldValue, newValue);
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


export abstract class AttributeComposer<T> implements Composer<T>
{
    static readonly default = Symbol('ParsedString case');

    protected readonly parser: Parser

    protected allowSubProperties = true;

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

    abstract applyInternal<const TKey extends PropertyKey>(item: Element, options: T, subItem: TKey, value: unknown, oldValue: unknown): Subscription | void;

    apply(item: Element, options: T, _futureParent?: Element | DocumentFragment)
    {
        let bindings: Record<string, Binding<unknown>>;

        const properties: Expressions | undefined = (item.getAttribute(this.attribute) || undefined) && this.parser.parse(item.getAttribute(this.attribute)) as ParsedObject;

        const otherProperties = this.allowSubProperties ? item.getAttributeNames().filter(att => att.startsWith(this.attribute + '-') && item.getAttribute(att)).map(att => [AttributeComposer.toCamelCase(att.substring(this.attribute.length + 1)), this.parser.parse(item.getAttribute(att))] as const) : [];

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
            case !this.allowSubProperties:
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

    getBindings<const TKey extends PropertyKey>(item: Element, options: T, context: Binding<unknown>, member: TKey, source: Expressions)
    {
        const binding = context.pipe<((...args: unknown[]) => unknown) | Record<string, (...args: unknown[]) => unknown>>(source);
        const sub = new ReplaceableSubscription();

        binding.onChanged(ev =>
        {
            const result = this.applyInternal(item, options, member, ev.value, ev.oldValue);
            if (result)
                sub.update(result, true);
        }, true);

        binding.teardown(sub.unsubscribe);
        return [member, binding] as const

    }
}
