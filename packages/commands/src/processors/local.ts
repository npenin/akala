import { Injector, Injectable, each, MiddlewarePromise, isPromiseLike } from '@akala/core';
import * as  Metadata from '../metadata/index';
import { CommandProcessor, StructuredParameters } from '../model/processor'
import { Container } from '../model/container';
import assert from 'assert';
import { CommandWithProcessorAffinity, SelfDefinedCommand } from '../model/command';

export class Local extends CommandProcessor
{
    static fromObject<T>(o: T): CommandProcessor
    {
        return new Local(o as any);
    }

    public static execute<T, U>(cmd: Metadata.Command, handler: Injectable<U>, container: Container<T>, param: StructuredParameters): U
    {
        if (!container)
            assert.fail('container is undefined');
        let inject = cmd.inject;
        const injector = new Injector(container);
        injector.register('$container', container);
        // console.log(param);
        if (param._trigger === 'proxy')
            inject = undefined;
        if (param._trigger && cmd.config && cmd.config[param._trigger] && cmd.config[param._trigger]?.inject)
            inject = cmd.config[param._trigger]?.inject;
        each(Object.getOwnPropertyDescriptors(param), ((descriptor, key) => injector.registerDescriptor(key, descriptor)));
        injector.register('$param', param);
        if (!inject)
            inject = param.param.map((a, i) => 'param.' + i);
        // console.log(inject);
        return injector.injectWithName(inject, handler)(container.state);
    }

    public static handle<T, U = unknown | PromiseLike<unknown>>(cmd: Metadata.Command, handler: Injectable<U>, container: Container<T>, param: StructuredParameters): MiddlewarePromise
    {
        return new Promise((resolve, reject) =>
        {
            try
            {
                var result = Local.execute<unknown, U>(cmd, handler, container, param);
                if (isPromiseLike(result))
                    result.then(reject, resolve);
                else
                    reject(result);
            }
            catch (e)
            {
                resolve(e);
            }
        })
    }

    public override handle(container: Container<unknown>, command: Metadata.Command, param: StructuredParameters): MiddlewarePromise
    {
        if (this.handler[command.name] && typeof this.handler[command.name] === 'function')
            return Local.handle(command, this.handler[command.name], container, param);
        return Promise.resolve();
    }

    constructor(private handler: { [key: string]: (...args: unknown[]) => Promise<unknown> | unknown })
    {
        super('local');
    }
}

export class Self extends CommandProcessor
{
    public override handle(container: Container<unknown>, command: Metadata.Command & Partial<SelfDefinedCommand>, param: StructuredParameters): MiddlewarePromise
    {
        if ('handler' in command && typeof command.handler == 'function')
            return Local.handle(command, command.handler, container, param);
        return Promise.resolve();
    }

    constructor()
    {
        super('self');
    }
}

export class CommandWithAffinityProcessor extends CommandProcessor
{
    public override handle(container: Container<unknown>, command: Metadata.Command & Partial<CommandWithProcessorAffinity>, param: StructuredParameters): MiddlewarePromise
    {
        if ('processor' in command && command.processor)
            return command.processor.handle(container, command, param);
        return Promise.resolve();
    }

    constructor()
    {
        super('commandWithAffinity');
    }
}