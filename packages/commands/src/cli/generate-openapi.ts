import * as akala from "../index.js";
import * as path from 'path'
import * as fs from 'fs';
import { Writable } from "stream";
import { outputHelper, write } from './new.js';
import { jsonObject } from "../metadata/configurations.js";
// import { Key, pathToRegexp } from "path-to-regexp";

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

    var container = await akala.Processors.FileSystem.discoverMetaCommands(path.resolve(folder), discoveryOptions);

    var result: jsonObject = { paths: {} };
    result.openapi = '3.1.0';
    result.info = { title: 'openAPI documentation for ' + container.name, version: '' };
    for (var i = 0; i < container.commands.length; i++)
    {
        if (container.commands[i].config?.http)
        {
            result.paths[container.commands[i].config.http.route] = result.paths[container.commands[i].config.http.route] || {};
            var action: jsonObject = result.paths[container.commands[i].config.http.route][container.commands[i].config.http.method] = { parameters: [] };
            // var keys: Key[] = [].concat(pathToRegexp(commands[i].config.http.route).keys);
            var hasBody = false;
            action.parameters = container.commands[i].config.http.inject.map(p =>
            {
                if (typeof p == 'string')
                    if (p.startsWith('route.'))
                        return {
                            name: p.substring('route.'.length),
                            in: 'path',
                            // required: keys.find(k => k.name == p.substring('route.'.length)).modifier == '?'
                        }
                    else if (p.startsWith('query.'))
                        return {
                            name: p.substring('query.'.length),
                            in: 'query',
                            // required: keys.find(k => k.name == p.substring('query.'.length)).modifier == '?'
                        }
                    else if (p.startsWith('header.'))
                        return {
                            name: p.substring('header.'.length),
                            in: 'header',
                            // required: keys.find(k => k.name == p.substring('header.'.length)).modifier == '?'
                        }
                    else if (p.startsWith('body.'))
                        hasBody = true;
            });
            if (hasBody)
            {
                var content = { schema: { type: 'object', properties: {} } };
                switch (container.commands[i].config.http.type)
                {
                    default:
                    case 'json':
                        action.content = { 'application/json': content }
                        break;
                    case 'raw':
                        action.content = { '*/*': content };
                        break;
                    case 'text':
                        action.content = { 'text/plain': content }
                        break;
                    case 'xml':
                        action.content = { 'text/json': content }
                        break;
                }
                container.commands[i].config.http.inject.forEach((p, i) =>
                {
                    if (typeof p == 'string' && p.startsWith('body.'))
                        content.schema.properties[p.substring('body.'.length)] = container.commands[i].config.schema?.inject[i] ? container.commands[i].config.schema?.$defs[container.commands[i].config.schema?.inject[i] as string] : {};
                });
            }
        }
    }
    await write(output, JSON.stringify(result, null, 4));
    await new Promise(resolve => output.end(resolve));
}