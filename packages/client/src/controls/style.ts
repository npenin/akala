import * as akala from '@akala/core'
import { control, BaseControl } from './control'
import { Promisify, Binding } from '@akala/core'
import { Text } from './text'

function setProperty(style, value)
{
    if (value)
    {
        akala.each(value, function (value, prop)
        {
            if (typeof (value) != 'object')
                style[prop] = value;
            else if (value instanceof Binding)
            {
                value.onChanged(function (ev)
                {
                    style[prop] = ev.eventArgs.value;
                });
            }
            else
                setProperty(style[prop], value);
        })
    }
}

@control()
export class Style extends Text
{
    constructor()
    {
        super('css');
    }

    protected setValue(element: HTMLElement, value)
    {
        setProperty(element.style, value);
    }
}
