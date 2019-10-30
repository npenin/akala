import { Trigger } from '../trigger'
import { Container } from '../container';
import split2 from 'split2'
import { Readable } from 'stream';


export var trigger = new Trigger('stream', function register<T>(container: Container<T>, media: Readable)
{
    if (media.listenerCount('data') == 0)
    {
        media.pipe(split2(JSON.parse)).on('data', function (payload: { command: string, param: any })
        {
            container.dispatch(payload.command, Object.assign(payload.param ?? {}, { _trigger: trigger.name }));
        });
    }
})

