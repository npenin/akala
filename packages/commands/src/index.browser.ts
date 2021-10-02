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
import serveMetadata, { ServeMetadata, connectByPreference, connectWith, ConnectionPreference } from './serve-metadata'
export { Processors, Triggers, Metadata }
export { NetSocketAdapter, default as serve, ServeOptions } from './cli/serve'
export { serveMetadata, ServeMetadata, connectByPreference, connectWith, ConnectionPreference };
import $metadata from './commands/$metadata'
export class Cli
{
    public static Metadata = $metadata;
}
