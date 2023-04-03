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
export { CommandProcessor };
export const Triggers = {};

export class Cli
{
    public static Metadata = $metadata;
}
