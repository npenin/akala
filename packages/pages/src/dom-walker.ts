import { CompositeTag, CustomTag, CustomTagDefinition, CustomTagInstance, Document, Tag, TextTag, TypedCustomTag } from "./dom.js";

export declare interface TagRef
{
    new <const TTag extends string, T extends Tag<TTag>>(__self: T): TagRefInstance<TTag, unknown, T>;
    new <V extends CustomTagInstance, T extends TypedCustomTag<string, V> = TypedCustomTag<string, V>>(__self: T): TagRefInstance<string, V, T>;

    resolve<T extends (...args: unknown[]) => unknown, U extends Record<string, TagRefInstance>>(f: (...args: [{ [key in keyof U]: (U[key] & HTMLElement) | null }, ...Parameters<T>]) => ReturnType<T>, resolve: U): string
    resolve<T extends { [key: string]: (...args: unknown[]) => unknown }, U extends Record<string, TagRefInstance>>(f: Record<keyof T, (...args: [{ [key in keyof U]: (U[key] & HTMLElement) | null }, ...Parameters<T[keyof T]>]) => ReturnType<T[keyof T]>>, resolve: U): Record<string, string>
}

export type Resolved<T> = T & HTMLElement;

export type TagRefInstance<TTag extends string = string, U = unknown, T extends Tag<TTag | CustomTagDefinition<TTag, U>> = Tag<TTag | CustomTagDefinition<TTag, U>>> = { __self: T } & T & U;

class TagRefImpl<TTag extends string, T extends Tag<TTag> | TypedCustomTag<TTag, U>, U>
{
    constructor(public readonly __self: T)
    {
        function instanceOfElRef(type: (new (...args: unknown[]) => unknown)) { return type == TagRef || __self instanceof type; }
        return new Proxy(__self, {
            get(target, prop)
            {
                if (prop == Symbol.hasInstance)
                    return instanceOfElRef;
                if (prop == '__self')
                    return target;
                if (prop in target)
                {
                    return target[prop];
                }
                if (typeof target.type === 'function' && prop in target.type.prototype)
                {
                    return target.type.prototype[prop];
                }
            }
        }) as TagRefInstance<TTag, U, T>;
    }

    public static resolve<T extends (...args: unknown[]) => unknown>(f: T, resolve: { [key: string]: TagRefInstance }): string
    public static resolve<T extends { [key: string]: (...args: unknown[]) => unknown }>(f: T, resolve: { [key: string]: TagRefInstance }): Record<string, string>
    public static resolve<T extends ((...args: unknown[]) => unknown) | { [key: string]: (...args: unknown[]) => unknown }>(f: T, resolve: { [key: string]: TagRefInstance }): string | Record<string, string>
    {
        switch (typeof f)
        {
            case 'function':

                return `(function ${f.name || ''}(ev){ return (${f})({${Object.entries(resolve).map(([name, el]) =>
                {
                    if (!el.attributes)
                        el.attributes = {};
                    if (!el.attributes.id)
                        el.attributes.id = { value: crypto.randomUUID() };
                    return `${name}:document.getElementById('${el.attributes.id.value}')`;
                })}}, ev)})`;
            case 'object':
                return Object.fromEntries(Object.entries(f).map(e => [e[0], TagRef.resolve(e[1], resolve)]));
            default:
                throw new Error('Not supported');
        }
    }
}

export const TagRef = TagRefImpl as unknown as TagRef;

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
        else if (Array.isArray(tag.content))
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

