import * as akala from '@akala/core'
import { Command, CommandProxy } from './command';
import { Trigger } from './trigger';
import { Processor, CommandNameProcessor, StructuredParameters } from './processor';
import { Local } from '../processors';
import { Pipe } from '../processors/pipe';
import $serve from '../commands/$serve'
import $attach from '../commands/$attach'
import $metadata from '../commands/$metadata'
import { UnknownCommandError } from './error-unknowncommand';
import * as Metadata from '../metadata'

const log = akala.log('akala:commands');

export type AsDispatchArgs<T extends unknown[]> = T | [StructuredParameters<T>];
export type AsDispatchArg<T extends unknown[]> = T[0] | StructuredParameters<T>;

export class Container<TState> extends akala.Injector
{
    attach<T extends Trigger<unknown, unknown>>(trigger: T, server: T extends Trigger<infer A, unknown> ? A : never): T extends Trigger<unknown, infer B> ? B : never
    attach<TResult>(trigger: string, server: unknown): TResult
    attach<TResult, X, T extends Trigger<X, TResult>>(trigger: T | string, server: X): TResult
    {
        if (typeof trigger == 'string')
            trigger = Trigger.find<X>(trigger) as T;
        if (!trigger)
            throw new Error(`There is no registered trigger named ${trigger}`);

        return trigger.register(this, server);
    }

    public get processor(): Processor
    {
        return this._processor;
    }

    private _processor: Processor;

    public get trapProcessor(): CommandNameProcessor
    {
        return this._trapProcessor;
    }

    private _trapProcessor?: CommandNameProcessor;

    public trap(trapProcessor: CommandNameProcessor): void
    {
        if (this._processor.requiresCommandName)
            console.warn('You can assign a trap, however, it will never get call with a processor that already need only the command name');
        this._trapProcessor = trapProcessor;
    }

    constructor(public name: string, public state: TState, processor?: Processor)
    {
        super();
        if (typeof state !== 'undefined')
            this.register('$state', state);
        this.register('$container', this);
        this._processor = processor || new Local(this);
        this.register(new Command($serve, '$serve', $serve.$inject))
        this.register(new Command($attach, '$attach', $attach.$inject))
        this.register($metadata);
    }

    public pipe(container: Container<TState>): void
    {
        this._processor = new Pipe(container);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public dispatch(command: string | Metadata.Command, ...param: AsDispatchArgs<unknown[]>): Promise<any>
    {
        if (typeof (param) == 'object' && param !== null && param.length === 1 && typeof (param[0]) == 'object' && param[0] !== null && param[0]['param'] && Array.isArray(param[0]['param']))
        {
            // log(`dispatching ${command}(${JSON.stringify(param[0])})`)
            if (this.processor.requiresCommandName)
                if (typeof command == 'string')
                    return this.processor.handle(command, param[0] as StructuredParameters<unknown[]>).then(err => { throw err }, result => result);
                else
                    return this.processor.handle(command.name, param[0] as StructuredParameters<unknown[]>).then(err => { throw err }, result => result);
            let cmd: Metadata.Command;
            if (typeof command == 'string')
            {
                cmd = this.resolve(command);
                if (!cmd)
                {
                    if (this._trapProcessor)
                        return this._trapProcessor.handle(command, param[0] as StructuredParameters<unknown[]>).then(err => { throw err }, result => result);
                    throw new UnknownCommandError(command)
                }
            }
            else
                cmd = command;
            return this.processor.handle(cmd, param[0] as StructuredParameters<unknown[]>).then(
                err => { throw err },
                async result => await result);
        }
        else
        {
            if (typeof param == 'undefined' || param === null)
                param = [];
            return this.dispatch(command, { param: param });
        }
    }

    public resolve<T = Command<TState>>(name: string): T
    {
        return super.resolve<T>(name);
    }

    public proxy(): Container<void>
    {
        const proxy = new Container<void>('proxy-' + this.name, null, this.processor);
        proxy.resolve = (name: string) =>
        {
            const result = super.resolve(name);
            if (!result)
                return new CommandProxy(this.processor, name, ['$param']);
            return result;
        }
        return proxy;
    }

    public static proxy<T = unknown>(name: string, processor: (container) => CommandNameProcessor): Container<T>
    public static proxy<T = unknown>(name: string, processor: CommandNameProcessor): Container<T>
    public static proxy<T = unknown>(name: string, processor: CommandNameProcessor | ((container) => CommandNameProcessor)): Container<T>
    {
        const proxy = new Container<T>('proxy-' + name, null, undefined);
        if (typeof (processor) === 'function')
            proxy._processor = processor(proxy);
        else
            proxy._processor = processor;
        const proxyResolve = proxy.resolve;
        proxy.unregister('$metadata');
        proxy.unregister('$serve');
        proxy.unregister('$attach');
        proxy.resolve = ((name: string) =>
        {
            const result = proxyResolve.call(proxy, name);
            if (result instanceof Command || !result)
                return new CommandProxy(proxy.processor, name, ['$param']);
            return result;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        }) as any;
        return proxy;
    }

    public register<T>(name: string, value: T, override?: boolean): T
    public register(cmd: Command, override?: boolean): Command<TState>
    public register(cmd: Container<unknown>, override?: boolean): Container<unknown>
    public register<T>(cmd: string | Command<TState> | Container<unknown>, value?: T, override?: boolean): T | Command<TState> | Container<unknown>
    {
        if (cmd instanceof Container || cmd instanceof Command)
            return this.register(cmd.name, cmd, !!value);
        else 
        {
            if (cmd == '$injector' || cmd == '$container')
                return super.register(cmd, value, override) as unknown as T;
            if (value instanceof Container)
                return super.register(cmd, value.proxy(), override);
            if (typeof value != 'undefined')
                return super.register(cmd, value, override);
            else
                throw new Error('value cannot be undefined');
        }
    }
}

// eslint-disable-next-line @typescript-eslint/ban-types
export function lazy<T extends object>(factory: () => T): T
{
    let instance: T | null = null;
    return new Proxy<T>({} as T,
        {
            // eslint-disable-next-line @typescript-eslint/ban-types
            getPrototypeOf(): object | null
            {
                if (!instance)
                    instance = factory();
                return Reflect.getPrototypeOf(instance);
            },
            // eslint-disable-next-line @typescript-eslint/ban-types
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
                // eslint-disable-next-line @typescript-eslint/ban-types
                return Reflect.apply(instance as unknown as Function, thisArg, argArray);
            },
            // eslint-disable-next-line @typescript-eslint/ban-types
            construct(_target: unknown, argArray: unknown[], newTarget?: Function): object
            {
                if (!instance)
                    instance = factory();
                // eslint-disable-next-line @typescript-eslint/ban-types
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
    akala.each(commands, function (f: Injectable<any> | Command<T>)
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