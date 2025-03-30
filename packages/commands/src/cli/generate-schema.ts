import * as akala from "../index.js";
import * as path from 'path'
import * as fs from 'fs';
import { Writable } from "stream";
import { outputHelper, write } from './new.js';
import ts from 'typescript'
import type { Schema as BaseSchema, SchemaObject } from "ajv";
import { Command } from "../metadata/command.js";
import { SchemaConfiguration, SchemaValidator } from "../processors/schema-validator.js";

type JsonSchema = Exclude<BaseSchema, boolean>

const jsonSchemaArrays = ['allOf', 'anyOf', 'oneOf']

export function simplifySchema(command: Command)
{
    if (!command.config?.schema?.$defs)
        return command;

    const usedRef = command.config.schema.inject?.filter(p => !SchemaValidator.notRefTypes.includes(p as string));
    if (!usedRef?.length && !command.config.schema.resultSchema)
        delete command.config.schema.$defs;
    else
    {
        const result: Command = {
            name: command.name, config: {
                ...command.config, schema: {
                    inject: command.config.schema.inject,
                    resultSchema: command.config.schema.resultSchema,
                    $defs: Object.fromEntries(usedRef.map(p => [p, command.config.schema.$defs[p as string]]))
                }
            }
        };

        const processed: string[] = [];

        const init = result.config.schema.inject.slice(0);
        const resultRef = crypto.randomUUID();
        if (command.config.schema.resultSchema)
        {
            command.config.schema.$defs[resultRef] = command.config.schema.resultSchema;
            init.push('#/$defs/' + resultRef);
        }
        for (const initRef of init)
        {
            if (processed.includes(initRef as string))
                continue;

            const refStack = [resolve(initRef as string, command.config.schema)];

            function processItem(ref: SchemaObject)
            {
                walkSchema(ref, {
                    walkRef: (ref =>
                    {
                        if (processed.includes(ref['$ref']))
                            return;
                        refStack.push(resolve(ref['$ref'], command.config.schema));
                        processed.push(ref['$ref']);
                    })
                })
            }

            while (refStack.length)
            {
                const ref = refStack.shift();

                processItem(ref);
            }
        }

        result.config.schema.$defs = Object.fromEntries(processed.map(p => [p.substring('#/$defs/'.length), resolve(p, command.config.schema)]))



        return result;
    }


    return command;
}

