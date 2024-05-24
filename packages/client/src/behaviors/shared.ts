import { SimpleInjector } from "@akala/core";

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

            observedAttributes = target.observedAttributes;

        });
    }
}
export function wcObserve()
{
    return function <T extends HTMLElement>(target: (new (element: HTMLElement, value: any) => T) & { observedAttributes?: string[] }, name: string)
    {
        if (!target.observedAttributes)
            target.observedAttributes = [name];
        else
            target.observedAttributes.push(name);
    }
}