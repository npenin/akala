import * as di from 'akala-core'
import { control, BaseControl } from './control'
import { Promisify, Binding } from 'akala-core'

@control()
export class Click extends BaseControl<Function>
{
    constructor()
    {
        super('click', 400)
    }

    public link(target: any, element: JQuery, parameter: Binding | Function)
    {
        element.click(function ()
        {
            if (parameter instanceof Binding)
            {
                return di.inject(parameter.getValue())();
            }
            else
                return di.inject(<Function>parameter)();
        });

    }
}
