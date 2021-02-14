import { Container, Metadata, NetSocketAdapter, Processors, registerCommands, ServeMetadata } from "@akala/commands";
import { Socket } from "net";
import { module } from "@akala/core";

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

export function connect(name: string): Promise<ServeMetadata>
{
    return module('@akala/pm').injectWithName(['container'], function (container: Container<void>)
    {
        return container.dispatch('connect', name)
    })();
}

