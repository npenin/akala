import { control } from './control.js'
import { Binding } from '@akala/core'
import * as showdown from 'showdown';
import { Text } from './text.js'

@control('markdown')
export class Markdown extends Text
{
    private markdown = new showdown.Converter();

    public init()
    {
        if (this.parameter instanceof Binding)
            this.parameter.formatter = this.markdown.makeHtml.bind(this.markdown);
    }

    protected setValue(element: Element, value)
    {
        element.innerHTML = this.markdown.makeHtml(value);
    }
}
