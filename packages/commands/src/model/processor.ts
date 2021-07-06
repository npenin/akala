import * as akala from '@akala/core'
import { Command } from '../metadata/index.js';
import { Container } from './container.js';

export type StructuredParameters<T extends unknown[] = unknown[]> = { param: T, [key: string]: unknown, _trigger?: string }

export abstract class CommandProcessor implements ICommandMetadataProcessor
{
    public readonly requiresCommandName = false;
    constructor(public name: string, protected container?: Container<unknown>) { }
    public abstract handle(cmd: Command, param: StructuredParameters): akala.MiddlewarePromise;
}

export abstract class CommandNameProcessor implements ICommandNameProcessor
{
    public readonly requiresCommandName = true;
    constructor(public name: string, protected container?: Container<unknown>) { }
    public abstract handle(cmd: string, param: StructuredParameters): akala.MiddlewarePromise;
}

export interface ICommandMetadataProcessor extends akala.Middleware<[cmd: Command, param: StructuredParameters]>
{
    readonly requiresCommandName: false;
    name: string;
    handle(cmd: Command, param: StructuredParameters): akala.MiddlewarePromise;
}

export interface ICommandNameProcessor extends akala.Middleware<[cmd: string, param: StructuredParameters]>
{
    readonly requiresCommandName: true;
    name: string;
    handle(cmd: string, param: StructuredParameters): akala.MiddlewarePromise;
}

export interface Processor extends akala.Middleware<[cmd: Command | string, param: StructuredParameters]>
{
    readonly requiresCommandName: boolean;
    name: string;
    handle(cmd: Command | string, param: StructuredParameters): akala.MiddlewarePromise;
}

export type CommandProcessors = ICommandMetadataProcessor | ICommandNameProcessor;

