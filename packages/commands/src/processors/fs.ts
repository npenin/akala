import * as path from 'path'
import { promises as fs, existsSync } from 'fs'
import * as akala from '@akala/core'
import * as  Metadata from '../metadata';
import { CommandProcessor, Processor, CommandNameProcessor } from '../model/processor';
import { Container } from '../model/container';
import { CommandProxy, Command } from '../model/command';
import { configure } from '../decorators';
import { registerCommands } from '../generator';
import { Local } from './local';
import { UnknownCommandError } from '../model/error-unknowncommand';
import { ExtendedConfigurations, jsonObject } from '../metadata';
import { MiddlewarePromise } from '@akala/core';

export interface FileSystemConfiguration extends Metadata.Configuration
{
    path: string;
    source?: string;
}

export type FSCommand = Metadata.Command & { config?: { fs?: FileSystemConfiguration } };

export interface DiscoveryOptions
{
    recursive?: boolean
    processor?: Processor
    isDirectory?: boolean
    ignoreFileWithNoDefaultExport?: boolean
    relativeTo?: string;
}



export class FileSystem<T> extends CommandProcessor
{
    public static async asTrap<T>(container: Container<T>, path?: string): Promise<CommandNameProcessor>
    {
        const fs = new FileSystem<T>(container, path);
        const commands = await FileSystem.discoverMetaCommands(path || process.cwd(), { processor: fs, recursive: true, ignoreFileWithNoDefaultExport: true });
        throw {
            handle(cmd, params)
            {
                const command = commands.find(c => c.name == cmd);
                if (!command)
                    return new UnknownCommandError(cmd);
                return fs.handle(command as FSCommand, params);
            },
            name: fs.name,
            requiresCommandName: true
        };
    }

    public static async discoverCommands<T>(root: string, container: Container<T>, options?: DiscoveryOptions): Promise<void>
    {
        if (!options)
            options = {};

        let fs: FileSystem<T>;
        if (!options.processor)
        {
            if (!options.isDirectory)
                options.relativeTo = path.dirname(root);
            options.processor = fs = new FileSystem<T>(container, options.relativeTo);
        }

        const commands = await this.discoverMetaCommands(root, options);

        registerCommands(commands, options.processor, container);

        if (fs)
            fs.root = options.relativeTo;

        if (typeof (commands.name) != 'undefined')
            container.name = commands.name;
    }

