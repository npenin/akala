

import * as path from 'path'
import { promises as fs, existsSync } from 'fs'
import * as akala from '@akala/core'
import * as  Metadata from '../metadata';
import { CommandProcessor, Processor } from '../processor';
import { Container } from '../container';
import { CommandProxy } from '../command';
import { configure } from '../decorators';
import { HttpClient } from './http-client';
import { proxy } from '../generator';
import { Local } from './local';

export interface FileSystemConfiguration extends Metadata.Configuration
{
    path: string;
    source?: string;
}

export type FSCommand = Metadata.Command & { config?: { fs?: FileSystemConfiguration } };


export class FileSystem<T> extends CommandProcessor<T>
{
    public static async versatileCommandRegister<T>(cmd: FSCommand, container: Container<T>)
    {
        if (cmd.config.fs)
            if (container.processor instanceof FileSystem)
                return container.register(configure('fs', cmd.config.fs)(new CommandProxy(container.processor, cmd.name)));
            else
                return container.register(configure('fs', cmd.config.fs)(new CommandProxy(new FileSystem(container, null), cmd.name)));
        else if (cmd.config.http)
            return container.register(configure('http', cmd.config.http)(new CommandProxy(new HttpClient(container), cmd.name)))
        throw new Error(`no valid configuration was found for command ${cmd.name}`);
    }

    public static async discoverCommands<T>(root: string, container: Container<T>, options?: { recursive?: boolean, processor?: Processor<T>, isDirectory?: boolean }): Promise<void>
    {
        if (!options)
            options = {};
        if (!options.processor)
            options.processor = new FileSystem<T>(container, root);
        if (typeof options.isDirectory == 'undefined')
        {
            let stats = await fs.stat(root);
            options.isDirectory = stats.isDirectory();
        }
        if (!options.isDirectory)
        {
            var metacontainer: Metadata.Container = require(path.resolve(root));
            metacontainer.commands.forEach(cmd =>
            {
                this.versatileCommandRegister(cmd as FSCommand, container);
            });
            container.pipe(proxy(metacontainer, options.processor))
            return;
        }
        else if (existsSync(path.join(root, 'commands.json')))
            return this.discoverCommands(path.join(root, 'commands.json'), container, { processor: options.processor, isDirectory: false });

        var files = await fs.readdir(root, { withFileTypes: true });
        await akala.eachAsync(files, async f =>
        {
            if (f.isFile())
                if (f.name.endsWith('.js'))
                {
                    let fsConfig = { path: path.join(root, f.name).replace(/\\/g, '/') };
                    let otherConfigsFile = path.join(root, path.basename(f.name) + 'on');
                    if (!options)
                        throw new Error('cannot happen');
                    let cmd = configure<FileSystemConfiguration>('fs', fsConfig)(new CommandProxy(options.processor as Processor<T>, path.basename(f.name, path.extname(f.name))));
                    if (files.find(file => file.name == cmd.name + '.json'))
                        cmd = configure(require(path.resolve(otherConfigsFile)))(cmd) as any;
                    if (files.find(file => file.name == f.name + '.map'))
                    {
                        var sourceMap = JSON.parse(await fs.readFile(path.join(root, path.basename(f.name) + '.map'), 'utf-8'));
                        if (cmd.config.fs)
                            cmd.config.fs.source = path.join(path.relative(process.cwd(), root), sourceMap.sources[0]).replace(/\\/g, '/');
                    }
                    container.register(cmd);
                }
                else if (f.name.endsWith('.json'))
                {
                    if (!files.find(file => file.name == path.basename(f.name, '.json') + '.js'))
                    {
                        let cmd: FSCommand = require(path.resolve(path.join(root, f.name)))
                        this.versatileCommandRegister(cmd, container);
                    }
                }
                else
                    if (f.isDirectory() && options && options.recursive)
                        container.register(f.name, await FileSystem.discoverCommands(path.join(root, f.name), new Container(container.name + '.' + f.name, container.state), options));
        });
    }

    public async process(command: FSCommand, param: { param: any[] })
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

        return Local.execute(command.inject, script.default, this.container, param);
    }

    constructor(container: Container<T>, private root: string | null)
    {
        super('fs', container);
    }
}