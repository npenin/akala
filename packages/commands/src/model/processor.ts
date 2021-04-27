import * as akala from '@akala/core'
import { Command } from '../metadata/index.js';
import { Container } from './container.js';

export type StructuredParameters<T extends unknown[] = unknown[]> = { param: T, [key: string]: unknown, _trigger?: string }

export abstract class CommandProcessor implements akala.Middleware<[cmd: Command, param: StructuredParameters<unknown[]>]>
{
    public readonly requiresCommandName: false = false;
    constructor(public name: string, protected container?: Container<unknown>)
    {
    }
    public abstract handle(cmd: Command, param: StructuredParameters<unknown[]>): akala.MiddlewarePromise;
}

export abstract class CommandNameProcessor implements akala.Middleware<[cmd: string, param: StructuredParameters<unknown[]>]>
{
    public readonly requiresCommandName: true = true;
    constructor(public name: string, protected container?: Container<unknown>) { }
    public abstract handle(cmd: string, param: { [key: string]: unknown; param: unknown[]; }): akala.MiddlewarePromise;
}

export type CommandProcessors = CommandProcessor | CommandNameProcessor

export interface Processor extends akala.Middleware<[cmd: Command | string, param: StructuredParameters<unknown[]>]>
{
    readonly requiresCommandName: boolean;
    name: string;
    handle(cmd: Command | string, param: { param?: unknown[], [key: string]: unknown }): akala.MiddlewarePromise;
}