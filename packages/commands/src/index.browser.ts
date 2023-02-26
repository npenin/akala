export * from './model/command.js'
export * from './model/container.js'
export * from './decorators.js'
export * from './generator.js'
export * from './model/trigger.js'
export * from './model/processor.js'
export * from './model/error-unknowncommand.js'
import * as Processors from './processors/index.js'
import * as Triggers from './triggers/index.js'
import * as Metadata from './metadata/index.js'
import serveMetadata, { ServeMetadata, ServeMetadataWithSignal, connectByPreference, connectWith, ConnectionPreference, parseMetadata } from './serve-metadata.js'
import { CommandProcessor } from './model/processor.js'
export { Processors, Triggers, Metadata }
export { default as serve, ServeOptions, serverHandlers, ServerHandler, getOrCreateServerAndListen, getOrCreateSecureServerAndListen } from './cli/serve.js'
export { serveMetadata, ServeMetadata, ServeMetadataWithSignal, connectByPreference, connectWith, ConnectionPreference, parseMetadata };
import $metadata from './commands/$metadata.js'
export { CommandProcessor };

export class Cli
{
    public static Metadata = $metadata;
}
