import { program as root, ErrorMessage, NamespaceMiddleware } from "@akala/cli"
import { eachAsync, mapAsync } from "@akala/core"
import { stat, writeFile } from "fs/promises";
import { dirname } from "path";
import commands from "./commands.js";
import { Cli, ServeOptions } from "./index.js";
import { Container } from "./model/container.js";
import FileSystem, { DiscoveryOptions } from "./processors/fs.js";
import $serve from "./commands/$serve.js";
import { Configurations } from "./metadata/configurations.js";
const serveDefinition: Configurations = await import('../' + '../src/commands/$serve.json', { assert: { type: 'json' } }).then(x => x.default)

export default function (config, program: NamespaceMiddleware<{ configFile: string }>)
{
    let containers: Record<string, Container<unknown>>;

    root.state<{ commands?: Record<string, string> & { extract?: () => Record<string, string> } }>().preAction(async (context) =>
    {
        let commands = context.state?.commands;
        if (commands && 'extract' in commands && typeof (commands.extract) == 'function')
            commands = commands.extract();
        if (commands)
            containers = Object.fromEntries(await mapAsync(commands, async (path, name) =>
            {
                const cliContainer: commands.container & Container<void> = new Container<void>('cli', undefined);

                let options: DiscoveryOptions = { ignoreFileWithNoDefaultExport: true };
                const stats = await stat(path);
                options.isDirectory = stats.isDirectory();

                if (!options.isDirectory)
                    options.relativeTo = dirname(path);
                else
                    options.relativeTo = path;

                options.processor = new FileSystem(options.relativeTo);

                cliContainer.processor.useMiddleware(51, options.processor);

                const commands = await FileSystem.discoverMetaCommands(path, options);
                // const subprogram = new NamespaceMiddleware(name);
                // const p = program.command(name); p.action(c =>
                // {
                //     c = buildCliContextFromContext(c, ...c.args);
                //     if (c.state)
                //     {
                //         if (!c.state[name])
                //             c.state[name] = {};
                //         c.state = c.state[name];
                //     }
                //     return subprogram.process(c);
                // });
                // p.usage = (c) => subprogram.usage(c);
                new Cli(cliContainer, commands, options.processor, program.command(name));
                return [name, cliContainer]
            }))
    });

    const commands = program.command('commands').state<{ commands: Record<string, string>, commit(): Promise<void> }>();
    commands.command('add <name> <path>').options<{ name: string, path: string }>({ name: {}, path: {} }).action(context =>
    {
        if (!context.options.name)
            throw new ErrorMessage('the mandatory name was not provided. Please try again with a non-empty name.')
        if (!context.state.commands)
            context.state.commands = {};
        context.state.commands[context.options.name] = context.options.path;
        return context.state.commit();
    })

    commands.command('remove <name>').options<{ name: string }>({ name: {} }).action(context =>
    {
        delete context.state.commands[context.options.name];
        return context.state.commit();
    })


    commands.command('ls').action(context =>
    {
        return Promise.resolve(context.state.commands)
    })

    commands.command<{ name: string }>('serve <name>', serveDefinition.doc.description).options(serveDefinition.cli.options).action(context =>
    {
        process.on('SIGINT', () => context.abort.abort())
        return $serve(containers[context.options.name], { args: context.args as ServeOptions['args'], options: { ...context.options, socketName: context.options.name } }, context.abort.signal);
    })
}