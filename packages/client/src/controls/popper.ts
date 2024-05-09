import * as popper from '@popperjs/core';
import { control, GenericControlInstance } from './control.js';
import { Binding } from '@akala/core';

@control('popper', 400)
export class Popper extends GenericControlInstance<popper.Options & { popper: 'string' }>
{
    constructor()
    {
        super();
    }

    public async init()
    {
        let p: popper.Instance;
        if (this.parameter instanceof Binding)
        {
            this.parameter.onChanged((ev) =>
            {
                if (p)
                    p.destroy();
                p = popper.createPopper(this.element, this.element.parentElement.querySelector(ev.value.popper), ev.value)
            })
        }
        else
            p = popper.createPopper(this.element, this.element.parentElement.querySelector(this.parameter['popper']), Binding.unwrap(this.parameter))

        this.element.addEventListener('click', function ()
        {
            if (p)
                p.update()
        });

    }
}