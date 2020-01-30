import { Trigger } from '../trigger'
import { Container } from '../container';
import debug from 'debug'
import { Connection, SocketAdapter } from '@akala/json-rpc-ws';


export var trigger = new Trigger('jsonrpc', function register<T>(container: Container<T>, media: SocketAdapter)
{
    // assert.ok(media instanceof ws.SocketAdapter, 'to be attached, the media must be an instance of @akala/json-rpc-ws.Connection');
    const log = debug('akala:commands:jsonrpcws:' + container.name)
    new Connection(media, {
        type: 'client', browser: false, getHandler(method: string)
        {
            return async function (params, reply)
            {
                try
                {
                    var result = await container.dispatch(method, Object.assign(params ?? { param: [] }, { _trigger: trigger.name }))
                    reply(null, result);
                }
                catch (error)
                {
                    log(error);
                    reply(error);
                }
            }
        },
        disconnected() { }
    });
})

