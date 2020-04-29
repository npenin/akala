import * as di from '@akala/core'
import { control, BaseControl } from './control'
import { Promisify, Binding } from '@akala/core'
import { IScope } from '../clientify';

@control()
export class Text extends BaseControl<string>
{
    constructor(name: string)
    {
        super(name || 'text', 400)
    }

    public link(scope: IScope<any>, element: HTMLElement, parameter: Binding | string)
    {
        var self = this;
        if (parameter instanceof Binding)
        {
            parameter.onChanged(function (ev)
            {
                if (di.isPromiseLike(ev.eventArgs.value))
                    ev.eventArgs.value.then(function (value)
                    {
                        self.apply(scope, element, value);
                    });
                else
                    self.apply(scope, element, ev.eventArgs.value);
            });
        }
        else
            self.apply(scope, element, parameter);
    }

    public apply(_scope: IScope<any>, element: Element, value: string)
    {
        element.textContent = value;
    }
}