export default async function generate(folder?: string, name?: string, outputFile?: string)
{
    folder = folder || process.cwd();
    const discoveryOptions: akala.Processors.DiscoveryOptions = { isDirectory: true };

    if (!name && fs.existsSync(path.join(folder, './package.json')))
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        name = (await import(path.join(folder, './package.json'))).name;
    if (!name)
    {
        name = path.basename(folder);
        discoveryOptions.isDirectory = false;
    }

    let output: Writable;
    let outputFolder: string;
    ({ output, outputFile, outputFolder } = await outputHelper(outputFile, 'commands.json', true));
    discoveryOptions.relativeTo = outputFolder;
    discoveryOptions.recursive = true;
    discoveryOptions.ignoreFileWithNoDefaultExport = true;
    let configPath = ts.findConfigFile(folder, ts.sys.fileExists, "tsconfig.json");
    let finalConfig = ts.parseJsonConfigFileContent(ts.readConfigFile(configPath, ts.sys.readFile).config, ts.sys, path.dirname(configPath));

    // do
    // {
    //     const config = ts.readConfigFile(configPath, ts.sys.readFile);
    //     if (config.error)
    //         console.warn(config.error);
    //     const intermediateConfig: { compilerOptions?: ts.CompilerOptions, extends?: string } = config.config;
    //     if (intermediateConfig.compilerOptions)
    //         Object.entries(intermediateConfig.compilerOptions).forEach(e =>
    //         {
    //             if (typeof finalConfig[e[0]] == 'undefined')
    //                 finalConfig[e[0]] = e[1];
    //         })
    //     if (intermediateConfig.extends)
    //         configPath = path.resolve(path.dirname(configPath), config.config.extends);
    //     else
    //         configPath = null;
    // }
    // while (configPath);
    var container = await akala.Processors.FileSystem.discoverMetaCommands(path.resolve(folder), discoveryOptions);
    const result = { ...container, $schema: 'https://raw.githubusercontent.com/npenin/akala/main/packages/commands/container-schema.json' };
    const defs: { local: Record<string, { id: string, isDynamic: boolean, promise: Promise<JsonSchema> }>, global: Record<string, { id: string, promise: Promise<JsonSchema> }> } = {
        local: {}, global: {
            SharedArrayBuffer: { id: 'SharedArrayBuffer', promise: Promise.resolve({ type: "array", $id: 'SharedArrayBuffer', items: { type: 'number' } }) }
        }
    };

    const paths = container.commands.map(cmd => ({ path: path.resolve(!discoveryOptions.isDirectory ? path.dirname(folder) : folder, cmd.config.fs?.source || cmd.config.fs.path), cmd }));
    const program = ts.createProgram(paths.map(c => c.path), finalConfig.options);
    const checker = program.getTypeChecker();
    await Promise.all(paths.map(async c =>
    {
        const promises: Promise<JsonSchema>[] = [];
        program.getSourceFile(c.path).forEachChild(node =>
        {
            if (ts.isFunctionDeclaration(node))
            {
                if (!node.getChildren().findLast(n => ts.isBlock(n)))
                    return;
                if (node.modifiers.filter(m => m.kind == ts.SyntaxKind.ExportKeyword || m.kind == ts.SyntaxKind.DefaultKeyword).length == 2)
                {
                    if (node.typeParameters?.length)
                        defs.local = Object.fromEntries(node.typeParameters.map(tp => [tp.name, tp.constraint ? Promise.all([Promise.resolve(serializeSymbol(checker, tp.constraint, defs)).then(x => 'promise' in x ? x.promise : x), tp.default ? Promise.resolve(serializeSymbol(checker, tp.default, defs)).then(x => 'promise' in x ? x.promise : x) : Promise.resolve(undefined)]).then(r => ({ ...r[0], "default": r[1] })) : Promise.resolve(undefined)], true))
                    node.parameters.forEach(p =>
                    {
                        if (ts.isIdentifier(p.name) && p.name.escapedText == 'this')
                            return null;

                        // console.log(c.cmd.config.fs.source);

                        if (p.type)
                        {
                            const type = serializeSymbol(checker, p.type, { global: defs.global, local: {} });
                            if ('promise' in type)
                            {
                                promises.push(type.promise.then(async r =>
                                {
                                    await Promise.all(Object.values(defs.global))
                                    await Promise.all(Object.values(defs.local))
                                    return r;
                                }))
                            }

                            else
                                promises.push(Promise.resolve(type).then(async r =>
                                {
                                    await Promise.all(Object.values(defs.global))
                                    await Promise.all(Object.values(defs.local))
                                    return r;
                                }))
                        }
                    }, true);
                }
            }
        });
        await Promise.all(promises).then(results =>
        {
            c.cmd.config.schema = {
                $defs: Object.fromEntries(c.cmd.config[""].inject.map((p, i) => [p, typeof p == 'string' && p.startsWith('param.') ? results[i] : { type: "null", description: p }])),
                inject: c.cmd.config[""].inject,
            };
        });

    }));
    result['$defs'] = Object.fromEntries(await Promise.all(Object.entries(defs.global).map(e => e[1].promise.then(r => [e[0], r]))))

    await write(output, JSON.stringify(result, null, 4));
    await new Promise(resolve => output.end(resolve));
}

function serializeSymbol(checker: ts.TypeChecker, typeNode: ts.TypeNode, defs: { local: Record<string, { id: string, isDynamic: boolean, promise: Promise<JsonSchema> }>, global: Record<string, { id: string, promise: Promise<JsonSchema> }> }): JsonSchema | { id: string, promise: Promise<JsonSchema> }
{
    let type: ts.Type;
    if (ts.isTypeReferenceNode(typeNode))
    {
        const symbol = checker.getSymbolAtLocation(typeNode.typeName);
        const declarations = symbol.getDeclarations();
        if (declarations?.length)
        {
            type = checker.getTypeAtLocation(declarations[0]);
            if (!('intrinsicName' in type && typeof type.intrinsicName == 'string' && type.intrinsicName == 'error'))
                return serializeType(checker, type, defs)
        }
    }
    return serializeType(checker, checker.getTypeFromTypeNode(typeNode), defs)
}

