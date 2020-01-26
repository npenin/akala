import { Trigger } from '../trigger'
import { Container } from '../container';
import debug from 'debug'
import assert from 'assert'
import { Connection } from '@akala/json-rpc-ws';


export var trigger = new Trigger('jsonrpc', function register<T>(container: Container<T>, media: Connection)
{
    assert.ok(media instanceof Connection, 'to be attached, the media must be an instance of @akala/json-rpc-ws.Connection');
    const log = debug('akala:commands:jsonrpcws:' + container.name)

    if (!media.parent.getHandler)
        media.parent.getHandler = function (method: string)
        {
            return function (params, reply)
            {
                container.dispatch(method, Object.assign(params ?? { param: [] }, { _trigger: trigger.name })).then((result: any) =>
                {
                    reply(null, result);
                }, (error: any) =>
                {
                    log(error);
                    reply(error);
                });
            }
        }
})

