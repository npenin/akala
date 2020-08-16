import { control, GenericControlInstance, Control } from './control'
import { Binding, inject, extendInject } from '@akala/core'
import { Part as PartService, PartDefinition } from '../part'

function noop() { }

@control('part', 110)
export class Part extends GenericControlInstance<string | { [property: string]: Binding }>
{
    constructor()
    {
        super();
    }

    @inject("akala-services.$part") private partService: PartService;

    public init()
    {
        var partService = this.partService;
        if (typeof this.parameter != 'string')
        {
            var nonStringParameter = this.parameter;
            if (nonStringParameter instanceof Binding)
            {
                nonStringParameter.onChanged(ev =>
                {
                    if (ev.source !== null || ev.eventArgs.value)
                        partService.apply(() => ({ scope: this.scope, element: this.element }), ev.eventArgs.value, {}, noop)
                });

            }
            else

                if (nonStringParameter.template instanceof Binding)
                    nonStringParameter.template.onChanged((ev) =>
                    {
                        var nonStringParameter = (nonStringParameter as { [property: string]: Binding });
                        if (nonStringParameter.controller instanceof Binding)
                            partService.apply(() => ({ scope: this.scope, element: this.element }), { controller: nonStringParameter.controller.getValue(), template: ev.eventArgs.value }, {}, noop);
                        else
                            partService.apply(() => ({ scope: this.scope, element: this.element }), { controller: nonStringParameter.controller, template: ev.eventArgs.value }, {}, noop);
                    });
                else
                {
                    if (nonStringParameter.controller instanceof Binding)
                        partService.apply(() => ({ scope: this.scope, element: this.element }), { controller: nonStringParameter.controller.getValue(), template: nonStringParameter.template }, {}, noop);
                    else
                        partService.apply(() => ({ scope: this.scope, element: this.element }), nonStringParameter, {}, noop);
                }
        }
        else
            partService.register(this.parameter, { scope: this.scope, element: this.element });
    }

}
