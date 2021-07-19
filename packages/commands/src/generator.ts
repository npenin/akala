import { Container } from "./model/container.js";
import * as meta from './metadata/index'
import { Command, CommandProxy } from './model/command';
import { CommandProcessors } from './model/processor';
import { configure } from './decorators';

export const ignoredCommands = ['$serve', '$metadata', '$attach']

export function metadata(container: Container<any>, deep?: boolean): meta.Container
{
    // console.log(deep);
    const metacontainer: meta.Container = { name: container.name || 'unnamed', commands: [] };
    container.keys().forEach((key) =>
    {
        if (key === '$injector' || key === '$state' || key === '$container')
            return;
        const cmd = container.resolve<Command>(key);
        if (cmd && cmd.name && cmd instanceof Command && ignoredCommands.indexOf(cmd.name) == -1)
            metacontainer.commands.push({ name: cmd.name, inject: cmd.inject || [], config: cmd.config });
        if (cmd instanceof Container && deep)
        {
            // console.log(cmd);
            const subContainer = metadata(cmd as Container<any>, deep);
            subContainer.commands.forEach(c => c.name = cmd.name + '.' + c.name)
            metacontainer.commands.push(...subContainer.commands);
        }
    });
    return metacontainer;
}

export function proxy<T = unknown>(metacontainer: meta.Container, processor: CommandProcessors): Container<T>
export function proxy<T = unknown>(metacontainer: meta.Container, processor: (c: Container<T>) => CommandProcessors): Container<T>
export function proxy<T = unknown>(metacontainer: meta.Container, processor: CommandProcessors | ((c: Container<T>) => CommandProcessors)): Container<T>
{

    const container = new Container<T>(metacontainer.name, undefined);
    if (processor instanceof Function)
    {
        processor = processor(container);
    }

    container.unregister('$metadata');
    container.register('$metadata', new Command(() => metacontainer));

    registerCommands(metacontainer.commands, processor, container);

    return container;
}

export function proxyCommand<T>(cmd: meta.Command, processor: CommandProcessors): Command<T>
{
    return configure(cmd.config)(new CommandProxy(processor, cmd.name, cmd.inject))
}

export function registerCommands<T>(commands: meta.Command[], processor: CommandProcessors, container: Container<T>): void
{
    commands.forEach(cmd =>
    {
        if (cmd.name == '$serve' || cmd.name == '$attach' || cmd.name == '$metadata')
            return;
        container.register(proxyCommand(cmd, processor));
    });
}

export function updateCommands<T>(commands: meta.Command[], processor: CommandProcessors, container: Container<T>): void
{
    commands.forEach(cmd =>
    {
        if (cmd.name == '$serve' || cmd.name == '$attach' || cmd.name == '$metadata')
            return;
        container.register(configure(cmd.config)(new CommandProxy(processor, cmd.name, cmd.inject)), true);
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

export function fromObject<T extends { [key: string]: (unknown) }>(o: T, name: string): Container<T>
{
    const container = new Container(name, o);

    Object.keys(o).forEach(k =>
    {
        if (typeof o[k] == 'function')
        {
            container.register(k, new Command<T>(o[k] as (...args: unknown[]) => Promise<unknown>, k));
        }
    })

    return container;
}