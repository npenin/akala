import { connectByPreference, Container, Metadata, NetSocketAdapter, Processors, registerCommands, ServeMetadata, ConnectionPreference } from "@akala/commands";
import { Socket } from "net";
import { module } from "@akala/core";

import definition from './container.js';

type pmContainer = definition.container
export { pmContainer as Container };

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
        const metaContainer: Metadata.Container = await pm.processor.handle('$metadata', { param: [] }).then(err => { throw err }, res => res);
        registerCommands(metaContainer.commands, pm.processor, pm);
        return pm;
    }
    return new Container('pm', {});
}

export function connect(name: string): Promise<{ connect: ServeMetadata, container: Metadata.Container }>
{
    return module('@akala/pm').injectWithName(['container'], async function (container: Container<void>)
    {
        var metaContainer = await container.dispatch('$metadata', true) as Metadata.Container;

        return { connect: await container.dispatch('connect', name) as ServeMetadata, container: { name, commands: metaContainer.commands.filter(c => c.name.startsWith(name + '.')).map(c => ({ name: c.name.substring(name.length), inject: c.inject, config: c.config })) } };
    })();
}

const defaultOrders: (keyof ServeMetadata)[] = ['ssocket', 'socket', 'wss', 'ws'];

export function sidecar<T extends SidecarMap>(options?: Omit<ConnectionPreference, 'container'> & { [key in keyof T]?: Partial<ConnectionPreference> & { orders?: (keyof ServeMetadata)[] } }, noCache?: boolean): Sidecar<T>
{
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Proxy<Sidecar<T>>({} as any, {
        get(target, property)
        {
            if (typeof (property) !== 'string')
                return Reflect.get(target, property);

            const orders = options && options[property] && options[property].orders || defaultOrders;

            if (noCache || typeof (target[property]) == 'undefined')
                Object.defineProperty(target, property, {
                    value: connect(property).then(async meta => 
                    {
                        const c = await connectByPreference(meta.connect, Object.assign({ container: meta.container }, options, options && options[property]), ...orders);
                        return c.container;
                    })
                });
            return target[property];
        }
    });
}

export type Sidecar<T extends SidecarMap> = { [key in keyof T]: Promise<T[key]> };

export interface SidecarMap
{
    [key: string]: Promise<Container<void>>;
    pm: Promise<pmContainer & Container<void>>
}