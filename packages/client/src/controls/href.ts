import { control, BaseControl, Control } from './control.js'
import { Promisify, Binding, extendInject } from '@akala/core'
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
