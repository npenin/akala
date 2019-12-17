import { Trigger } from '../trigger'
import { Container } from '../container';
import { Readable, Writable } from 'stream';
import * as ws from 'ws';
import debug from 'debug'

const log = debug('akala:commands:jsonrpcws')

export var trigger = new Trigger('jsonrpcws', function register<T>(container: Container<T>, media: WebSocket)
{
    media.onmessage = async function (ev: MessageEvent & { data: { jsonrpc: string, id: number | string, method: string, params: any } })
    {
        log(ev.data);
        try
        {
            var result = await container.dispatch(ev.data.method, Object.assign(ev.data.params ?? { param: [] }, { _trigger: trigger.name }));
            if (media instanceof Writable)
            {
                media.send(JSON.stringify({ jsonrpc: ev.data.jsonrpc, result: result, id: ev.data.id }));
            }
        }
        catch (e)
        {
            if (media instanceof Writable)
            {
                log(e);
                media.send(JSON.stringify({ jsonrpc: '2.0', id: ev.data.id, error: { message: e.message, stackTrace: e.stackTrace, code: e.code } }))
            }
        }
    };
})

