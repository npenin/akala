import { control, BaseControl } from './control'
import { IScope } from '../scope'
import { Binding, Proxy } from '@akala/core'
import { Part as PartService, PartDefinition } from '../part'

function noop() { }

@control("akala-services.$part")
export class Part extends BaseControl<string | { [property: string]: Binding }>
{
    constructor(private partService: PartService)
    {
        super('part', 100)
    }

    public apply(scope: IScope<any>, element: HTMLElement, parameter: string | PartDefinition<typeof scope> | Proxy<PartDefinition<typeof scope>, Binding>)
    {
        var partService = this.partService;
        if (typeof parameter != 'string')
            if (parameter.template instanceof Binding)
                parameter.template.onChanged(function (ev)
                {
                    if (parameter.controller instanceof Binding)
                        partService.apply(function () { return { scope, element } }, { controller: parameter.controller.getValue(), template: ev.eventArgs.value }, {}, noop);
                    else
                        partService.apply(function () { return { scope, element } }, { controller: <any>parameter.controller, template: ev.eventArgs.value }, {}, noop);
                });
            else
                if (parameter.controller instanceof Binding)
                    partService.apply(function () { return { scope, element } }, { controller: parameter.controller.getValue(), template: parameter.template }, {}, noop);
                else
                    partService.apply(function () { return { scope, element } }, parameter as PartDefinition<typeof scope>, {}, noop);

        else
            partService.register(parameter, { scope, element });
    }

}
