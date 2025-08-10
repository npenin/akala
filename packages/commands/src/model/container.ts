import { Trigger } from './trigger.js';
import { type StructuredParameters, type CommandMetadataProcessorSignature, CommandProcessor } from './processor.js';
import { CommandWithAffinityProcessor, Local, Self } from '../processors/index.js';
import { Pipe } from '../processors/pipe.js';
import $serve from '../commands/$serve.js'
import $attach from '../commands/$attach.js'
import $metadata from '../commands/$metadata.js'
import { UnknownCommandError } from './error-unknowncommand.js';
import * as Metadata from '../metadata/index.js'
import { ErrorWithStatus, Injector, type MiddlewareAsync, MiddlewareCompositeWithPriorityAsync, type MiddlewarePromise, SimpleInjector } from '@akala/core';
import { BindingProcessor } from '../processors/binding.js';

export type AsDispatchArgs<T extends unknown[]> = T | [StructuredParameters<T>];
export type AsDispatchArg<T extends unknown[]> = T[0] | StructuredParameters<T>;

export const defaultCommands = new Local({ $attach, $serve });

export class Container<TState> extends SimpleInjector implements MiddlewareAsync<[origin: Container<unknown>, cmd: Metadata.Command | string, params: AsDispatchArgs<unknown[]>]>
{
    attach<U extends unknown[], V>(trigger: Trigger<U, V>, ...server: U): V
    attach<TResult>(trigger: string, ...server: unknown[]): TResult
    attach<TResult, X extends unknown[], T extends Trigger<X, TResult>>(trigger: T | string, ...args: X): TResult
    {
        if (typeof trigger == 'string')
            trigger = Trigger.find<X>(trigger) as T;
        if (!trigger)
            throw new Error(`There is no registered trigger named ${trigger}`);

        return trigger.register(this, ...args);
    }

    public readonly processor: MiddlewareCompositeWithPriorityAsync<CommandMetadataProcessorSignature<TState>>;

    constructor(public name: string, public state: TState, processor?: MiddlewareAsync<CommandMetadataProcessorSignature<TState>>, parent?: Injector)
    {
        super(parent);
        if (typeof state !== 'undefined')
            this.register('$state', state);
        this.register('$container', this);
        this.processor = new MiddlewareCompositeWithPriorityAsync(name);
        if (processor)
            this.processor.useMiddleware(20, processor);
        this.processor.useMiddleware(5, new BindingProcessor());
        this.processor.useMiddleware(19, new Self());
        this.processor.useMiddleware(10, new CommandWithAffinityProcessor());
        this.processor.useMiddleware(50, defaultCommands);
        this.register({ name: '$serve', config: { '': { inject: $serve.$inject } } })
        this.register({ name: '$attach', config: { '': { inject: $attach.$inject } } })
        this.register({ name: '$metadata', ...$metadata })
    }

    public pipe(container: Container<TState>, priority: number = 30): void
    {
        this.processor.useMiddleware(priority, new Pipe(container));
    }

    public dispatch(command: '$metadata', ...param: AsDispatchArgs<unknown[]>): Promise<Metadata.Container>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public dispatch(command: string | Metadata.Command, ...param: AsDispatchArgs<unknown[]>): Promise<any>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public dispatch(command: string | Metadata.Command, ...param: AsDispatchArgs<unknown[]>): Promise<any>
    {
        return this.handle(this, command, ...param).then(err => { throw err }, result => result);
    }

    public handle(container: Container<TState>, command: string | Metadata.Command, ...param: AsDispatchArgs<unknown[]>): MiddlewarePromise
    {
        container = container || this;
        if (typeof (param) == 'object' && param !== null && param.length === 1 && typeof (param[0]) == 'object' && param[0] !== null && param[0]['params'] && Array.isArray(param[0]['params']))
        {
            // console.log(`dispatching ${command}(${JSON.stringify(param[0])})`)
            let cmd: Metadata.Command;
            if (typeof command == 'string')
            {
                cmd = this.resolve(command);
                if (!cmd)
                    throw new UnknownCommandError(command, this);
                if (cmd.name !== command)
                {
                    const proc = this.resolve<Container<TState>>(command.substring(0, command.length - cmd.name.length - 1));
                    return proc.handle(proc, cmd, param[0] as StructuredParameters<unknown[]>);
                }
            }
            else
                cmd = command;

            return this.processor.handle(container, cmd, param[0] as StructuredParameters<unknown[]>);
        }
        else
        {
            if (typeof param == 'undefined' || param === null)
                param = [];
            return this.handle(container, command, { params: param });
        }
    }

    public resolve<T = Metadata.Command>(name: string): T
    {
        return super.resolve<T>(name);
        // if (isCommand(c) && c.name !== name)
        //     return Object.assign({}, c, { name });
        // return c;
    }

