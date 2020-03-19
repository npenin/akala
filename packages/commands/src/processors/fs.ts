import * as path from 'path'
import { promises as fs, existsSync } from 'fs'
import * as akala from '@akala/core'
import * as  Metadata from '../metadata';
import { CommandProcessor, Processor, CommandNameProcessor } from '../model/processor';
import { Container } from '../model/container';
import { CommandProxy, Command } from '../model/command';
import { configure } from '../decorators';
import { HttpClient } from './http-client';
import { proxy, registerCommands } from '../generator';
import { Local } from './local';
import { UnknownCommandError } from '../model/error-unknowncommand';

export interface FileSystemConfiguration extends Metadata.Configuration
{
    path: string;
    source?: string;
}

export type FSCommand = Metadata.Command & { config?: { fs?: FileSystemConfiguration } };


export class FileSystem<T> extends CommandProcessor<T>
{
    public static async asTrap<T>(container: Container<T>, path?: string): Promise<CommandNameProcessor<T>>
    {
        var fs = new FileSystem<T>(container, path);
        var commands = await FileSystem.discoverMetaCommands(path || process.cwd(), { recursive: true });
        return {
            process(cmd, params)
            {
                var command = commands.find(c => c.name == cmd);
                if (!command)
                    throw new UnknownCommandError(cmd);
                return fs.process(command as FSCommand, params);
            },
            name: fs.name,
            requiresCommandName: true
        };
    }

    public static async discoverCommands<T>(root: string, container: Container<T>, options?: { recursive?: boolean, processor?: Processor<T>, isDirectory?: boolean }): Promise<void>
    {
        if (!options)
            options = {};

        if (!options.processor)
            options.processor = new FileSystem<T>(container, root);

        registerCommands(await this.discoverMetaCommands(root, options), options.processor, container);
    }

    public static async discoverMetaCommands<T>(root: string, options?: { recursive?: boolean, processor?: Processor<T>, isDirectory?: boolean }): Promise<Metadata.Command[]>
    {
        const log = akala.log('commands:fs:discovery');

        if (!options)
            options = {};
        if (typeof options.isDirectory == 'undefined')
        {
            try
            {
                let stats = await fs.stat(root);
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
        if (!options.isDirectory)
        {
            var metacontainer: Metadata.Container = require(path.resolve(root));
            return metacontainer.commands.filter(cmd => !(cmd.name == '$serve' || cmd.name == '$attach' || cmd.name == '$metadata'));
        }
        else if (existsSync(path.join(root, 'commands.json')))
            return this.discoverMetaCommands(path.join(root, 'commands.json'), { processor: options.processor, isDirectory: false });

        else if (existsSync(path.join(root, 'package.json')))
        {
            var packageDef = require(path.join(root, 'package.json'));
            if (packageDef.commands && typeof (packageDef.commands) == 'string')
                return this.discoverMetaCommands(path.join(root, packageDef.commands), { processor: options.processor });
        }

        var commands: Metadata.Command[] = [];

        var files = await fs.readdir(root, { withFileTypes: true });
        await akala.eachAsync(files, async f =>
        {
            if (f.isFile())
                if (f.name.endsWith('.js'))
                {
                    let fsConfig = { path: path.join(root, f.name).replace(/\\/g, '/') };
                    if (!options)
                        throw new Error('cannot happen');
                    let cmd = configure<FileSystemConfiguration>('fs', fsConfig)(new CommandProxy(options.processor as Processor<T>, path.basename(f.name, path.extname(f.name))));
                    log(cmd.name);
                    if (files.find(file => file.name == f.name + '.map'))
                    {
                        var sourceMap = JSON.parse(await fs.readFile(path.join(root, path.basename(f.name) + '.map'), 'utf8'));
                        if (cmd.config.fs)
                            cmd.config.fs.source = path.join(path.relative(process.cwd(), root), sourceMap.sources[0]).replace(/\\/g, '/');
                    }
                    let source = cmd.config.fs.source || cmd.config.fs.path;
                    let otherConfigsFile: string;
                    otherConfigsFile = path.join(path.dirname(source), path.basename(source, path.extname(source))) + '.json';
                    if (existsSync(path.resolve(otherConfigsFile)))
                    {
                        log(`found config file ${otherConfigsFile}`)
                        var otherConfigs = require(path.resolve(otherConfigsFile));
                        delete otherConfigs.$schema;
                        cmd = configure(otherConfigs)(cmd) as any;
                    }
                    if (!cmd.config.fs.inject)
                    {
                        log(`looking for fs default definition`)
                        var params: string[] = [];
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
                            if (config.inject && config.inject.length && !cmd.config.fs.inject)
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
                        let func = require(path.resolve(cmd.config.fs.path)).default;
                        if (!func)
                            throw new Error(`No default export is mentioned in ${path.resolve(cmd.config.fs.path)}`)
                        if (func.$inject)
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
                                if (v == 'container')
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
                        let cmd: FSCommand = require(path.resolve(path.join(root, f.name)))
                        commands.push(cmd);
                    }
                }
                else
                    if (f.isDirectory() && options && options.recursive)
                        commands.push(...await FileSystem.discoverMetaCommands(path.join(root, f.name), options));
        });

        return commands;
    }

    public async process(command: FSCommand, param: { param: any[], _trigger?: string })
    {
        var filepath: string;
        if (command && command.config && command.config.fs)
            filepath = path.resolve(this.root || process.cwd(), command.config.fs.path);
        else
            filepath = path.resolve(this.root || process.cwd(), command.name);
        var script = require(filepath);
        if (process.env.NODE_ENV !== 'production')
            delete require.cache[filepath];

        if (!this.container)
            throw new Error('container is undefined');

        if (!param._trigger)
            param._trigger = this.name;

        return Local.execute(command, script.default, this.container, param);
    }

    constructor(container: Container<T>, private root?: string)
    {
        super('fs', container);
    }
}