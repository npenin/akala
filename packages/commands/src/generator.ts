import { Container } from "./model/container";
import * as meta from './metadata'
import { Command, CommandProxy } from "./model/command";
import { Processor } from "./model/processor";
import { configure } from "./decorators";

export const ignoredCommands = ['$serve', '$metadata', '$attach']

export function metadata(container: Container<any>, deep?: boolean): meta.Container
{
    // console.log(deep);
    var metacontainer: meta.Container = { name: container.name || 'unnamed', commands: [] };
    container.keys().forEach((key) =>
    {
        if (key === '$injector' || key === '$state' || key === '$container')
            return;
        var cmd = container.resolve<Command>(key);
        if (cmd && cmd.name && cmd instanceof Command && ignoredCommands.indexOf(cmd.name) == -1)
            metacontainer.commands.push({ name: cmd.name, inject: cmd.inject || [], config: cmd.config });
        if (cmd instanceof Container && deep)
        {
            // console.log(cmd);
            let subContainer = metadata(cmd as Container<any>, deep);
            subContainer.commands.forEach(c => c.name = cmd.name + '.' + c.name)
            metacontainer.commands.push(...subContainer.commands);
        }
    });
    return metacontainer;
}

export function proxy<T = any>(metacontainer: meta.Container, processor: Processor<T>): Container<T>
export function proxy<T = any>(metacontainer: meta.Container, processor: (c: Container<T>) => Processor<T>): Container<T>
export function proxy<T = any>(metacontainer: meta.Container, processor: Processor<T> | ((c: Container<T>) => Processor<T>)): Container<T>
{

    var container = new Container<T>(metacontainer.name, undefined as any);
    if (processor instanceof Function)
    {
        processor = processor(container);
    }

    registerCommands(metacontainer.commands, processor, container);

    return container;
}

export function registerCommands<T>(commands: meta.Command[], processor: Processor<T>, container: Container<T>)
{
    commands.forEach(cmd =>
    {
        if (cmd.name == '$serve' || cmd.name == '$attach' || cmd.name == '$metadata')
            return;
        container.register(configure(cmd.config)(new CommandProxy(processor as Processor<T>, cmd.name, cmd.inject)));
    });
}

export function updateCommands<T>(commands: meta.Command[], processor: Processor<T>, container: Container<T>)
{
    commands.forEach(cmd =>
    {
        if (cmd.name == '$serve' || cmd.name == '$attach' || cmd.name == '$metadata')
            return;
        container.register(configure(cmd.config)(new CommandProxy(processor as Processor<T>, cmd.name, cmd.inject)), true);
    });
}

export function helper<TState>(container: Container<TState>, metacontainer?: meta.Container)
{
    var result: { [key: string]: (...args: any[]) => any } = {};
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

export function commandList(container: meta.Container)
{
    return container.commands.map(cmd => cmd.name)
}

export function fromObject<T extends { [key: string]: any }>(o: T, name: string)
{
    var container = new Container(name, o);

    Object.keys(o).forEach(k =>
    {
        if (typeof o[k] == 'function')
        {
            container.register(k, new Command<T>(o[k], k));
        }
    })

    return container;
}