import { webComponent } from "@akala/client";
import { dom } from "@akala/pages";

@webComponent('kl-test')
export class Test implements dom.CustomTagInstance
{
    static readonly type = 'kl-test';

    constructor()
    {
    }


    connectedCallback()
    {
        console.log("Custom element added to page.");
    }

    disconnectedCallback()
    {
        console.log("Custom element removed from page.");
    }

    adoptedCallback()
    {
        console.log("Custom element moved to new page.");
    }

    attributeChangedCallback(name, oldValue, newValue)
    {
        console.log(`Attribute ${name} has changed.`);
    }
}
