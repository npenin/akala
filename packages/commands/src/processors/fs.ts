import * as path from 'path'
import { promises as fs, existsSync } from 'fs'
import * as akala from '@akala/core'
import * as  Metadata from '../metadata/index.js';
import { CommandProcessor } from '../model/processor.js';
import { Container } from '../model/container.js';
import { registerCommands } from '../generator.js';
import { Local } from './local.js';
import { jsonObject } from '../metadata/index.js';
import { MiddlewarePromise } from '@akala/core';
import { eachAsync } from '@akala/core';
import { createRequire } from 'module';
import { handlers, parseQueryString } from '../protocol-handler.js';
import { stat } from 'fs/promises';
import os from 'node:os'
import { fileURLToPath, pathToFileURL } from 'url';

async function protocolHandler(url: URL)
{
    let options: DiscoveryOptions = parseQueryString(url);
    if (url.searchParams.has('ignoreFileWithNoDefaultExport'))
        options.ignoreFileWithNoDefaultExport = !!url.searchParams.get('ignoreFileWithNoDefaultExport') && url.searchParams.get('ignoreFileWithNoDefaultExport').toLocaleLowerCase() !== 'false';
    else
        options.ignoreFileWithNoDefaultExport = true;

    let p: string = url.hostname;
    if (os.platform() == 'win32')
        p += url.pathname.substring(1);
    else
        p += url.pathname;

    if (typeof (options.isDirectory) === 'undefined')
    {
        const stats = await stat(p);
        options.isDirectory = stats.isDirectory();
    }
    if (typeof (options.relativeTo) === 'undefined')
        if (!options.isDirectory)
            options.relativeTo = path.dirname(p);
        else
            options.relativeTo = p;

    return { processor: new FileSystem(options.relativeTo), getMetadata: () => FileSystem.discoverMetaCommands(p, options) }
}


handlers.useProtocol('fs', protocolHandler);
handlers.useProtocol('file', protocolHandler);
handlers.useProtocol('npm',
    async function npmHandler(url: URL)
    {
        let options: DiscoveryOptions = url.search && Object.fromEntries(url.searchParams.entries()) || {};
        if (url.searchParams.has('ignoreFileWithNoDefaultExport'))
            options.ignoreFileWithNoDefaultExport = !!url.searchParams.get('ignoreFileWithNoDefaultExport') && url.searchParams.get('ignoreFileWithNoDefaultExport').toLocaleLowerCase() !== 'false';
        else
            options.ignoreFileWithNoDefaultExport = true;

        let p: string = 'node_modules/' + url.hostname;
        if (p.endsWith('/'))
            p = p.substring(0, p.length - 1);

        if (os.platform() == 'win32')
            p += url.pathname.substring(1);
        else
            p += url.pathname;

        if (typeof (options.isDirectory) === 'undefined')
        {
            try
            {
                const stats = await stat(p);
                options.isDirectory = stats.isDirectory();
            }
            catch (e)
            {
                if (e.code == 'ENOENT')
                {
                    const cwd = process.cwd();
                    const maxUp = cwd.split(path.sep).length;
                    let tmpP = p;
                    for (let i = 1; i <= maxUp; i++)
                    {
                        if (i == maxUp)
                            throw e;
                        tmpP = '../' + tmpP;
                        try
                        {
                            const stats = await stat(tmpP);
                            options.isDirectory = stats.isDirectory();
                            p = tmpP;
                            break;
                        }
                        catch (e)
                        {
                            if (e.code != 'ENOENT')
                                throw e;
                        }
                    }
                }
            }
        }

        if (typeof (options.relativeTo) === 'undefined')
            if (!options.isDirectory)
                options.relativeTo = path.dirname(p);
            else
                options.relativeTo = p;

        return { processor: new FileSystem(options.relativeTo), getMetadata: () => FileSystem.discoverMetaCommands(p, options) }
    });



export interface FileSystemConfiguration extends Metadata.Configuration
{
    path: string;
    source?: string;
    disabled?: boolean;
}

function importJson(path: string)
{
    return fs.readFile(path, { encoding: 'utf-8', flag: 'r' }).then(JSON.parse)
}

export type FSCommand = Metadata.Command & { config?: { fs?: FileSystemConfiguration } };

