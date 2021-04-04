import { Command } from '../model/command';
import { Injector, Injectable, each, MiddlewarePromise } from '@akala/core';
import * as  Metadata from '../metadata';
import { CommandProcessor, StructuredParameters } from '../model/processor'
import { Container } from '../model/container';
import assert = require('assert');

export class Local extends CommandProcessor
{
    public static execute<T>(cmd: Metadata.Command, command: Injectable<unknown>, container: Container<T>, param: StructuredParameters): unknown | PromiseLike<unknown>
    {
        if (!container)
            assert.fail('container is undefined');
        let inject = cmd.inject;
        const injector = new Injector(container);
        injector.register('$container', container);
        // console.log(param);
        if (param._trigger === 'proxy')
            inject = undefined;
        if (param._trigger && cmd.config && cmd.config[param._trigger] && cmd.config[param._trigger]?.inject)
            inject = cmd.config[param._trigger]?.inject;
        each(Object.getOwnPropertyDescriptors(param), ((descriptor, key) => injector.registerDescriptor(key, descriptor)));
        injector.register('$param', param);
        if (!inject)
            inject = param.param.map((a, i) => 'param.' + i);
        // console.log(inject);
        return injector.injectWithName(inject, command)(container.state);
    }


    public handle(command: Command, param: StructuredParameters): MiddlewarePromise
    {
        if (!this.container)
            assert.fail('container is undefined');
        else
            return new Promise((resolve, reject) =>
            {
                try
                {
                    reject(Local.execute<unknown>(command, command.handler, this.container, param));
                }
                catch (e)
                {
                    resolve(e);
                }
            })
    }

    constructor(container: Container<unknown>)
    {
        super('local', container);
    }
}