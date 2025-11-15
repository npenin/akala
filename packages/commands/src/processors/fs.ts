import * as path from 'path'
import * as akala from '@akala/core'
import * as  Metadata from '../metadata/index.js';
import { CommandProcessor, type StructuredParameters } from '../model/processor.js';
import { Container } from '../model/container.js';
import { registerCommands } from '../generator.js';
import { Local } from './local.js';
import { type jsonObject } from '../metadata/index.js';
import { type MiddlewarePromise, eachAsync } from '@akala/core';
import { protocolHandlers as handlers, parseQueryString } from '../protocol-handler.js';
import { fileURLToPath, pathToFileURL } from 'url';
import fsHandler, { type FileSystemProvider, OpenFlags } from '@akala/fs';

async function protocolHandler(url: URL)
{
    const options: DiscoveryOptions = parseQueryString(url);
    if (url.searchParams.has('ignoreFileWithNoDefaultExport'))
        options.ignoreFileWithNoDefaultExport = !!url.searchParams.get('ignoreFileWithNoDefaultExport') && url.searchParams.get('ignoreFileWithNoDefaultExport').toLocaleLowerCase() !== 'false';
    else
        options.ignoreFileWithNoDefaultExport = true;

    const fs = await fsHandler.process(url);

    if (typeof (options.isDirectory) === 'undefined')
    {
        const stats = await fs.stat(url);
        options.isDirectory = stats.isDirectory;
    }
    if (!options.isDirectory)
        fs.chroot('./');
    if (typeof (options.relativeTo) === 'undefined')
        options.relativeTo = fs.root;

    options.fs = fs;

    return { processor: new FileSystem(fs), getMetadata: () => FileSystem.discoverMetaCommands(url, options) }
}


handlers.useProtocol('fs', protocolHandler);
handlers.useProtocol('file', protocolHandler);

handlers.useProtocol('npm', protocolHandler);
// async function npmHandler(url: URL)
// {
//     const options: DiscoveryOptions = url.search && Object.fromEntries(url.searchParams.entries()) || {};
//     if (url.searchParams.has('ignoreFileWithNoDefaultExport'))
//         options.ignoreFileWithNoDefaultExport = !!url.searchParams.get('ignoreFileWithNoDefaultExport') && url.searchParams.get('ignoreFileWithNoDefaultExport').toLocaleLowerCase() !== 'false';
//     else
//         options.ignoreFileWithNoDefaultExport = true;

//     const fs = await fsHandler.process(url);

//     options.fs = fs;


//     return { processor: new FileSystem(options.fs?.toImportPath(url)), getMetadata: () => FileSystem.discoverMetaCommands(url, options) }
// });



export interface FileSystemConfiguration extends Metadata.Configuration
{
    path: string;
    source?: string;
    disabled?: boolean;
}

function importJson(fs: FileSystemProvider, path: string | URL)
{
    return fs.readFile(path, { encoding: 'utf-8', flag: OpenFlags.Read }).then(JSON.parse)
}
function tryImportJson(fs: FileSystemProvider, path: string | URL)
{
    return importJson(fs, path).catch(e =>
    {
        if (e.statusCode == akala.HttpStatusCode.NotFound)
            return undefined;
        throw e;
    });
}

export type FSCommand = Metadata.Command & { config?: { fs?: FileSystemConfiguration } };

export interface DiscoveryOptions
{
    fs?: FileSystemProvider;
    flatten?: boolean
    recursive?: boolean
    processor?: CommandProcessor
    isDirectory?: boolean
    ignoreFileWithNoDefaultExport?: boolean
    relativeTo?: URL;
}

export class FileSystem extends CommandProcessor
{
    public static async discoverCommands<T>(root: string, container: Container<T>, options?: DiscoveryOptions): Promise<void>
    {
        if (!options)
            options = {};


        const commands = await this.discoverMetaCommands(root, options);

        let processor: FileSystem;
        if (!options.processor)
            options.processor = processor = new FileSystem(options.fs);

        registerCommands(commands.commands, options.processor, container);

        processor?.fs.chroot(options.relativeTo);

        if (typeof (commands.name) != 'undefined')
            container.name = commands.name;
    }

