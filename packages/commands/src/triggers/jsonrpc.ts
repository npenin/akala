import { Trigger } from '../trigger'
import { Container } from '../container';
import split2 from 'split2'
import { Readable, Writable } from 'stream';
import debug from 'debug'
import { JsonRPC } from '../processors';

const log = debug('akala:commands:jsonrpc')

export var trigger = new Trigger('jsonrpc', function register<T>(container: Container<T>, media: Readable)
{
    media.setEncoding('utf8');
    media.pipe(split2(JSON.parse)).on('data', async function (payload: { jsonrpc: string, id: number | string, method: string, params: any })
    {
        log(payload);
        try
        {
            var result = await container.dispatch(payload.method, Object.assign({}, {
                _trigger: trigger.name, get connectionAsContainer()
                {
                    if (media instanceof Writable)
                        return new Container('', null, new JsonRPC(media));
                }
            }, payload.params));
            if (media instanceof Writable)
            {
                media.write(JSON.stringify({ jsonrpc: payload.jsonrpc, result: result, id: payload.id }) + '\n')
            }
        }
        catch (e)
        {
            if (media instanceof Writable)
            {
                log(e);
                media.write(JSON.stringify({ jsonrpc: payload.jsonrpc, id: payload.id, error: { message: e.message, stack: e.stack, code: e.code } }) + '\n')
            }
        }
    });
})