export interface DiscoveryOptions
{
    flatten?: boolean
    recursive?: boolean
    processor?: CommandProcessor
    isDirectory?: boolean
    ignoreFileWithNoDefaultExport?: boolean
    relativeTo?: string;
}

async function resolveFolder(require: NodeRequire, request: string)
{
    var paths = require.resolve.paths(request);
    var result = null;
    await eachAsync(paths, async p =>
    {
        if (result)
            return;
        try
        {
            if (!p.endsWith('/'))
                p += '/'
            if (!(await fs.stat(path.join(p, request), {})).isDirectory())
                result = path.join(p, request);
        }
        catch (e)
        {
            if (e.code === 'ENOENT')
                return;
            throw e;
        }
    }, true)
    return result;
}

export class FileSystem extends CommandProcessor
{
    public static async discoverCommands<T>(root: string, container: Container<T>, options?: DiscoveryOptions): Promise<void>
    {
        if (!options)
            options = {};

        let fs: FileSystem;
        if (!options.processor)
            options.processor = fs = new FileSystem(options.relativeTo);

        const commands = await this.discoverMetaCommands(root, options);

        registerCommands(commands.commands, options.processor, container);

        if (fs)
            fs.root = options.relativeTo;

        if (typeof (commands.name) != 'undefined')
            container.name = commands.name;
    }

