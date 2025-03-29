import { Http, Interpolate } from '@akala/core'
import { basename, extname, sep } from 'path'
import { Metadata, Processors } from '@akala/commands'
import { SchemaObject } from 'ajv';
import fs from 'fs/promises'

function parseRoute(uri: string): { route: string, parameters: { name: string, multiple: boolean }[] }
{
    const url = new URL(uri, 'http://localhost');
    const result = { route: uri, parameters: [] };
    result.route = url.pathname.split('/').map(p =>
    {
        const start = p.indexOf('%7B');
        if (~start)
        {
            const end = p.indexOf('%7D', start);
            if (~end)
            {
                if (p[end - 1] == '+')
                    result.parameters.push({ name: p.substring(start + 3, end - 1), multiple: true })
                else
                    result.parameters.push({ name: p.substring(start + 3, end), multiple: false })
                return `{${result.parameters[result.parameters.length - 1].multiple ? '/' : ''}${result.parameters[result.parameters.length - 1].name}${result.parameters[result.parameters.length - 1].multiple ? '*' : ''}}`;
            }
        }
        return p;
    }).join('/').replace(/\/\{\//g, '{/');
    return result;
}

const baseUrl = new URL('https://api.github.com/repos/aws/aws-sdk-js-v3/contents/codegen/sdk-codegen/aws-models/');
const downloadBaseUrl = new URL('https://raw.githubusercontent.com/aws/aws-sdk-js-v3/main/codegen/sdk-codegen/aws-models/')

export type Smithy = { smithy: '2.0', metadata: {}, shapes: Record<string, SmithyShapes> }
export type SmithyShapes = (SmithyEnum |
    SmithyService |
    SmithyStructure |
    SmithyMap |
    SmithyList |
    SmithyUnion |
    SmithyString |
    SmithyTimestamp |
    SmithyBlob | SmithyBoolean |
    SmithyByte |
    SmithyShort |
    SmithyInteger |
    SmithyLong |
    SmithyFloat |
    SmithyDouble |
    SmithyBigInt |
    SmithyBigDecimal |
    SmithyDocument) & Partial<SmithyTrait>;
export type SmithyEnum = { type: 'enum', members: Record<string, string> }
export type SmithyIntEnum = { type: 'intEnum', members: Record<string, number> }
export type SmithyService = { type: 'service', operations: SmithyShapeRef[], resources: Record<string, SmithyResource> }
export type SmithyStructure = { type: 'structure', members: Record<string, SmithyShapes | SmithyShapeRef> }
export type SmithyMap = { type: 'map', key: SmithyShapes, value: SmithyShapes }
export type SmithyList = { type: 'list', member: SmithyShapes }
export type SmithyUnion = { type: 'union', members: Record<string, SmithyShapes> }
export type SmithyOperation = { input?: SmithyShapeRef | SmithyShapes, output?: SmithyShapeRef | SmithyShapes }
export type SmithyResource = { operations: Record<string, SmithyOperation>, shapes: Record<string, SmithyShapes> }
export type SmithyShapeRef = { target: string }
export type SmithyTimestamp = { type: 'timestamp' }
export type SmithyString = { type: 'string' }
export type SmithyBlob = { type: 'blob' }
export type SmithyBoolean = { type: 'boolean' }
export type SmithyByte = { type: 'byte' }
export type SmithyShort = { type: 'short' }
export type SmithyInteger = { type: 'integer' }
export type SmithyLong = { type: 'long' }
export type SmithyFloat = { type: 'float' }
export type SmithyDouble = { type: 'double' }
export type SmithyBigInt = { type: 'biginteger' }
export type SmithyBigDecimal = { type: 'bigDecimal' }
export type SmithyDocument = { type: 'document' }
export type SmithyTrait = {
    traits: {
        'aws.api#service': {
            "sdkId": string,
            "arnNamespace": string,
            "cloudFormationName": string,
            "cloudTrailEventSource": string,
            "endpointPrefix": string
        },
        'smithy.rule#endpointRuleSet': SmithyRuleSet<string, string>,
        'smithy.api#http': {
            method: string,
            uri: string,
            code: number
        }
    }
}

export type SmithyRuleSet<TParameters extends string, TOutput extends string> = {
    version: '1.0',
    parameter: Record<TParameters, { buildIn: string, required: boolean, type: 'String' | 'Boolean', default?: string | boolean }>,
    rules: SmithyRules<TParameters, TOutput>[]
};

export type SmithyRuleCondition<TParameters extends string, TOutput> = { fn: 'isSet' | 'booleanEquals' | 'stringEquals' | 'not' | 'getAttr' | 'substring', argv: ({ ref: TParameters } | boolean | string)[], assign: TOutput };
export type SmithyErrorRule<TParameters extends string, TOutput extends string> = { type: 'error', error: string, conditions: SmithyRuleCondition<TParameters, TOutput>[] };
export type SmithyTreeRule<TParameters extends string, TOutput extends string> = { type: 'tree', conditions: SmithyRuleCondition<TParameters, TOutput>[], rules: SmithyRules<TParameters, TOutput>[] };
export type SmithyEndpointRule<TParameters extends string, TOutput extends string> = { type: 'endpoint', conditions: SmithyRuleCondition<TParameters, TOutput>[], rules: SmithyRules<TParameters, TOutput>[], endpoint: SmithyEndpoint };

export type SmithyRules<TParameters extends string, TOutput extends string> = SmithyErrorRule<TParameters, TOutput> | SmithyTreeRule<TParameters, TOutput> | SmithyEndpointRule<TParameters, TOutput>;
// export type SmithyErrorRule = { type: 'error', error: string, conditions: SmithyRuleCondition[] };

export type SmithyEndpoint = { url: string, properties: Record<string, string>, headers: Record<string, string> };

const smithyEvaluator = new Interpolate('{', '}');

const arg = (argument: { ref: string } | boolean | string | SmithyRuleCondition<string, string>) =>
{
    switch (typeof (argument))
    {
        case 'boolean':
            return argument;
        case 'string':
            const evaluator = smithyEvaluator.build(argument, false, (exp) =>
            {
                let endOfRootParameter = exp.length;
                endOfRootParameter = exp.indexOf('#');
                if (endOfRootParameter > -1)
                    return arg({ ref: exp.substring(1, endOfRootParameter) }) + '["' + exp.substring(endOfRootParameter + 1).split('#').join('"]["') + '"]';
                return arg({ ref: exp.substring(1, exp.length - 1) });
            })
            if (!evaluator.expressions?.length)
                return JSON.stringify(argument)
            return evaluator("config");

        // return JSON.stringify(arg);
        case 'object':
            if ('ref' in argument)
                return `config[${JSON.stringify(argument.ref)}]`;
            const result = conditionRules[argument.fn](argument);
            if (argument.assign)
                return `config[${JSON.stringify(argument.assign)}]= await ${result} `;
            return result;
    }
}

function deepObjectInterpolate(obj: unknown)
{
    switch (typeof obj)
    {
        case 'object':
            if (Array.isArray(obj))
                return `[${obj.map(e => deepObjectInterpolate(e))}]`;
            return `{${Object.entries(obj).map(e => JSON.stringify(e[0]) + ':' + deepObjectInterpolate(e[1]))} } `;
        case 'string':
            let interpolateString: RegExpExecArray;
            let result = '';
            let lastOffset = 0;
            const regexp = /\{([A-Z][A-Z0-9]+?)(?:#([A-Z][A-Z0-9]+?)*)?\}/gi;
            while (interpolateString = regexp.exec(obj))
            {
                if (result)
                    result += '+';
                if (interpolateString.index > lastOffset)
                    result += JSON.stringify(obj.substring(lastOffset, interpolateString.index)) + '+';

                result += arg({ ref: interpolateString[1] });
                if (interpolateString[2])
                    result += '[' + interpolateString[2].split('#').map(s => JSON.stringify(s)).join('][') + ']';
                lastOffset += interpolateString.index + interpolateString[0].length;
            }
            if (result)
            {
                if (lastOffset < obj.length)
                    return result + obj.substring(lastOffset);
                return result;
            }
            return JSON.stringify(obj);
        case 'number':
        case 'boolean':
            return obj.toString();
        case 'undefined':
            return 'undefined';
        case 'function':
            throw new Error('Cannot interpolate functions');
    }
}

const conditionRules = {
    isSet: <TParameters extends string, TOutput extends string>(condition: SmithyRuleCondition<TParameters, TOutput>) => `typeof ${arg(condition.argv[0])} != undefined`,
    booleanEquals: <TParameters extends string, TOutput extends string>(condition: SmithyRuleCondition<TParameters, TOutput>) => `${arg(condition.argv[0])} != ${arg(condition.argv[1])} `,
    stringEquals: <TParameters extends string, TOutput extends string>(condition: SmithyRuleCondition<TParameters, TOutput>) => `${arg(condition.argv[0])} != ${arg(condition.argv[1])} `,
    substring: <TParameters extends string, TOutput extends string>(condition: SmithyRuleCondition<TParameters, TOutput>) =>
    {
        if (typeof condition.argv[3] == 'boolean')
            if (condition.argv[3])
                return `${arg(condition.argv[0])}.split("").reverse().join("").substring(${arg(condition.argv[1])
                    },${arg(condition.argv[2])} `;
            else
                return `${arg(condition.argv[0])}.substring(${arg(condition.argv[1])
                    },${arg(condition.argv[2])} `;
        return `${arg(condition.argv[3])} ? ${arg(condition.argv[0])}.split("").reverse().join("").substring(${arg(condition.argv[1])
            }, ${arg(condition.argv[2])
            } : ${arg(condition.argv[0])}.substring(${arg(condition.argv[1])},${arg(condition.argv[2])} `;
    },
    not: <TParameters extends string, TOutput extends string>(condition: SmithyRuleCondition<TParameters, TOutput>) => `!${arg(condition.argv[0])} `,
    getAttr: <TParameters extends string, TOutput extends string>(condition: SmithyRuleCondition<TParameters, TOutput>) => `${arg(condition.argv[0])} [${arg(condition.argv[1])}]`,
    'aws.partition': <TParameters extends string, TOutput extends string>(condition: SmithyRuleCondition<TParameters, TOutput>) => `import('@akala/aws-sdk').then(sdk => sdk.getPartition(${arg(condition.argv[0])}))`,
    isValidHostLabel: <TParameters extends string, TOutput extends string>(condition: SmithyRuleCondition<TParameters, TOutput>) => `/^ [A - Z0 - 9 -\.] + $ / i.test(${arg(condition.argv[0])})`,
}

export function staticEndpointBuilder(ruleset: SmithyRuleSet<string, string>['rules'], parameters: Record<string, string | boolean>): string
{
    return ruleset.map(rule =>
    {
        switch (rule.type)
        {
            case 'error':
                return `if (${rule.conditions?.length ? rule.conditions.map(arg).join(' && ') : true})
throw new Error(${JSON.stringify(rule.error)}); `;
            case 'tree':
                return `if (${rule.conditions?.length ? rule.conditions.map(arg).join(' && ') : true}) {
                ${rule.rules?.length ? staticEndpointBuilder(rule.rules, parameters) : staticEndpointBuilder([{ error: 'invalid smithy rule', type: 'error', conditions: [] }], parameters)};
    throw new Error('Tree Rules exhausted')
} `;
            case 'endpoint':
                if (rule.conditions?.length == 0)
                    return `return ${deepObjectInterpolate(rule.endpoint)}; `;
                return `if (${rule.conditions.map(arg).join(' && ') || true})
return ${deepObjectInterpolate(rule.endpoint)}; `;
        }
    }).join('  ');
}

export function resolve(smithy: Smithy, shape?: SmithyShapes | SmithyShapeRef): SmithyShapes | undefined
{
    if (!shape)
        return undefined;
    if ('target' in shape)
        return smithy.shapes[shape.target];
    return shape;
}

export default async function generateSdk(http: Http, serviceName?: string, output?: string)
{
    if (!serviceName)
    {
        const services = await http.getJSON<{ name: string }[]>(baseUrl);
        await Promise.all(services.map(async s =>
        {
            const serviceName = basename(s.name, extname(s.name));
            await generateSdk(http, serviceName, output)
        }));
        return;
    }

    if (output)
    {
        if ((await fs.stat(output)).isDirectory())
        {
            if (!output.endsWith(sep))
                output += sep;
            output += serviceName + '.json';
        }
    }

    const smithy = await http.getJSON<Smithy>(new URL(serviceName + '.json', downloadBaseUrl));

    const serviceEntry = Object.entries(smithy.shapes).find(x => x[1].type == 'service') as [string, SmithyService & SmithyTrait];
    const service = serviceEntry[1];
    const urn = serviceEntry[0].substring(0, serviceEntry[0].indexOf('#') + 1);

    if (!service)
        throw new Error('Service not found');

    const container: Metadata.Container = { name: service.traits['aws.api#service']!.arnNamespace, commands: [] };

    const schemaCache: Record<string, SchemaObject> = {
        'smithy.api#Unit': { type: 'object' },
        'smithy.api#String': { type: 'string' },
        'smithy.api#Timestamp': { type: 'string', format: 'date-time' },
        "smithy.api#Boolean": { type: 'boolean' },
        "smithy.api#PrimitiveBoolean": { type: 'boolean' },
        "smithy.api#Integer": { type: 'integer' },
        "smithy.api#PrimitiveInteger": { type: 'integer' },
        "smithy.api#Long": { type: 'integer' },
        "smithy.api#PrimitiveLong": { type: 'integer' },
        "smithy.api#Double": { type: 'number' },
        "smithy.api#PrimitiveDouble": { type: 'number' },
        "smithy.api#Float": { type: 'number' },
        "smithy.api#PrimitiveFloat": { type: 'number' },
        "smithy.api#Document": {},
        "smithy.api#Blob": { type: 'string', format: 'binary' },
    };
    container.commands = service.operations?.map<Metadata.Command>(op =>
    {
        const operation = resolve(smithy, op);
        const operationName = op.target.substring(urn.length);
        try
        {
            if (operation.traits['smithy.api#http'])
            {
                const httpTrait = operation.traits['smithy.api#http'];
                const route = parseRoute(httpTrait.uri);

                const schemaDef = toSchema(urn, (operation as SmithyOperation)?.input, smithy, schemaCache);

                return {
                    name: operationName,
                    config: {
                        http: {
                            inject: route.parameters?.length ? [{
                                ...Object.fromEntries(route.parameters.map(p => [p.name, 'route.' + p.name])),
                                '...': httpTrait.method == 'GET' ? 'query' : 'body',
                            }] : httpTrait.method == 'GET' ? ['query'] : ['body'],
                            method: httpTrait.method,
                            route: route.route,
                            // auth: { mode: { type: 'header', name: 'Authorization' } },
                        } as Processors.HttpConfiguration,
                        schema: {
                            resultSchema: toSchema(urn, (operation as SmithyOperation)?.output, smithy, schemaCache),
                            inject: [].concat(route.parameters.map(p => 'param.0.' + p.name), ['param.0']),
                            $defs: { 'param.0': schemaDef }
                        },
                        cli: {
                            inject: ["options"],
                            options: Object.fromEntries(Object.entries(schemaDef.$ref && schemaCache[schemaDef.$ref.substring('#/$defs/'.length)]?.properties || {}).map(e => [e[0], {}]))
                        }
                    }
                }
            }

            return {
                name: operationName,
                config: {
                    http: {
                        inject: ["param.0"],
                        method: 'POST',
                        route: '/',
                        // auth: { mode: { type: 'header', name: 'Authorization' } },
                        type: 'json',
                        headers: { 'X-Amz-Target': serviceEntry[0].substring(urn.length) + '.' + op.target.substring(urn.length) },
                    } as Processors.HttpConfiguration,
                    schema: {
                        resultSchema: toSchema(urn, (operation as SmithyOperation)?.output, smithy, schemaCache),
                        inject: ['param.0'],
                        $defs: { 'param.0': toSchema(urn, (operation as SmithyOperation)?.input, smithy, schemaCache) }
                    }
                }
            }
        }
        catch (e)
        {
            console.error(`error happened for service ${serviceName} and operation ${op.target.substring(urn.length)} `)
            throw e;
        }
    });

    container.$defs = schemaCache;

    container['aws'] = {
        endpoint: service.traits['smithy.rules#endpointRuleSet'],
    }

    if (output)
        await fs.writeFile(output, JSON.stringify(container, null, 4));
    else
        return container;
}



function toSchema(urn: string, obj: SmithyShapeRef | SmithyShapes, smithy: Smithy, schemaCache: Record<string, SchemaObject>): SchemaObject
{
    if ('type' in obj)
        switch (obj.type)
        {
            case 'string': return { type: 'string' };
            case 'timestamp': return { type: 'string', format: 'date-time' };
            case 'enum': return { enum: Object.keys(obj.members) };
            case 'list': return { type: 'array', items: toSchema(urn, obj.member, smithy, schemaCache) };
            case 'map': return { type: 'object', additionalProperties: toSchema(urn, obj.value, smithy, schemaCache) };
            case 'service': return { type: 'object' };
            case 'document': return {};
            case 'union':
            case 'structure': return { type: 'object', properties: Object.fromEntries(Object.entries(obj.members).map(([k, v]) => [k, toSchema(urn, v, smithy, schemaCache)])) };
            case 'boolean': return { type: 'boolean' };
            case 'blob': return { type: 'string', format: 'binary' };
            case 'byte': return { type: 'integer', format: 'int32' };
            case 'short': return { type: 'integer', format: 'int32' };
            case 'integer': return { type: 'integer', format: 'int32' };
            case 'long': return { type: 'integer', format: 'int64' };
            case 'float': return { type: 'number', format: 'float' };
            case 'double': return { type: 'number', format: 'double' };
            case 'biginteger': return { type: 'integer' };
            case 'bigDecimal': return { type: 'number' };
            default: throw new Error('Unknown type ' + obj['type']);
        }

    const name = obj.target.startsWith(urn) ? obj.target.substring(urn.length) : obj.target;
    if (!schemaCache[name])
    {
        schemaCache[name] = {}
        Object.assign(schemaCache[name], toSchema(urn, resolve(smithy, obj), smithy, schemaCache));
    }
    if (name == 'smithy.api#Unit')
        return schemaCache[name];
    return {
        $ref: '#/$defs/' + name
    };
}
