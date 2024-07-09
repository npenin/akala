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
            get scope() { return DataContext.find(this.element) }
        }));
    }

    disconnectedCallback()
    {
        serviceModule.injectWithName(['$outlet'], (outletService: OutletService) => outletService.unregister(this.element.getAttribute('name')))();
    }
}