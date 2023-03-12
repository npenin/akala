import { SocketAdapter } from "@akala/json-rpc-ws";
import EventEmitter from "events";
import { Readable } from "stream";

export interface Runtime
{
    build(args: string[], options: { new?: boolean, name: string, keepAttached?: boolean, inspect?: boolean, verbose?: boolean, wait?: boolean }): RuntimeInstance;
}

export interface RuntimeInstance extends EventEmitter
{
    stop(): Promise<number>;
    get adapter(): SocketAdapter;

    get stderr(): Readable;
    get stdout(): Readable;

    get running(): boolean;

    on(event: 'runningChanged', handler: () => void): this
    on(event: 'exit', handler: () => void): this
}