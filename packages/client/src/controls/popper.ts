import * as popper from '@popperjs/core';
import { BaseControl, control } from './control';
import * as akala from '@akala/core';
import { IScope } from '../scope';

@control()
export class Popper extends BaseControl<popper.Options>
{
    constructor()
    {
        super('popper', 400);
    }

    public link(scope: IScope<any>, element: Element, parameter: akala.Binding | popper.Options)
    {
        var p: popper.Instance;
        if (parameter instanceof akala.Binding)
        {
            parameter.onChanged(function (ev)
            {
                if (p)
                    p.destroy();
                p = popper.createPopper(element, ev.eventArgs.value)
            })
        }
        else
            p = popper.createPopper(element, element.parentElement.querySelector(parameter['popper']), akala.Binding.unbindify(parameter))

        element.addEventListener('click', function ()
        {
            if (p)
                p.update()
        });

    }

    public apply() { }
}