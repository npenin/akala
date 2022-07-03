import { control } from './control'
import { Text } from './text'

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
