import { CommandProxy } from '../model/command';
import { Injector } from '@akala/core';
import { CommandNameProcessor } from '../model/processor'
import { Container } from '../model/container';
import assert = require('assert');

export class Pipe<T> extends CommandNameProcessor<T>
{
    public process(command: string, param: { param: any[], [key: string]: any }): any | PromiseLike<any>
    {
        if (!this.container)
            assert.fail('container is undefined');
        else
            return this.container.dispatch(command, param);
    }

    constructor(container: Container<T>)
    {
        super('pipe', container);
    }
}