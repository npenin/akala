import * as di from 'akala-core'
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
        if (parameter instanceof di.Binding)
        {
            element.change(function ()
            {
                parameter.setValue($(this).val(), parameter);
            });
            parameter.onChanged(function (target)
            {
                element.val(target.eventArgs.value);
            });
        }
        else
            element.val(parameter);
    }
}
