import { control, GenericControlInstance } from './control'
import { Binding, inject } from '@akala/core'
import { Part as PartService, PartInstance } from '../part'

@control('part', 110)
export class Part extends GenericControlInstance<string | { [property: string]: Binding }>
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
            let nonStringParameter = this.parameter;
            if (nonStringParameter instanceof Binding)
            {
                nonStringParameter.onChanged(ev =>
                {
                    if (ev.eventArgs.source !== null || ev.eventArgs.value)
                        partService.apply(() => this as unknown as PartInstance, ev.eventArgs.value, {})
                });

            }
            else

                if (nonStringParameter.template instanceof Binding)
                    nonStringParameter.template.onChanged((ev) =>
                    {
                        nonStringParameter = (nonStringParameter as { [property: string]: Binding });
                        if (nonStringParameter.controller instanceof Binding)
                            partService.apply(() => this as unknown as PartInstance, { controller: nonStringParameter.controller.getValue(), template: ev.eventArgs.value }, {});
                        else
                            partService.apply(() => this as unknown as PartInstance, { controller: nonStringParameter.controller, template: ev.eventArgs.value }, {});
                    });
                else
                {
                    if (nonStringParameter.controller instanceof Binding)
                        partService.apply(() => this as unknown as PartInstance, { controller: nonStringParameter.controller.getValue(), template: nonStringParameter.template }, {});
                    else
                        partService.apply(() => this as unknown as PartInstance, nonStringParameter, {});
                }
        }
        else
            partService.register(this.parameter, { scope: this.scope, element: this.element });
    }

}
