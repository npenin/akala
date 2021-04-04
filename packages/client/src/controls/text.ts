import * as di from '@akala/core'
import { control, GenericControlInstance, Control } from './control'
import { Binding, extendInject } from '@akala/core'
import { IScope } from '../clientify';

@control('text', 400)
export class Text extends GenericControlInstance<string>
{
    constructor()
    {
        super();
    }

    public init()
    {
        const self = this;
        if (this.parameter instanceof Binding)
        {
            const stopWatch = this.parameter.onChanged(function (ev)
            {
                if (di.isPromiseLike(ev.eventArgs.value))
                    ev.eventArgs.value.then(function (value)
                    {
                        self.apply(value);
                    });
                else
                    self.apply(ev.eventArgs.value);
            });
            if (stopWatch)
                this.stopWatches.push(stopWatch);
        }
        else
            self.apply(this.parameter);
    }

    public apply(value: string)
    {
        this.element.textContent = value;
    }
}
