import * as di from '@akala/core'
import { control, BaseControl } from './control'
import { Promisify, Binding } from '@akala/core'
import { Text } from './text'

@control()
export class Json extends Text
{
    constructor()
    {
        super('json');
    }

    protected setValue(element: Element, value)
    {
        element.textContent = JSON.stringify(value);
    }
}
