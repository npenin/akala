import { control, GenericControlInstance } from './control.js'
import { Binding, inject, PossiblyBound } from '@akala/core'
import { Part as PartService, PartDefinition, PartInstance } from '../part.js'
import { IScope } from '../scope.js';

@control('part', 110)
export class Part extends GenericControlInstance<string | PartDefinition<IScope<unknown>>>
{
    constructor()
    {
        super();
    }


    @inject("akala-services.$part") private partService: PartService;

    public init(): void
    {
        const partService = this.partService;
        if (typeof this.parameter != 'string')
        {
            const nonStringParameter = this.parameter;
            if (nonStringParameter instanceof Binding)
            {
                nonStringParameter.onChanged(ev =>
                {
                    if ((ev.eventArgs.source !== null || ev.eventArgs.value) && typeof ev.eventArgs.value !== 'string')
                        partService.apply(() => this as unknown as PartInstance, ev.eventArgs.value, {})
                });

            }
            else
            {
                const x = nonStringParameter as PossiblyBound<PartDefinition<IScope<unknown>>>;
                if (x.template instanceof Binding)
                    x.template.onChanged((ev) =>
                    {
                        if (x.controller instanceof Binding)
                            partService.apply(() => this as unknown as PartInstance, { controller: x.controller.getValue(), template: ev.eventArgs.value }, {});
                        else
                            partService.apply(() => this as unknown as PartInstance, { controller: x.controller, template: ev.eventArgs.value }, {});
                    });
                else
                {
                    if (x.controller instanceof Binding)
                        partService.apply(() => this as unknown as PartInstance, { controller: x.controller.getValue(), template: x.template }, {});
                    else
                        partService.apply(() => this as unknown as PartInstance, x as PartDefinition<IScope<unknown>>, {});
                }
            }
        }
        else
            partService.register(this.parameter, { scope: this.scope, element: this.element });
    }

}
