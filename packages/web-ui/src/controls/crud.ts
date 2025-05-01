import { Control } from "@akala/client";

export enum EntityViewState
{
    New = 'new',
    View = 'view',
    Edit = 'edit',
    Delete = 'delete',
}

export class Entity extends Control<{ state: EntityViewState, }, HTMLElement>
{
    constructor(el: HTMLElement)
    {
        super(el);
    }

    public connectedCallback(): void
    {
        const shadow = this.shadowWithStyles({ mode: 'closed' })
        this.teardown(this.bind('state').onChanged(ev =>
        {
            const template = this.element.querySelector<HTMLTemplateElement>(`template[name=${ev.value}]`);

            if (template)
                shadow.replaceChildren(template.content.cloneNode(true));
            else
                shadow.replaceChildren();
        }, true))
    }
}
