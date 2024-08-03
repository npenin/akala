import { Injector, MiddlewareAsync, MiddlewarePromise } from '@akala/core';
import { Command } from '../metadata/index.js';
import { Container } from './container.js';

export type StructuredParameters<T extends unknown[] = unknown[]> = { param: T, [key: string]: unknown, _trigger?: string, injector?: Injector }

export abstract class CommandProcessor implements ICommandProcessor
{
    public readonly requiresCommandName = false;
    constructor(public name: string) { }
    public abstract handle(origin: Container<unknown>, cmd: Command, param: StructuredParameters): MiddlewarePromise;
}

export type CommandMetadataProcessorSignature<T> = [origin: Container<T>, cmd: Command, param: StructuredParameters];

export type ICommandProcessor<T = unknown> = MiddlewareAsync<CommandMetadataProcessorSignature<T>>;