export function renderOuter(tag: Tag<string> | CompositeTag<string> | TextTag<string> | Document | CustomTag<string>, prefix: string = '')
{

    switch (tag.type)
    {
        case '':
            if ('content' in tag && typeof (tag.content) === 'string')
            {
                let result: string = '';
                if (tag.preRender)
                {
                    const prerenderTags = tag.preRender();
                    if (Array.isArray(prerenderTags))
                        result = prerenderTags.map(n => renderOuter(n, prefix)).join('');
                    else if (prerenderTags)
                        result = renderOuter(prerenderTags, prefix);
                }
                if (tag.render)
                    result = tag.render(result, prefix) || result;
                result += prefix + tag.content;
                if (tag.renderWithChildren)
                    result = tag.renderWithChildren(result, prefix) || result;
                return result;
            }
        case 'html':
            let head = ''
            const html = tag as Document;
            if (tag.preRender)
            {
                const prerenderTags = tag.preRender();
                if (Array.isArray(prerenderTags))
                    head = prerenderTags.map(n => renderOuter(n, prefix)).join('');
                else if (prerenderTags)
                    head = renderOuter(prerenderTags, prefix);
            }

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
            return `<!doctype html><${tag.type}${renderAttributes(tag.attributes)}>${prefix}<head>${head}${prefix}</head>${prefix}<body>${html.body.map(v => renderOuter(v, indent(prefix))).join('')}${prefix}<body>${prefix}</${tag.type}>`;

        default:
            let result: string = '';
            if (typeof tag.type == 'function')
            {
                if (tag.type.preRender)
                {
                    const prerenderTags = tag.type.preRender();
                    if (Array.isArray(prerenderTags))
                        result = prerenderTags.map(n => renderOuter(n, prefix)).join('');
                    else if (prerenderTags)
                        result = renderOuter(prerenderTags, prefix);
                }
                if (tag.type.parentRender)
                {
                    const final = { ...tag, type: tag.type.type, };
                    const def = tag.type.parentRender();
                    if (def.attributes)
                        Object.assign(tag.attributes, def.attributes)
                    return result + renderOuter(final)
                }
                return result + renderOuter({ ...tag, type: tag.type.type as string } as unknown as Tag<string>)
            }
            if (tag.preRender)
            {
                const prerenderTags = tag.preRender();
                if (Array.isArray(prerenderTags))
                    result = prerenderTags.map(n => renderOuter(n, prefix)).join('');
                else if (prerenderTags)
                    result = renderOuter(prerenderTags, prefix);
            }
            if (tag.event)
            {
                if (!tag.attributes)
                    tag.attributes = {};
                if (!tag.attributes.id)
                    tag.attributes.id = { value: crypto.randomUUID() };
            }
            if ('classes' in tag && tag.classes?.length)
                result += `${prefix}<${tag.type}${renderAttributes({ 'class': { value: tag.classes.join(' '), ...tag.attributes } })}>`;
            else
                result += `${prefix}<${tag.type}${renderAttributes(tag.attributes)}>`
            if (tag.render)
                result = tag.render(result, prefix) || result;


            let inner = renderInner(tag, indent(prefix));
            if (inner && prefix)
                inner += prefix;
            result += inner;

            result += `</${tag.type}>`;

            if (tag.event && tag.attributes.id)
            {
                result += renderOuter({ type: 'script', content: `addEventListener('load', function(){(function(el){${Object.entries(tag.event).map(e => `el.addEventListener(${JSON.stringify(e[0])}, ${e[1]})`).join(';' + prefix)}})(document.getElementById(${JSON.stringify(tag.attributes.id.value)}))})` });
            }
            if (tag.renderWithChildren)
                return tag.renderWithChildren(result, prefix) || result;

            return result;
    }
}

export function renderOuterWithDomAPI(tag: CompositeTag<Exclude<any, 'html'>> | Tag<Exclude<any, 'html'>> | TextTag<Exclude<any, 'html'>> | Document, prefix?: string): Node[]
{
    switch (tag.type)
    {
        case '':
            if ('content' in tag && typeof (tag.content) === 'string')
            {
                const results: Node[] = [];
                if (tag.preRender)
                {
                    const prerenderTags = tag.preRender();
                    if (Array.isArray(prerenderTags))
                        results.push(...prerenderTags.flatMap(n => renderOuterWithDomAPI(n, prefix)));
                    else if (prerenderTags)
                        results.push(...renderOuter(prerenderTags, prefix));
                }

                let result = document.createTextNode(tag.content);
                results.push(result);
                if (tag.event)
                    Object.entries(tag.event).forEach(att => typeof att[1] == 'string' ? result.addEventListener(att[0], new Function('$event', att[1]) as EventListenerOrEventListenerObject) : result.addEventListener(att[0], att[1]));
                return results;
            }
        case 'html':
            const doc = document.createElement('html');
            const html = tag as Document;
            if (html.head)
            {
                const head = document.createElement('head');
                doc.appendChild(head);

                if (html.head.title)
                    renderOuterWithDomAPI({ type: 'title', content: html.head.title }).forEach(c => head.appendChild(c));
                if (html.head.meta)
                    Object.entries(html.head.meta).map(meta => renderOuterWithDomAPI({ type: 'meta', attributes: { name: { value: meta[0] }, content: meta[1] } }).forEach(m => head.appendChild(m)))
                if (html.head.links)
                    html.head.links.map(link => renderOuterWithDomAPI({ type: 'link', attributes: { rel: link.rel, href: link.src } }, prefix).forEach(m => head.appendChild(m)))
                if (html.head.jsInit)
                    html.head.jsInit.map(v => renderOuterWithDomAPI(v, prefix).forEach(n => head.appendChild(n)));
            }
            return [doc];

        default:
            const result: Node[] = [];
            if (tag.preRender)
            {
                const prerenderTags = tag.preRender();
                if (Array.isArray(prerenderTags))
                    result.push(...prerenderTags.flatMap(t => renderOuterWithDomAPI(t)));
                else
                    result.push(...renderOuterWithDomAPI(prerenderTags));
            }
            const self: HTMLElement = document.createElement(tag.type);
            result.push(self);
            if ('classes' in tag && tag.classes?.length)
                self.classList.add(...tag.classes);
            if (tag.attributes)
                Object.entries(tag.attributes).forEach(att => self.setAttribute(att[0], att[1].value));
            if (tag.event)
                Object.entries(tag.event).forEach(att => typeof att[1] === 'string' ? self.addEventListener(att[0], new Function('$event', att[1]) as EventListenerOrEventListenerObject) : self.addEventListener(att[0], att[1]));
            if (tag.event?.render)
                tag.render(self);
            if ('content' in tag)
                if (typeof (tag.content) === 'string')
                {
                    if (tag.content)
                        self.textContent = tag.content;
                }
                else
                    tag.content.map((v: Tag<any>) => renderOuterWithDomAPI(v).forEach(n => self.appendChild(n)));
            if (tag.event?.renderWithChildren)
                tag.renderWithChildren(self);
            return result;
    }
}