    public static async discoverMetaCommands(root: string, options?: DiscoveryOptions): Promise<Metadata.Container>
    {
        const log = akala.logger('commands:fs:discovery', akala.LogLevels.verbose);
        log.info(`discovering commands in ${root}`)

        if (!options)
            options = {};

        const indexOfColon = root.indexOf('#');
        if (indexOfColon > 1)
        {
            var name = root.substring(indexOfColon + 1);
            root = root.substring(0, indexOfColon);
        }

        if (typeof options.isDirectory == 'undefined')
        {
            try
            {
                if (URL.canParse(root))
                    root = fileURLToPath(root);
                const stats = await fs.stat(root);
                options.isDirectory = stats.isDirectory();
            }
            catch (e)
            {
                if (e.code == 'ENOENT')
                {
                    const resolved = import.meta.resolve(root);
                    if (indexOfColon > 1)
                        return this.discoverMetaCommands(resolved + '#' + name, options);
                    else if (resolved !== root)
                        return this.discoverMetaCommands(resolved, options);
                }
                throw e;
            }
        }

        if (!options.relativeTo)
        {
            if (!options.isDirectory)
                options.relativeTo = path.dirname(root);
            else
                options.relativeTo = root;
        }
        if (!options.isDirectory)
        {
            const cmdRequire = createRequire(path.resolve(root));
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const metacontainer: Metadata.Container & { extends?: string[] } = await importJson(path.resolve(root));
            metacontainer.commands = metacontainer.commands.filter(cmd => !(cmd.name == '$serve' || cmd.name == '$attach' || cmd.name == '$metadata'));
            let globalDefs = metacontainer.$defs;
            if (metacontainer.extends && metacontainer.extends.length)
            {
                await eachAsync(metacontainer.extends, async subPath =>
                {
                    const indexOfColon = subPath.indexOf(':');
                    if (indexOfColon > 1)
                    {
                        var name = subPath.substring(indexOfColon + 1);
                        subPath = subPath.substring(0, indexOfColon);
                    }
                    if (indexOfColon > 1)
                        var parentCommands = await this.discoverMetaCommands(await resolveFolder(cmdRequire, subPath) + ':' + name, { ...options, isDirectory: undefined, relativeTo: cmdRequire.resolve(subPath) });
                    else
                        var parentCommands = await this.discoverMetaCommands(await resolveFolder(cmdRequire, subPath), { ...options, isDirectory: undefined, relativeTo: cmdRequire.resolve(subPath) });
                    if (parentCommands.stateless)
                        Object.defineProperty(metacontainer, 'stateless', { enumerable: false, value: parentCommands.stateless });
                    await eachAsync(parentCommands.commands, async c =>
                    {
                        if (metacontainer.commands.find(c2 => c.name == c2.name))
                            return;
                        if (c.config?.fs?.path)
                            c.config.fs.path = path.resolve(path.dirname(await resolveFolder(cmdRequire, subPath)), c.config.fs.path);
                        if (c.config?.fs?.source)
                            c.config.fs.source = path.resolve(path.dirname(await resolveFolder(cmdRequire, subPath)), c.config.fs.source);

                        if (c.config.schema?.$defs)
                            if (globalDefs)
                                Object.assign(c.config.schema.$defs, globalDefs);

                        try
                        {
                            const f = await fs.open(c.config.fs.source);
                            await f.close();
                            metacontainer.commands.push(c);
                        }
                        catch (e)
                        {
                            if (e.code == 'ENOENT')
                                console.warn(`The file ${c.config.fs.source} does not exist (thus ignoring ${c.name}). It could be that you deleted the source file, but the transpiled file is still around.`)
                            else
                                throw e;
                        }
                    });
                });
            }
            // if ('$defs' in metacontainer && typeof metacontainer.$defs == 'object')
            //     Object.defineProperty(commands, '$defs', { enumerable: false, value: globalDefs });
            // Object.defineProperty(commands, 'name', { enumerable: false, value: metacontainer.name });
            return metacontainer;
        }
        else if (existsSync(path.join(root, 'package.json')))
        {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const packageDef = await importJson(path.join(root, 'package.json'))
            if (packageDef.commands)
                if (typeof (packageDef.commands) == 'string')
                    return this.discoverMetaCommands(path.join(root, packageDef.commands), { processor: options.processor });
                else
                    return this.discoverMetaCommands(path.join(root, packageDef.commands[name]), { processor: options.processor });

        }
        else if (existsSync(path.join(root, 'commands.json')))
            return this.discoverMetaCommands(path.join(root, 'commands.json'), { processor: options.processor, isDirectory: false });

        const metacontainer: Metadata.Container = { name: '', commands: [] }
        const files = await fs.readdir(root, { withFileTypes: true });
        const relativeTo = options.relativeTo;
        await akala.eachAsync(files, async f =>
        {
            if (f.isFile())
            {
                if (f.name.endsWith('.js') || f.name.endsWith('.mjs') || f.name.endsWith('.cjs'))
                {
                    const fsConfig: FileSystemConfiguration & jsonObject = { path: path.relative(relativeTo, path.join(root, f.name)).replace(/\\/g, '/') };

                    if (!options)
                        throw new Error('cannot happen');
                    const cmd: Metadata.Command = { name: path.basename(f.name, path.extname(f.name)), config: { fs: fsConfig } };
                    log.debug(cmd.name);
                    if (files.find(file => file.name == f.name + '.map'))
                    {
                        const sourceMap = JSON.parse(await fs.readFile(path.join(root, path.basename(f.name) + '.map'), 'utf8'));
                        if (cmd.config.fs)
                            cmd.config.fs.source = path.relative(relativeTo, path.join(root, sourceMap.sources[0])).replace(/\\/g, '/');
                    }
                    const source = cmd.config.fs.source || cmd.config.fs.path;
                    try
                    {
                        const f = await fs.open(cmd.config.fs.source);
                        await f.close()
                    }
                    catch (e)
                    {
                        if (e.code == 'ENOENT')
                            console.warn(`The file ${cmd.config.fs.source} does not exist (thus ignoring ${cmd.name}). It could be that you deleted the source file, but the transpiled file is still around.`)
                        else
                        {
                            // console.error(`reading ${f.name} resulted in error`)
                            console.error('Error opening ', cmd.config.fs);
                            console.error(e);
                        }
                        return;
                    }
                    const otherConfigsFile: string = path.join(path.dirname(source), path.basename(source, path.extname(source))) + '.json';

                    if (existsSync(path.resolve(relativeTo, otherConfigsFile)))
                    {
                        log.debug(`found config file ${otherConfigsFile}`)
                        const otherConfigs = await importJson(path.resolve(relativeTo, otherConfigsFile));
                        delete otherConfigs.$schema;
                        const fsConfig = cmd.config.fs;
                        cmd.config = { ...cmd.config, ...otherConfigs };
                        cmd.config.fs = { ...cmd.config.fs, ...fsConfig };
                    }
                    let params: string[];
                    if (!cmd.config.fs.inject)
                    {
                        log.debug(`looking for fs default definition`)
                        params = [];
                        if (cmd.config['']?.inject && cmd.config[''].inject.length)
                        {
                            akala.each(cmd.config[''].inject, item =>
                            {
                                if (typeof item == 'string' && (item.startsWith('param.') || item == '$container'))
                                    params.push(item);
                                else
                                    params.push('ignore');
                            });
                            cmd.config.fs.inject = params;
                        }
                    }
                    // if (!cmd.config.fs.inject)
                    // {
                    //     log.debug(`looking for fs in any configuration`)
                    //     params = [];
                    //     akala.each(cmd.config, config =>
                    //     {
                    //         if (config && config.inject && config.inject.length && !cmd.config.fs.inject)
                    //         {
                    //             akala.each(config.inject, item =>
                    //             {
                    //                 if (item.startsWith('param.'))
                    //                     params[Number(item.substring('param.'.length))] = item;
                    //             });
                    //             cmd.config.fs.inject = params;
                    //         }
                    //     });
                    // }

                    if (!cmd.config.fs.inject)
                    {
                        // eslint-disable-next-line @typescript-eslint/no-var-requires
                        const func = (await import(pathToFileURL(path.resolve(relativeTo, cmd.config.fs.path)).toString())).default;
                        if (!func)
                            if (!options.ignoreFileWithNoDefaultExport)
                                throw new Error(`No default export is mentioned in ${path.resolve(relativeTo, cmd.config.fs.path)}`)
                            else
                                return;

                        // if (func instanceof Command)
                        // {
                        //     cmd = configure('fs', fsConfig)(func);
                        // }

                        if (!cmd.config.fs.inject && func.$inject)
                        {
                            log.debug(`taking $inject`)
                            cmd.config.fs.inject = func.$inject;
                        }
                        else
                        {
                            log.debug(`reflection on function arguments`)
                            let n = 0;
                            cmd.config.fs.inject = akala.introspect.getParamNames(func).map(v =>
                            {
                                if (v == '$container')
                                    return v;
                                return 'param.' + (n++)
                            }
                            );
                        }
                        if (cmd.config.fs.inject && !cmd.config[''])
                            cmd.config[''] = {};
                        if (cmd.config.fs.inject && !cmd.config[''].inject)
                            cmd.config[''].inject = cmd.config.fs.inject;
                    }

                    if (!cmd.config[''])
                        cmd.config[''] = { inject: [] };

                    metacontainer.commands.push(cmd);
                }
                else if (f.name.endsWith('.json'))
                {
                    if (!files.find(file => file.name == path.basename(f.name, '.json') + '.js' || file.name == path.basename(f.name, '.json') + '.mjs' || file.name == path.basename(f.name, '.json') + '.cjs'))
                    {
                        // eslint-disable-next-line @typescript-eslint/no-var-requires
                        try
                        {
                            const cmd: FSCommand = await importJson(path.resolve(path.join(root, f.name)));
                            metacontainer.commands.push(cmd);
                        }
                        catch (e)
                        {
                            console.error('Could not import ', path.join(root, f.name));
                            throw e;
                        }
                    }
                }
            }
            else
                if (f.isDirectory() && options && options.recursive)
                    metacontainer.commands.push(...(await FileSystem.discoverMetaCommands(path.join(root, f.name), options)).commands.map(c => ({ name: (options.flatten ? '' : (f.name + '.')) + c.name, config: c.config })));
        }, false);

        metacontainer.commands.sort((a, b) =>
        {
            if (a.name < b.name) return -1;
            if (a.name > b.name) return 1;
            return 0;
        });
        return metacontainer;
    }

    public async handle(origin: Container<unknown>, command: FSCommand, param: { param: unknown[], _trigger?: string }): MiddlewarePromise
    {
        let filepath: string;
        if (command && command.config && command.config.fs && command.config.fs.path)
            filepath = path.resolve(this.root || process.cwd(), command.config.fs.path);
        else
            filepath = path.resolve(this.root || process.cwd(), command.name);
        try
        {
            filepath = pathToFileURL(filepath).toString();
            let script;
            if (process.env.NODE_ENV !== 'production')
                script = await import(filepath + '?_=' + new Date().valueOf());
            else
                script = await import(filepath);
            //     delete require.cache[filepath];

            if (!param._trigger)
                param._trigger = this.name;

            if (script.default.__esModule)
                script = script.default;
            return Local.handle(command, script.default, origin, param);
        }
        catch (e)
        {
            if (e && e.code == 'MODULE_NOT_FOUND' && e.requireStack.indexOf(filepath) == -1)
                return undefined;
            return e;
        }
    }

    constructor(private root?: string)
    {
        super('fs');
    }
}

export default FileSystem;
