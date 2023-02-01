import * as popper from '@popperjs/core';
import { control, GenericControlInstance } from './control.js';
import * as akala from '@akala/core';

@control('popper', 400)
export class Popper extends GenericControlInstance<popper.Options & { popper: 'string' }>
{
    constructor()
    {
        super();
    }

    public init()
    {
        let p: popper.Instance;
        if (this.parameter instanceof akala.Binding)
        {
            this.parameter.onChanged((ev) =>
            {
                if (p)
                    p.destroy();
                p = popper.createPopper(this.element, this.element.parentElement.querySelector(ev.eventArgs.value.popper), ev.eventArgs.value)
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