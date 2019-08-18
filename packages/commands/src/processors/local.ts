import { CommandProxy } from '../command';
import { Injector } from '@akala/core';
import { Processor } from '../processor'
import { Container } from '../container';

export class Local<T> extends Processor
{
    public process(command: CommandProxy<any>, ...param: any[])
    {
        var injector = new Injector(this.container)
        injector.register('param', param);

        return injector.injectWithName<any>(command.inject || [], command.handler)(this.container.state);
    }

    constructor(private container: Container<T>)
    {
        super('local');
    }
}