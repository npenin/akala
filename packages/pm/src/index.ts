import { connectByPreference, Container, Metadata, NetSocketAdapter, Processors, registerCommands, ServeMetadata, ConnectionPreference } from "@akala/commands";
import { Socket } from "net";
import { module } from "@akala/core";

import pmContainer from './container';

export { pmContainer as Container };

export class InteractError extends Error
{
    public readonly code = 'INTERACT';

    constructor(message: string, public as?: string)
    {
        super(message);
    }

    public toJSON()
    {
        return { code: this.code, message: this.message, as: this.as };
    }
}

export default function interact(message: string, as?: string)
{
    throw new InteractError(message, as);
}

export async function pm(socketPath?: string): Promise<Container<any>>
{
    if (socketPath)
    {
        var pmSocket = new Socket();
        var pm = new Container('pm', null, new Processors.JsonRpc(Processors.JsonRpc.getConnection(new NetSocketAdapter(pmSocket)), true));
        pmSocket.connect(socketPath);
        var metaContainer: Metadata.Container = await pm.processor.process('$metadata', { param: [] });
        registerCommands(metaContainer.commands, pm.processor, pm);
        return pm;
    }
    return new Container('pm', {});
}

export function connect(name: string): Promise<{ connect: ServeMetadata, container: Metadata.Container }>
{
    return module('@akala/pm').injectWithName(['container'], async function (container: Container<void>)
    {
        return { connect: await container.dispatch('connect', name) as ServeMetadata, container: await container.dispatch(name + '.$metadata') };
    })();
}

const defaultOrders: (keyof ServeMetadata)[] = ['ssocket', 'socket', 'wss', 'ws'];

export function sidecar<T extends SidecarMap>(options?: Omit<ConnectionPreference, 'container'> & { [key in keyof T]?: Partial<ConnectionPreference> & { orders?: (keyof ServeMetadata)[] } }, noCache?: boolean): Sidecar<T>
{
    return new Proxy<Sidecar<T>>({} as any, {
        get(target, property, receiver)
        {
            if (typeof (property) !== 'string')
                return Reflect.get(target, property);

            var orders = options && options[property] && options[property].orders || defaultOrders;

            if (noCache || typeof (target[property]) == 'undefined')
                Object.defineProperty(target, property, { value: connect(property).then(meta => connectByPreference(meta.connect, Object.assign({ container: meta.container }, options, options[property]), ...orders).then(c => c.container)) });
            return target[property];
        }
    });
}

export type Sidecar<T extends SidecarMap> = { [key in keyof T]: Promise<T[key]> };

export interface SidecarMap
{
    [key: string]: Container<void>;
    pm: pmContainer & Container<void>
}