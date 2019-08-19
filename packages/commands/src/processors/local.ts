import { CommandProxy } from '../command';
import { Injector } from '@akala/core';
import { Processor } from '../processor'
import { Container } from '../container';
import assert = require('assert');

export class Local<T> extends Processor<T>
{
    public process(command: CommandProxy<any>, ...param: any[])
    {
        if (!this.container)
            assert.fail('container is undefined');
        else
        {
            var injector = new Injector(this.container)
            injector.register('param', param);

            return injector.injectWithName<any>(command.inject || [], command.handler)(this.container.state);
        }
    }

    constructor(container: Container<T>)
    {
        super('local', container);
    }
}