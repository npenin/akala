import ErrorWithStatus, { HttpStatusCode } from "../errorWithStatus.js";
import type { SerializableObject } from "../helpers.js";
import { UrlHandler } from "../url-handler.js";
import { type AsyncEventBus, type EventBus, EventBus2AsyncEventBus, type EventMap } from "./event-bus.js";
import { EventEmitter } from "./event-emitter.js";
import type { IEvent } from "./shared.js";

export * from "./async.js";
export * from './event-bus.js'
export * from './shared.js'
export * from './event-emitter.js'

export const eventBuses = new UrlHandler(true) as UrlHandler<[url: URL, config: SerializableObject & { abort?: AbortSignal }, void], EventBus> & { process<TEvents extends EventMap<TEvents> = Record<PropertyKey, IEvent<unknown[], unknown>>>(url: URL, config: SerializableObject): Promise<EventBus<TEvents>> };
export const asyncEventBuses = new UrlHandler(true) as UrlHandler<[url: URL, config: SerializableObject & { abort?: AbortSignal }, void], AsyncEventBus> & { process<TEvents extends EventMap<TEvents> = Record<PropertyKey, IEvent<unknown[], unknown>>>(url: URL, config: SerializableObject): Promise<AsyncEventBus<TEvents>> };

eventBuses.useProtocol('memory', (_, config) =>
{
    return Promise.resolve(new EventEmitter(null, config?.abort) as any);
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
