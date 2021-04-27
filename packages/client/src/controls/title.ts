import * as di from '@akala/core'
import { control, BaseControl } from './control.js'
import { Promisify, Binding } from '@akala/core'
import { Text } from './text.js'

@control('title')
export class Title extends Text
{
    constructor()
    {
        super()
    }


    protected setValue(element: Element, value)
    {
        element.attributes['title'] = value;
    }
}
