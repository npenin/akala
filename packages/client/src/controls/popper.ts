import * as popper from 'popper.js';
import { BaseControl, control } from './control';
import * as akala from '@akala/core';
import { IScope } from '../scope';

const popperCl: typeof popper.default = <any>popper;

@control()
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
                new popperCl(element, ev.eventArgs.value)
            })
        }
        else
            new popperCl(element, element.parentElement.querySelector(parameter['popper']), akala.Binding.unbindify(parameter))

    }
}