import { Control, wcObserve, webComponent } from '@akala/client';
import { Subscription } from '@akala/core';
import { computePosition, Middleware, Placement } from '@floating-ui/dom'

@webComponent('kl-dropdown')
@wcObserve('placement')
@wcObserve('middlewares')
@wcObserve('trigger')
export class Popover extends Control<{ placement: Placement, trigger: string, middlewares: Middleware[] }>
{
    private visible?: Subscription;

    constructor(element: HTMLElement)
    {
        super(element);
        element.popover = 'manual';
        element.showPopover = () =>
        {
            const trigger = document.querySelector(this.attrib('trigger'));
            console.log('show popover');
            HTMLElement.prototype.showPopover.call(this.element);
            this.visible = this.bind('placement').onChanged(async (ev) =>
            {
                const result = await computePosition(trigger, this.element, { placement: ev.value, middleware: this.bind('middlewares').getValue() });
                this.element.style.left = result.x + 'px';
                this.element.style.top = result.y + 'px';
                this.element.style.position = result.strategy;
                this.element.style.margin = '0';
            }, true);
        }

        element.hidePopover = () =>
        {
            console.log('hide popover');
            this.visible?.();
            HTMLElement.prototype.hidePopover.call(this.element);
        }
        element.togglePopover = (force?: boolean) =>
        {
            console.log('toggle popover');
            if (HTMLElement.prototype.togglePopover.call(this.element, force))
            {
                const trigger = element.querySelector(this.bindings.trigger.getValue());
                this.visible = this.bind('placement').onChanged(async (ev) =>
                {
                    const result = await computePosition(trigger, this.element, { placement: ev.value, middleware: this.bind('middlewares').getValue() });
                    this.element.style.x = result.x + 'px';
                    this.element.style.y = result.y + 'px';
                }, true);
                return true;
            }

            return false;
        }
    }

    connectedCallback(): void
    {
    }
}