import { Control, wcObserve, pipefromEvent } from '@akala/client';
import { BindingChangedEvent, pipe, Subscription } from '@akala/core';
import { computePosition, Middleware, Placement } from '@floating-ui/dom'

@wcObserve('placement')
@wcObserve('middlewares')
@wcObserve('trigger')
@wcObserve('closeonclickoutside')
export class Popover extends Control<{ placement: Placement, trigger: string, middlewares?: Middleware[], closeonclickoutside?: boolean }>
{
    private visible?: Subscription;

    private async placementChanged(trigger: Element, ev: BindingChangedEvent<Placement>)
    {
        const result = await computePosition(trigger, this.element, { placement: ev.value, middleware: this.bind('middlewares')?.getValue() });
        this.element.style.left = result.x + 'px';
        this.element.style.top = result.y + 'px';
        this.element.style.position = result.strategy;
        this.element.style.margin = '0';
    }

    constructor(element: HTMLElement)
    {
        super(element);
        element.popover = 'manual';

        element.showPopover = () =>
        {
            const trigger = document.querySelector(this.attrib('trigger'));
            console.log('show popover');
            HTMLElement.prototype.showPopover.call(this.element);
            this.visible = this.bind('placement').onChanged((ev) => this.placementChanged(trigger, ev), true);
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
                this.visible = this.bind('placement').onChanged((ev) => this.placementChanged(trigger, ev), true);
                return true;
            }

            return false;
        }
    }

    connectedCallback(): void
    {
        const coco = this.bind('closeonclickoutside');
        this.teardown(pipefromEvent(pipe(coco.get('change'), ev => [ev.value]), window, 'click').addListener((ev) =>
        {
            const target = ev.target as HTMLElement;
            const trigger = document.querySelector(this.attrib('trigger'));

            if (trigger?.contains(target) || this.element.contains(target))
                return;
            if (this.element.checkVisibility())
                this.element.hidePopover();
        }));
        coco.get('change').emit({ oldValue: undefined, value: coco.getValue() });
    }
}