import { Resolved, TagRef, TagRefInstance, dom, renderOuter, renderOuterWithDomAPI } from "@akala/pages";
import { computePosition } from "@floating-ui/dom";


@dom.customElement('kl-dropdown', [], 'HTMLElement')
export class Dropdown
{
    static readonly type = 'kl-dropdown';
    attributes?: Record<string, { value: string; }> & { useTriggerSize?: { value: 'true' | 'false' } } = {};

    constructor()
    {
        if (!this.attributes.id)
            this.attributes.id = { value: crypto.randomUUID() };
    }

    async show(this: Resolved<this>, trigger?: HTMLElement)
    {
        if (trigger && Boolean(this.attributes?.useTriggerSize))
        {
            this.style['width'] = trigger.clientWidth + 'px';
        }
        this['showPopover']();
        const position = await computePosition(trigger, this, { placement: 'bottom' });
        this.style.position = position.strategy;
        this.style.left = position.x + 'px';
        this.style.top = position.y + 'px';
    }

    static parentRender(): Partial<dom.Tag<string, Record<string, { value: string; }>>>
    {
        return { attributes: { 'popover': { value: 'auto' } } }
    }

    static preRender(): dom.Tag<string, Record<string, { value: string; }>> | dom.Tag<string, Record<string, { value: string; }>>[]
    {
        return { type: 'script', content: `window.dom=window.dom||{};dom.InlineStyle=${dom.InlineStyle}` } as dom.Script;
    }
};