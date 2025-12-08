import ErrorWithStatus, { HttpStatusCode } from "../errorWithStatus.js";
import { IsomorphicBuffer } from "../helpers.js";
import { SocketProtocolTransformer } from "./shared.transformer.js";

/**
 * Error thrown when a message is incomplete and cannot be processed.
 * Used by protocol adapters to indicate that more data is needed to complete the message.
 */

export class IncompleteMessageError<TTarget, TSource = string | IsomorphicBuffer> extends Error
{
    constructor(public readonly transformedMessages: TTarget[], public readonly remainingPart: TSource[])
    {
        super();
    }
}
/**
 * Protocol adapter that buffers incomplete messages until they are complete.
 * Extends SocketProtocolAdapter to handle fragmented messages by accumulating
 * data until a complete message can be processed.
 * @template T The type of messages after transformation
 */

export function LongMessageProtocolTransformer<T, U extends string | IsomorphicBuffer>(transform: SocketProtocolTransformer<T, U[]>)
    : SocketProtocolTransformer<T, U>
{
    const buffer: U[] = [];

    return {
        receive: (data, self) =>
        {
            try
            {
                buffer.push(data);
                const result = transform.receive(buffer, self);
                buffer.length = 0;
                return result;
            }
            catch (e)
            {
                if (e instanceof IncompleteMessageError)
                {
                    buffer.splice(0, buffer.length, ...e.remainingPart);
                    return e.transformedMessages;
                }
                else if ((e.statusCode as HttpStatusCode) == HttpStatusCode.PartialContent)
                {
                    buffer.push(data as any);
                    return [];
                }
            }
        },
        send(data, self): U
        {
            const chunks = transform.send(data, self);
            if (!chunks.length)
                return undefined;
            if (chunks.length == 1)
                return chunks[0] as U;
            if (chunks.length > 1)
            {

                let stringCount: number = 0;
                let bufferCount: number = 0;

                for (const chunk of chunks)
                {
                    if (typeof chunk == 'string')
                        stringCount++;
                    else if (chunk instanceof IsomorphicBuffer)
                        bufferCount++;
                    else
                        throw new ErrorWithStatus(HttpStatusCode.BadRequest, 'Expected a string or IsomorphicBuffer, but got ' + typeof chunk);
                }

                if (bufferCount == chunks.length)
                    return IsomorphicBuffer.concat(chunks as IsomorphicBuffer[]) as U;
                if (stringCount == chunks.length)
                    return chunks.reduce((previous, current) => previous + current, '') as U;

                if (stringCount > bufferCount)
                    return chunks.reduce((previous, current) => previous + (typeof current == 'string' ? current : current.toString('utf8')), '') as U;
                else if (bufferCount == chunks.length)
                    return IsomorphicBuffer.concat(chunks as IsomorphicBuffer[]).toString('utf-8') as U;
                else
                    return IsomorphicBuffer.concat(chunks.map(chunk => typeof chunk == 'string' ? IsomorphicBuffer.from(chunk) : chunk as IsomorphicBuffer)) as U;

            }
        },
        close: transform.close?.bind(transform)
    };
}
