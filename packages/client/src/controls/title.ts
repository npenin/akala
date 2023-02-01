import { control } from './control.js'
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