declare module 'typescript'
{
    export interface Symbol
    {
        parent?: ts.Symbol;
    }

    // export interface Declaration
    // {
    //     parameters?: ts.Node[];
    // }
}

function serializeType(checker: ts.TypeChecker, type: ts.Type | ts.TypeReference, defs: { local: Record<string, { id: string, $dynamicAnchor?: string, promise: Promise<JsonSchema> }>, global: Record<string, { id: string, promise: Promise<JsonSchema> }> }, bypassDefs?: boolean): JsonSchema | { id: string, $dynamicAnchor?: string, promise: Promise<JsonSchema> }
{
    if (!type)
        return { type: false };
    if ('intrinsicName' in type && typeof type.intrinsicName == 'string')
        switch (type.intrinsicName)
        {
            case 'any':
                return {};
            case 'boolean':
                return { type: "boolean" }
            case 'false':
                return { type: "boolean", enum: ["false"] }
            case 'true':
                return { type: "boolean", enum: ["true"] }
            case 'number':
                return { type: "number" }
            case 'string':
                return { type: "string" }
            case 'void':
                return { type: "null" }
            case 'error':
                debugger;
        }
    if ('value' in type)
    {
    }
    let friendlyId: string;
    let originPath: string;
    let originPathResult: RegExpExecArray;
    if (type.symbol)
        friendlyId = checker.getFullyQualifiedName(type.symbol);
    if (friendlyId && !bypassDefs)
    {
        const fullTypeName = friendlyId;
        if (fullTypeName in defs.local)
        {
            if (defs.local[fullTypeName].$dynamicAnchor)
                return { $dynamicRef: "#" + defs.local[fullTypeName].id };
            return { $ref: "#/$defs/" + defs.local[fullTypeName].id };
        }
        if (fullTypeName in defs.global)
            return { $ref: "#/$defs/" + defs.global[fullTypeName].id };

        if (/^"[^"/]+"\./.test(fullTypeName) || fullTypeName[0] != '"' && /^([^\.]+)\.?/.exec(fullTypeName)[1] == 'internal')
        {
            defs.global[fullTypeName] = {
                id: friendlyId, promise: (async function ()
                {
                    const result = serializeType(checker, type, defs, true);
                    if ('promise' in result)
                        return await result.promise;
                    else
                        return result;
                })()
            };
        }
        else if (originPathResult = /^"([^"]+)"/.exec(fullTypeName))
        {
            originPath = originPathResult[1];
            while (originPath = path.resolve(path.dirname(originPath), './package.json'))
            {
                try
                {
                    const packageJsonContent = JSON.parse(fs.readFileSync(originPath, 'utf-8'));
                    friendlyId = packageJsonContent.name + fullTypeName.slice(originPathResult[0].length);
                    break;
                }
                catch (e)
                {
                    if (e.code == 'ENOENT')
                        originPath = path.dirname(originPath);
                    else
                        throw e;
                }
            }
            defs.global[fullTypeName] = {
                id: friendlyId, promise: (async function ()
                {
                    const result = serializeType(checker, 'target' in type ? type.target : type, defs, true);
                    if ('promise' in result)
                        return await result.promise.then(t =>
                        {
                            if (t)
                                t.$id = friendlyId;
                            return t
                        });
                    result.$id = friendlyId;
                    return result;
                })()
            };
        }
        if (fullTypeName in defs.global)
        {
            const resolvedType = defs.global[fullTypeName];
            if (type)
            {
                const dynamics = defs.local && Object.entries(defs.local).filter(e => e[0].startsWith(fullTypeName));
                if (dynamics?.length > 0 && dynamics[0][0] !== fullTypeName)
                {
                    const serializedTypes = dynamics.map((d, i) => ({ name: d[0].substring(fullTypeName.length + 1), type: serializeType(checker, checker.getTypeArguments((type as ts.TypeReference))[i], defs) }));
                    if (serializedTypes.find(x => 'promise' in x.type))
                    {
                        return {
                            promise: Promise.all(serializedTypes.map<Promise<SchemaObject>>(x => 'promise' in x.type ? x.type.promise : Promise.resolve(x.type))).then(types => ({
                                $ref: "#/$defs/" + resolvedType.id, $defs: Object.fromEntries(types.map((serializedType, i) => [serializedTypes[i].name,
                                { type: 'object', $dynamicAnchor: resolvedType.id + '.' + (type as ts.TypeReference).target.typeArguments[i].symbol.escapedName, ...serializedType, $id: undefined }]))
                            }))
                        };
                    }
                    return {
                        $ref: "#/$defs/" + resolvedType.id, $defs: Object.fromEntries(serializedTypes.map((serializedType, i) => [serializedType.name,
                        { type: 'object', $dynamicAnchor: resolvedType.id + '.' + (type as ts.TypeReference).target.typeArguments[i].symbol.escapedName, ...serializedType.type, $id: undefined }]))
                    };
                }
                return { $ref: "#/$defs/" + resolvedType.id };
            }
            return { type: 'null' }
        }
    }
    switch (true)
    {
        case type.isStringLiteral():
            return { type: "string", enum: [type.value] };
        case type.isNumberLiteral():
            return { type: "number", enum: [type.value] };
        case type.isUnion():
            if (type.types.every(t => t.isStringLiteral()))
            {
                return { type: "string", enum: type.types.map(t => t.value) };
            }
            if (type.types.every(t => t.isNumberLiteral()))
            {
                return { type: "number", enum: type.types.map(t => t.value) };
            } {
                const types = type.types.map(t => serializeType(checker, t, defs));
                if (types.find(x => 'promise' in x))
                {
                    return { id: friendlyId, promise: Promise.all(types.map(x => 'promise' in x ? x.promise : Promise.resolve(x))).then(types => ({ oneOf: types })) }
                }
                return { "oneOf": types as JsonSchema[] }
            }
        case type.isIntersection():
            {
                const types = type.types.map(t => serializeType(checker, t, defs));
                if (types.find(x => 'promise' in x))
                {
                    return { id: friendlyId, promise: Promise.all(types.map(x => 'promise' in x ? x.promise : Promise.resolve(x))).then(types => ({ allOf: types })) }
                }
                return { "allOf": types as JsonSchema[] }
            }
        case checker.isArrayLikeType(type): {
            const tupleType = type.getNumberIndexType();
            if (tupleType)
            {
                const types = serializeType(checker, tupleType, defs);
                if ('promise' in types)
                    return { id: friendlyId, promise: types.promise.then(t => ({ type: 'array', items: t.oneOf! }) as JsonSchema) }
                return {
                    type: "array",
                    items: types.oneOf
                } as JsonSchema
            }
            else
                throw new Error();
        }
        default:
            {
                if ('typeArguments' in type && type.typeArguments)
                    Object.assign(defs.local, Object.fromEntries(type.target.typeArguments.map((t, i) =>
                    {
                        const name = checker.getFullyQualifiedName(t.symbol);
                        if (t.symbol)
                        {
                            const typeI = serializeType(checker, type.typeArguments[i], defs);
                            if ('promise' in typeI)
                                return [name, typeI];
                            if (typeI.$ref)
                            {
                                const anchorName = typeI.$ref.substring('#/$defs/'.length);
                                return [name, { id: anchorName, $dynamicAnchor: anchorName }];
                            }
                            return [name, { id: name, promise: Promise.resolve(typeI) }]
                        }
                        debugger;
                        return ['', null];
                    })))
                if ('typeArguments' in type && type.typeArguments || type.isClassOrInterface())
                    return {
                        id: friendlyId, promise: (async function ()
                        {
                            return {
                                "$id": friendlyId,
                                "$defs": Object.fromEntries(await Promise.all(Object.entries(defs.local).filter(x => x[0].startsWith(friendlyId)).map(e => 'promise' in e[1] ? e[1].promise.then(v => [e[0], v]) : Promise.resolve([e[0], e[1]])))),
                                "type": "object",
                                "properties": Object.fromEntries((await Promise.all(type.getProperties().filter(p => !checker.getTypeOfSymbol(p).getCallSignatures().length).map(p => ({ prop: p, type: serializeType(checker, checker.getTypeOfSymbol(p), defs) })).map(x => 'promise' in x.type ? x.type.promise.then(r => [x.prop.escapedName, r]) : Promise.resolve([x.prop.escapedName, x.type])))).filter(e => e[1])),
                                // "items": { "$dynamicRef": "#T" }
                            }
                        })()
                    }
                let baseType = type.getConstraint();
                if (baseType)
                {
                    const serializedType = serializeType(checker, baseType, defs);
                    if ('promise' in serializedType)
                        defs.local[friendlyId] = serializedType as { id: string, promise: Promise<JsonSchema> };
                    else
                        (defs.local[friendlyId] = { id: friendlyId, promise: Promise.resolve(serializedType) });
                    return { "$dynamicRef": "#/defs/" + friendlyId }
                }
                if (type.getConstructSignatures())
                {
                    return {
                        id: friendlyId, promise: (async function ()
                        {
                            return {
                                "$id": friendlyId,
                                // "$defs": Object.fromEntries(await Promise.all(Object.entries(defs.local).map(e => 'promise' in e[1] ? e[1].promise.then(v => [e[0], v]) : Promise.resolve([e[0], e[1]])))),
                                "type": "object",
                                "properties": Object.fromEntries((await Promise.all(type.getProperties().filter(p => !checker.getTypeOfSymbol(p).getCallSignatures().length).map(p => ({ prop: p, type: serializeType(checker, checker.getTypeOfSymbol(p), defs) })).map(x => 'promise' in x.type ? x.type.promise.then(r => [x.prop.escapedName, r]) : Promise.resolve([x.prop.escapedName, x.type])))).filter(e => e[1])),
                                // "items": { "$dynamicRef": "#T" }
                            }
                        })()
                    }
                }
                break;
            }
    }
    if (ts.isCallSignatureDeclaration(type.symbol?.valueDeclaration))
    {
        return null;
    }
    debugger;
}
function resolve(initRef: string, schema: SchemaConfiguration): SchemaObject
{
    const fragments = initRef.split('/');
    if (fragments.length == 1)
        return { type: initRef };
    if (fragments[0] !== '#')
        throw new Error('unsupported relative references');
    fragments.splice(0, 1);
    for (const fragment of fragments)
    {
        if (typeof schema[fragment] == 'object')
            schema = schema[fragment];
        else
            throw new Error('non object schema reached')
    }

    return schema;
}


