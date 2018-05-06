import { default as popper } from 'popper.js';
import { BaseControl } from './control';
import * as akala from '@akala/core';
import { IScope } from '../scope';

export class Popper extends BaseControl<popper.PopperOptions>
{
    constructor()
    {
        super('popper', 400);
    }

    public link(scope: IScope<any>, element: Element, parameter: akala.Binding | popper.PopperOptions)
    {
        if (parameter instanceof akala.Binding)
        {
            parameter.onChanged(function (ev)
            {
                new popper(element, document.querySelector(ev.eventArgs.value.popper), ev.eventArgs.value)
            })
        }
        else
            new popper(element, document.querySelector(parameter['popper']), akala.Binding.unbindify(parameter))

    }
}