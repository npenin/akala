import * as di from '@akala/core'
import { control, BaseControl } from './control'
import { Promisify, Binding } from '@akala/core'

@control()
export class Json extends BaseControl<string>
{
    constructor()
    {
        super('json', 400)
    }

    public link(target: any, element: JQuery, parameter: Binding | string)
    {
        if (parameter instanceof Binding)
        {
            parameter.onChanged(function (ev)
            {
                element.text(JSON.stringify(ev.eventArgs.value));
            });
        }
        else
            element.text(JSON.stringify(parameter));
    }
}
