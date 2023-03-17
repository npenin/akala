import root, { buildCliContextFromContext, ErrorMessage, NamespaceMiddleware } from "@akala/cli"
import { eachAsync } from "@akala/core"
import { stat, writeFile } from "fs/promises";
import { dirname } from "path";
import commands from "./commands.js";
import { Cli } from "./index.js";
import { Container } from "./model/container.js";
import FileSystem, { DiscoveryOptions } from "./processors/fs.js";

export default function (config, program: NamespaceMiddleware<{ configPath: string }>)
{
    root.state<{ commands?: Record<string, string> & { extract?: () => Record<string, string> } }>().preAction(async (context) =>
    {
        debugger;
        let commands = context.state?.commands;
        if (commands && 'extract' in commands && typeof (commands.extract) == 'function')
            commands = commands.extract();
        if (commands)
            await eachAsync(commands, async (path, name) =>
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
                return new Cli(cliContainer, commands, options.processor, program.command(name));
            })
    });

    const commands = program.command('commands').state<{ commands: Record<string, string>, commit(): Promise<void> }>();
    commands.command('add <name> <path>').options<{ name: string, path: string }>({ name: {}, path: { normalize: true } }).action(context =>
    {
        if (!context.options.name)
            throw new ErrorMessage('the mandatory name was not provided. Please try again with a non-empty name.')
        if (!context.state.commands)
            context.state.commands = {};
        context.state.commands[context.options.name] = context.options.path;
        if (typeof context.state.commit === 'function')
            return context.state.commit();
        else
            return writeFile(context.options['configPath'], JSON.stringify(context.state));
    })

    commands.command('remove <name>').options<{ name: string, path: string }>({ name: {}, path: { normalize: true } }).action(context =>
    {
        delete context.state.commands[context.options.name];
        if (typeof context.state.commit === 'function')
            return context.state.commit();
        else
            return writeFile(context.options['configPath'], JSON.stringify(context.state));

    })


    commands.command('ls').options<{ name: string, path: string }>({ name: {}, path: { normalize: true } }).action(context =>
    {
        return Promise.resolve(context.state.commands)
    })
}