    public static async discoverMetaCommands(root: string, options?: DiscoveryOptions): Promise<Metadata.Command[] & { name?: string }>
    {
        const log = akala.log('commands:fs:discovery');

        if (!options)
            options = {};
        if (typeof options.isDirectory == 'undefined')
        {
            try
            {
                const stats = await fs.stat(root);
                options.isDirectory = stats.isDirectory();
            }
            catch (e)
            {
                if (e.code == 'ENOENT')
                {
                    return this.discoverMetaCommands(require.resolve(root), options);
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
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const metacontainer: Metadata.Container = require(path.resolve(root));

            const commands = metacontainer.commands.filter(cmd => !(cmd.name == '$serve' || cmd.name == '$attach' || cmd.name == '$metadata'));
            Object.defineProperty(commands, 'name', { enumerable: false, value: metacontainer.name });
            return commands;
        }
        else if (existsSync(path.join(root, 'commands.json')))
            return this.discoverMetaCommands(path.join(root, 'commands.json'), { processor: options.processor, isDirectory: false });

        else if (existsSync(path.join(root, 'package.json')))
        {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const packageDef = require(path.join(root, 'package.json'));
            if (packageDef.commands && typeof (packageDef.commands) == 'string')
                return this.discoverMetaCommands(path.join(root, packageDef.commands), { processor: options.processor });
        }
        if (!options.processor)
            throw new Error('Processor not defined');

        const commands: Metadata.Command[] = [];

        const files = await fs.readdir(root, { withFileTypes: true });
        const relativeTo = options.relativeTo;
        await akala.eachAsync(files, async f =>
        {
            if (f.isFile())
                if (f.name.endsWith('.js'))
                {
                    const fsConfig: FileSystemConfiguration & jsonObject = { path: path.relative(relativeTo, path.join(root, f.name).replace(/\\/g, '/')) };

                    if (!options)
                        throw new Error('cannot happen');
                    let cmd: Command & { config: ExtendedConfigurations<FileSystemConfiguration & jsonObject, 'fs'> } = configure('fs', fsConfig)(new CommandProxy(options.processor as Processor, path.basename(f.name, path.extname(f.name))));
                    log(cmd.name);
                    if (files.find(file => file.name == f.name + '.map'))
                    {
                        const sourceMap = JSON.parse(await fs.readFile(path.join(root, path.basename(f.name) + '.map'), 'utf8'));
                        if (cmd.config.fs)
                            cmd.config.fs.source = path.join(path.relative(relativeTo, root), sourceMap.sources[0]).replace(/\\/g, '/');
                    }
                    const source = cmd.config.fs.source || cmd.config.fs.path;
                    const otherConfigsFile: string = path.join(path.dirname(source), path.basename(source, path.extname(source))) + '.json';
                    if (existsSync(path.resolve(relativeTo, otherConfigsFile)))
                    {
                        log(`found config file ${otherConfigsFile}`)
                        // eslint-disable-next-line @typescript-eslint/no-var-requires
                        const otherConfigs = require(path.resolve(relativeTo, otherConfigsFile));
                        delete otherConfigs.$schema;
                        cmd = configure(otherConfigs)(cmd);
                    }
                    let params: string[];
                    if (!cmd.config.fs.inject)
                    {
                        log(`looking for fs default definition`)
                        params = [];
                        if (cmd.inject && cmd.inject.length)
                        {
                            log(cmd.inject);
                            akala.each(cmd.inject, item =>
                            {
                                if (!item.startsWith('param.'))
                                    params.push('ignore');
                                else
                                    params.push(item);
                            });
                            cmd.config.fs.inject = params;
                        }
                    }
                    if (!cmd.config.fs.inject)
                    {
                        log(`looking for fs in any configuration`)
                        params = [];
                        akala.each(cmd.config, config =>
                        {
                            if (config && config.inject && config.inject.length && !cmd.config.fs.inject)
                            {
                                akala.each(config.inject, item =>
                                {
                                    if (item.startsWith('param.'))
                                        params[Number(item.substring('param.'.length))] = item;
                                });
                                cmd.config.fs.inject = params;
                            }
                        });
                    }

                    if (!cmd.config.fs.inject)
                    {
                        // eslint-disable-next-line @typescript-eslint/no-var-requires
                        const func = require(path.resolve(relativeTo, cmd.config.fs.path)).default;
                        if (!func)
                            if (!options.ignoreFileWithNoDefaultExport)
                                throw new Error(`No default export is mentioned in ${path.resolve(cmd.config.fs.path)}`)
                            else
                                return;

                        if (func instanceof Command)
                        {
                            cmd = configure('fs', fsConfig)(func);
                        }

                        if (!cmd.config.fs.inject && func.$inject)
                        {
                            log(`taking $inject`)
                            cmd.config.fs.inject = func.$inject;
                        }
                        else
                        {
                            log(`reflection on function arguments`)
                            let n = 0;
                            cmd.config.fs.inject = akala.introspect.getParamNames(func).map(v =>
                            {
                                if (v == '$container')
                                    return v;
                                return 'param.' + (n++)
                            }
                            );
                        }
                        if (cmd.config.fs.inject && !cmd.inject)
                        {
                            cmd.inject = cmd.config.fs.inject;
                            cmd.config[''] = { inject: cmd.inject };
                        }
                    }

                    if (!cmd.config[''])
                        cmd.config[''] = {};

                    if (!cmd.config[''].inject && cmd.inject)
                        cmd.config[''].inject = cmd.inject;

                    commands.push(cmd);
                }
                else if (f.name.endsWith('.json'))
                {
                    if (!files.find(file => file.name == path.basename(f.name, '.json') + '.js'))
                    {
                        // eslint-disable-next-line @typescript-eslint/no-var-requires
                        const cmd: FSCommand = require(path.resolve(path.join(root, f.name)))
                        commands.push(cmd);
                    }
                }
                else
                    if (f.isDirectory() && options && options.recursive)
                        commands.push(...await FileSystem.discoverMetaCommands(path.join(root, f.name), options));
        }, null, false);

        return commands;
    }

    public async handle(command: FSCommand, param: { param: unknown[], _trigger?: string }): MiddlewarePromise
    {
        let filepath: string;
        if (command && command.config && command.config.fs)
            filepath = path.resolve(this.root || process.cwd(), command.config.fs.path);
        else
            filepath = path.resolve(this.root || process.cwd(), command.name);
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const script = require(filepath);
        if (process.env.NODE_ENV !== 'production')
            delete require.cache[filepath];

        if (!this.container)
            throw new Error('container is undefined');

        if (!param._trigger)
            param._trigger = this.name;

        return Local.handle(command, script.default, this.container, param);
    }

    constructor(container: Container<T>, private root?: string)
    {
        super('fs', container);
    }
}

export default FileSystem;
