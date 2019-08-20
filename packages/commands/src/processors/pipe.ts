import { CommandProxy } from '../command';
import { Injector } from '@akala/core';
import { Processor } from '../processor'
import { Container } from '../container';
import assert = require('assert');

export class Pipe<T> extends Processor<T>
{
    public process(command: CommandProxy<any>, ...param: any[])
    {
        if (!this.container)
            assert.fail('container is undefined');
        else
            this.container.dispatch(command.name, ...param);
    }

    constructor(container: Container<T>)
    {
        super('pipe', container);
    }
}