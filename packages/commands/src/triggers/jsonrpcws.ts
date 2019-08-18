import { Trigger } from '../trigger'
import { Container } from '../container';
import { Command } from '../command';
import { Injector, isPromiseLike } from '@akala/core';
import { Base } from '@akala/json-rpc-ws/lib/base';
import * as jsonrpcws from '@akala/json-rpc-ws'

function wrap<TState>(container: Container<TState>, c: Command<TState>)
{
    return function (param: jsonrpcws.SerializableObject[], reply: (error: any, response?: jsonrpcws.SerializableObject) => void)
    {
        if (!param)
            param = [];
        var result = container.dispatch(c.name, ...param)
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

