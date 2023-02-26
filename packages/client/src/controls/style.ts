import * as akala from '@akala/core'
import { control } from './control.js'
import { Binding } from '@akala/core'
import { Text } from './text.js'

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

@control('css')
export class Style extends Text
{
    constructor()
    {
        super();
    }

    protected setValue(element: HTMLElement, value)
    {
        setProperty(element.style, value);
    }
}
