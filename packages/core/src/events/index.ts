import { Serializable } from "../helpers.js";
import { UrlHandler } from "../url-handler.js";
import { EventBus } from "./event-bus.js";
import { EventEmitter } from "./event-emitter.js";

export * from "./async.js";
export * from './event-bus.js'
export * from './shared.js'
export * from './event-emitter.js'

export const eventBuses = new UrlHandler<[url: URL, config: Serializable, void], EventBus>();

eventBuses.useProtocol('memory', () =>
{
    return Promise.resolve(new EventEmitter());
})

const handle = eventBuses.handle;
eventBuses.handle = async function (url, config)
{
    const result = await handle.call(this, url, config);
    if (result === undefined)
        return new Error(`Unsupported URL mechanism (${url})`)
}
