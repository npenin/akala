import { Binding } from "@akala/core";
import { DataBind } from "./common.js";

export function e<K extends keyof HTMLElementTagNameMap>(tagName: K, options?: ElementCreationOptions): HTMLElementTagNameMap[K]
export function e(tagName: string, options?: ElementCreationOptions): HTMLElement
export function e(tagName: string, options?: ElementCreationOptions): HTMLElement
{
    return document.createElement(tagName, options);
}

export function s<T extends object>(target: T, values: Partial<T>)
{
    return DataBind.extend(target, values);
}

export function a<T extends Element>(el: T, name: string): string
export function a<T extends Element>(el: T, name: string, value: string): T
export function a<T extends Element>(el: T, record: Record<string, string>): T
export function a<T extends Element>(el: T, record: string[]): string[]
export function a<T extends Element>(el: T, name: string | string[] | Record<string, string>, value?: string | null)
export function a<T extends Element>(el: T, name: string | string[] | Record<string, string>, value?: string | null)
{
    if (typeof name == 'string')
        if (typeof (value) !== 'undefined')
        {
            if (value === null)
                el.removeAttribute(name);
            else
                el.setAttribute(name, value);
        }
        else
            return el.getAttribute(name);
    else if (Array.isArray(name))
        return name.map(n => el.getAttribute(n));
    else
        Object.entries(name).forEach(([name, value]) => this.attribute(name, value));

    return el;
}

export function c<T extends Element>(el: T, ...classes: string[]): T
{
    el.classList.add(...classes);
    return el;
}

export function content<T extends Element>(el: T, ...children: (Node | Binding<Node>)[]): T
{
    el.replaceChildren(...children.map(c => c instanceof Binding ? c.getValue() : c));
    Binding.combine(...children).onChanged(ev =>
        el.replaceChildren(...ev.value)
    )
    return el;
}

content.p = function cp<T extends Element>(el: T, ...children: Node[]): T
{
    el.append(...children);
    return el;
}

export function t(content: string | number | boolean | bigint)
{
    return document.createTextNode(content?.toString());
}