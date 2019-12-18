import { Trigger } from '../trigger'
import { Container } from '../container';
import { Readable, Writable } from 'stream';
import * as ws from 'ws';
import debug from 'debug'
import assert from 'assert'

const log = debug('akala:commands:jsonrpcws')

export var trigger = new Trigger('jsonrpcws', function register<T>(container: Container<T>, media: ws)
{
    assert.ok(media.addEventListener, 'to be attached, the media must be an instance having addEventListener');

    media.addEventListener('message', function (ev: { data: string }): void
    {
        log(ev.data);
        var data: { jsonrpc: string, id: number | string, method: string, params: any } = JSON.parse(ev.data);
        try
        {
            Promise.resolve(container.dispatch(data.method, Object.assign(data.params ?? { param: [] }, { _trigger: trigger.name }))).then((result: any) =>
            {
                media.send(JSON.stringify({ jsonrpc: data.jsonrpc, result: result || null, id: data.id }));
            }, (e: any) =>
            {
                log(e);
                media.send(JSON.stringify({ jsonrpc: '2.0', id: data.id, error: { message: e.message, stackTrace: e.stackTrace, code: e.code } }))
            });
        }
        catch (e)
        {
            log(e);
            media.send(JSON.stringify({ jsonrpc: '2.0', id: data.id, error: { message: e.message, stackTrace: e.stackTrace, code: e.code } }))
        }
    });
})

