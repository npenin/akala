import { CommandProxy, Command } from '../model/command';
import { Injector, Injectable } from '@akala/core';
import * as  Metadata from '../metadata';
import { CommandProcessor } from '../model/processor'
import { Container } from '../model/container';
import assert = require('assert');

export class Local<T> extends CommandProcessor<T>
{
    public static execute<T>(cmd: Metadata.Command, command: Injectable<any>, container: Container<T>, param: { param: any[], [key: string]: any }): any | PromiseLike<any>
    {
        if (!container)
            assert.fail('container is undefined');
        var inject = cmd.inject;
        var injector = new Injector(container);
        injector.register('container', container);

        if (param._trigger === 'proxy')
            inject = undefined;
        if (param._trigger && cmd.config && cmd.config[param._trigger] && cmd.config[param._trigger]?.inject)
            inject = cmd.config[param._trigger]?.inject;
        Object.keys(param).forEach((key) => injector.register(key, param[key]));
        injector.register('$param', param);
        if (!inject)
            inject = param.param.map((a, i) => 'param.' + i);
        return injector.injectWithName(inject, command)(container.state);
    }


    public process(command: Command<T>, param: { param: any[], [key: string]: any }): any | PromiseLike<any>
    {
        if (!this.container)
            assert.fail('container is undefined');
        else
            return Local.execute<T>(command, command.handler, this.container, param);
    }

    constructor(container: Container<T>)
    {
        super('local', container);
    }
}