import { CommandProxy } from '../command';
import { Injector } from '@akala/core';
import { CommandNameProcessor } from '../processor'
import { Container } from '../container';
import assert = require('assert');

export class Pipe<T> extends CommandNameProcessor<T>
{
    public process(command: string, ...param: any[])
    {
        if (!this.container)
            assert.fail('container is undefined');
        else
            this.container.dispatch(command, ...param);
    }

    constructor(container: Container<T>)
    {
        super('pipe', container);
    }
}