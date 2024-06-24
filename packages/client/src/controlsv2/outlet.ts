import { webComponent } from "../behaviors/shared.js";
import { OutletService } from "../outlet.js";
import { DataContext, serviceModule } from "../common.js";

@webComponent('kl-outlet')
export class Outlet
{
    constructor(private element: HTMLElement)
    {
        if (!element.getAttribute('name'))
            element.setAttribute('name', 'main')
    }

    connectedCallback()
    {
        serviceModule.ready(['$outlet'], (outletService: OutletService) => outletService.register(this.element.getAttribute('name'), {
            element: this.element,
            scope: DataContext.find(this.element)
        }));
    }
}