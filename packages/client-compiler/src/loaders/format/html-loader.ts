import type { Loader, Resolver } from "../../index.js";
import path from 'node:path'
import * as parse5 from 'parse5'
import fs from 'node:fs/promises'
import { dom, renderInner } from '@akala/pages'
import { fileURLToPath } from 'node:url'
import sourceMap from "source-map";
import * as ts from './ts-loader.js'
import { logger as coreLogger } from '@akala/core'

const logger = coreLogger.use('hook:html')

const tsExts = new Set([
    '.html',
    '.map',
]);

const maps: Record<string, string> = {};

export const resolve: Resolver = async function (specifier, context, nextResolve)
{
    let ext = path.extname(specifier);

    let hash = '';

    // console.log(specifier, ext, path.basename(specifier))
    if (!ext && /^module(\d+)$/.test(path.basename(specifier)))
    {
        hash = path.basename(specifier);
        ext = path.extname(path.dirname(specifier));
        specifier = path.dirname(specifier);
    }

    if (!tsExts.has(ext)) { return nextResolve(specifier); } // File is not ts, so step aside

    if (ext == '.map' && !(specifier in maps))
        return nextResolve(specifier);

    const { url } = await nextResolve(specifier); // This can be deduplicated but isn't for simplicity

    if (hash)
    {
        return {
            ...context,
            format: 'html.' + hash, // Provide a signal to `load`
            shortCircuit: true,
            url: url + '/' + hash,
        };
    }

    return {
        ...context,
        format: ext == '.map' ? 'html.map' : 'html', // Provide a signal to `load`
        shortCircuit: true,
        url,
    };
}

export const location = Symbol('sourceCodelocation');

export interface Location
{
    /** One-based line index of the first character. */
    startLine: number;
    /** One-based column index of the first character. */
    startCol: number;
    /** Zero-based first character index. */
    startOffset: number;
    /** One-based line index of the last character. */
    endLine: number;
    /** One-based column index of the last character. Points directly *after* the last character. */
    endCol: number;
    /** Zero-based last character index. Points directly *after* the last character. */
    endOffset: number;
}

type AttributeType = { value: string } & Locatable
type Attributes = Record<string, AttributeType>

type Locatable = { [location]: Location }

function convertToDom(item: parse5.DefaultTreeAdapterMap['node']): ((dom.Tag<any, Attributes>) & Locatable)[]
{
    if (item.nodeName.startsWith('#'))
        if ('childNodes' in item)
            return item.childNodes.filter(cn => 'tagName' in cn && cn.tagName == cn.nodeName).map(cn => convertToDom(cn)).flat();
        else
        {
            const value = item.nodeName == "#text" && item.value.trim();
            if (value && value.length > 0)
                return [{ type: '', [location]: item.sourceCodeLocation, content: !item.value.length ? undefined : value } as dom.TextTag<string, Attributes> & Locatable]
            else
                return undefined;
        }
    if ('tagName' in item)
    {
        if (item.tagName === 'html')
        {
            const children = item.childNodes.map(cn => convertToDom(cn)).flat().filter(x => x);
            const head = children.find(x => x.type === 'head') as dom.CompositeTag<'head', Attributes, (dom.Tag<string, Attributes> & Locatable)[]>;
            const titleTag = head.content?.find(x => x.type == 'title') as dom.CompositeTag<'title', Attributes, dom.TextTag<'', Attributes>[]>;

            return [{
                type: item.tagName,
                head: {
                    title: titleTag?.content?.at(0)?.content,
                    meta: Object.fromEntries(head.content.filter(x => x.type == 'meta').map(x => [x.attributes.name.value, x.attributes.content])),
                    links: head.content.filter(x => x.type == 'link').map(x => ({ rel: x.attributes.rel, src: x.attributes.href })),
                    jsInit: head.content.filter(x => x.type == 'script') as unknown as dom.Script<Attributes>[]
                }, body: (children.find(x => x.type == 'body') as dom.CompositeTag<'body', Attributes, (dom.FlowContentTags<Attributes> & Locatable)[]>).content, [location]: item.sourceCodeLocation
            } as dom.Document<Attributes> & Locatable];
        }
        return [{
            type: item.tagName,
            [location]: item.sourceCodeLocation,
            attributes: !item.attrs.length ? undefined : Object.fromEntries(item.attrs.map(att => [att.name, { value: att.value, [location]: item.sourceCodeLocation.attrs[att.name] }])),
            content: !item.childNodes.length ? undefined : item.childNodes.map(cn => convertToDom(cn)).flat().filter(x => x)
        } as dom.CompositeTag<string, Attributes> & Locatable]

    }
}

function updateContext(context: { file: string, content: string, line: number, column: number }, s: string, noNewLine?: boolean)
{
    if (!noNewLine)
    {
        const lastIndexOfNewLine = s.lastIndexOf('\n')
        if (~lastIndexOfNewLine)
        {
            let linesAdded = 0;
            for (let i = 0; i < lastIndexOfNewLine + 1; i++)
            {
                if (s[i] === '\n')
                    linesAdded++;
            }
            context.column = s.length - lastIndexOfNewLine
            context.line += linesAdded;
        }
        else
            context.column += s.length;
    }
    else
        context.column += s.length;
    context.content += s;

}

