import { connectByPreference, ConnectionPreference, updateCommands } from "@akala/commands";
import { SideCarConnectionPreference, Sidecar, defaultOrders, connect } from "./index";
import * as ac from '@akala/commands'

let instance: Sidecar;

export default function (options?: Omit<ConnectionPreference, 'metadata'> | SideCarConnectionPreference | Omit<ConnectionPreference, 'metadata'> & SideCarConnectionPreference, noCache?: boolean): Sidecar
{
    return instance || (instance = sidecar(options, noCache));
}

export function sidecar(options?: Omit<ConnectionPreference, 'metadata'> | SideCarConnectionPreference | Omit<ConnectionPreference, 'metadata'> & SideCarConnectionPreference, noCache?: boolean): Sidecar
{
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new Proxy<Sidecar>({} as any, {
        get(target, property)
        {
            if (typeof (property) !== 'string')
                return Reflect.get(target, property);

            const orders = options && options[property] && options[property].orders || defaultOrders;
            if (!options)
                options = {};
            if (typeof options.preferRemote == 'undefined')
                options.preferRemote = !process.connected;
            if (noCache || typeof (target[property]) == 'undefined')
                Object.defineProperty(target, property, {
                    value: connect(property).then(async (meta) =>
                    {
                        try
                        {
                            const c = await connectByPreference(await meta.connect, Object.assign({ metadata: meta.container }, options, options && options[property]), ...orders);
                            return c.container;
                        }
                        catch (e)
                        {
                            if (e && e.statusCode == 404 || !meta.connect)
                            {
                                return await connect('pm').then(async (meta) =>
                                {
                                    const c = await connectByPreference(await meta.connect, Object.assign({ metadata: meta.container }, options, options && options[property]), ...orders);
                                    await c.container.dispatch('proxy', property);
                                    c.container.unregister(ac.Cli.Metadata.name);
                                    c.container.register(Object.assign(ac.Metadata.extractCommandMetadata(ac.Cli.Metadata), { processor: c.processor }));
                                    updateCommands((await c.container.dispatch('$metadata', true)).commands, c.processor, c.container);
                                    return c.container;
                                });
                            }
                            throw e;
                        }
                    })
                });
            return target[property];
        }
    });
}
