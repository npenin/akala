import { Container } from "@akala/commands";
import { ChildProcess } from "child_process";
import { Deferred } from "@akala/json-rpc-ws";

export default interface State
{
    processes: RunningContainer[];
    isDaemon: boolean;
    config: {
        containers: { [key: string]: string[] }
        mapping: { [key: string]: { path: string, commandable: boolean, dependencies?: string[] } }
        save(): Promise<void>
        externals?: string[];
    }
}

export interface RunningContainer<T = any> extends Container<T>
{
    path: string;
    process: ChildProcess;
    running?: boolean;
    commandable?: boolean;
    ready?: Deferred<void>;
}