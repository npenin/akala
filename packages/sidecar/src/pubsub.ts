import { ProxyConfiguration } from "@akala/config";
import { AsyncEventBus, asyncEventBuses, EventMap, SerializableObject } from "@akala/core";

export interface PubSubConfiguration
{
    transport: string;
    transportOptions?: SerializableObject;
}

export async function pubsub<TEvents extends EventMap<TEvents>>(sidecar: { abort?: AbortSignal, config: ProxyConfiguration<{ pubsub?: PubSubConfiguration }>, pubsub?: AsyncEventBus<TEvents> }, config: PubSubConfiguration | undefined, abort: AbortSignal)
{
    let transport: URL;
    if (!sidecar.pubsub)
    {
        if (!config)
        {
            if (process.env.PUBSUB_URL)
                transport = new URL(process.env.PUBSUB_URL);
            else
                return;
        }
        else
            transport = new URL(config.transport);

        let password = config?.transportOptions?.password;
        if (typeof password === 'string')
        {
            if (!sidecar.config.pubsub)
                sidecar.config.set('pubsub', config)
            if (!sidecar.config.pubsub.transportOptions)
                sidecar.config.pubsub.set('transportOptions', config.transportOptions);
            await sidecar.config.pubsub.transportOptions.setSecret('password', password);
            await sidecar.config.commit();
        }
        else if (typeof password === 'object')
            password = await sidecar.config.pubsub.transportOptions.getSecret('password');

        if (transport)
            sidecar.pubsub = await asyncEventBuses.process<TEvents>(new URL(transport), Object.assign({ abort },
                config?.transportOptions,
                {
                    abort: sidecar.abort,
                    password
                }));
    }
}
