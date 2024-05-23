import { control, GenericControlInstance } from './control.js'
import { Binding, isPromiseLike } from '@akala/core'

@control('text', 400)
export class Text extends GenericControlInstance<string>
{
    constructor()
    {
        super();
    }

    public async init()
    {
        if (this.parameter instanceof Binding)
        {
            const stopWatch = this.parameter.onChanged((ev) =>
            {
                if (isPromiseLike(ev.value))
                    ev.value.then(function (value)
                    {
                        this.apply(value);
                    });
                else
                    this.apply(ev.value);
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
