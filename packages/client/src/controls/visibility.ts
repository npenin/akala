import * as di from '@akala/core'
import { control, BaseControl } from './control'
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

@control()
export class Hide extends BaseControl<di.Binding>
{
    constructor()
    {
        super('hide', 400)
    }

    public link(target: any, element: HTMLElement, parameter: di.Binding)
    {
        var toggle = toggleBuilder(element);
        parameter.onChanged(function (ev)
        {
            toggle(!ev.eventArgs.value);
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

    public link(target: any, element: HTMLElement, parameter: di.Binding)
    {
        var toggle = toggleBuilder(element);
        parameter.onChanged(function (ev)
        {
            toggle(ev.eventArgs.value);
        });
    }
}
