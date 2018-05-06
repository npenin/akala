import * as di from '@akala/core'
import { control, BaseControl } from './control'
import { Promisify, Binding } from '@akala/core'

@control()
export class Text extends BaseControl<string>
{
    constructor(name: string)
    {
        super(name || 'text', 400)
    }

    public link(target: any, element: HTMLElement, parameter: Binding | string)
    {
        var self = this;
        if (parameter instanceof Binding)
        {
            parameter.onChanged(function (ev)
            {
                if (di.isPromiseLike(ev.eventArgs.value))
                    ev.eventArgs.value.then(function (value)
                    {
                        self.setValue(element, value);
                    });
                else
                    self.setValue(element, ev.eventArgs.value);
            });
        }
        else
            self.setValue(element, parameter);
    }

    protected setValue(element: Element, value: string)
    {
        element.textContent = value;
    }
}
