import { ErrorWithStatus, FetchHttp } from '@akala/core';
import fs from 'fs/promises'
import { fileURLToPath } from 'url';
import { Command } from '../metadata/command.js';
import { Container } from '../metadata/container.js';
import { outputHelper } from '../new.js';
import { redirectSchema, simplifySchema } from './generate-schema.js';
import { OpenApi30, Operation, Parameter, PathItem, Reference, Response } from '../oas30.js';
import { OpenApi31, operation, parameter, parameterOrReference, pathItem, response } from '../oas31.js';
import { OpenApi20 } from '../oas20.js';
import { resolve, resolveToTypeScript } from './generate-ts-from-schema.js';

export default async function (pathToOpenApiFile: string | URL, outputFile?: string)
{

    console.log(arguments)
    let output: WritableStreamDefaultWriter;
    ({ output } = await outputHelper(outputFile, 'openapi.json', true));
    if (typeof pathToOpenApiFile == 'string')
    {
        if (pathToOpenApiFile.indexOf(':') < 1)
            pathToOpenApiFile = 'file://' + pathToOpenApiFile;
        pathToOpenApiFile = new URL(pathToOpenApiFile);
    }
    let content: string;
    switch (pathToOpenApiFile.protocol)
    {
        case 'file:':
            content = await fs.readFile(fileURLToPath(pathToOpenApiFile), { encoding: 'utf8' });
            break;
        case 'https:':
            if (pathToOpenApiFile.host == 'app.swaggerhub.com')
                pathToOpenApiFile.pathname = pathToOpenApiFile.pathname.replace(/\/apis(-docs)?\//, '/apiproxy/schema/file/apis/');

            content = await new FetchHttp(null).getJSON(pathToOpenApiFile.toString(), new URLSearchParams({ format: 'json' }));
            break;
        default:
            throw new Error('Unsupported URL scheme');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const openApi: OpenApi30 | OpenApi31 | OpenApi20 = typeof content == 'string' ? JSON.parse(content) : content;

    if (isOpenApi3(openApi))
    {
        openApi.components.schemas && Object.values(openApi.components.schemas).forEach(s => redirectSchema(s, '#/components/', '#/$defs/'));
        // Object.values(openApi.components.requestBodies).forEach(s => Objects.content redirectSchema(, '#/components/', '#/$defs/'));
        openApi.components.responses && Object.values(openApi.components.responses).forEach(s => redirectSchema(s, '#/components/', '#/$defs/'));
        // const baseUri = new URL(openApi.schemes[0] + '://' + openApi.host + openApi.basePath);
        const commands: Command[] = (await Promise.all(Object.entries(openApi.paths).map(async ([path, requests]: [string, PathItem | pathItem]) =>
            await Promise.all(Object.entries(requests).map(async ([method, request]: [string, Operation | operation]) =>
            {
                const parameters = Object.fromEntries(await Promise.all(request.parameters?.map(async (p: Parameter | Reference | parameterOrReference, i: number) => '$ref' in p ? ['params.' + i, await resolveToTypeScript(p.$ref, { '#': openApi as any }, {})] : [(p as parameter | Parameter).in + '.' + (p as parameter | Parameter).name, p]) || [])) as Record<string, parameter | Parameter>
                const needsSchema = !!request.parameters?.find(p => p && ('$ref' in p || 'in' in p && p.in == 'body')) || request.responses['200'] && '$ref' in request.responses['200'] && resolve(request.responses['200'].$ref as string, { '#': openApi }, {}) || (request.responses['200'] as response | Response)?.content.schema;

                return simplifySchema({
                    name: request.operationId,
                    config: {
                        schema: {
                            $defs: needsSchema ? { ...openApi.components, ...Object.fromEntries(request.parameters?.filter(p => 'in' in p && p.in == 'body').map((p: parameter | Parameter) => ['body.' + p.name, p.schema])) } : undefined,
                            inject: request.parameters?.map(p => p.in == 'body' ? 'body.' + p.name : p.type),
                            resultSchema: request.responses['200'] && redirectSchema('$ref' in request.responses['200'] && resolve(request.responses['200'].$ref as string, { '#': openApi }, {}) || (request.responses['200'] as response | Response).content.schema, '#/components/', '#/$defs/')
                        },
                        doc: {
                            inject: Object.keys(parameters),
                            description: request.description,
                            options: Object.fromEntries(Object.entries(parameters).map(e => [e[0], e[1].description]))
                        },
                        http: {
                            method,
                            type: getType20(openApi, request),
                            route: path,
                            inject: Object.keys(parameters),
                        },
                        auth: {
                            http: getAuth3(openApi, request)
                        }
                    }
                } as Command)
            })
            )))).flat();
        const result = { commands, name: openApi.info.title.replace(/\./g, '-') } as Container;
        if (outputFile)
        {
            await output.write(JSON.stringify(result, null, 4));
            await output.close();
        }
        else
            return result;
    }
    else if (openApi.swagger == '2.0')
    {
        Object.values(openApi.definitions).forEach(s => redirectSchema(s, '#/definitions/', '#/$defs/'));
        // const baseUri = new URL(openApi.schemes[0] + '://' + openApi.host + openApi.basePath);
        const commands: Command[] = Object.entries(openApi.paths).flatMap(([path, requests]) =>
            Object.entries(requests).map(([method, request]) =>
            {
                const parameters = Object.fromEntries(request.parameters.map(p => [p.in + '.' + p.name, p]))
                const needsSchema = !!request.parameters.find(p => p.in == 'body') || request.responses['200'].schema;

                return simplifySchema({
                    name: request.operationId,
                    config: {
                        schema: {
                            $defs: needsSchema ? { ...openApi.definitions, ...Object.fromEntries(request.parameters.filter(p => p.in == 'body').map(p => ['body.' + p.name, p.schema])) } : undefined,
                            inject: request.parameters.map(p => p.in == 'body' ? 'body.' + p.name : p.type),
                            resultSchema: redirectSchema(request.responses['200'].schema, '#/definitions/', '#/$defs/')
                        },
                        doc: {
                            inject: Object.keys(parameters),
                            description: request.description,
                            options: Object.fromEntries(Object.entries(parameters).map(e => [e[0], e[1].description]))
                        },
                        http: {
                            method,
                            type: getType20(openApi, request),
                            route: path,
                            inject: Object.keys(parameters),
                        },
                        auth: {
                            http: getAuth20(openApi, request)
                        }
                    }
                } as Command)
            })
        );
        const result = { commands, name: openApi.info.title.replace(/\./g, '-') } as Container;
        if (outputFile)
        {
            await output.write(JSON.stringify(result, null, 4));
            await output.close();
        }
        else
            return result;
    }
    else
        console.log(openApi);
}

function isOpenApi3(x: object): x is OpenApi30 | OpenApi31
{
    return 'openapi' in x && x.openapi > '3.';
}

function getType20(openApi: any, request: any): "json" | "xml" | "text" | "raw"
{
    if (openApi.produces?.length)
    {
        switch (openApi.produces[0])
        {
            case 'application/json':
            case 'text/json':
                return 'json';
            case 'application/xml':
                return 'xml';
            case 'text/plain':
                return 'text';
            case 'application/octet-stream':
                return 'raw';
        }
    }
    return 'json';
}
function getAuth3(openApi: OpenApi30 | OpenApi31, request: any): import("../index.js").Configuration & { mode: "basic" | "bearer" | { type: "query" | "header" | "cookie"; name: string; }; }
{
    if (request.security?.length)
    {
        const auth = Object.entries(request.security[0])[0];
        console.log(openApi.components.securitySchemes[auth[0]])
        switch (openApi.components.securitySchemes[auth[0]].type)
        {
            case 'apiKey':
                return {
                    mode: { name: openApi.components.securitySchemes[auth[0]].name, type: openApi.components.securitySchemes[auth[0]].in },
                    inject: ['headers.' + openApi.components.securitySchemes[auth[0]].name]
                };
            case 'basic':
                return {
                    mode: 'basic',
                    inject: ['headers.authorization']
                };
            case 'oauth2':
                // return {
                //     mode: 'bearer',

                // }
                throw new ErrorWithStatus(501, 'oauth2 flow not yet supported');
            case 'openIdConnect':
                throw new ErrorWithStatus(501, 'openIdConnect flow not yet supported');
        }
    }
}
function getAuth20(openApi: any, request: any): import("../index.js").Configuration & { mode: "basic" | "bearer" | { type: "query" | "header" | "cookie"; name: string; }; }
{
    if (request.security?.length)
    {
        const auth = Object.entries(request.security[0])[0];
        switch (openApi.securityDefinitions[auth[0]].type)
        {
            case 'apiKey':
                return {
                    mode: { name: openApi.securityDefinitions[auth[0]].name, type: openApi.securityDefinitions[auth[0]].in },
                    inject: ['headers.' + openApi.securityDefinitions[auth[0]].name]
                };
            case 'basic':
                return {
                    mode: 'basic',
                    inject: ['headers.authorization']
                };
            case 'oauth2':
                throw new ErrorWithStatus(501, 'oauth2 flow not yet supported');
        }
    }
}

