import { module } from '@akala/core'
import { connectByPreference, ConnectionPreference, Container, updateCommands } from "@akala/commands";
import { SideCarConnectionPreference, Sidecar, defaultOrders, connect } from "./index.js";
import * as ac from '@akala/commands'
import pm from './container.js'

let instance: Sidecar;

export default function singleton(options?: { pm?: pm.container & Container<void>, container?: Container<unknown> } & (Omit<ConnectionPreference, 'metadata'> | SideCarConnectionPreference | Omit<ConnectionPreference, 'metadata'> & SideCarConnectionPreference), noCache?: boolean): Sidecar
{
    return instance || (instance = sidecar(options, noCache));
}

export function sidecar(options?: { pm?: pm.container & Container<void>, container?: Container<unknown> } & (Omit<ConnectionPreference, 'metadata'> | SideCarConnectionPreference | Omit<ConnectionPreference, 'metadata'> & SideCarConnectionPreference), noCache?: boolean): Sidecar
{
    if (!options)
        options = {};
    if (!options.pm)
        options.pm = module('@akala/pm').resolve('container');
    if (!options.pm)
        return null;
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
                    value: connect(property, options.pm).then(async (meta) =>
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
                                return await connect('pm', options.pm).then(async (meta) =>
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
