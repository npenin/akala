import { MiddlewareAsync, MiddlewarePromise, NotHandled } from "@akala/core";
import accept from 'accepts'
import { Response } from './shared.js';

export class MimeMiddleware<T extends [{ accepts: accept.Accepts, isLocal: boolean }, Response, unknown]> implements MiddlewareAsync<T>
{
    constructor(private readonly types: string[], private readonly serialize: (content: T[2]) => BufferSource | string, private readonly options?: { showErrorDetails?: true | false | 'local' })
    {
        if (!this.options)
            this.options = {};
        if (typeof (this.options.showErrorDetails) === 'undefined')
            this.options.showErrorDetails = 'local';
    }

    handle(...context: T): MiddlewarePromise
    {
        const contentType = context[0].accepts.type(this.types);
        if (!contentType)
            return NotHandled;
        try
        {
            const serialized = this.serialize(context[2]);
            context[1].writeHead(200, 'OK', { contentType, contentLength: typeof serialized == 'string' ? serialized.length : serialized.byteLength });
            return new Promise((_, reject) => context[1].end(serialized, reject));
        }
        catch (e)
        {
            return e;
        }
    }

    handleError?(error: Error, ...context: T): MiddlewarePromise
    {
        const contentType = context[0].accepts.type(this.types);
        if (!contentType)
            return NotHandled;
        if (!this.options.showErrorDetails || this.options.showErrorDetails === 'local' && !context[0].isLocal)
        {
            context[1].writeHead(500, 'OK', { contentType, contentLength: error.message.length });
            context[1].end(error.message);
        }
        else
        {
            const serialized = error.toString();
            context[1].writeHead(500, 'OK', { contentType, contentLength: serialized.length });
            context[1].end(serialized);
        }
        return Promise.reject();
    }

}
