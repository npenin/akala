import type { IEvent, EventBus, SpecialEvents, SocketAdapter } from "@akala/core";
import { Readable } from "stream";

export interface Runtime
{
    name: string;
    build(args: string[], options: { new?: boolean, name: string, keepAttached?: boolean, inspect?: boolean, verbose?: boolean, wait?: boolean }): RuntimeInstance;
}

export interface RuntimeEventMap
{
    runningChanged: IEvent<[], void>;
    exit: IEvent<[number, NodeJS.Signals], void>;
}

export interface RuntimeInstance<T extends RuntimeEventMap = RuntimeEventMap> extends EventBus<T & Partial<SpecialEvents>>
{
    runtime: Omit<Runtime, 'build'>;
    stop(): Promise<number>;
    get adapter(): SocketAdapter;

    get stderr(): Readable;
    get stdout(): Readable;

    get running(): boolean;
}
