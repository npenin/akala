import { CommandProxy } from '../command';
import { Injector } from '@akala/core';
import { Processor, CommandProcessor } from '../processor'
import { Container } from '../container';
import assert = require('assert');

export class Local<T> extends CommandProcessor<T>
{
    public process(command: CommandProxy, param: { param: any[], [key: string]: any }): any | PromiseLike<any>
    {
        if (!this.container)
            assert.fail('container is undefined');
        else
        {
            var injector = new Injector(this.container);
            Object.keys(param).forEach((key) => injector.register(key, param[key]));
            return injector.injectWithName<any>(command.inject || [], command.handler)(this.container.state);
        }
    }

    constructor(container: Container<T>)
    {
        super('local', container);
    }
}