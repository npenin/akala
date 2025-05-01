import { a, Control, DataContext, e, s, Template } from "@akala/client";
import { EmptyBinding } from "@akala/core";


export class MasterDetail<T> extends Control<{}, HTMLTemplateElement>
{
    public item = new EmptyBinding<T>();

    public connectedCallback(): void
    {
        const shadow = this.shadowWithStyles({ mode: 'closed' });
        const masterSlot = e('slot');
        const detailSlot = a(s(e('slot'), { name: 'detail' }), { 'data-context': 'item' });
        shadow.replaceChildren(masterSlot, detailSlot);

        DataContext.define(this.element, { item: this.item });
        // DataContext.defineDirect(detailSlot, DataContext.extend(context, null, 'item'));

        this.teardown(Template.composeAll(shadow.childNodes as NodeListOf<Element>, shadow));
    }
}
