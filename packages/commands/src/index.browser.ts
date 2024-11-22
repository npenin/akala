export * from './model/command.js'
export * from './model/container.js'
export * from './decorators.js'
export * from './generator.js'
export * from './model/trigger.js'
export * from './model/processor.js'
export * from './model/error-unknowncommand.js'
import * as Processors from './processors/index.browser.js'
import * as Metadata from './metadata/index.js'
import { ServeMetadata, connectByPreference, connectWith, ConnectionPreference } from './serve-metadata.browser.js'
import { CommandProcessor } from './model/processor.js'
export { Processors, Metadata }
export { ServeMetadata, connectByPreference, connectWith, ConnectionPreference };
import $metadata from './commands/$metadata.js'
import { handlers } from './protocol-handler.js'
import { Container } from './model/container.js'
import { registerCommands } from './generator.js'
import $metadataCmd from './commands/$metadata.js'
export { CommandProcessor };
export { $metadataCmd, $metadata };

export { ConfigurationMap } from './metadata/configurations.js'

export const Triggers = {};

export class Cli
{
    public static Metadata = $metadata;
}

export async function connect(socketPath: string | URL, signal: AbortSignal, resolvedMetadata?: Metadata.Container): Promise<Container<unknown>>
{
    const container = new Container('proxy', null);
    const { processor, getMetadata } = await handlers.process(new URL(socketPath), { signal, container }, {})

    const meta = resolvedMetadata || await getMetadata();
    container.name = meta.name;
    container.processor.useMiddleware(20, processor);

    registerCommands(meta.commands, null, container);
    return container;
}
