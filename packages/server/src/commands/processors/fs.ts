

import { Processor, CommandProxy, Container, configure, proxy, CommandProcessor, Metadata, Command, Processors } from '@akala/commands';
import * as path from 'path'
import { promises as fs, existsSync } from 'fs'
import * as akala from '@akala/core'

export interface FileSystemConfiguration extends Metadata.Configuration
{
    path: string;
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
            return container.register(configure('http', cmd.config.http)(new CommandProxy(new Processors.HttpClient(container), cmd.name)))
        throw new Error(`no valid configuration was found for command ${cmd.name}`);
    }

    public static async discoverCommands<T>(root: string, container: Container<T>, options?: { recursive?: boolean, processor?: Processor<T>, isDirectory?: boolean })
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
            var metacontainer: Metadata.Container = require(root);
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
                    let fsConfig = { path: path.join(root, f.name) };
                    let otherConfigsFile = path.join(root, path.basename(f.name) + '.json');
                    let cmd = configure<FileSystemConfiguration>('fs', fsConfig)(new CommandProxy(options.processor, path.basename(f.name)));
                    if (files.find(file => file.name == cmd.name + '.json'))
                        cmd = configure(require(path.resolve(otherConfigsFile)))(cmd);
                    container.register(cmd);
                }
                else if (f.name.endsWith('.json'))
                {
                    if (!files.find(file => file.name == path.basename(f.name) + '.js'))
                    {
                        let cmd: FSCommand = require(path.resolve(path.join(root, f.name)))
                        this.versatileCommandRegister(cmd, container);
                    }
                }
                else
                    if (f.isDirectory() && options.recursive)
                        container.register(f.name, await FileSystem.discoverCommands(path.join(root, f.name), new Container(container.name + '.' + f.name, container.state), options));
        });
    }

    public async process(command: FSCommand, param: { param: any[] })
    {
        var filepath: string;
        if (command && command.config && command.config.fs)
            filepath = path.resolve(this.root, command.config.fs.path);
        else
            filepath = path.resolve(this.root, command.name);
        var script = require(filepath);
        if (process.env.NODE_ENV !== 'production')
            delete require.cache[filepath];

        return Processors.Local.execute(command.inject, script.default, this.container, param);
    }

    constructor(container: Container<T>, private root: string)
    {
        super('fs', container);
    }
}