import { promises as fs } from 'fs'
import { Injectable, Injector } from '@akala/core'
import * as vm from 'vm'
import * as akala from '@akala/core'
import { Command } from './command';
import { Trigger } from './trigger';
import { Processor } from './processor';
import { Local } from './processors';
import { commandList, metadata } from './generator';
import { Pipe } from './processors/pipe';

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
        this.processor = processor || new Local(this);
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