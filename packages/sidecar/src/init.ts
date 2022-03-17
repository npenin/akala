import { connect, Container as pm } from '@akala/pm'
import Configuration from '@akala/config'
import { connectByPreference, Container, helper } from '@akala/commands'
import PubSubContainer, { ContainerProxy as PubSubProxy } from '@akala/pubsub'
import { PersistenceEngine, providers, Store, StoreDefinition } from '@akala/storage'
import MetaPubSub from '@akala/pubsub/commands.json'
import os from 'os'
import path from 'path'
import { Serializable } from '@akala/json-rpc-ws'
import { Logger } from '@akala/core';

export interface PubSubConfiguration
{
    transport: string;
    transportOptions?: Serializable;
}

export interface StoreConfiguration
{
    provider: string
    providerOptions?: Serializable;
}

export interface Sidecar<T extends StoreDefinition = any>
{
    pubsub?: PubSubProxy
    pm: Container<void> & pm;
    store?: Store<T> & T;
}

export type SidecarConfiguration = string | { name: string, program: string };

export default async function <T extends StoreDefinition>(logger: Logger, config: Configuration | string, remotePm?: string | (pm & Container<void>)): Promise<Sidecar<T>>
{
    if (typeof config == 'undefined')
        throw new Error('configuration is required');
    if (typeof config == 'string')
        config = await Configuration.load(config);
    const sidecar: Sidecar<T> = {} as any;
    const pubsubConfig = config.get<string | PubSubConfiguration>('pubsub');
    const stateStoreConfig = config.get<StoreConfiguration>('store');
    logger.debug('connecting to pm...');
    if (typeof remotePm != 'string' && typeof remotePm != 'number')
        sidecar.pm = remotePm;
    else
    {
        var result = await connectByPreference<void>(require(path.join(os.homedir(), './pm.config.json')).mapping.pm.connect, { host: remotePm, metadata: await import('@akala/pm/commands.json') })
        sidecar.pm = result.container as any;
    }
    logger.info('connection established.');
    var pubSubContainer: PubSubContainer;
    switch (typeof pubsubConfig)
    {
        case 'string':
            switch (pubsubConfig)
            {
                case 'default':
                    pubSubContainer = new PubSubContainer('pubsub');
                    break;
                case 'in-memory':
                    pubSubContainer = new PubSubContainer('pubsub');
                    break;
                default:
                    var tmp = await connect(pubsubConfig);
                    pubSubContainer = (await connectByPreference(tmp.connect, { metadata: MetaPubSub })).container as PubSubContainer;
                    break;
            }
            sidecar.pubsub = helper<PubSubProxy>(pubSubContainer, MetaPubSub)
            break;
        case 'object':
            pubSubContainer = new PubSubContainer('pubsub');
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
            await providers.injectWithName([stateStoreConfig || 'file'], async (engine: PersistenceEngine<any>) =>
            {
                await engine.init(null)
                sidecar.store = Store.create<T>(engine);
            })();
            break;
        case 'object':
            await providers.injectWithName([stateStoreConfig.provider || 'file'], async (engine: PersistenceEngine<any>) =>
            {
                await engine.init(stateStoreConfig.providerOptions)
                sidecar.store = Store.create<T>(engine);
            })();
            break;
        case 'undefined':
            break;
        default:
            throw new Error('Not support configuration type')
    }

    logger.help('Your application is now ready !');

    return sidecar;
}