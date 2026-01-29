import { MiddlewareResult } from '../../middlewares/shared.js';
import { ILogMiddlewareAsync, LogLevels } from '../shared.js';


export function webStream(stream: WritableStreamDefaultWriter): ILogMiddlewareAsync
{
    let isReady = false;
    stream.closed.then(() => isReady = false);
    stream.ready.then(() => isReady = true);

    return {
        async handle(logLevel: LogLevels, namespaces: string[], ...obj: unknown[]): Promise<MiddlewareResult>
        {
            if (!isReady)
                return undefined;
            const message = obj.map(o => typeof o === 'string' ? o : JSON.stringify(o)).join(' ');
            try
            {
                await stream.write(message);
                return undefined;
            }
            catch (err)
            {
                // Rethrow by not catching
                throw new Error('Failed to write to stream', { cause: err });
            }
        }
    };
}

export default webStream;
