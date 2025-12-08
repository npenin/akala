import type { EventBus, SpecialEvents } from "../events/event-bus.js";
import type { IEvent } from "../events/shared.js";
import { IsomorphicBuffer } from "../helpers.js";

export interface SocketAdapterEventMap<T = string | IsomorphicBuffer> 
{
    message: T;
    open: Event;
    error: Event;
    close: CloseEvent;
}

export type SocketAdapterAkalaEventMap<T = string | IsomorphicBuffer> = { [key in keyof SocketAdapterEventMap<T>]: IEvent<[SocketAdapterEventMap<T>[key]], void> }

export interface SocketAdapter<T = string | IsomorphicBuffer> extends EventBus<SocketAdapterAkalaEventMap<T> & Partial<SpecialEvents>>
{
    readonly open: boolean;
    close(): Promise<void>;
    send(data: T): Promise<void>;
    pipe(socket: SocketAdapter<T>): void;
}

export * from './shared.long-message-protocol-transformer.js'
export * from './shared.transformer.js'
export * from './shared.socket-protocol-adapter.js'
export * from './shared.socket-transformer-with-connection-retry.js'
