import { MiddlewarePromise } from '@akala/core';
import { CommandNameProcessor, StructuredParameters } from '../model/processor'
import { Container } from '../model/container';
import assert from 'assert';

export class Pipe<T> extends CommandNameProcessor
{
    public async handle(command: string, param: StructuredParameters): MiddlewarePromise
    {
        if (!this.container)
            assert.fail('container is undefined');
        else
        {
            try
            {
                var result = await this.container.dispatch(command, param);
                throw result;
            }
            catch (e)
            {
                return e;
            }
        }
    }

    constructor(container: Container<T>)
    {
        super('pipe', container);
    }
}