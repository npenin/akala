import { Container } from "@akala/commands";
import { ChildProcess } from "child_process";
import { Deferred, SerializableObject, SocketAdapter } from "@akala/json-rpc-ws";
import { ServeMetadata } from "@akala/commands";
import { ProxyConfiguration } from "@akala/config";

export default interface State
{
    processes: { [key: string]: RunningContainer };
    isDaemon: boolean;
    config: ProxyConfiguration<StateConfiguration>
    bridges: { [key: string]: { left: SocketAdapter, right?: SocketAdapter } }
}

export interface StateConfiguration 
{
    containers: { [key: string]: SidecarMetadata }
    mapping: { [key: string]: SidecarConfiguration }
}

export interface SidecarMetadata
{
    path: string;
    dependencies?: string[];
    commandable: boolean;
    type?: 'nodejs';
}

export interface SidecarConfiguration<T extends string | SerializableObject = SerializableObject>
{
    cli?: string[];
    container: string;
    connect?: ServeMetadata;
    cwd?: string;
    config?: T;
}

//eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface RunningContainer<T extends string | SerializableObject = any> extends Container<unknown>, SidecarConfiguration<T>, SidecarMetadata
{
    process: ChildProcess;
    running?: boolean;
    ready?: Deferred<void>;
}