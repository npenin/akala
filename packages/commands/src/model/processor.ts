import * as akala from '@akala/core'
import { Command } from '../metadata/index.js';
import { Container } from './container.js';

export type StructuredParameters<T extends unknown[] = unknown[]> = { param: T, [key: string]: unknown, _trigger?: string }

export abstract class CommandProcessor implements ICommandProcessor
{
    public readonly requiresCommandName = false;
    constructor(public name: string) { }
    public abstract handle(origin: Container<unknown>, cmd: Command, param: StructuredParameters): akala.MiddlewarePromise;
}

export type CommandMetadataProcessorSignature<T> = [origin: Container<T>, cmd: Command, param: StructuredParameters];

export type ICommandProcessor<T = unknown> = akala.Middleware<CommandMetadataProcessorSignature<T>>;
