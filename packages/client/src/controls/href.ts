import { control, BaseControl, Control } from './control'
import { Promisify, Binding, extendInject } from '@akala/core'
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
