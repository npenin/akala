import { control } from './control'
import { Text } from './text'

@control('name', 400)
export class Href extends Text
{
    protected setValue(element: Element, value)
    {
        element.attributes['name'] = value;
    }
}
