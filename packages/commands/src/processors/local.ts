import { Injectable, each, MiddlewarePromise, SpecialNextParam, MiddlewareAsync, SimpleInjector, Resolvable, NotHandled, map, ErrorWithStatus, HttpStatusCode } from '@akala/core';
import * as  Metadata from '../metadata/index.js';
import { CommandMetadataProcessorSignature, CommandProcessor, ICommandProcessor, StructuredParameters } from '../model/processor.js'
import { Container } from '../model/container.js';
import { CommandWithProcessorAffinity, SelfDefinedCommand } from '../model/command.js';


export class AuthHandler<T extends (...args: unknown[]) => unknown> implements MiddlewareAsync<CommandMetadataProcessorSignature<unknown>>
{
    constructor(private readonly authValidator: T)
    {
    }

    async handle(origin: Container<unknown>, cmd: Metadata.Command, param: StructuredParameters<unknown[]>): MiddlewarePromise
    {
        if (param._trigger && cmd.config?.[param._trigger].auth)
        {
            try
            {
                param.auth = await Local.execute({ name: cmd.name, config: Object.fromEntries(map(cmd.config, (c, proc) => [proc, c.auth], true).filter(e => e[1])) },
                    this.authValidator,
                    origin,
                    param)
                if (cmd.config?.[param._trigger].auth?.required && !param.auth)
                    return new ErrorWithStatus(HttpStatusCode.Forbidden, 'Unauthorized action');
            }
            catch (e)
            {
                return e;
            }
        }
        return undefined;
    }
}

export class AuthPreProcessor extends CommandProcessor
{
    constructor(private readonly inner: ICommandProcessor)
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

    public static extractParams(source: Resolvable[])
    {
        const sourceParams = source.
            map((i, j) => [i, j]).
            filter(x => typeof x[0] == 'string' && x[0].startsWith('param.') || Array.isArray(x[0]) && (x[0][0] == 'param' || x[0][0].startsWith('param.'))).
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
        let config = cmd.config?.[''];
        let inject = config?.inject;
        const injector = new SimpleInjector(container);
        injector.register('$container', container);
        if (param.injector)
            injector.merge(param.injector as SimpleInjector);
        // console.log(param);
        if (param._trigger === 'proxy')
            inject = undefined;
        if (param._trigger && cmd.config?.[param._trigger])
        {
            config = cmd.config[param._trigger];
            if (config?.inject)
                inject = config.inject;
        }
        each(Object.getOwnPropertyDescriptors(param), ((descriptor, key) => injector.registerDescriptor(key as string | symbol, descriptor)));
        injector.register('$param', param);
        injector.register('$state', container.state);
        injector.register('$config', config);
        injector.register('$command', cmd);
        if (!inject)
            inject = param.param.map((a, i) => 'param.' + i);
        // console.log(inject);
        // injector.inspect();
        return injector.injectWithName(inject, handler)(container.state);
    }

    public static async handle<T, TArgs extends unknown[], U = unknown>(cmd: Metadata.Command, handler: Injectable<U, TArgs>, container: Container<T>, param: StructuredParameters): MiddlewarePromise
    {
        try
        {
            const result = await Local.execute(cmd, handler, container, param);
            return Promise.reject(result);
        }
        catch (e)
        {
            return Promise.resolve(e);
        }
    }

    public override handle(container: Container<unknown>, command: Metadata.Command, param: StructuredParameters): MiddlewarePromise
    {
        if (this.handler[command.name] && typeof this.handler[command.name] === 'function')
            return Local.handle(command, this.handler[command.name], container, param);
        return NotHandled;
    }

    constructor(private readonly handler: { [key: string]: (...args: unknown[]) => unknown })
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
        return NotHandled;
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
        return NotHandled;
    }

    constructor()
    {
        super('commandWithAffinity');
    }
}
