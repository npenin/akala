import * as di from '@akala/core'
import { control, BaseControl } from './control'
import { Promisify, Binding } from '@akala/core'
import { Text } from './text'

@control()
export class Title extends Text
{
    constructor()
    {
        super('title')
    }


    protected setValue(element: JQuery, value)
    {
        element.attr('title', value);
    }
}
