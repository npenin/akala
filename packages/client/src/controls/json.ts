import { control } from './control.js'
import { Text } from './text.js'

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
