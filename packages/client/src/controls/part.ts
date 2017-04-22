import * as di from '@akala/core'
import { control, BaseControl } from './control'
import { IScope } from '../scope'
import { Promisify, Binding } from '@akala/core'
import { Part as PartService } from '../part'

@control("$part")
export class Part extends BaseControl<string | { [property: string]: Binding }>
{
    constructor(private partService: PartService)
    {
        super('part', 100)
    }

    public link(target: IScope<any>, element: JQuery, parameter: string | { [property: string]: Binding })
    {
        var partService = this.partService;
        if (typeof parameter != 'string')
        {
            parameter['template'].onChanged(function (ev)
            {
                partService.apply(function () { return { scope: parameter, element: element } }, { controller: <any>parameter.controller, template: ev.eventArgs.value }, {}, $.noop);
            });
        }
        else
            partService.register(parameter, { scope: target, element: element });
    }
}
