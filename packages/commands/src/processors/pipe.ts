import { MiddlewarePromise } from '@akala/core';
import { CommandNameProcessor, StructuredParameters } from '../model/processor.js'
import { Container } from '../model/container.js';
import assert from 'assert';

export class Pipe<T> extends CommandNameProcessor
{
    public handle(command: string, param: StructuredParameters): MiddlewarePromise
    {
        if (!this.container)
            assert.fail('container is undefined');
        else
            throw this.container.dispatch(command, param);
    }

    constructor(container: Container<T>)
    {
        super('pipe', container);
    }
}