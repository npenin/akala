import * as akala from "../index.js";
import * as path from 'path'
import * as fs from 'fs';
import { outputHelper, write } from '../new.js';
import { jsonObject } from "../metadata/configurations.js";
import { pathToFileURL } from "url";
import { each } from "@akala/core";

export default async function generate(folder?: string, name?: string, outputFile?: string)
{
    folder = folder || process.cwd();
    const discoveryOptions: akala.Processors.DiscoveryOptions = { isDirectory: true };

    if (!name && fs.existsSync(path.join(folder, './package.json')))
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        name = (await import(path.join(folder, './package.json'))).name;
    if (!name)
    {
        // name = path.basename(folder);
        discoveryOptions.isDirectory = false;
    }

    const outputResult = await outputHelper(outputFile, 'commands.json', true);
    const output = outputResult.output;
    discoveryOptions.relativeTo = pathToFileURL(outputResult.outputFolder);
    discoveryOptions.recursive = true;
    discoveryOptions.ignoreFileWithNoDefaultExport = true;

    const container = await akala.Processors.FileSystem.discoverMetaCommands(path.resolve(folder), discoveryOptions);

    const result: jsonObject = { paths: {} };
    result.openapi = '3.1.0';
    result.info = { title: 'openAPI documentation for ' + container.name, version: '' };
    for (const command of container.commands)
    {
        if (command.config?.http)
        {
            result.paths[command.config.http.route] = result.paths[command.config.http.route] || {};
            const action: jsonObject = result.paths[command.config.http.route][command.config.http.method] = { parameters: [] };
            // var keys: Key[] = [].concat(pathToRegexp(commands[i].config.http.route).keys);
            let hasBody = false;
            action.parameters = Array.isArray(command.config.http.inject) ? command.config.http.inject.map(p =>
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
            }) : command.config.http.inject as jsonObject;
            if (hasBody)
            {
                const content = { schema: { type: 'object', properties: {} } };
                switch (command.config.http.type)
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
                if (Array.isArray(command.config.http.inject))
                    command.config.http.inject.forEach((p, i) =>
                    {
                        if (typeof p == 'string' && p.startsWith('body.'))
                            content.schema.properties[p.substring('body.'.length)] = p ? command.config.schema?.$defs[p] : {};
                    });
                else
                {
                    each(command.config.http.inject as any, (p, i) =>
                    {
                        if (typeof p == 'string' && p.startsWith('body.'))
                            content.schema.properties[p.substring('body.'.length)] = p ? command.config.schema?.$defs[p] : {};
                    });
                }
            }
        }
    }
    await write(output, JSON.stringify(result, null, 4));
    await new Promise(resolve => output.end(resolve));
}
