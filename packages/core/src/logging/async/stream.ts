import { Writable } from 'node:stream';
import { ILogMiddlewareAsync, LogLevels } from '../shared.js';
import { MiddlewareResult } from '../../middlewares/shared.js';


export function stream(stream: Writable): ILogMiddlewareAsync
{
    return {
        async handle(logLevel: LogLevels, namespaces: string[], ...obj: unknown[]): Promise<MiddlewareResult>
        {
            const message = obj.map(o => typeof o === 'string' ? o : JSON.stringify(o)).join(' ');
            return new Promise((resolve, reject) => stream.write(message, (err) => err ? reject(err) : resolve(undefined)));
        }
    };
}

export default stream;
