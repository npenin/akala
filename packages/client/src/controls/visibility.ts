import * as di from '@akala/core'
import { control, BaseControl } from './control'
import { Promisify, ObservableArray, ObservableArrayEventArgs, Binding } from '@akala/core'

@control()
export class Hide extends BaseControl<di.Binding>
{
    constructor()
    {
        super('hide', 400)
    }

    public link(target: any, element: JQuery, parameter: di.Binding)
    {
        parameter.onChanged(function (ev)
        {
            element.toggle(!ev.eventArgs.value);
        });
    }
}

@control()
export class Show extends BaseControl<di.Binding>
{
    constructor()
    {
        super('show', 400)
    }

    public link(target: any, element: JQuery, parameter: di.Binding)
    {
        parameter.onChanged(function (ev)
        {
            element.toggle(ev.eventArgs.value);
        });
    }
}
