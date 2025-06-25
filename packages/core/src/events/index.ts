import ErrorWithStatus, { HttpStatusCode } from "../errorWithStatus.js";
import { SerializableObject } from "../helpers.js";
import { UrlHandler } from "../url-handler.js";
import { AsyncEventBus, EventBus, EventBus2AsyncEventBus } from "./event-bus.js";
import { EventEmitter } from "./event-emitter.js";

export * from "./async.js";
export * from './event-bus.js'
export * from './shared.js'
export * from './event-emitter.js'

export const eventBuses = new UrlHandler<[url: URL, config: SerializableObject & { abort?: AbortSignal }, void], EventBus>();
export const asyncEventBuses = new UrlHandler<[url: URL, config: SerializableObject & { abort?: AbortSignal }, void], AsyncEventBus>();

eventBuses.useProtocol('memory', (_, config) =>
{
    const result = new EventEmitter();
    config?.abort?.addEventListener('abort', () => result[Symbol.dispose]());
    return Promise.resolve(result);
})

asyncEventBuses.protocol.useMiddleware({
    async handle(url, config) 
    {
        try
        {
            const error = await handle.call(eventBuses, url, config);
            if (error instanceof ErrorWithStatus && error?.statusCode == HttpStatusCode.NotFound)
                return undefined;
            return error;
        }
        catch (eventBus)
        {
            if (eventBus)
                throw new EventBus2AsyncEventBus(eventBus);
        }
    }
})

const handle = eventBuses.handle;
eventBuses.handle = async function (url, config)
{
    const result = await handle.call(this, url, config);
    if (result === undefined)
        return new Error(`Unsupported URL mechanism (${url})`)
}
