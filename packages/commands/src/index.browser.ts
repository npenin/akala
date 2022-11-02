export * from './model/command'
export * from './model/container'
export * from './decorators'
export * from './generator'
export * from './model/trigger'
export * from './model/processor'
export * from './model/error-unknowncommand'
import * as Processors from './processors/index'
import * as Triggers from './triggers/index'
import * as Metadata from './metadata/index'
import serveMetadata, { ServeMetadata, ServeMetadataWithSignal, connectByPreference, connectWith, ConnectionPreference, parseMetadata } from './serve-metadata'
import { CommandProcessor } from './model/processor'
export { Processors, Triggers, Metadata }
export { default as serve, ServeOptions, serverHandlers, ServerHandler, getOrCreateServerAndListen, getOrCreateSecureServerAndListen } from './cli/serve'
export { serveMetadata, ServeMetadata, ServeMetadataWithSignal, connectByPreference, connectWith, ConnectionPreference, parseMetadata };
import $metadata from './commands/$metadata'
export { CommandProcessor };

export class Cli
{
    public static Metadata = $metadata;
}
