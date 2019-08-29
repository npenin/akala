import { CommandProxy } from '../command';
import { Injector } from '@akala/core';
import { Processor, CommandProcessor } from '../processor'
import { Container } from '../container';
import assert = require('assert');

export class Local<T> extends CommandProcessor<T>
{
    public static execute<T>(command: CommandProxy<T>, container: Container<T>, param: { param: any[], [key: string]: any }): any | PromiseLike<any>
    {
        if (!container)
            assert.fail('container is undefined');
        else
        {
            var injector = new Injector(container);
            Object.keys(param).forEach((key) => injector.register(key, param[key]));
            return injector.injectWithName<any>(command.inject || [], command.handler)(container.state);
        }
    }


    public process(command: CommandProxy, param: { param: any[], [key: string]: any }): any | PromiseLike<any>
    {
        if (!this.container)
            assert.fail('container is undefined');
        else
            Local.execute(command, this.container, param);
    }

    constructor(container: Container<T>)
    {
        super('local', container);
    }
}