import { Processor, CommandProxy, Container, Metadata, configure, proxy, CommandNameProcessor, CommandProcessor, metadata } from '@akala/commands';
import * as path from 'path'
import { promises as fs, existsSync } from 'fs'
import * as akala from '@akala/core'
import { Local } from '@akala/commands/dist/processors';

export interface FileSystemConfiguration extends Metadata.Configuration
{
    path: string;
}

export type FSCommand<T> = CommandProxy<T> & { config?: { fs?: FileSystemConfiguration } };

export class FileSystem<T> extends CommandProcessor<T>
{
    public static async discoverCommands<T>(root: string, container: Container<T>, options?: { recursive?: boolean, processor?: Processor<T>, isDirectory?: boolean })
    {
        var files = await fs.readdir(root, { withFileTypes: true });
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
            container.pipe(proxy(metacontainer, options.processor))
        }
        else if (existsSync(path.join(root, 'commands.json')))
            return this.discoverCommands(path.join(root, 'commands.json'), container, { processor: options.processor, isDirectory: false });

        await akala.eachAsync(files, async f =>
        {
            if (f.isFile())
                container.register(configure<FileSystemConfiguration>('fs', { path: path.join(root, f.name) })(new CommandProxy(options.processor, path.basename(f.name))));
            if (f.isDirectory() && options.recursive)
                container.register(f.name, await FileSystem.discoverCommands(path.join(root, f.name), new Container(container.name + '.' + f.name, container.state), options));
        });
    }

    public async process(command: FSCommand<any>, ...args: any[])
    {
        var filepath: string;
        if (command && command.config && command.config.fs)
            filepath = path.join(this.root, command.config.fs.path);
        else
            filepath = path.join(this.root, command.name);
        var script = require(filepath);
        if (process.env.NODE_ENV !== 'production')
            delete require.cache[filepath];

        return script.default.apply(this.container.state, args);
    }

    constructor(container: Container<T>, private root: string)
    {
        super('fs', container);
    }
}