import { program as root, ErrorMessage, NamespaceMiddleware, type CliContext } from "@akala/cli"
import { type MiddlewarePromise, NotHandled, SimpleInjector, mapAsync, spread } from "@akala/core"
import commands from "./commands.js";
import { CommandProcessor, Metadata, registerCommands, type ServeOptions, type StructuredParameters, Triggers } from "./index.js";
import { Container } from "./model/container.js";
import $serve from "./commands/$serve.js";
import { type Configurations } from "./metadata/configurations.js";
import { isAbsolute } from "node:path";
import { protocolHandlers } from "./protocol-handler.js";
import { pathToFileURL } from "node:url";
import { type Command } from "./metadata/command.js";
const serveDefinition: Configurations = await import('../' + '../src/commands/$serve.json', { with: { type: 'json' } }).then(x => x.default)

export default async function (_, program: NamespaceMiddleware<{ configFile: string }>, context: CliContext<{ configFile: string }, object>)
{
    return install(context, program)
}

export class InitAkala<T> extends CommandProcessor
{
    private warmedup = false;

    constructor(private init: Metadata.Command, private readonly context: T)
    {
        super('initAkala');
    }

    async handle(container: Container<unknown>, cmd: Command, param: StructuredParameters): MiddlewarePromise
    {
        if (!this.warmedup)
        {
            this.init ??= container.resolve('$init');
            if (this.init)
            {
                if (!this.warmedup && cmd !== this.init && cmd.name !== '$metadata')
                    try
                    {
                        const err = await container.handle(container, this.init, spread(param, { containers }, this.context, { params: [], env: process.env }));
                        if (err)
                            return err;
                    }
                    catch (e)
                    {
                        this.warmedup = true;
                        return e;
                    }
                else if (cmd === this.init)
                    this.warmedup = true;
            }
            else
                this.warmedup = true;
        }
        return NotHandled;
    }
}

export const containers: Container<unknown> = new Container('akala cli', undefined);

export async function install(_context: CliContext<{ configFile: string }, object>, program: NamespaceMiddleware<{ configFile: string }>)
{

    root.state<{ commands?: Record<string, string> & { extract?: () => Record<string, string> } }>().preAction(async (context) =>
    {
        const sharedInjector = new SimpleInjector();
        sharedInjector.register('env', process.env);
        let commands = context.state?.commands;
        if (commands && 'extract' in commands && typeof (commands.extract) == 'function')
            commands = commands.extract();
        if (commands)
            await mapAsync(commands, async (path, name) =>
            {
                const cliContainer: commands.container & Container<unknown> = new Container('cli', {}, undefined, sharedInjector);

                let uri: URL;
                if (URL.canParse(path))
                    uri = new URL(path);
                else
                    if (!isAbsolute(path))
                        uri = new URL(path, context.options['configFile'] as string);
                    else
                        uri = pathToFileURL(path);

                const handler = await protocolHandlers.process(uri, null, {})

                cliContainer.processor.useMiddleware(51, handler.processor);

                const commands = await handler.getMetadata();
                cliContainer.name = commands.name;
                const init = commands.commands.find(c => c.name == '$init');
                if (init)
                    cliContainer.processor.useMiddleware(1, new InitAkala(init, { _trigger: 'cli', config: context.state?.[name], options: { ...context.options, configFile: context.options && 'configFile' in context.options ? context.options.configFile + '#pm' : undefined }, args: context.args }));

                registerCommands(commands.commands, handler.processor, cliContainer);
                await cliContainer.attach(Triggers.cli, program.command(name));

                containers.register(name, cliContainer);
            })
    });

    const commands = program.command('commands').state<{ commands: Record<string, string>, commit(_: void, formatted?: boolean): Promise<void> }>();
    commands.command<{ name: string, path: string }>('add <name> <path|uri>').action(async context =>
    {
        if (!context.options.name)
            throw new ErrorMessage('the mandatory name was not provided. Please try again with a non-empty name.')
        if (!context.state.commands)
            context.state.commands = {};
        if (URL.canParse(context.options.path))
        {
            const url = new URL(context.options.path);
            await protocolHandlers.protocol.process(url, { signal: context.abort.signal }, { processor: null, getMetadata: () => void 0 })
        }
        else
        {
            const path = new URL(import.meta.resolve(context.options.path));
            const configFilePath = pathToFileURL(context.options.configFile).pathname.split('/');
            context.options.path = path.pathname.split('/').map((f, i) => f == configFilePath[i] ? '' : f).filter(x => x).join('/');
        }
        context.state.commands[context.options.name] = context.options.path;
        return context.state.commit(undefined, true);
    })

    commands.command('remove <name>').options<{ name: string }>({ name: {} }).action(context =>
    {
        delete context.state.commands[context.options.name];
        return context.state.commit(undefined, true);
    })


    commands.command('ls').action(context =>
    {
        return Promise.resolve(context.state.commands)
    })

    commands.command<{ container: string }>('serve [container]', serveDefinition.doc.description).options(serveDefinition.cli.options).action(context =>
    {
        process.on('SIGINT', () => context.abort.abort())
        const container = containers.resolve<Container<unknown>>(context.options.container);
        if (!container)
            return $serve(containers, { args: [context.options.container].concat(context.args) as ServeOptions['args'], options: { ...context.options, socketName: context.options.container } }, context.abort.signal);
        return $serve(container, { args: context.args as ServeOptions['args'], options: { ...context.options, socketName: context.options.container } }, context.abort.signal);
    })
}
