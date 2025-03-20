import { IEvent, EventEmitter } from "@akala/core";
import { SocketAdapter } from "@akala/json-rpc-ws";
import { Readable } from "stream";

export interface Runtime
{
    build(args: string[], options: { new?: boolean, name: string, keepAttached?: boolean, inspect?: boolean, verbose?: boolean, wait?: boolean }): RuntimeInstance;
}

export type RuntimeEventMap = {
    runningChanged: IEvent<[], void>;
    exit: IEvent<[], void>;
}

export interface RuntimeInstance<T extends RuntimeEventMap = RuntimeEventMap> extends EventEmitter<T>
{
    stop(): Promise<number>;
    get adapter(): SocketAdapter;

    get stderr(): Readable;
    get stdout(): Readable;

    get running(): boolean;
}
