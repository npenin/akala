import * as di from '@akala/core'
import { control, BaseControl } from './control'
import { Promisify, Binding } from '@akala/core'

@control()
export class Text extends BaseControl<string>
{
    constructor()
    {
        super('text', 400)
    }

    public link(target: any, element: JQuery, parameter: Binding | string)
    {
        if (parameter instanceof Binding)
        {
            parameter.onChanged(function (ev)
            {
                element.text(ev.eventArgs.value);
            });
        }
        else
            element.text(parameter);

    }
}
