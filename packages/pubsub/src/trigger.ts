import { Metadata, Trigger } from "@akala/commands";
import commands from "./container.js";

type jsonObject = Metadata.jsonObject;

declare module '@akala/commands'
{
    export interface Configurations
    {
        pubsub?: jsonObject & PubSubConfiguration;
    }
}

export interface PubSubConfiguration extends Metadata.Configuration
{
    topic: string;
}

export const trigger = new Trigger('pubsub', async (container, pubsub: commands.container) =>
{
    var meta: Metadata.Container = await container.dispatch('$metadata', true);

    meta.commands.forEach(c =>
    {
        if (c.config.pubsub)
        {
            pubsub.dispatch('subscribe', container, c.config.pubsub.topic, c.name);
        }
    })
})