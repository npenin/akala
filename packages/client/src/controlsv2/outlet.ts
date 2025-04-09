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
        serviceModule.ready(['$outlet'], (outletService: OutletService) => outletService.register(this.element.getAttribute('name'), {
            element: this.element,
            get scope() { return DataContext.find(this.element)?.getValue()?.context || bootstrapModule.resolve('$rootScope') }
        }));
    }

    disconnectedCallback()
    {
        serviceModule.injectWithName(['$outlet'], (outletService: OutletService) => outletService.unregister(this.element.getAttribute('name')))();
    }
}
