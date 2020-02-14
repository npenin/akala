import * as akala from '@akala/core'
import { Command, CommandProxy } from './command';
import { Trigger } from './trigger';
import { Processor } from './processor';
import { Local } from './processors';
import { Pipe } from './processors/pipe';
import $serve from './commands/$serve'
import $attach from './commands/$attach'
import $metadata from './commands/$metadata'

export class Container<TState> extends akala.Injector
{
    attach(triggerName: string, server: any)
    {
        var trigger = Trigger.find(triggerName);
        if (!trigger)
            throw new Error(`There is no registered trigger named ${triggerName}`);

        trigger.register(this, server);
    }
    public processor: Processor<TState>;
    constructor(public name: string, public state: TState, processor?: Processor<TState>)
    {
        super();
        if (typeof state !== 'undefined')
            this.register('$state', state);
        this.register('$container', this);
        var localProcessor = new Local(this);
        this.processor = processor || localProcessor;
        this.register(new Command($serve, '$serve', $serve.$inject))
        this.register(new Command($attach, '$attach', $attach.$inject))
        this.register(new Command($metadata, '$metadata', $metadata.$inject))
    }

    public pipe(container: Container<TState>)
    {
        this.processor = new Pipe(container);
    }

    public dispatch(command: string | Command<TState>, param: { param: any[], [key: string]: any }): any
    public dispatch(command: string | Command<TState>, ...param: any[]): any
    public dispatch(command: string | Command<TState>, param: any | { param: any[], [key: string]: any }, ...params: any[]): any
    {
        if (typeof (param) == 'object' && param.param && Array.isArray(param.param))
        {
            if (this.processor.requiresCommandName)
                if (typeof command == 'string')
                    return this.processor.process(command, param);
                else
                    return this.processor.process(command.name, param);
            if (typeof command == 'string')
            {
                var cmd = this.resolve(command);
                if (!cmd)
                    throw new Error(`Command with name ${command} could not be found`)
            }
            else
                cmd = command;
            return this.processor.process(cmd, param);
        }
        else
        {
            if (typeof params == 'undefined')
                params = [];
            if (typeof param !== 'undefined')
                params.unshift(param);
            return this.dispatch(command, { param: params });
        }
    }

    public resolve<T = Command<TState>>(name: string): T
    {
        return super.resolve<T>(name);
    }

    public proxy()
    {
        var proxy = new Container('proxy-' + this.name, null);
        proxy.resolve = (name: string) =>
        {
            var result = super.resolve(name);
            if (result instanceof Command)
                return new CommandProxy(this.processor, name, result.inject);
            return result;
        }
        return proxy;
    }

    public register<T>(name: string, value: T): T
    public register(cmd: Command<TState>): Command<TState>
    public register<T>(cmd: string | Command<TState>, value?: T): T | Command<TState>
    {
        if (typeof (cmd) == 'string')
            if (typeof value != 'undefined')
                return super.register(cmd, value);
            else
                throw new Error('value cannot be undefined');
        else if (value instanceof Container)
            return super.register(name, value.proxy()) as any;
        else
            return super.register(cmd.name, cmd);
    }
}

export function lazy<T extends object>(ctor: () => T): T
{
    var instance: T | null = null;
    return new Proxy<T>({} as any,
        {
            getPrototypeOf(): object | null
            {
                if (!instance)
                    instance = ctor();
                return Reflect.getPrototypeOf(instance);
            },
            setPrototypeOf(target: any, v: any): boolean
            {
                if (!instance)
                    instance = ctor();
                return Reflect.setPrototypeOf(instance, v);
            },
            isExtensible(): boolean
            {
                if (!instance)
                    instance = ctor();
                return Reflect.isExtensible(instance);
            },
            preventExtensions(): boolean
            {
                if (!instance)
                    instance = ctor();
                return Reflect.preventExtensions(instance);
            },
            getOwnPropertyDescriptor(target: any, p: PropertyKey)
            {
                if (!instance)
                    instance = ctor();
                return Reflect.getOwnPropertyDescriptor(instance, p);
            },
            has(target: any, p: PropertyKey): boolean
            {
                if (!instance)
                    instance = ctor();
                return Reflect.has(instance, p);
            },
            get(target: any, p: PropertyKey): any
            {
                if (!instance)
                    instance = ctor();
                return Reflect.get(instance, p);
            },
            set(target: any, p: PropertyKey, value: any): boolean
            {
                if (!instance)
                    instance = ctor();
                return Reflect.set(instance, p, value);
            },
            deleteProperty(target: any, p: PropertyKey): boolean
            {
                if (!instance)
                    instance = ctor();
                return Reflect.deleteProperty(instance, p);
            },
            defineProperty(target: any, p: PropertyKey, attributes: PropertyDescriptor): boolean
            {
                if (!instance)
                    instance = ctor();
                return Reflect.defineProperty(instance, p, attributes);
            },
            enumerate(): PropertyKey[]
            {
                if (!instance)
                    instance = ctor();
                var result: PropertyKey[] = [];
                for (var x of Reflect.enumerate(instance as any))
                    result.push(x);
                return result;
            },
            ownKeys(): PropertyKey[]
            {
                if (!instance)
                    instance = ctor();
                return Reflect.ownKeys(instance);
            },
            apply(target: any, thisArg: any, argArray?: any): any
            {
                if (!instance)
                    instance = ctor();
                return Reflect.apply(instance as any, thisArg, argArray);
            },
            construct(target: any, argArray: any, newTarget?: any): object
            {
                if (!instance)
                    instance = ctor();
                return Reflect.construct(instance as any, argArray, newTarget);
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