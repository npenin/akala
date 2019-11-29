import { Container } from "@akala/commands";
import { ChildProcess } from "child_process";

export default interface State
{
    processes: RunningContainer[];
    isDaemon: boolean;
    config: {
        containers: { [key: string]: string[] }
        mapping: { [key: string]: { path: string, commandable: boolean } }
        save(): Promise<void>
    }
}

export interface RunningContainer<T = any> extends Container<T>
{
    path: string;
    process: ChildProcess;
    running?: boolean;
    commandable?: boolean;
}