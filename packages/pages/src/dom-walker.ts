import { CompositeTag, Document, Tag, TextTag } from "./dom.js";

export type Walker<T> = (tag: Tag<any> | Document, walker: Walker<T>) => T

function renderAttributes(attributes: Tag<any>['attributes'])
{
    if (!attributes)
        return '';
    const result = Object.entries(attributes).map(e => `${e[0]}="${e[1].value.replace(/"/g, '&quot;')}"`).join(' ')
    if (result)
        return ' ' + result;
    return '';
}

export function renderInner(tag: Tag<any> | CompositeTag<any> | TextTag<any>, indent?: string)
{
    if ('content' in tag)
        if (typeof (tag.content) === 'string')
        {
            if (tag.content)
                return indent + tag.content;
        }
        else
            return tag.content.map(v => renderOuter(v, indent)).join(indent)
    return '';
}

export function escapeXml(text: string)
{
    return text.replace(/<>/g, m =>
    {
        switch (m)
        {
            case '<':
                return '&lt;';
            case '>':
                return '&gt;';
        }
    });
}

function indent(prefix: string)
{
    if (prefix.length)
        prefix += '\t'
    return prefix;
}
function outdent(prefix: string)
{
    if (prefix.length > 1)
        prefix = prefix.substring(0, prefix.length - 1);
    return prefix;
}

export function renderOuter(tag: Tag<any> | CompositeTag<Exclude<any, 'html'>> | Tag<Exclude<any, 'html'>> | TextTag<Exclude<any, 'html'>> | Document, prefix?: string)
{
    switch (tag.type)
    {
        case '':
            if ('content' in tag && typeof (tag.content) === 'string')
            {
                let result: string = '';
                if (tag.render)
                    result = tag.render(result, tag, prefix) || result;
                result += prefix + tag.content;
                if (tag.renderWithChildren)
                    result = tag.renderWithChildren(result, tag, prefix) || result;
                return result;
            }
        case 'html':
            let head = ''
            const html = tag as Document;
            if (html.head)
            {
                prefix = indent(prefix);
                if (html.head.title)
                    head += prefix + renderOuter({ type: 'title', content: html.head.title }, '')
                if (html.head.meta)
                    head += Object.entries(html.head.meta).map(meta => renderOuter({ type: 'meta', attributes: { name: { value: meta[0] }, content: meta[1] } }, prefix))
                if (html.head.links)
                    head += html.head.links.map(link => renderOuter({ type: 'link', attributes: { rel: link.rel, href: link.src } }, prefix)).join('')
                if (html.head.jsInit)
                    head += html.head.jsInit.map(v => renderOuter(v, prefix)).join('');
                prefix = outdent(prefix);
            }
            return `<${tag.type}${renderAttributes(tag.attributes)}>${prefix}<head>${head}${prefix}</head>${prefix}<body>${html.body.map(v => renderOuter(v, indent(prefix))).join('')}${prefix}<body>${prefix}</${tag.type}>`;

        default:
            let result: string;
            if ('classes' in tag && tag.classes?.length)
                result = `${prefix}<${tag.type}${renderAttributes({ 'class': { value: tag.classes.join(' '), ...tag.attributes } })}>`;
            result = `${prefix}<${tag.type}${renderAttributes(tag.attributes)}>`
            if (tag.render)
                result = tag.render(result, tag, prefix) || result;


            let inner = renderInner(tag, indent(prefix));
            if (inner && prefix)
                inner += prefix;
            result += inner;

            result += `</${tag.type}>`;

            if (tag.event?.renderWithChildren)
                return tag.renderWithChildren(result, tag, prefix) || result;

            return result;
    }
}

export function renderOuterWithDomAPI(tag: CompositeTag<Exclude<any, 'html'>> | Tag<Exclude<any, 'html'>> | TextTag<Exclude<any, 'html'>> | Document, prefix?: string): Node
{
    switch (tag.type)
    {
        case '':
            if ('content' in tag && typeof (tag.content) === 'string')
            {
                let result = document.createTextNode(tag.content);
                if (tag.event)
                    Object.entries(tag.event).forEach(att => result.addEventListener(att[0], att[1]));
                return result;
            }
        case 'html':
            const doc = document.createElement('html');
            const html = tag as Document;
            if (html.head)
            {
                const head = document.createElement('head');
                doc.appendChild(head);

                if (html.head.title)
                    head.appendChild(renderOuterWithDomAPI({ type: 'title', content: html.head.title }))
                if (html.head.meta)
                    Object.entries(html.head.meta).map(meta => head.appendChild(renderOuterWithDomAPI({ type: 'meta', attributes: { name: { value: meta[0] }, content: meta[1] } })))
                if (html.head.links)
                    html.head.links.map(link => head.appendChild(renderOuter({ type: 'link', attributes: { rel: link.rel, href: link.src } }, prefix)))
                if (html.head.jsInit)
                    html.head.jsInit.map(v => head.appendChild(renderOuter(v, prefix)));
            }
            return doc;

        default:
            const self: HTMLElement = document.createElement(tag.type);
            if ('classes' in tag && tag.classes?.length)
                self.classList.add(...tag.classes);
            if (tag.attributes)
                Object.entries(tag.attributes).forEach(att => self.setAttribute(att[0], att[1].value));
            if (tag.event)
                Object.entries(tag.event).forEach(att => self.addEventListener(att[0], att[1]));
            if (tag.event?.render)
                tag.render(self, tag);
            if ('content' in tag)
                if (typeof (tag.content) === 'string')
                {
                    if (tag.content)
                        self.textContent = tag.content;
                }
                else
                    tag.content.map((v: Tag<any>) => self.appendChild(renderOuterWithDomAPI(v)));
            if (tag.event?.renderWithChildren)
                tag.renderWithChildren(self, tag);
            return self;
    }
}
