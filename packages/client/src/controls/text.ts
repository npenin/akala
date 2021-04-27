import * as di from '@akala/core'
import { control, GenericControlInstance, Control } from './control.js'
import { Binding, extendInject } from '@akala/core'
import { IScope } from '../clientify.js';

@control('text', 400)
export class Text extends GenericControlInstance<string>
{
    constructor()
    {
        super();
    }

    public init()
    {
        if (this.parameter instanceof Binding)
        {
            const stopWatch = this.parameter.onChanged((ev) =>
            {
                if (di.isPromiseLike(ev.eventArgs.value))
                    ev.eventArgs.value.then(function (value)
                    {
                        this.apply(value);
                    });
                else
                    this.apply(ev.eventArgs.value);
            });
            if (stopWatch)
                this.stopWatches.push(stopWatch);
        }
        else
            this.apply(this.parameter);
    }

    public apply(value: string)
    {
        this.element.textContent = value;
    }
}
