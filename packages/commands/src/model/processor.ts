import * as akala from '@akala/core'
import { Command } from "../metadata";
import { Container } from './container';

export abstract class CommandProcessor<T>
{
    public readonly requiresCommandName: false = false;
    abstract process(cmd: Command, param: { param: any[], [key: string]: any }): any | PromiseLike<any>;
    constructor(public name: string, protected container?: Container<T>)
    {
    }
}

export abstract class CommandNameProcessor<T>
{
    public readonly requiresCommandName: true = true;
    abstract process(cmd: string, param: { param: any[], [key: string]: any }): any | PromiseLike<any>;
    constructor(public name: string, protected container?: Container<T>) { }
}

export type CommandProcessors<T> = CommandProcessor<T> | CommandNameProcessor<T>

export interface Processor<T>
{
    readonly requiresCommandName: boolean;
    name: string;
    process(cmd: Command | string, param: { param?: any[], [key: string]: any }): any | PromiseLike<any>;
}