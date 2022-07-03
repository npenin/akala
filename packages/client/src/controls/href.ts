import { control } from './control'
import { Text } from './text'

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
