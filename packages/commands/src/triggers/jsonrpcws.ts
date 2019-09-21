import { Trigger } from '../trigger'
import { Container } from '../container';
import { Command } from '../command';
import { Injector, isPromiseLike } from '@akala/core';
import { Base } from '@akala/json-rpc-ws/lib/base';
import * as jsonrpcws from '@akala/json-rpc-ws'
import { JsonRpcWs as Processor } from '../processors';

function wrap<TState>(container: Container<TState>, c: Command<TState>)
{
    return function (this: jsonrpcws.Connection, param: jsonrpcws.PayloadDataType, reply: (error: any, response?: jsonrpcws.SerializableObject) => void)
    {
        if (!param)
            param = { param: [] };
        if (Array.isArray(param))
            param = { param: param };
        var self = this;
        var result = container.dispatch(c.name, Object.assign(param, { _trigger: 'jsonrpcws', connection: this, get connectionAsContainer() { return new Container('unknown', null, new Processor(self)) } }));
        if (isPromiseLike<jsonrpcws.SerializableObject>(result))
        {
            result.then(function (r: jsonrpcws.SerializableObject)
            {
                reply(null, r);
            }, function (err: jsonrpcws.SerializableObject)
                {
                    if (err instanceof Error)
                        reply(err.toString());
                    else
                        reply(err);
                });
        }
        else if (typeof result != 'undefined')
            reply(null, result);
        else
            reply(null);
    }
}

export var trigger = new Trigger('jsonrpcws', function register<T>(container: Container<T>, command: Command<T>, media: Base<jsonrpcws.Connection>)
{
    media.expose(command.name, wrap(container, command))
})

