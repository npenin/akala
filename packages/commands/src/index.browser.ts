export * from './model/command.js'
export * from './model/container.js'
export * from './decorators.js'
export * from './generator.js'
export * from './model/trigger.js'
export * from './model/processor.js'
export * from './model/error-unknowncommand.js'
import * as Processors from './processors/index.browser.js'
import * as Metadata from './metadata/index.js'
export * from './serve-metadata.js'
import serveMetadata, { ServeMetadata, connectByPreference, connectWith, ConnectionPreference } from './serve-metadata.browser.js'
export { ServeMetadata, connectByPreference, connectWith, ConnectionPreference, serveMetadata };
import { ConfigurationMap, Configurations, Configuration, GenericConfiguration, ExtendedConfigurations } from './metadata/index.js'

import { CommandProcessor } from './model/processor.js'
export { Processors, Metadata }
export { default as $metadata } from './commands/$metadata.js'
import { Container } from './model/container.js'
import { registerCommands } from './generator.js'
export { CommandProcessor };

export { ConfigurationMap, Configurations, Configuration, GenericConfiguration, ExtendedConfigurations }

import { protocolHandlers, HandlerResult, serverHandlers, ServerHandler } from './protocol-handler.js';
export { protocolHandlers, HandlerResult, serverHandlers, ServerHandler };

export const Triggers = {}

export async function connect(socketPath: string | URL, signal: AbortSignal, resolvedMetadata?: Metadata.Container, backChannelContainer?: Container<unknown>): Promise<Container<unknown>>
{
    const container = new Container('proxy', null);
    const { processor, getMetadata } = await protocolHandlers.process(new URL(socketPath), { signal, container: backChannelContainer }, {})

    const meta = resolvedMetadata || await getMetadata();
    container.name = meta.name;
    container.processor.useMiddleware(20, processor);

    registerCommands(meta.commands, null, container);
    return container;
}
