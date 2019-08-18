import { promises as fs } from 'fs'
import { Injectable, Injector } from '@akala/core'
import * as vm from 'vm'
import * as akala from '@akala/core'
import { Command } from './command';
import { Trigger } from './trigger';
import { Processor } from './processor';
import { Local } from './processors';

export class Container<TState> extends akala.Injector
{
    attach(triggerName: string, server: any)
    {
        var trigger = Trigger.find(triggerName);
        if (!trigger)
            throw new Error(`There is no registered trigger named ${triggerName}`);

        var iTrigger = trigger;

        this.keys().forEach(cmdName =>
        {
            iTrigger.register(this, this.resolve(cmdName), server);
        });
    }
    public processor: Processor;
    constructor(public name: string, public state: TState, processor?: Processor)
    {
        super();
        this.register('$state', state);
        this.processor = processor || new Local(this);
    }

    public dispatch(command: string, ...param: any[])
    {
        return this.processor.process(this.resolve(command), ...param);
    }

    public resolve<T = Command<TState>>(name: string): T
    {
        return super.resolve<T>(name);
    }

    public register<T>(name: string, value: T): T
    public register(cmd: Command<TState>): Command<TState>
    public register<T>(cmd: string | Command<TState>, value?: T): T | Command<TState>
    {
        if (typeof (cmd) == 'string')
            if (typeof value != 'undefined')
                return super.register(cmd, value);
            else
                throw new Error('value cannot be null');
        else
            return super.register(cmd.name, cmd);
    }
}

/*
var files: { [key: string]: Command[] }

export async function serveController<T>(path: string, container: Container<T>, state: T)
{
    var context = vm.createContext({ state }, { name: container.name });

    if (typeof files[path] == 'undefined')
        files[path] = [];

    var file = await fs.readFile(path, 'utf-8')
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