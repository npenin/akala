import { program as root, ErrorMessage, NamespaceMiddleware } from "@akala/cli"
import { Injector, mapAsync } from "@akala/core"
import commands from "./commands.js";
import { Cli, ServeOptions, registerCommands } from "./index.js";
import { Container } from "./model/container.js";
import $serve from "./commands/$serve.js";
import { Configurations } from "./metadata/configurations.js";
import getHandler, { getHandlers } from "./protocol-handler.js";
import { dirname, isAbsolute, resolve } from "node:path";
import { Local } from "./processors/local.js";
const serveDefinition: Configurations = await import('../' + '../src/commands/$serve.json', { assert: { type: 'json' } }).then(x => x.default)

export default function (config, program: NamespaceMiddleware<{ configFile: string }>)
{
    let containers: Container<unknown> = new Container('akala cli', undefined);

    root.state<{ commands?: Record<string, string> & { extract?: () => Record<string, string> } }>().preAction(async (context) =>
    {
        const sharedInjector = new Injector();
        sharedInjector.register('env', process.env);
        let commands = context.state?.commands;
        if (commands && 'extract' in commands && typeof (commands.extract) == 'function')
            commands = commands.extract();
        if (commands)
            await mapAsync(commands, async (path, name) =>
            {
                const cliContainer: commands.container & Container<void> = new Container<void>('cli', undefined, undefined, sharedInjector);

                let uri: URL;
                try
                {
                    uri = new URL(path);
                }
                catch (e)
                {
                    if (e.message == 'Invalid URL')
                    {
                        if (!isAbsolute(path))
                            path = resolve(dirname(context.options.configFile as string), path)
                        uri = new URL('file://' + path);
                    }
                }
                const handler = await getHandler(uri.protocol, uri)

                cliContainer.processor.useMiddleware(51, handler.processor);

                const commands = await handler.getMetadata();
                const init = commands.find(c => c.name == '$init-akala');
                if (init)
                {
                    if (init.config?.cli?.inject)
                        commands.forEach(cmd =>
                        {
                            if (cmd.config?.cli?.inject)
                                cmd.config.cli.inject.unshift(...init.config.cli.inject);
                        });
                    cliContainer.processor.useMiddleware(1, {
                        handle: async (container, cmd, param) =>
                        {
                            if (cmd !== init && cmd.name !== '$metadata' && param._trigger === 'cli')
                                try
                                {
                                    await container.dispatch(init, { ...param, param: param.param.slice(0, init.config.cli?.inject.length || 0) });

                                    if (param._trigger)
                                        param.param.splice(0, init.config.cli?.inject.length || 0);
                                }
                                catch (e)
                                {
                                    return e;
                                }
                            return;
                        }
                    });
                }

                await new Cli(cliContainer, commands, handler.processor, program.command(name)).promise;
                containers.register(name, cliContainer);
            })
    });

    const commands = program.command('commands').state<{ commands: Record<string, string>, commit(): Promise<void> }>();
    commands.command<{ name: string, path: string }>('add <name> <path|uri>').action(context =>
    {
        if (!context.options.name)
            throw new ErrorMessage('the mandatory name was not provided. Please try again with a non-empty name.')
        if (!context.state.commands)
            context.state.commands = {};
        try
        {
            const url = new URL(context.options.path);
            getHandlers(url.protocol.substring(0, url.protocol.length - 1))
        }
        catch (e)
        {
        }
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

    commands.command<{ container: string }>('serve [container]', serveDefinition.doc.description).options(serveDefinition.cli.options).action(context =>
    {
        process.on('SIGINT', () => context.abort.abort())
        if (!context.options.container)
            return $serve(containers, { args: context.args as ServeOptions['args'], options: { ...context.options, socketName: context.options.container } }, context.abort.signal);
        return $serve(containers.resolve(context.options.container), { args: context.args as ServeOptions['args'], options: { ...context.options, socketName: context.options.container } }, context.abort.signal);
    })
}