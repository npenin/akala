import { control } from './control.js'
import { Text } from './text.js'

@control('name', 400)
export class Href extends Text
{
    protected setValue(element: Element, value)
    {
        element.attributes['name'] = value;
    }
}
