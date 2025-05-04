import { webComponent } from "@akala/client";
import { dom } from "@akala/pages";
import { Dropdown as WebUIDropdown } from "@akala/web-ui";


@webComponent('kl-select')
export class Select extends WebUIDropdown
{
    static readonly type = 'kl-select';
    attributes?: Record<string, { value: string; }> & { useTriggerSize?: { value: 'true' | 'false' } } = {};

    constructor()
    {
        super(null);
        if (!this.attributes.id)
            this.attributes.id = { value: crypto.randomUUID() };
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
