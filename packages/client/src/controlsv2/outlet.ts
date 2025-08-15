import { webComponent } from "../behaviors/shared.js";
import { OutletService } from "../outlet.js";
import { serviceModule } from "../common.js";

@webComponent('kl-outlet')
export class Outlet
{
    constructor(private readonly element: HTMLElement)
    {
        if (!element.getAttribute('name'))
            element.setAttribute('name', 'main')
    }

    connectedCallback()
    {
        serviceModule.ready([OutletService.InjectionToken], (outletService: OutletService) => outletService.register(this.element.getAttribute('name'), {
            element: this.element,
        }));
    }

    disconnectedCallback()
    {
        serviceModule.injectWithName([OutletService.InjectionToken], (outletService: OutletService) => outletService.unregister(this.element.getAttribute('name')))();
    }
}
