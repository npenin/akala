import { outputHelper } from '../new.js';
import { type JsonSchema } from '../jsonschema.js'
import { readFile } from '@akala/fs';

export default async function generate(pathToSchemaFile: string | URL, name: string, outputFile?: string)
{
    let output: WritableStreamDefaultWriter;
    ({ output } = await outputHelper(outputFile, 'openapi.json', true));

    const schema = await readFile(pathToSchemaFile, 'json');

    const types = { '': name };
    types[name] = await resolveToTypeScript(schema, { '#': schema }, types);
    delete types[''];

    if (outputFile)
    {
        const declarations = Object.entries(types).map(e =>
        {
            if (e[1].startsWith('enum('))
            {
                const content = e[1].slice(5, -1); // remove enum()
                return `export enum ${e[0]} { ${content} }`;
            }
            else
            {
                return `export type ${e[0]}=${e[1]}`;
            }
        }).join(';\n');
        await output.write(declarations);
        await output.close();
    }
    else
        console.log(types);
}

const cache: Record<string, Promise<JsonSchema>> = {};


export async function resolveToTypeScript(p: string | JsonSchema, anchors: Record<string, JsonSchema>, types: Record<string, string>): Promise<string>
{
    switch (p)
    {
        case '':
            return types[''];
        case 'boolean':
        case 'string':
            return p;
        case 'integer':
        case 'number':
            return 'number';
        default:
            if (typeof p == 'object')
            {
                if ('properties' in p)
                    if (p.patternProperties)
                        return `{ ${(await Promise.all(Object.entries(p.properties).map(async e => JSON.stringify(e[0]) + ((p as any).required?.includes(e[0]) ? '' : '?') + ':' + await resolveToTypeScript(e[1], anchors, types)))).join(', ')}, ${p.patternProperties && '[key:string]:' + (await Promise.all(Object.values(p.patternProperties).map(e => resolveToTypeScript(e, anchors, types)))).join(' | ')} }`;
                    else
                        return `{ ${(await Promise.all(Object.entries(p.properties).map(async e => JSON.stringify(e[0]) + ((p as any).required?.includes(e[0]) ? '' : '?') + ':' + await resolveToTypeScript(e[1], anchors, types)))).join(', ')} }`;
                else if ('patternProperties' in p)
                    return `{ ${p.patternProperties && '[key:string]:' + (await Promise.all(Object.values(p.patternProperties).map(e => resolveToTypeScript(e, anchors, types)))).join(' | ')} }`;

                if ('$ref' in p)
                {
                    if (typeof p.$ref != 'string')
                        throw new Error('invalid json schema');

                    if (!p.$ref.startsWith('#') && !p.$ref.startsWith('https://') && !p.$ref.startsWith('http://'))
                        throw new Error('unsupported def reference');
                    if (p.$ref[0] !== '#')
                    {
                        const url = new URL(p.$ref);
                        const hash = url.hash;
                        url.hash = '';
                        if (!cache[url.toString()])
                            cache[url.toString()] = fetch(url).then(r => r.json() as JsonSchema);
                        const schema = await cache[url.toString()];
                        const subTypes = {}
                        return resolveToTypeScript(await resolve(hash, { '#': schema }, subTypes), anchors, types);
                    }

                    return resolveToTypeScript(await resolve(p.$ref, anchors, types), anchors, types);
                }
                if ('enum' in p)
                {
                    return p.enum.map(p => JSON.stringify(p)).join(' | ')
                }
                if ('allOf' in p)
                {
                    return '(' + (await Promise.all(p.allOf.map(p => resolveToTypeScript(p, anchors, types)))).join(') & (') + ')'
                }
                if ('anyOf' in p)
                {
                    return '(' + (await Promise.all(p.anyOf.map(p => resolveToTypeScript(p, anchors, types)))).join(') | (') + ')'
                }
                if ('oneOf' in p)
                {
                    if ('type' in p && (p.type == 'string' || p.type == 'integer' || p.type == 'number') &&
                        p.oneOf.every(o => typeof o == 'object' && o && 'const' in o && 'title' in o))
                    {
                        const enumDef = p.oneOf.map(o => `${o.title} = ${JSON.stringify(o.const)}`).join(', ');
                        return `enum(${enumDef})`;
                    }
                    return '(' + (await Promise.all(p.oneOf.map(p => resolveToTypeScript(p, anchors, types)))).join(') | (') + ')'
                }
                if ('type' in p)
                {
                    switch (p.type)
                    {
                        case 'array':
                            {
                                let result = '[';
                                let counter = 0;
                                if ('prefixItems' in p)
                                {
                                    result += (await Promise.all((p.prefixItems as (object | string)[]).map((p) => resolveToTypeScript(p, anchors, types)))).join(', ');
                                    counter += (p.prefixItems as unknown[]).length;
                                }
                                if ('items' in p && p.items)
                                {
                                    if (counter == 0)
                                        return '(' + await resolveToTypeScript(p.items as object, anchors, types) + ')[]';
                                    result += '...(' + await resolveToTypeScript(p.items as object, anchors, types) + ')[]';
                                }
                                return result + ']'
                            }
                        case 'object':
                            {
                                if (p.additionalProperties)
                                    return resolveToTypeScript(p.additionalProperties, anchors, types);
                                if (p.required)
                                {
                                    return '{' + p.required.map(p => JSON.stringify(p) + ': unknown') + '}';
                                }
                            }
                            break;
                        default:
                            if (typeof p.type == 'string')
                            {
                                return resolveToTypeScript(p.type, anchors, types);
                            }
                    }
                }
                if ('if' in p)
                {
                    return await resolveToTypeScript(p.then, anchors, types) + '|' + await resolveToTypeScript(p.else, anchors, types)
                }
                if (!Object.keys(p).length)
                    return '{}';

            }
            if (typeof p == 'string' && p in types)
                return p;
            return 'unknown';

    }
}

export async function resolve(initRef: string, anchors: Record<string, object>, types: Record<string, string>): Promise<object | string>
{
    const fragments = initRef.split('/');
    if (fragments.length == 1)
        return types[''];
    if (fragments[0] !== '#')
        throw new Error('unsupported relative references');
    if ((fragments[1] == '$defs' || fragments[1] == 'definitions') && fragments.length == 3)
    {
        const typeName = validTypeName(fragments[2])
        if (typeName in types)
            return typeName;
        types[typeName] = '';
        types[typeName] = await resolveToTypeScript(anchors[fragments[0]][fragments[1]][fragments[2]], anchors, types);
        return typeName;
    }
    for (const fragment of fragments)
    {
        if (typeof anchors[fragment] == 'object')
            anchors = anchors[fragment] as any;
        else
            throw new Error('non object schema reached')
    }

    return anchors;
}

function validTypeName(arg0: string)
{
    if (arg0 == 'default' || arg0 == 'enum')
        return arg0.replace(/^\w/, l => l.toUpperCase());
    return arg0.replace(/-(\w)/g, (_, l) => l.toUpperCase());
}
