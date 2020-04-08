import { control, BaseControl } from './control'
import { IScope } from '../scope'
import { Binding } from '@akala/core'
import { Part as PartService } from '../part'

function noop() { }

@control("$modules.akala-services.$part")
export class Part extends BaseControl<string | { [property: string]: Binding }>
{
    constructor(private partService: PartService)
    {
        super('part', 100)
    }

    public link(target: IScope<any>, element: HTMLElement, parameter: string | { [property: string]: Binding })
    {
        var partService = this.partService;
        if (typeof parameter != 'string')
        {
            if (parameter instanceof Binding)
            {
                parameter.onChanged(function (ev)
                {
                    var part = ev.eventArgs.value;
                    if (part)
                        if (part.template instanceof Binding)
                            part.onChanged(function (ev)
                            {
                                if (part.controller instanceof Binding)
                                    partService.apply(function () { return { scope: target, element: element } }, { controller: part.controller.getValue(), template: ev.eventArgs.value }, {}, noop);
                                else
                                    partService.apply(function () { return { scope: target, element: element } }, { controller: <any>part.controller, template: ev.eventArgs.value }, {}, noop);
                            });
                        else
                            if (part.controller instanceof Binding)
                                partService.apply(function () { return { scope: target, element: element } }, { controller: part.controller.getValue(), template: <string><any>part.template }, {}, noop);
                            else
                                partService.apply(function () { return { scope: target, element: element } }, part, {}, noop);
                })
            }
            else if (parameter.template instanceof Binding)
                parameter.template.onChanged(function (ev)
                {
                    if (parameter.controller instanceof Binding)
                        partService.apply(function () { return { scope: target, element: element } }, { controller: parameter.controller.getValue(), template: ev.eventArgs.value }, {}, noop);
                    else
                        partService.apply(function () { return { scope: target, element: element } }, { controller: <any>parameter.controller, template: ev.eventArgs.value }, {}, noop);
                });
            else
                if (parameter.controller instanceof Binding)
                    partService.apply(function () { return { scope: target, element: element } }, { controller: parameter.controller.getValue(), template: <string><any>parameter.template }, {}, noop);
                else
                    partService.apply(function () { return { scope: target, element: element } }, parameter, {}, noop);
        }
        else
            partService.register(parameter, { scope: target, element: element });
    }
}
