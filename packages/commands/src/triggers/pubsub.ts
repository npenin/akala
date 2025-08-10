import * as Metadata from '../metadata/index.js'
import { Trigger } from '../model/trigger.js';
import { type AsyncEventBus, type EventBus } from '@akala/core';
import { Container } from '../model/container.js'

declare module '@akala/commands'
{
    export interface ConfigurationMap
    {
        pubsub: PubSubConfiguration;
    }
}

export interface PubSubConfiguration extends Metadata.Configuration
{
    topic: string;
}


export function registerCommand<TState>(cmd: Metadata.Command, c: Container<TState>, pubsub: EventBus)
{
    if (cmd.config?.pubsub)
    {
        pubsub.on(cmd.config.pubsub.topic, args =>
        {
            return c.handle(c, cmd.name, {
                params: args,
                _trigger: 'pubsub'
            });
        });
    }
}

export async function registerAsyncCommand<TState>(cmd: Metadata.Command, c: Container<TState>, pubsub: AsyncEventBus)
{
    if (cmd.config?.pubsub)
    {
        await pubsub.on(cmd.config.pubsub.topic, args =>
        {
            return c.handle(c, cmd.name, {
                params: args,
                _trigger: 'pubsub'
            });
        });
    }
}

export const asyncTrigger = new Trigger('pubsub-async', async (c, pubsub: AsyncEventBus) =>
{
    const meta: Metadata.Container = await c.dispatch('$metadata', true);
    return Promise.all([...meta.commands, c.resolve('$metadata')].map(cmd => registerAsyncCommand(cmd, c, pubsub)));
});


export const syncTrigger = new Trigger('pubsub', async (c, pubsub: EventBus) =>
{
    const meta: Metadata.Container = await c.dispatch('$metadata', true);
    return [...meta.commands, c.resolve('$metadata')].forEach(cmd => registerCommand(cmd, c, pubsub));
});
