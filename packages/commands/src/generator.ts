import { Container } from "./model/container.js";
import * as meta from './metadata/index.js'
import { Command, CommandProxy } from './model/command.js';
import { Processor } from './model/processor.js';
import { configure } from './decorators.js';

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

export function proxy<T = unknown>(metacontainer: meta.Container, processor: Processor): Container<T>
export function proxy<T = unknown>(metacontainer: meta.Container, processor: (c: Container<T>) => Processor): Container<T>
export function proxy<T = unknown>(metacontainer: meta.Container, processor: Processor | ((c: Container<T>) => Processor)): Container<T>
{

    const container = new Container<T>(metacontainer.name, undefined);
    if (processor instanceof Function)
    {
        processor = processor(container);
    }

    registerCommands(metacontainer.commands, processor, container);

    return container;
}

export function registerCommands<T>(commands: meta.Command[], processor: Processor, container: Container<T>): void
{
    commands.forEach(cmd =>
    {
        if (cmd.name == '$serve' || cmd.name == '$attach' || cmd.name == '$metadata')
            return;
        container.register(configure(cmd.config)(new CommandProxy(processor as Processor, cmd.name, cmd.inject)));
    });
}

export function updateCommands<T>(commands: meta.Command[], processor: Processor, container: Container<T>): void
{
    commands.forEach(cmd =>
    {
        if (cmd.name == '$serve' || cmd.name == '$attach' || cmd.name == '$metadata')
            return;
        container.register(configure(cmd.config)(new CommandProxy(processor as Processor, cmd.name, cmd.inject)), true);
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