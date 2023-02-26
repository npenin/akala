import * as akala from "../index.js";
import { Container } from '../model/container.js';
import * as path from 'path'
import * as fs from 'fs';
import { Writable } from "stream";
import { outputHelper, write } from './new.js';
import { jsonObject } from "../metadata/command.js";
import { Key, pathToRegexp } from "path-to-regexp";

export default async function generate(folder?: string, name?: string, outputFile?: string)
{
    folder = folder || process.cwd();
    if (!name && fs.existsSync(path.join(folder, './package.json')))
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        name = (await import(path.join(folder, './package.json'))).name;
    if (!name)
        name = path.basename(folder);

    let output: Writable;
    let outputFolder: string;
    ({ output, outputFile, outputFolder } = await outputHelper(outputFile, 'commands.json', true));

    var commands = await akala.Processors.FileSystem.discoverMetaCommands(path.resolve(folder), { relativeTo: outputFolder, isDirectory: true, recursive: true, ignoreFileWithNoDefaultExport: true });

    var result: jsonObject = { paths: {} };
    result.openapi = '3.1.0';
    result.info = { title: 'openAPI documentation for ' + commands.name, version: '' };
    for (var i = 0; i < commands.length; i++)
    {
        if (commands[i].config?.http)
        {
            result.paths[commands[i].config.http.route] = result.paths[commands[i].config.http.route] || {};
            var action: jsonObject = result.paths[commands[i].config.http.route][commands[i].config.http.method] = { parameters: [] };
            var keys: Key[] = [];
            pathToRegexp(commands[i].config.http.route, keys);
            var hasBody = false;
            action.parameters = commands[i].config.http.inject.map(p =>
            {
                if (p.startsWith('route.'))
                    return {
                        name: p.substring('route.'.length),
                        in: 'path',
                        required: keys.find(k => k.name == p.substring('route.'.length)).modifier == '?'
                    }
                if (p.startsWith('query.'))
                    return {
                        name: p.substring('query.'.length),
                        in: 'query',
                        required: keys.find(k => k.name == p.substring('query.'.length)).modifier == '?'
                    }
                if (p.startsWith('header.'))
                    return {
                        name: p.substring('header.'.length),
                        in: 'header',
                        required: keys.find(k => k.name == p.substring('header.'.length)).modifier == '?'
                    }
                if (p.startsWith('body.'))
                    hasBody = true;
            });
            if (hasBody)
            {
                var content = { schema: { type: 'object', properties: {} } };
                switch (commands[i].config.http.type)
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
                commands[i].config.http.inject.forEach(p =>
                {
                    if (p.startsWith('body.'))
                        content.schema.properties[p.substring('body.'.length)] = {};
                });
            }
        }
    }
    await write(output, JSON.stringify(result, null, 4));
    await new Promise(resolve => output.end(resolve));
}