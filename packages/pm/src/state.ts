import { Container } from "@akala/commands";
import { ChildProcess } from "child_process";
import { Deferred } from "@akala/json-rpc-ws";
import { ServeMetadata } from "@akala/commands";

export default interface State
{
    processes: RunningContainer[];
    isDaemon: boolean;
    config: {
        containers: { [key: string]: string[] }
        mapping: { [key: string]: Pick<RunningContainer, 'path' | 'dependencies' | 'connect' | 'commandable'> }
        save(): Promise<void>
        externals?: string[];
    }
}

export interface RunningContainer extends Container<unknown>
{
    path: string;
    process: ChildProcess;
    dependencies?: string[];
    connect?: ServeMetadata;
    running?: boolean;
    commandable?: boolean;
    ready?: Deferred<void>;
}