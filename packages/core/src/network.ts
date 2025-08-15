import type { EventBus, SpecialEvents } from "./events/event-bus.js";
import type { IEvent } from "./events/shared.js";
import type { IsomorphicBuffer } from "./helpers.js";

export interface SocketAdapterEventMap
{
    message: string | IsomorphicBuffer;
    open: Event;
    error: Event;
    close: CloseEvent;
}

export type SocketAdapterAkalaEventMap = { [key in keyof SocketAdapterEventMap]: IEvent<[SocketAdapterEventMap[key]], void> }

export interface SocketAdapter extends EventBus<SocketAdapterAkalaEventMap & Partial<SpecialEvents>>
{
    readonly open: boolean;
    close(): Promise<void>;
    send(data: string | IsomorphicBuffer): void;
    pipe(socket: SocketAdapter): void;
}