    public static proxy<T = unknown>(name: string, processor: CommandProcessor, priority: number = 50): Container<T>
    {
        const proxy = new Container<T>('proxy-' + name, null);
        proxy.processor.useMiddleware(priority, processor);
        // const proxyResolve = proxy.resolve;
        proxy.unregister('$metadata');
        proxy.unregister('$serve');
        proxy.unregister('$attach');
        // proxy.resolve = ((name: string) =>
        // {
        //     const result = proxyResolve.call(proxy, name);
        //     if (isCommand(result) || !result)
        //         return { processor: processor, name, inject: ['$param'] };
        //     return result;
        //     // eslint-disable-next-line @typescript-eslint/no-explicit-any
        // }) as any;
        return proxy;
    }

    public register<T>(name: string, value: T, override?: boolean): T
    public register<T extends Metadata.Command>(cmd: T, override?: boolean): T
    public register(cmd: Container<unknown>, override?: boolean): Container<unknown>
    public register<T>(cmd: string | (T & { name: string }), value?: T, override?: boolean): T
    {
        if (typeof cmd !== 'string')
        {
            if ('name' in cmd)
            {
                override = !!value;
                value = cmd;
                cmd = cmd.name;
            }
            else
                throw new ErrorWithStatus(400, 'The provided item cannot be registered as it does not have a name property. Please provide a name as the first parameter or provide an object with a name property');
        }
        if (cmd == '$injector' || cmd == '$container')
            return super.register(cmd, value, override) as unknown as T;
        if (value instanceof Container)
            return super.register(cmd, value, override);
        if (typeof value != 'undefined')
            return super.register(cmd, value, override);
        else
            throw new Error('value cannot be undefined');
    }
}

export function lazy<T extends object>(factory: () => T): T
{
    let instance: T | null = null;
    return new Proxy<T>({} as T,
        {
            getPrototypeOf(): object | null
            {
                if (!instance)
                    instance = factory();
                return Reflect.getPrototypeOf(instance);
            },
            setPrototypeOf(_target: unknown, v: object): boolean
            {
                if (!instance)
                    instance = factory();
                return Reflect.setPrototypeOf(instance, v);
            },
            isExtensible(): boolean
            {
                if (!instance)
                    instance = factory();
                return Reflect.isExtensible(instance);
            },
            preventExtensions(): boolean
            {
                if (!instance)
                    instance = factory();
                return Reflect.preventExtensions(instance);
            },
            getOwnPropertyDescriptor(_target: unknown, p: PropertyKey)
            {
                if (!instance)
                    instance = factory();
                return Reflect.getOwnPropertyDescriptor(instance, p);
            },
            has(_target: unknown, p: PropertyKey): boolean
            {
                if (!instance)
                    instance = factory();
                return Reflect.has(instance, p);
            },
            get(_target: unknown, p: PropertyKey): unknown
            {
                if (!instance)
                    instance = factory();
                return Reflect.get(instance, p);
            },
            set(_target: unknown, p: PropertyKey, value: unknown): boolean
            {
                if (!instance)
                    instance = factory();
                return Reflect.set(instance, p, value);
            },
            deleteProperty(_target: unknown, p: PropertyKey): boolean
            {
                if (!instance)
                    instance = factory();
                return Reflect.deleteProperty(instance, p);
            },
            defineProperty(_target: unknown, p: PropertyKey, attributes: PropertyDescriptor): boolean
            {
                if (!instance)
                    instance = factory();
                return Reflect.defineProperty(instance, p, attributes);
            },
            ownKeys(): (string | symbol)[]
            {
                if (!instance)
                    instance = factory();
                return Reflect.ownKeys(instance);
            },
            apply(_target: unknown, thisArg: unknown, argArray?: unknown[]): unknown
            {
                if (!instance)
                    instance = factory();
                // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
                return Reflect.apply(instance as unknown as Function, thisArg, argArray);
            },
            // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
            construct(_target: unknown, argArray: unknown[], newTarget?: Function): object
            {
                if (!instance)
                    instance = factory();
                // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
                return Reflect.construct(instance as unknown as Function, argArray, newTarget);
            }
        });
}

/*
var files: { [key: string]: Command[] }

export async function serveController<T>(path: string, container: Container<T>, state: T)
{
    var context = vm.createContext({ state }, { name: container.name });

    if (typeof files[path] == 'undefined')
        files[path] = [];

    var file = await fs.readFile(path, 'utf8')
    var commands = vm.runInContext(file, context, { filename: path, displayErrors: true });
    each(commands, function (f: Injectable<any> | Command<T>)
    {
        if (typeof f == 'function')
            f = new Command<T>(f);
        if (typeof f == 'object')
        {
            files[path].push(f);
            container.register(f.name, f);
        }
    });
}
*/
