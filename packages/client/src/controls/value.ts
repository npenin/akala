import * as di from '@akala/core'
import { control, BaseControl } from './control'

@control()
export class Value extends BaseControl<string>
{
    constructor()
    {
        super('value', 400)
    }

    public link(target: any, element: JQuery, parameter: di.Binding | string)
    {
        if (typeof (parameter) == 'undefined')
            return;
        if (parameter instanceof di.Binding)
        {
            element.change(function ()
            {
                parameter.setValue(element.val(), parameter);
            });
            parameter.onChanged(function (ev)
            {
                if (parameter !== ev.source)
                    element.val(ev.eventArgs.value);
            });
        }
        else
            element.val(parameter);
    }
}
