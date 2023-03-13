import root, { buildCliContextFromContext, NamespaceMiddleware } from "@akala/cli"
import { eachAsync } from "@akala/core"
import { stat } from "fs/promises";
import { dirname } from "path";
import commands from "./commands.js";
import { Cli } from "./index.js";
import { Container } from "./model/container.js";
import FileSystem, { DiscoveryOptions } from "./processors/fs.js";

export default function (config, program: NamespaceMiddleware)
{
    root.state<{ commands?: Record<string, string> }>().preAction(async (context) =>
    {
        if (context.state?.commands)
            await eachAsync(context.state.commands, async (path, name) =>
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
                const subprogram = new NamespaceMiddleware(name);
                program.command(name).action(c =>
                {
                    c = buildCliContextFromContext(c, ...c.args);
                    if (c.state)
                    {
                        if (!c.state[name])
                            c.state[name] = {};
                        c.state = c.state[name];
                    }
                    return subprogram.process(c);
                });
                return new Cli(cliContainer, commands, options.processor, subprogram);
            })
    });

    const commands = program.command('commands').state<{ commands: Record<string, string>, commit(): Promise<void> }>();
    commands.command('add <name> <path>').options<{ name: string, path: string }>({ name: {}, path: { normalize: true } }).action(context =>
    {
        if (!context.state.commands)
            context.state.commands = {};
        context.state.commands[context.options.name] = context.options.path;
        return context.state.commit();
    })

    commands.command('remove <name>').options<{ name: string, path: string }>({ name: {}, path: { normalize: true } }).action(context =>
    {
        delete context.state.commands[context.options.name];
        return context.state.commit();
    })


    commands.command('ls').options<{ name: string, path: string }>({ name: {}, path: { normalize: true } }).action(context =>
    {
        return Promise.resolve(context.state.commands.config)
    })
}