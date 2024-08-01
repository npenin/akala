import { ErrorWithStatus, FetchHttp } from '@akala/core';
import fs from 'fs/promises'
import { fileURLToPath } from 'url';
import { Command } from '../metadata/command.js';
import { Container } from '../metadata/container.js';
import { outputHelper, write } from './new.js';
import { Writable } from 'stream';
import { promisify } from 'util';
import { redirectSchema, simplifySchema } from './generate-schema.js';
import { OpenApi30 } from '../oas30.js';
import { OpenApi31 } from '../oas31.js';
import { OpenApi20 } from '../oas20.js';

export default async function (pathToOpenApiFile: string | URL, outputFile?: string)
{

    console.log(arguments)
    let output: Writable;
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
        const commands: Command[] = Object.entries(openApi.paths).flatMap(([path, requests]) =>
            Object.entries(requests).map(([method, request]) =>
            {
                const parameters = Object.fromEntries(request.parameters.map(p => [p.in + '.' + p.name, p]))
                const needsSchema = !!request.parameters.find(p => p.in == 'body') || request.responses['200'].schema;

                return simplifySchema({
                    name: request.operationId,
                    config: {
                        schema: {
                            $defs: needsSchema ? { ...openApi.components, ...Object.fromEntries(request.parameters.filter(p => p.in == 'body').map(p => ['body.' + p.name, p.schema])) } : undefined,
                            inject: request.parameters.map(p => p.in == 'body' ? 'body.' + p.name : p.type),
                            resultSchema: redirectSchema(request.responses['200'].schema, '#/components/', '#/$defs/')
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
            await write(output, JSON.stringify(result, null, 4));
            await promisify(cb => output.end(cb))();
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
            await write(output, JSON.stringify(result, null, 4));
            await promisify(cb => output.end(cb))();
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

