import { control } from './control.js'
import { Text } from './text.js'

@control('href')
export class Href extends Text
{
    constructor()
    {
        super();
    }


    public apply(value: string)
    {
        this.element.attributes['href'] = value;
    }
}
