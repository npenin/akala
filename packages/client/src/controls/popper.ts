import * as popper from '@popperjs/core';
import { BaseControl, control, GenericControlInstance } from './control';
import * as akala from '@akala/core';
import { IScope } from '../scope';

@control('popper', 400)
export class Popper extends GenericControlInstance<popper.Options>
{
    constructor()
    {
        super();
    }

    public init()
    {
        var p: popper.Instance;
        if (this.parameter instanceof akala.Binding)
        {
            this.parameter.onChanged((ev) =>
            {
                if (p)
                    p.destroy();
                p = popper.createPopper(this.element, ev.eventArgs.value)
            })
        }
        else
            p = popper.createPopper(this.element, this.element.parentElement.querySelector(this.parameter['popper']), akala.Binding.unbindify(this.parameter))

        this.element.addEventListener('click', function ()
        {
            if (p)
                p.update()
        });

    }
}