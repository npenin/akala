import { Container } from "@akala/commands";
import { Event, SerializableObject } from "@akala/core";
import { SocketAdapter } from "@akala/json-rpc-ws";
import { ProxyConfiguration } from "@akala/config";
import { RuntimeInstance } from "./runtimes/shared.js";

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
    plugins: string[];
    setup: { packages: string[] };
}

export interface SidecarMetadata
{
    path: string;
    stateless: boolean;
    dependencies?: string[];
    commandable: boolean;
    type?: 'nodejs' | 'worker';
}

export interface SidecarConfiguration<T extends string | SerializableObject = SerializableObject>
{
    cli?: string[];
    container: string;
    connect?: Record<string, object>;
    cwd?: string;
    config?: T;
    autostart?: boolean
}

//eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface RunningContainer<T extends string | SerializableObject = any> extends Container<unknown>, SidecarConfiguration<T>, SidecarMetadata
{
    process: RuntimeInstance;
    running?: boolean;
    stateless: boolean;
    ready?: Event<[void]>;
}
