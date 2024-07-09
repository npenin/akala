import { control, GenericControlInstance } from './control.js'
import { Binding, inject, PossiblyBound } from '@akala/core'
import type { OutletService, OutletDefinition, PartInstance } from '../outlet.js'
import { IScope } from '../scope.js';

@control('outlet', 110)
export class Outlet extends GenericControlInstance<string | OutletDefinition<IScope<object>>>
{
    @inject("akala-services.$outlet") private partService: OutletService;

    public async init(): Promise<void>
    {
        const partService = this.partService;
        if (typeof this.parameter != 'string')
        {
            const nonStringParameter = this.parameter;
            if (nonStringParameter instanceof Binding)
            {
                nonStringParameter.onChanged(ev =>
                {
                    // if ((ev.eventArgs.source !== null || ev.value) && typeof ev.value !== 'string')
                    if ((ev.value) && typeof ev.value !== 'string')
                        partService.apply(() => this as unknown as PartInstance, ev.value, {})
                });

            }
            else
            {
                const x = nonStringParameter as PossiblyBound<OutletDefinition<IScope<object>>>;
                if (x.template instanceof Binding)
                    x.template.onChanged(async (ev) =>
                    {
                        if (x.controller instanceof Binding)
                            partService.apply(() => this as unknown as PartInstance, { controller: await x.controller.getValue(), template: ev.value }, {});
                        else
                            partService.apply(() => this as unknown as PartInstance, { controller: x.controller as OutletDefinition<IScope<object>>['controller'], template: ev.value }, {});
                    });
                else
                {
                    if (x.controller instanceof Binding)
                        partService.apply(() => this as unknown as PartInstance, { controller: await x.controller.getValue(), template: x.template as string | Promise<string> }, {});
                    else
                        partService.apply(() => this as unknown as PartInstance, x as OutletDefinition<IScope<object>>, {});
                }
            }
        }
        else
            partService.register(this.parameter, { scope: new Binding(this.scope, null), element: this.element });
    }

}