export function redirectSchema(schema: SchemaObject, fromPath: string | RegExp, toPath: string)
{
    walkSchema(schema, {
        walkRef: (ref: { $ref: string }) =>
        {
            ref.$ref = ref.$ref.replace(fromPath, toPath);
        }
    })
    return schema;
}

function walkSchema(ref: SchemaObject, walkerOverride: { walkRef?: (ref: { $ref: string }) => void; })
{
    if (ref['$ref'])
        if (walkerOverride.walkRef)
            walkerOverride.walkRef(ref as any);



    if (ref['properties'])
    {
        const walker = walkerOverride['walkProperties'];
        if (walker)
            walker(ref);
        else
            Object.values(ref['properties']).forEach(ref => walkSchema(ref, walkerOverride));
    }

    if (ref['type'] == 'array')
    {
        const walker = walkerOverride['walkItems'];
        if (walker)
            walker(ref);
        else
            walkSchema(ref['items'], walkerOverride);
    }


    jsonSchemaArrays.forEach(p =>
    {
        if (ref[p])
        {
            const walker = walkerOverride['walk' + p[0].toUpperCase() + p.substring(1)];
            if (walker)
                walker(ref);
            else
                ref[p].forEach(ref => walkSchema(ref, walkerOverride));
        }
    })
}

