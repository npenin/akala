import { Writable } from 'stream';
import { ILogMiddlewareAsync, LogLevels } from '../shared.js';
import { MiddlewareResult } from '../../middlewares/shared.js';


export function stream(stream: Writable): ILogMiddlewareAsync
{
    return {
        handle(logLevel: LogLevels, namespaces: string[], ...obj: unknown[]): Promise<MiddlewareResult>
        {
            const message = obj.map(o => typeof o === 'string' ? o : JSON.stringify(o)).join(' ');
            return new Promise((resolve, reject) => stream.write(message, (err) => err ? resolve(err) : reject()));
        },
        shouldHandle: function (logLevel: LogLevels, namespaces: string[]): boolean
        {
            return !stream.closed && stream.writable;
        }
    };
}

export default stream;
