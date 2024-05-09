import { control, GenericControlInstance } from './control.js'
import { Binding, inject, PossiblyBound } from '@akala/core'
import type { Part as PartService, PartDefinition, PartInstance } from '../part.js'
import { IScope } from '../scope.js';

@control('part', 110)
export class Part extends GenericControlInstance<string | PartDefinition<IScope<object>>>
{
    @inject("akala-services.$part") private partService: PartService;

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
                const x = nonStringParameter as PossiblyBound<PartDefinition<IScope<object>>>;
                if (x.template instanceof Binding)
                    x.template.onChanged(async (ev) =>
                    {
                        if (x.controller instanceof Binding)
                            partService.apply(() => this as unknown as PartInstance, { controller: await x.controller.getValue(), template: ev.value }, {});
                        else
                            partService.apply(() => this as unknown as PartInstance, { controller: x.controller as PartDefinition<IScope<object>>['controller'], template: ev.value }, {});
                    });
                else
                {
                    if (x.controller instanceof Binding)
                        partService.apply(() => this as unknown as PartInstance, { controller: await x.controller.getValue(), template: x.template as string | Promise<string> }, {});
                    else
                        partService.apply(() => this as unknown as PartInstance, x as PartDefinition<IScope<object>>, {});
                }
            }
        }
        else
            partService.register(this.parameter, { scope: this.scope, element: this.element });
    }

}
