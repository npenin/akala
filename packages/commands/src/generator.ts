import { Container } from "./container";
import * as meta from './metadata'
import { Command, CommandProxy } from "./command";
import { Processor } from "./processor";
import { Injector } from "@akala/core";

export function metadata(container: Container<any>): meta.Container
{
    var metacontainer: meta.Container = { name: container.name || 'unnamed', commands: [] };
    container.keys().forEach((key) =>
    {
        if (key === '$injector' || key === '$state')
            return;
        var cmd = container.resolve<Command>(key);
        if (cmd && cmd.name)
            metacontainer.commands.push({ name: cmd.name, inject: cmd.inject || [], config: cmd.config });
    });
    return metacontainer;
}

export function proxy(metacontainer: meta.Container, processor: Processor<void>)
{
    var container = new Container<void>(metacontainer.name, undefined, processor);

    metacontainer.commands.forEach(cmd =>
    {
        var proxycmd = container.register(new Command(function proxy(arg) { processor.process(cmd, arg); }, cmd.name, cmd.config[processor.name] && cmd.config[processor.name].inject || cmd.inject));
        proxycmd.config = Object.assign({}, cmd.config);
    });

    return container;
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