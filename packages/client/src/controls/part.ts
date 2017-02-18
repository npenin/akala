import * as di from 'akala-core'
import { control, BaseControl } from './control'
import { Promisify, Binding } from 'akala-core'
import { Part as PartService } from '../part'

@control("$part")
export class Part extends BaseControl<string>
{
    constructor(private partService: PartService)
    {
        super('part', 100)
    }

    public link(target: any, element: JQuery, parameter: string)
    {
        this.partService.register(parameter, { scope: target, element: element });
    }
}
