import { MiddlewarePromise } from '@akala/core';
import { CommandProcessor, StructuredParameters } from '../model/processor.js'
import { Container } from '../model/container.js';
import { Command } from '../metadata/index.js';

export class Pipe<T> extends CommandProcessor
{
    public async handle(origin: Container<T>, command: Command, param: StructuredParameters): MiddlewarePromise
    {
        if (!this.container)
            return new Error('container is undefined');

        return this.container.handle(origin, command.name, param);
    }

    constructor(private container: Container<T>)
    {
        super('pipe');
    }
}