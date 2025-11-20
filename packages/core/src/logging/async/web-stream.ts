import { MiddlewareResult } from '../../middlewares/shared.js';
import { ILogMiddlewareAsync, LogLevels } from '../shared.js';


export function webStream(stream: WritableStreamDefaultWriter): ILogMiddlewareAsync
{
    let shouldHandle = false;
    stream.closed.then(() => shouldHandle = false);
    stream.ready.then(() => shouldHandle = true);

    return {
        handle(logLevel: LogLevels, namespaces: string[], ...obj: unknown[]): Promise<MiddlewareResult>
        {
            if (!shouldHandle)
                return Promise.resolve(undefined);
            const message = obj.map(o => typeof o === 'string' ? o : JSON.stringify(o)).join(' ');
            return stream.write(message).then(() => Promise.reject(), err => err);
        },
        shouldHandle(logLevel, namespaces)
        {
            return shouldHandle;
        },
    };
}

export default webStream;
