import { Control, wcObserve, pipefromEvent } from '@akala/client';
import { BindingChangedEvent, pipe, Subscription } from '@akala/core';
import { autoUpdate, computePosition, Middleware, Placement } from '@floating-ui/dom'
import css from './popover.css?inline'

@wcObserve('placement')
@wcObserve('middlewares')
@wcObserve('trigger')
@wcObserve('closeonclickoutside')
export class Popover extends Control<{ placement: Placement, trigger: string, middlewares?: Middleware[], closeonclickoutside?: boolean }>
{
    private visible?: Subscription;

    private async placementChanged(trigger: Element, ev: BindingChangedEvent<Placement>, middlewares: Middleware[])
    {
        const result = await computePosition(trigger, this.element, { placement: ev.value, middleware: middlewares });
        this.element.style.left = result.x + 'px';
        this.element.style.top = result.y + 'px';
        this.element.style.position = result.strategy;
        result.middlewareData.parentSize?.minWidth && (this.element.style.minWidth = result.middlewareData.parentSize.minWidth + 'px');
        this.element.style.margin = '0';
    }

    private trigger: HTMLElement;

    public showPopover(trigger: HTMLElement, middlewares: Middleware[])
    {
        this.trigger = trigger;
        console.log('show popover');
        HTMLElement.prototype.showPopover.call(this.element);
        this.visible = this.bind('placement').onChanged((ev) => this.placementChanged(trigger, ev, middlewares), true);
        autoUpdate(trigger, this.element, () => this.placementChanged(trigger, { value: this.bind('placement').getValue(), oldValue: undefined }, middlewares))
    }

    public hidePopover()
    {
        this.trigger = null;
        console.log('hide popover');
        this.visible?.();
        HTMLElement.prototype.hidePopover.call(this.element);
    }

    public togglePopover(trigger: HTMLElement, middlewares: Middleware[], force?: boolean)
    {

        console.log('toggle popover');
        if (HTMLElement.prototype.togglePopover.call(this.element, force))
        {
            this.visible = this.bind('placement').onChanged((ev) => this.placementChanged(trigger, ev, middlewares), true);
            return true;
        }

        return false;
    }

    constructor(element: HTMLElement)
    {
        super(element);
        element.popover = 'manual';

        element.showPopover = () =>
        {
            this.showPopover(document.querySelector(this.attrib('trigger')), this.bind('middlewares').getValue());
        }

        element.hidePopover = () =>
        {
            this.hidePopover();
        }

        element.togglePopover = (force?: boolean) =>
        {
            return this.togglePopover(document.querySelector(this.attrib('trigger')), this.bind('middlewares')?.getValue(), force);
        }
    }

    connectedCallback(): void
    {
        const coco = this.bind('closeonclickoutside');
        if (coco)
        {
            this.teardown(pipefromEvent(pipe(coco.get('change'), ev => [ev.value]), window, 'click').addListener((ev) =>
            {
                const target = ev.target as HTMLElement;
                const trigger = document.querySelector(this.attrib('trigger')) || this.trigger;

                if (trigger?.contains(target) || this.element.contains(target))
                    return;
                if (this.element.checkVisibility())
                    this.element.hidePopover();
            }));
            coco.get('change').emit({ oldValue: undefined, value: coco.getValue() });
        }

        const shadow = this.element.attachShadow({ mode: 'open' });
        const style = shadow.appendChild(document.createElement('style'));
        style.innerHTML = css;

        shadow.appendChild(document.createElement('slot'));
    }
}