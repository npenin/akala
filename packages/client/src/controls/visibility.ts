import * as di from '@akala/core'
import { control, BaseControl, GenericControlInstance } from './control'
import { Promisify, ObservableArray, ObservableArrayEventArgs, Binding } from '@akala/core'
import { Template } from '../template';

function toggleBuilder(element)
{
    var currentDisplay = element.style.display;
    if (currentDisplay == 'none')
    {
        currentDisplay = document.createElement(element.tagName).style.display;
    }
    return function (show?: boolean)
    {
        if (!show)
            element.style.display = 'none';
        else
            element.style.display = currentDisplay;
    }
}

@control('hide', 400)
export class Hide extends GenericControlInstance<void>
{
    constructor()
    {
        super();
    }

    public link(target: any, element: HTMLElement, parameter: di.Binding)
    {
        var toggle = toggleBuilder(element);
        parameter.onChanged(function (ev)
        {
            toggle(!ev.eventArgs.value);
        });
    }

    public apply() { }
}

@control('show', 400)
export class Show extends GenericControlInstance<di.Binding>
{
    constructor()
    {
        super()
    }

    public link(target: any, element: HTMLElement, parameter: di.Binding)
    {
        var toggle = toggleBuilder(element);
        parameter.onChanged(function (ev)
        {
            toggle(ev.eventArgs.value);
        });
    }

    public apply() { }

}
