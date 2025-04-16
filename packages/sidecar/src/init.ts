import { Container as pm, ContainerLite, Sidecar as pmSidecar, sidecar as pmsidecar, meta as pmMeta } from '@akala/pm'
import { ProxyConfiguration } from '@akala/config'
import { connectByPreference, Container } from '@akala/commands'
import { SerializableDefinition, PersistenceEngine, providers, Store, StoreDefinition } from '@akala/storage'
import { EventBus, Serializable, eachAsync, eventBuses, module } from '@akala/core';
import { CliContext, OptionType } from '@akala/cli'

export interface PubSubConfiguration
{
    transport: string;
    transportOptions?: Serializable;
}

export interface StoreConfiguration
{
    provider: string
    providerOptions?: Serializable;
    models?: { [key: string]: SerializableDefinition<unknown> };
}

export interface Sidecar<T extends StoreDefinition = unknown>
{
    sidecars: pmSidecar;
    pubsub?: EventBus
    pm: Container<void> & pm;
    store?: StoreDefinition<T> & T;
}

export type SidecarPluginConfiguration = { sidecar: string, optional: true, command: string, parameters: Serializable }[]

export type SidecarConfiguration = { pubsub?: PubSubConfiguration, store?: StoreConfiguration, plugins?: SidecarPluginConfiguration };

export async function $init<T extends StoreDefinition>(context: CliContext<Record<string, OptionType>, ProxyConfiguration<SidecarConfiguration>>, remotePm?: string | (pm & Container<void>)): Promise<void>
{
    Object.assign(this, await app<T>(context, remotePm));
    context.logger.help('Your application is now ready !');
}

export default async function app<T extends StoreDefinition>(context: CliContext<Record<string, OptionType>, ProxyConfiguration<SidecarConfiguration>>, remotePm?: string | (pm & Container<void>)): Promise<Sidecar<T>>
{
    // if (typeof config == 'undefined')
    //     throw new Error('configuration is required');
    // if (typeof config == 'string')
    //     config = await Configuration.load(config);
    const sidecar: Sidecar<T> = {} as unknown as Sidecar<T>;
    const pubsubConfig = context.state.pubsub?.extract();
    const stateStoreConfig = context.state.store?.extract();

    context.logger.debug('connecting to pm...');
    if (typeof remotePm != 'string')
        sidecar.pm = remotePm;
    else
    {
        //eslint-disable-next-line @typescript-eslint/no-var-requires
        var result = await connectByPreference<void>(context.state.get('pm.mapping.pm.connect'), { host: remotePm, metadata: pmMeta })
        sidecar.pm = result.container as Container<void> & pm;
    }

    module('@akala/pm').register('container', sidecar.pm, true);
    sidecar.sidecars = pmsidecar();
    context.logger.info('connection established.');
    sidecar.pubsub = await eventBuses.process(new URL(pubsubConfig.transport), pubsubConfig.transportOptions);
    switch (typeof stateStoreConfig)
    {
        case 'string':
            await providers.process(stateStoreConfig || 'file://./').then(async (engine: PersistenceEngine<unknown>) =>
            {
                sidecar.store = Store.create<T>(engine);
            });
            break;
        case 'object':
            throw new Error('Unsupported configuration type')

        // if (Array.isArray(stateStoreConfig))
        // {
        //     const engines = await mapAsync(stateStoreConfig as StoreConfiguration[], async store => await providers.injectWithName([store.provider || 'file'], async (engine: PersistenceEngine<unknown>) =>
        //     {
        //         await engine.init(Object.assign({}, store.providerOptions, { path: context.currentWorkingDirectory }));
        //         return { engine, models: Object.entries(store.models).map(e => ({ definition: new ModelDefinition(e[0], e[1].nameInStorage, e[1].namespace), model: e[1] })).map(x => x.definition.fromJson(x.model)) };
        //     })(), true);
        //     const obj = {};
        //     engines.forEach(config => Object.keys(config.models).forEach(model => obj[model] = config.engine));
        //     sidecar.store = MultiStore.create(obj);
        // }
        // else
        //     await providers.injectWithName([stateStoreConfig.provider || 'file'], async (engine: PersistenceEngine<unknown>) =>
        //     {
        //         await engine.init(Object.assign({}, stateStoreConfig.providerOptions, { path: context.currentWorkingDirectory }));
        //         Object.entries(stateStoreConfig.models).map(e => ({ definition: new ModelDefinition(e[0], e[1].nameInStorage, e[1].namespace), model: e[1] })).forEach(x => x.definition.fromJson(x.model));
        //         sidecar.store = Store.create<T>(engine, ...Object.keys(stateStoreConfig.models) as (Exclude<keyof T, number | symbol>)[]);
        //     })();
        // break;
        case 'undefined':
            break;
        default:
            throw new Error('Unsupported configuration type')
    }

    const plugins = context.state.get<{ sidecar: string, optional: true, command: string, parameters: Serializable }[]>('plugins');
    if (plugins?.length)
    {
        const failedSidecars: string[] = [];

        await eachAsync(plugins, async (plugin) =>
        {
            if (failedSidecars.indexOf(plugin.sidecar) > -1)
                if (plugin.optional)
                    return;
                else
                    throw new Error(`No sidecar ${plugin.sidecar} is available`)
            let sidecarplugin: ContainerLite & Container<void>;
            try
            {
                sidecarplugin = await sidecar.sidecars[plugin.sidecar];
            }
            catch (e)
            {
                failedSidecars.push(plugin.sidecar);
                if (!plugin.optional)
                    throw e;
            }
            if (sidecarplugin)
                await sidecarplugin.dispatch(plugin.command, plugin.parameters);

        }, true);

        if (failedSidecars.length)
        {
            failedSidecars.forEach(sidecar => context.logger.warn(`${sidecar} could not be used. This application might behave inapropriately.`));
        }
    }


    return sidecar;
}
