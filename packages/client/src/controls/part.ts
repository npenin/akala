import * as di from 'akala-core'
import { control, BaseControl } from './control'
import { IScope } from '../scope'
import { Promisify, Binding } from 'akala-core'
import { Part as PartService } from '../part'

@control("$part")
export class Part extends BaseControl<string>
{
    constructor(private partService: PartService)
    {
        super('part', 100)
    }

    public link(target: IScope, element: JQuery, parameter: string | Binding)
    {
        var partService = this.partService;
        if (parameter instanceof Binding)
        {
            new Binding('template', parameter.target).onChanged(function (ev)
            {
                partService.apply(function () { return { scope: target, element: element } }, parameter.target, {}, $.noop);
            });
        }
        else
            partService.register(parameter, { scope: target, element: element });
    }
}
