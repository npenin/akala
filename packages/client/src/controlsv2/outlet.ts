import { webComponent } from "../behaviors/shared.js";
import { OutletService } from "../outlet.js";
import { bootstrapModule, DataContext, serviceModule } from "../common.js";

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
            get scope() { return DataContext.find(this.element)?.getValue()?.context || bootstrapModule.resolve('templateOptions') }
        }));
    }

    disconnectedCallback()
    {
        serviceModule.injectWithName([OutletService.InjectionToken], (outletService: OutletService) => outletService.unregister(this.element.getAttribute('name')))();
    }
}
