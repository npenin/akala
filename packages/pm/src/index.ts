import { Container, Metadata, NetSocketAdapter, Processors, registerCommands, ServeMetadata, ConnectionPreference, Cli } from "@akala/commands";
import { Socket } from "net";
import { module } from "@akala/core";

import definition from './container';

type pmContainer = definition.container
export { pmContainer as Container };

import State from './state'
export { State }

export class InteractError extends Error
{
    public readonly code = 'INTERACT';

    constructor(message: string, public as?: string)
    {
        super(message);
    }

    public toJSON(): Record<string, unknown>
    {
        return { code: this.code, message: this.message, as: this.as };
    }
}

export default function interact(message: string, as?: string): void
{
    throw new InteractError(message, as);
}

export async function pm(socketPath?: string): Promise<Container<unknown>>
{
    if (socketPath)
    {
        const pmSocket = new Socket();
        const pm = new Container('pm', null, new Processors.JsonRpc(Processors.JsonRpc.getConnection(new NetSocketAdapter(pmSocket)), true));
        pmSocket.connect(socketPath);
        const metaContainer: Metadata.Container = await pm.handle(pm, Cli.Metadata, { param: [] }).then(err => { throw err }, res => res);
        registerCommands(metaContainer.commands, null, pm);
        return pm;
    }
    return new Container('pm', {});
}

export async function connect(name: string, container?: pmContainer & Container<void>): Promise<{ connect: Promise<ServeMetadata>, container: Metadata.Container }>
{
    container = container || module('@akala/pm').resolve('container');
    if (name === 'pm')
    {
        const metaContainer = await container.dispatch('$metadata') as Metadata.Container;
        return { connect: container.dispatch('connect', name) as Promise<ServeMetadata>, container: metaContainer };
    }
    const metaContainer = await container.dispatch('$metadata', true) as Metadata.Container;

    return { connect: container.dispatch('connect', name) as Promise<ServeMetadata>, container: { name, commands: metaContainer.commands.filter(c => c.name.startsWith(name + '.')).map(c => ({ name: c.name.substring(name.length + 1), config: c.config })) } };
}

export const defaultOrders: (keyof ServeMetadata)[] = ['ssocket', 'socket', 'wss', 'ws'];

export type SideCarConnectionPreference = { [key in keyof SidecarMap]?: Partial<ConnectionPreference> & { orders?: (keyof ServeMetadata)[] } };

export interface ContainerLite
{
    dispatch(cmd: string, ...args: unknown[]): Promise<unknown>;
}

export type Sidecar = { [key in keyof SidecarMap]: Promise<SidecarMap[key] & Container<void>> };

export interface SidecarMap
{
    [key: string]: ContainerLite;
    pm: pmContainer
}


import getRandomName from './commands/name';
import sidecarSingleton, { sidecar } from "./sidecar";
export { sidecar, sidecarSingleton };
export { getRandomName };