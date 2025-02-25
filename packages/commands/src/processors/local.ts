import { Injectable, each, MiddlewarePromise, isPromiseLike, SpecialNextParam, MiddlewareAsync, SimpleInjector, Resolvable } from '@akala/core';
import * as  Metadata from '../metadata/index.js';
import { CommandMetadataProcessorSignature, CommandProcessor, ICommandProcessor, StructuredParameters } from '../model/processor.js'
import { Container } from '../model/container.js';
import { CommandWithProcessorAffinity, SelfDefinedCommand } from '../model/command.js';


export class AuthHandler implements MiddlewareAsync<CommandMetadataProcessorSignature<unknown>>
{
    constructor(private authValidator: CommandProcessor['handle'])
    {
    }

    async handle(origin: Container<unknown>, cmd: Metadata.Command, param: StructuredParameters<unknown[]>): MiddlewarePromise
    {
        if (param._trigger && cmd.config?.auth)
        {
            return this.authValidator(origin, cmd, param);
        }
        return undefined;
    }
}

export class AuthPreProcessor extends CommandProcessor
{
    constructor(private inner: ICommandProcessor)
    {
        super('auth');
    }

    public authState: any;

    public handle(origin: Container<unknown>, cmd: Metadata.Command, param: StructuredParameters<unknown[]>): MiddlewarePromise<SpecialNextParam>
    {
        if (!param.auth)
            param.auth = this.authState
        return this.inner.handle(origin, cmd, param);
    }
}

export class Local extends CommandProcessor
{
    static fromObject<T extends object>(o: T): CommandProcessor
    {
        //eslint-disable-next-line @typescript-eslint/no-explicit-any
        return new Local(o as any);
    }

    public static extractParams(source: Exclude<Resolvable, symbol>[])
    {
        const sourceParams = source.
            map((i, j) => [i, j]).
            filter(x => typeof x[0] == 'string' && x[0].startsWith('param.')).
            map(x => [...x as [string, number], Number((x[0] as string).substring('param.'.length))] as const).
            sort((a, b) => a[2] - b[2])
            ;

        return function (...args)
        {
            return sourceParams.map(p => ({ p, value: args[p[1]] })).
                map(p => p.value);
        }
    }

    public static remapArgs(source: string[], destination: string[])
    {
        const sourceParams = source.
            map((i, j) => [i, j] as [string, number]).
            filter(x => x[0].startsWith('param.')).
            map(x => [...x, Number(x[0].substring('param.'.length))] as const).
            sort((a, b) => a[2] - b[2])
            ;
        const destinationParams = destination.
            map((i, j) => [i, j] as [string, number]).
            filter(x => x[0].startsWith('param.')).
            map(x => [...x, Number(x[0].substring('param.'.length))] as const)
            ;

        return function (...args)
        {
            return sourceParams.map(p => ({ p, value: args[p[1]] })).
                filter(p => destinationParams.find(dp => dp[2] == p.p[2])).
                map(p => p.value);
        }
    }

    public static execute<T, U, TArgs extends unknown[]>(cmd: Metadata.Command, handler: Injectable<U, TArgs>, container: Container<T>, param: StructuredParameters): U
    {
        if (!container)
            throw new Error('container is undefined');
        let config = cmd.config && cmd.config[''];
        let inject = config?.inject;
        const injector = new SimpleInjector(container);
        injector.register('$container', container);
        if (param.injector)
            injector.merge(param.injector as SimpleInjector);
        // console.log(param);
        if (param._trigger === 'proxy')
            inject = undefined;
        if (param._trigger && cmd.config && cmd.config[param._trigger])
        {
            config = cmd.config[param._trigger];
            if (config?.inject)
                inject = config.inject;
        }
        each(Object.getOwnPropertyDescriptors(param), ((descriptor, key) => injector.registerDescriptor(key as string | symbol, descriptor)));
        injector.register('$param', param);
        injector.register('$config', config);
        injector.register('$command', cmd);
        if (!inject)
            inject = param.param.map((a, i) => 'param.' + i);
        // console.log(inject);
        // injector.inspect();
        return injector.injectWithName(inject, handler)(container.state);
    }

    public static handle<T, TArgs extends unknown[], U = unknown | PromiseLike<unknown>>(cmd: Metadata.Command, handler: Injectable<U, TArgs>, container: Container<T>, param: StructuredParameters): MiddlewarePromise
    {
        return new Promise((resolve, reject) =>
        {
            try
            {
                var result = Local.execute(cmd, handler, container, param);
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
    public override handle<TArgs extends unknown[]>(container: Container<unknown>, command: Metadata.Command & Partial<SelfDefinedCommand<TArgs>>, param: StructuredParameters): MiddlewarePromise
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
        if ('processor' in command && typeof command.processor?.handle == 'function')
            return command.processor.handle(container, command, param);
        return Promise.resolve();
    }

    constructor()
    {
        super('commandWithAffinity');
    }
}