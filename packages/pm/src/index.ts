import { Container, Metadata, ServeMetadata, ConnectionPreference } from "@akala/commands";
import { module } from "@akala/core";

export { spawnAsync } from './cli-helper.js'

import definition from './container.js';

type pmContainer = definition.container

export const meta = definition.meta;

export { pmContainer as Container, };

import State from './state.js'
export { State }

export default function interact(message: string, as?: string): void
{
    throw new InteractError(message, as);
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

export const defaultOrders: (keyof ServeMetadata)[] = ['jsonrpc+unix+tls', 'jsonrpc+unix', 'jsonrpc+unix+tls', 'jsonrpc+tcp+tls', 'jsonrpc+tcp', 'wss', 'ws', 'https', 'http'];

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


import getRandomName from './commands/name.js';
import sidecarSingleton, { sidecar } from "./sidecar.js";
import start from "./cli-commands/start.js";
import { InteractError } from "@akala/cli";
export { sidecar, sidecarSingleton };
export { getRandomName };
export { start };
