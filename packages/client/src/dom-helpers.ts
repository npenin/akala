import { Binding } from "@akala/core";
import { DataBind } from "./common.js";

/**
 * Creates a new HTML element.
 * @param {string} tagName - The name of the HTML element to create.
 * @param {ElementCreationOptions} [options] - Optional element creation options.
 * @returns {HTMLElement} The created HTML element.
 */
export function e<K extends keyof HTMLElementTagNameMap>(tagName: K, options?: ElementCreationOptions): HTMLElementTagNameMap[K]
export function e(tagName: string, options?: ElementCreationOptions): HTMLElement
export function e(tagName: string, options?: ElementCreationOptions): HTMLElement
{
    return document.createElement(tagName, options);
}

/**
 * Extends the target object with the provided values.
 * @param {object} target - The target object to extend.
 * @param {Partial<object>} values - The values to extend the target object with.
 * @returns {object} The extended target object.
 */
export function s<T extends object>(target: T, values: Partial<T>)
{
    return DataBind.extend(target, values);
}

/**
 * Gets or sets attributes on an element.
 * @param {Element} el - The element to get or set attributes on.
 * @param {string | string[] | Record<string, string>} name - The attribute name(s) or a record of attribute names and values.
 * @param {string | null} [value] - The attribute value to set.
 * @returns {string | string[] | Element} The attribute value(s) or the element.
 */
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

/**
 * Adds classes to an element.
 * @param {Element} el - The element to add classes to.
 * @param {...string} classes - The classes to add.
 * @returns {Element} The element with the added classes.
 */
export function c<T extends Element>(el: T, ...classes: string[]): T
{
    el.classList.add(...classes);
    return el;
}

/**
 * Replaces the children of an element with the provided nodes or bindings.
 * @param {Element} el - The element to replace children of.
 * @param {...(Node | Binding<Node>)} children - The nodes or bindings to replace the children with.
 * @returns {Element} The element with the replaced children.
 */
export function content<T extends Element>(el: T, ...children: (Node | Binding<Node>)[]): T
{
    el.replaceChildren(...children.map(c => c instanceof Binding ? c.getValue() : c));
    Binding.combine(...children).onChanged(ev =>
        el.replaceChildren(...ev.value)
    )
    return el;
}

/**
 * Appends children to an element.
 * @param {Element} el - The element to append children to.
 * @param {...Node} children - The children to append.
 * @returns {Element} The element with the appended children.
 */
content.p = function cp<T extends Element>(el: T, ...children: Node[]): T
{
    el.append(...children);
    return el;
}

/**
 * Creates a new text node.
 * @param {string | number | boolean | bigint} content - The content of the text node.
 * @returns {Text} The created text node.
 */
export function t(content: string | number | boolean | bigint)
{
    return document.createTextNode(content?.toString());
}