    public static async discoverMetaCommands(root: string | URL, options?: DiscoveryOptions): Promise<Metadata.Container>
    {
        const log = akala.defaultContext?.logger('commands:fs:discovery');
        log.info(`discovering commands in ${root}`)

        if (!options)
            options = {};

        let name: string = options && 'name' in options && typeof options.name == 'string' ? options.name : '';
        if (typeof root == 'string')
            if (!URL.canParse(root))
                if (options.fs)
                    root = new URL(root, options.fs.root);
                else
                    root = pathToFileURL(root);
            else
                root = new URL(root);
        if (root.hash?.length > 1)
        {
            name = root.hash.substring(1);
            root.hash = '';
        }

        const hasNoFs = !options.fs

        if (hasNoFs)
            options.fs = await fsHandler.process(root);

        if (typeof options.isDirectory == 'undefined')
        {
            const stats = await options.fs.stat(root);
            options.isDirectory = stats.isDirectory;
        }

        if (options.isDirectory && !root.pathname.endsWith('/'))
            root = new URL(root + '/');

        if (!options.isDirectory)
            options.fs.chroot(new URL('./', root));
        else if (!root.pathname.endsWith('/'))
            options.fs.chroot(root);

        if (!options.relativeTo)
        {
            if (!options.isDirectory)
                options.relativeTo = new URL('./', root);
            else if (!root.pathname.endsWith('/'))
                options.relativeTo = new URL(root + '/');
            else
                options.relativeTo = new URL(root);
        }
        if (!options.isDirectory)
        {
            // const cmdRequire = createRequire(fileURLToPath(root));
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const metacontainer: Metadata.Container & { extends?: string[] } = await importJson(options.fs, root.toString());
            metacontainer.commands = metacontainer.commands.filter(cmd => !(cmd.name == '$serve' || cmd.name == '$attach' || cmd.name == '$metadata'));
            const globalDefs = metacontainer.$defs;
            if (metacontainer.extends?.length)
            {
                await eachAsync(metacontainer.extends, async subPath =>
                {
                    const subFs = await fsHandler.process(new URL(subPath, root));
                    const relativeToPath = subFs.root.toString().startsWith(options.fs.root.toString()) ? subFs.root.pathname.endsWith('/') ? subFs.root.toString() : path.dirname(subFs.root.toString()) : '';
                    const parentCommands = await this.discoverMetaCommands(new URL(subPath, root), { ...options, fs: subFs, isDirectory: undefined });
                    if (parentCommands.stateless)
                        Object.defineProperty(metacontainer, 'stateless', { enumerable: false, value: parentCommands.stateless });
                    await eachAsync(parentCommands.commands, async c =>
                    {
                        if (metacontainer.commands.find(c2 => c.name == c2.name))
                            return;
                        const subURL = new URL(subPath, root);
                        if (c.config?.fs?.path)
                            if (relativeToPath)
                                c.config.fs.path = path.relative(relativeToPath, new URL(c.config.fs.path, subURL).toString())
                            else
                                c.config.fs.path = new URL(c.config.fs.path, subURL).toString();
                        if (c.config?.fs?.source)
                            if (relativeToPath)
                                c.config.fs.source = path.relative(relativeToPath, new URL(c.config.fs.source, subURL).toString())
                            else
                                c.config.fs.source = new URL(c.config.fs.source, subURL).toString();

                        if (c.config.schema?.$defs)
                            if (globalDefs)
                                Object.assign(c.config.schema.$defs, globalDefs);

                        try
                        {
                            const f = await subFs.open(c.config.fs.source, OpenFlags.Read);
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
        else
        {
            if (options.fs.root.toString() == root.toString())
            {
                const packageDef = await tryImportJson(options.fs, './package.json');

                if (packageDef)
                {
                    // eslint-disable-next-line @typescript-eslint/no-var-requires
                    if (packageDef.commands)
                        if (typeof (packageDef.commands) == 'string')
                            return this.discoverMetaCommands(packageDef.commands, { fs: options.fs, processor: options.processor });
                        else if (name in packageDef.commands)
                            return this.discoverMetaCommands(packageDef.commands[name], { fs: options.fs, processor: options.processor });

                }
                else 
                {
                    const commands = await tryImportJson(options.fs, './commands.json');
                    if (commands)
                        return this.discoverMetaCommands('./commands.json', { fs: options.fs, processor: options.processor, isDirectory: false });
                }
            }
        }

        const metacontainer: Metadata.Container = { name: '', commands: [] }
        const files = await options.fs.readdir(root, { withFileTypes: true });
        const relativeTo = options.relativeTo;
        const relativeToPath = fileURLToPath(options.relativeTo);
        await akala.eachAsync(files, async f =>
        {
            if (f.isFile)
            {
                if (f.name.endsWith('.js') || f.name.endsWith('.mjs') || f.name.endsWith('.cjs'))
                {
                    const fsConfig: FileSystemConfiguration & jsonObject = { path: path.relative(relativeToPath, fileURLToPath(new URL(f.name, root))).replace(/\\/g, '/') };

                    if (!options)
                        throw new Error('cannot happen');
                    const cmd: Metadata.Command = { name: path.basename(f.name, path.extname(f.name)), config: { fs: fsConfig } };
                    log.debug(cmd.name);
                    if (files.find(file => file.name == f.name + '.map'))
                    {
                        const sourceMap = JSON.parse(await options.fs.readFile(new URL(path.basename(f.name) + '.map', root), { encoding: 'utf8' }));
                        if (cmd.config.fs)
                            cmd.config.fs.source = path.relative(relativeToPath, fileURLToPath(new URL(sourceMap.sources[0], new URL(f.name, root))));
                    }
                    const source = cmd.config.fs.source || cmd.config.fs.path;
                    try
                    {
                        const f = await options.fs.open(new URL(cmd.config.fs.source, relativeTo), OpenFlags.Read);
                        await f.close()
                    }
                    catch (e)
                    {
                        if (e.statusCode == akala.HttpStatusCode.NotFound)
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
                    const otherConfigs = await tryImportJson(options.fs, new URL(otherConfigsFile, relativeTo));

                    if (otherConfigs)
                    {
                        log.debug(`found config file ${otherConfigsFile}`)
                        delete otherConfigs.$schema;
                        const fsConfig = cmd.config.fs;
                        cmd.config = { ...cmd.config, ...otherConfigs };
                        cmd.config.fs = { ...cmd.config.fs, ...fsConfig };
                    }
                    if (!cmd.config.fs.inject)
                    {
                        log.debug(`looking for fs default definition`)
                        if (Array.isArray(cmd.config['']?.inject))
                        {
                            const params: string[] = [];
                            if (cmd.config['']?.inject?.length)
                            {
                                akala.each(cmd.config[''].inject, item =>
                                {
                                    if (typeof item == 'string' && (item.startsWith('params.') || item == '$container' || item.startsWith('$state.')))
                                        params.push(item);
                                    else
                                        params.push('ignore');
                                });
                                cmd.config.fs.inject = params;
                            }
                        }
                        else
                        {
                            cmd.config.fs.inject = cmd.config['']?.inject && akala.map(cmd.config[''].inject as any, item =>
                            {
                                if (typeof item == 'string' && (item.startsWith('params.') || item == '$container' || item.startsWith('$state.')))
                                    return item
                                else
                                    return 'ignore';
                            });
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
                    //                 if (item.startsWith('params.'))
                    //                     params[Number(item.substring('params.'.length))] = item;
                    //             });
                    //             cmd.config.fs.inject = params;
                    //         }
                    //     });
                    // }

                    if (!cmd.config.fs.inject)
                    {
                        // eslint-disable-next-line @typescript-eslint/no-var-requires
                        const func = (await import(pathToFileURL(path.resolve(relativeToPath, cmd.config.fs.path)).toString())).default;
                        if (!func)
                            if (!options.ignoreFileWithNoDefaultExport)
                                throw new Error(`No default export is mentioned in ${path.resolve(relativeToPath, cmd.config.fs.path)}`)
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
                                return 'params.' + (n++)
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
                            const cmd: FSCommand = await importJson(options.fs, new URL(f.name, root));
                            metacontainer.commands.push(cmd);
                        }
                        catch (e)
                        {
                            console.error('Could not import ', path.join(root.toString(), f.name));
                            throw e;
                        }
                    }
                }
            }
            else
                if (f.isDirectory && options?.recursive)
                    metacontainer.commands.push(...(await FileSystem.discoverMetaCommands(new URL(f.name, root), options)).commands.map(c => ({ name: (options.flatten ? '' : (f.name + '.')) + c.name, config: c.config })));
        }, false);

        metacontainer.commands.sort((a, b) =>
        {
            if (a.name < b.name) return -1;
            if (a.name > b.name) return 1;
            return 0;
        });
        return metacontainer;
    }

    public async handle(origin: Container<unknown>, command: FSCommand, param: StructuredParameters): MiddlewarePromise
    {
        let filepath: string;
        if (command && command.config && command.config.fs?.path)
            filepath = this.fs.toImportPath(command.config.fs.path);
        else
            filepath = this.fs.toImportPath(command.name);
        try
        {
            let script;
            if (process.env.NODE_ENV !== 'production')
                script = await import(filepath + '?_=' + new Date().valueOf());
            else
                script = await import(filepath.toString());
            //     delete require.cache[filepath];

            if (!param._trigger)
                param._trigger = this.name;

            if (script.default.__esModule)
                script = script.default;
            return Local.handle(command, script.default, origin, param);
        }
        catch (e)
        {
            if (e.code === 'ERR_MODULE_NOT_FOUND')
                return undefined;
            return e;
        }
    }

    constructor(private fs: FileSystemProvider)
    {
        super('fs');
    }
}

export default FileSystem;
