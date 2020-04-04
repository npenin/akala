import { control } from './control'
import { Binding } from '@akala/core'
import * as showdown from 'showdown';
import { Text } from './text'

@control()
export class Markdown extends Text
{
    constructor()
    {
        super('markdown')
    }
    private markdown = new showdown.Converter();

    public link(target: any, element: HTMLElement, parameter: Binding)
    {
        if (parameter instanceof Binding)
        {
            parameter.formatter = this.markdown.makeHtml.bind(this.markdown);
        }
        super.link(target, element, parameter);
    }

    protected setValue(element: Element, value)
    {
        element.innerHTML = this.markdown.makeHtml(value);
    }
}
