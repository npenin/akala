import { CommandProxy } from '../command';
import { Injector, Injectable } from '@akala/core';
import { Processor, CommandProcessor } from '../processor'
import { Container } from '../container';
import assert = require('assert');

export class Local<T> extends CommandProcessor<T>
{
    public static execute<T>(inject: undefined | string[], command: Injectable<any>, container: Container<T>, param: { param: any[], [key: string]: any }): any | PromiseLike<any>
    {
        if (!container)
            assert.fail('container is undefined');
        else
        {
            var injector = new Injector(container);
            Object.keys(param).forEach((key) => injector.register(key, param[key]));
            return injector.injectWithName(inject || [], command)(container.state);
        }
    }


    public process(command: CommandProxy, param: { param: any[], [key: string]: any }): any | PromiseLike<any>
    {
        if (!this.container)
            assert.fail('container is undefined');
        else
            Local.execute(command.inject, command.handler, this.container, param);
    }

    constructor(container: Container<T>)
    {
        super('local', container);
    }
}