import * as di from '@akala/core'
import { control, BaseControl } from './control'
import { Promisify, Binding } from '@akala/core'
import { Text } from './text'

@control('name', 400)
export class Href extends Text
{
    protected setValue(element: Element, value)
    {
        element.attributes['name'] = value;
    }
}
