import { connect, Container as pm, ContainerLite, Sidecar as pmSidecar, sidecar as pmsidecar, meta as pmMeta } from '@akala/pm'
import { ProxyConfiguration } from '@akala/config'
import { connectByPreference, Container, helper } from '@akala/commands'
import { ContainerProxy as PubSubProxy } from '@akala/pubsub'
import { ModelDefinition, MultiStore, PersistenceEngine, providers, Store, StoreDefinition } from '@akala/storage'
import { Serializable, eachAsync, mapAsync, module } from '@akala/core';
import { SerializableDefinition } from '@akala/storage'
import { CliContext, OptionType } from '@akala/cli'
import { connect as pubsubConnect, meta as MetaPubSub, Container as PubSubContainer } from '@akala/pubsub'

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
    pubsub?: PubSubProxy
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
    var pubSubContainer: PubSubContainer & Container<void>;
    switch (typeof pubsubConfig)
    {
        case 'string':
            switch (pubsubConfig)
            {
                case 'default':
                    pubSubContainer = pubsubConnect();
                    break;
                case 'in-memory':
                    pubSubContainer = pubsubConnect();
                    break;
                default:
                    var tmp = await connect(pubsubConfig);
                    pubSubContainer = (await connectByPreference(await tmp.connect, { metadata: MetaPubSub })).container as PubSubContainer & Container<void>;
                    break;
            }
            sidecar.pubsub = helper<PubSubProxy>(pubSubContainer, MetaPubSub)
            break;
        case 'object':
            pubSubContainer = pubsubConnect();
            await pubSubContainer.attach(pubsubConfig.transport, pubsubConfig.transportOptions);
            sidecar.pubsub = helper<PubSubProxy>(pubSubContainer, MetaPubSub);
            break;
        case 'undefined':
            break;
        default:
            throw new Error('Not support configuration type')
    }
    switch (typeof stateStoreConfig)
    {
        case 'string':
            await providers.injectWithName([stateStoreConfig || 'file'], async (engine: PersistenceEngine<unknown>) =>
            {
                await engine.init(null)
                sidecar.store = Store.create<T>(engine);
            })();
            break;
        case 'object':
            if (Array.isArray(stateStoreConfig))
            {
                var engines = await mapAsync(stateStoreConfig as StoreConfiguration[], async store => await providers.injectWithName([store.provider || 'file'], async (engine: PersistenceEngine<unknown>) =>
                {
                    await engine.init(Object.assign({}, store.providerOptions, { path: context.currentWorkingDirectory }));
                    return { engine, models: Object.entries(store.models).map(e => ({ definition: new ModelDefinition(e[0], e[1].nameInStorage, e[1].namespace), model: e[1] })).map(x => x.definition.fromJson(x.model)) };
                })(), true);
                var obj = {};
                engines.forEach(config => Object.keys(config.models).forEach(model => obj[model] = config.engine));
                sidecar.store = MultiStore.create(obj);
            }
            else
                await providers.injectWithName([stateStoreConfig.provider || 'file'], async (engine: PersistenceEngine<unknown>) =>
                {
                    await engine.init(Object.assign({}, stateStoreConfig.providerOptions, { path: context.currentWorkingDirectory }));
                    Object.entries(stateStoreConfig.models).map(e => ({ definition: new ModelDefinition(e[0], e[1].nameInStorage, e[1].namespace), model: e[1] })).map(x => x.definition.fromJson(x.model));
                    sidecar.store = Store.create<T>(engine, ...Object.keys(stateStoreConfig.models) as (Exclude<keyof T, number | symbol>)[]);
                })();
            break;
        case 'undefined':
            break;
        default:
            throw new Error('Not support configuration type')
    }

    const plugins = context.state.get<{ sidecar: string, optional: true, command: string, parameters: Serializable }[]>('plugins');
    if (plugins && plugins.length)
    {
        var failedSidecars: string[] = [];

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