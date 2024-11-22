import { UrlHandler } from "@akala/core";
import { ICommandProcessor, Metadata } from "./index.browser.js";
import { Container } from "./model/container.js";

// export default function getHandler(protocol: string, url: URL)
// {
//     const processors = getHandlers(protocol.substring(0, protocol.length - 1));
//     return processors.reduce((previous, current) =>
//     {
//         return previous.then(p => current(url, p))
//     }, Promise.resolve<ReturnType<handler<ICommandProcessor>>>(null))
// }

// export function getHandlers(protocol: string)
// {
//     const protocols = protocol.split('+');
//     const result = protocols.map(v => handlers[v]);
//     let x: number;
//     if ((x = result.findIndex(x => x === undefined)) !== -1)
//         throw new ErrorWithStatus(404, `No handler could be found for the protocol ${protocols[x]}`)
//     return result;
// }

export type HandlerResult<T> = { processor: T, getMetadata(): Promise<Metadata.Container> };
export type handler<T> = (arg1: URL, arg2: HandlerResult<T>) => Promise<void>

export const handlers = new UrlHandler<[URL, { signal: AbortSignal, container?: Container<unknown> }, Partial<HandlerResult<ICommandProcessor>>], HandlerResult<ICommandProcessor>>();

export type ServerHandler<T = { signal: AbortSignal }> = (container: Container<unknown>, options: T) => Promise<void>

export const serverHandlers = new UrlHandler<[URL, Container<unknown>, { signal: AbortSignal }, void], void>() as UrlHandler<[URL, Container<unknown>, { signal: AbortSignal }, void], void> & { useProtocol<U>(protocol: string, handler: (url: URL, container: Container<unknown>, options: U & { signal: AbortSignal }) => Promise<void>) };

export function parseQueryString(url: URL)
{
    return Object.fromEntries(Array.from(url.searchParams).map<[string, boolean | number | string]>(e =>
    {
        if (e[1].toLocaleLowerCase() in ['true', 'false'])
            return [e[0], e[1].toLocaleLowerCase() == 'true'];
        if (e[1].match(/^[\.\d]+$/))
            return [e[0], Number(e[1])];
        return [e[0], e[1]];
    }))
}