function stringifyWithSourceMap(context: { file: string, content: string, line: number, column: number }, nodes: string | (Object & { [location]: Location }) | (Object & { [location]: Location })[], sourcemap: sourceMap.SourceMapGenerator)
{
    if (Array.isArray(nodes))
    {
        updateContext(context, '[', true);
        nodes.forEach((node, i) =>
        {
            stringifyWithSourceMap(context, node, sourcemap);
            if (i < nodes.length - 1)
                updateContext(context, ',', true)
        })
        updateContext(context, ']', true);
        return;
    }

    switch (typeof (nodes))
    {
        case 'object':
            {
                updateContext(context, '{', true);
                if (location in nodes && nodes[location])
                    sourcemap.addMapping({
                        source: context.file,
                        original: { line: nodes[location].startLine, column: nodes[location].startCol },
                        generated: { line: context.line, column: context.column }
                    })
                let hasProperty = false;
                Object.entries(nodes).forEach((e, i) =>
                {

                    if (e[0] == 'location' && e[1])
                        return;
                    if (e[1] === undefined)
                        return;
                    if (hasProperty)
                        updateContext(context, ',', true)
                    hasProperty = true
                    updateContext(context, JSON.stringify(e[0]))
                    updateContext(context, ':', true)
                    stringifyWithSourceMap(context, e[1], sourcemap);
                })
                updateContext(context, '}', true);
            }
            break;
        default:
            updateContext(context, JSON.stringify(nodes));
            break;
    }
}

export function getResources(doms: (dom.CompositeTag<string | dom.CustomTagDefinition<string, unknown>, Attributes, dom.Tag<string | dom.CustomTagDefinition<string, unknown>, Attributes>[]> | dom.TextTag<string, Attributes>)[]): ({ type: 'style' | 'script' | 'img', src: AttributeType } & Locatable)[]
{
    return doms.map(n =>
    {
        switch (n.type)
        {
            case 'script':
            case 'img':
            case 'style':
                if (n.attributes.src?.value)
                    return { type: n.type, src: n.attributes.src, [location]: n[location] };
            default:
                if ('content' in n && typeof (n.content) === 'object')
                    return getResources(n.content);
                return [];
        }
    }).flat()
}

export function getModules(doms: (dom.Tag<string, Attributes> | dom.CompositeTag<string, Attributes> | dom.CustomTag<string, Attributes> | dom.TextTag<string, Attributes>)[]): string[]
{
    return doms.map(n =>
    {
        switch (n.type)
        {
            case 'script':
                if (!n.attributes.src?.value && n.attributes.type?.value === 'module' && 'content' in n)
                    return typeof n.content == 'string' ? [n.content] : [renderInner(n, '')];
            default:
                if ('content' in n && typeof (n.content) === 'object')
                    return getModules(n.content);
                return [];
        }
    }).flat()
}

export const load: Loader = async function (url, context, nextLoad)
{
    switch (context.format)
    {
        case 'html.map':

            return {
                format: 'json',
                shortCircuit: true,
                source: maps[url]
            }
        case 'html':
            {
                const content = await fs.readFile(fileURLToPath(url), 'utf-8');
                const fragment = parse5.parse(content, { sourceCodeLocationInfo: true, treeAdapter: parse5.defaultTreeAdapter });

                const stringifyContext = { content: '', line: 1, column: 0, file: fileURLToPath(url) };
                const sourcemap = new sourceMap.SourceMapGenerator()
                const doms = convertToDom(fragment);
                if (context.importAttributes?.type === 'json')
                {
                    stringifyWithSourceMap(stringifyContext, doms, sourcemap);
                    maps[url] = sourcemap.toString();

                    return {
                        format: 'json',
                        shortCircuit: true,
                        source: stringifyContext.content
                    }
                }
                else
                {
                    let resources: ({ type: 'style' | 'img' | 'script', src: AttributeType } & Locatable)[];
                    let modules: string[];
                    if (doms.length == 1 && doms[0].type == 'html')
                    {
                        const html = doms[0] as unknown as dom.Document<Attributes>;
                        resources = html.head.jsInit.filter(r => r.attributes?.src?.value).map(s => ({ type: 'script', src: s.attributes.src, [location]: s[location] }));
                        resources = resources.concat(html.head.links.map(l => ({ type: 'style', src: l.src, [location]: l.src[location] })));
                        resources = resources.concat(getResources(html.body));

                        modules = getModules(html.head.jsInit);
                        modules = modules.concat(getModules(html.body));
                    }
                    else
                    {
                        resources = getResources(doms);
                        modules = getModules(doms);
                    }
                    // console.log(modules);

                    await Promise.all(modules.map((m, i) =>
                    {
                        maps[url + '/module' + i] = m;
                        return ts.parse({ specifier: url + '/module' + i }, m, cacheItem =>
                        {
                            cacheItem.source = cacheItem.resources.reduce((source, r) => !path.isAbsolute(r) && !URL.canParse(r) ? source.replace(r, '../' + r) : source, cacheItem.source)
                            cacheItem.modules = cacheItem.modules.map(m => !path.isAbsolute(m) && !URL.canParse(m) ? '../' + m : m)
                        });
                    }))

                    const parsed = await ts.parse({ specifier: url }, resources.filter(r => r.src).map(r => `import '${r.src.value}'`).join('\n') + `
                
                    ${modules.map((_, i) => `import './${path.basename(url)}/module${i}')}`).join(',')}
    
                    export const dom = ${JSON.stringify(doms)};
    
                    export default function(renderer, prefix)
                    {
                        return dom.map(d=>renderer(d, prefix || ''))
                    }`);

                    logger.debug(context.importAttributes)

                    if ((context.importAttributes?.type || 'module') == 'module')
                        return { format: 'module', shortCircuit: true, source: parsed.content }

                    return ts.supportedFormats[context.importAttributes?.type as string || 'module'](parsed);
                }
            }
        default:
            if (context.format?.startsWith('html.module'))
            {
                const cacheItem = await ts.parse({ specifier: url }, maps[url]);
                const result = await ts.supportedFormats[context.importAttributes.type as string || 'module'](cacheItem);
                logger.data(result.source);
                return result
            };
            break;
    }

    return nextLoad(url, context);
}
