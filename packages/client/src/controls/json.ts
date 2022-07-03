import { control } from './control'
import { Text } from './text'

@control('json')
export class Json extends Text
{
    constructor()
    {
        super();
    }

    protected setValue(element: Element, value)
    {
        element.textContent = JSON.stringify(value);
    }
}
