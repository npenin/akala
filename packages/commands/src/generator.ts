import { Container } from "./model/container.js";
import * as meta from './metadata/index'
// import { Command, CommandProxy } from './model/command';
import { CommandProcessor, ICommandProcessor } from './model/processor';
import { SelfDefinedCommand } from "./model/command.js";
import { isCommand } from "./metadata/index";
import { Local } from "./processors/local.js";
// import { configure } from './decorators';

export const ignoredCommands = ['$serve', '$metadata', '$attach']

export function metadata(container: Container<any>, deep?: boolean): meta.Container
{
    // console.log(deep);
    const metacontainer: meta.Container = { name: container.name || 'unnamed', commands: [] };
    container.keys().forEach((key) =>
    {
        if (key === '$injector' || key === '$state' || key === '$container')
            return;
        const cmd = container.resolve<meta.Command>(key);
        if (cmd && isCommand(cmd) && ignoredCommands.indexOf(cmd.name) == -1)
            metacontainer.commands.push({ name: cmd.name, inject: cmd.inject, config: cmd.config });
        else if (cmd instanceof Container && deep)
        {
            // console.log(cmd);
            const subContainer = metadata(cmd as Container<any>, deep);
            subContainer.commands.forEach(c => c.name = cmd.name + '.' + c.name)
            metacontainer.commands.push(...subContainer.commands);
        }
    });
    return metacontainer;
}

export function proxy<T = unknown>(metacontainer: meta.Container, processor: CommandProcessor): Container<T>
{

    const container = new Container<T>(metacontainer.name, undefined, processor);

    container.unregister('$metadata');
    container.register(new SelfDefinedCommand(() => metacontainer, '$metadata'));

    registerCommands(metacontainer.commands, processor, container);

    return container;
}

// export function proxyCommand<T>(cmd: meta.Command, processor: CommandProcessor): Command<T>
// {
//     return configure(cmd.config)(new CommandProxy(processor, cmd.name, cmd.inject))
// }

export function registerCommands<T>(commands: meta.Command[], processor: ICommandProcessor, container: Container<T>): void
{
    commands.forEach(cmd =>
    {
        if (cmd.name == '$serve' || cmd.name == '$attach' || cmd.name == '$metadata')
            return;
        container.register({ name: cmd.name, inject: cmd.inject, config: cmd.config, processor });
    });
}

export function updateCommands<T>(commands: meta.Command[], processor: ICommandProcessor, container: Container<T>): void
{
    commands.forEach(cmd =>
    {
        if (cmd.name == '$serve' || cmd.name == '$attach' || cmd.name == '$metadata')
            return;
        container.register({ ...cmd, processor }, true);
    });
}

export function helper<TState>(container: Container<TState>, metacontainer?: meta.Container): { [key: string]: (...args: unknown[]) => Promise<unknown> }
{
    const result: { [key: string]: (...args: unknown[]) => Promise<unknown> } = {};
    if (!metacontainer)
        metacontainer = metadata(container);
    commandList(metacontainer).forEach(cmd =>
    {
        result[cmd] = function (...args)
        {
            return container.dispatch(cmd, ...args);
        }
    });
    return result;
}

export function commandList(container: meta.Container): string[]
{
    return container.commands.map(cmd => cmd.name)
}

export function fromObject<T extends Record<string, unknown>>(o: T, name: string): Container<T>
{
    const container = proxy<T>(metadataFromObject(o, name), Local.fromObject(o));
    container.state = o;
    return container;
}



export function metadataFromObject<T extends object>(o: T, name: string): meta.Container
{
    return { name, commands: Object.entries(o).filter(e => typeof e[1] === 'function').map(e => ({ name: e[0], config: {}, inject: e[1].$inject })) };
}