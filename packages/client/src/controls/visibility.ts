import * as di from '@akala/core'
import { control, GenericControlInstance } from './control'

function toggleBuilder(element)
{
    let currentDisplay = element.style.display;
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

    public link(target: unknown, element: HTMLElement, parameter: di.Binding<boolean>)
    {
        const toggle = toggleBuilder(element);
        parameter.onChanged(function (ev)
        {
            toggle(!ev.eventArgs.value);
        });
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    public apply() { }
}

@control('show', 400)
export class Show extends GenericControlInstance<boolean>
{
    constructor()
    {
        super()
    }

    public link(target: unknown, element: HTMLElement, parameter: di.Binding<boolean>)
    {
        const toggle = toggleBuilder(element);
        parameter.onChanged(function (ev)
        {
            toggle(ev.eventArgs.value);
        });
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    public apply() { }

}
