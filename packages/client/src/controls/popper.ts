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
        var popper: popper.default;
        if (parameter instanceof akala.Binding)
        {
            parameter.onChanged(function (ev)
            {
                if (popper)
                    popper.destroy();
                popper = new popperCl(element, ev.eventArgs.value)
            })
        }
        else
            popper = new popperCl(element, element.parentElement.querySelector(parameter['popper']), akala.Binding.unbindify(parameter))

        element.addEventListener('click', function ()
        {
            if (popper)
                popper.scheduleUpdate()
        });

    }
}