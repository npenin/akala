import * as akala from '@akala/core';

export * from './shared.js'
export * from './commands/command-processor.js'
export * from './commands/command.js'
export * from './Query.js'
export * from './exceptions.js'
export * from './string-builder.js'
export * from './providers/file.js'
export * from './providers/vanilla.js'
import { ModelDefinition, ModelMode } from './common.js';

akala.module('@akala/storage');

export { ModelDefinition, ModelMode };

import { providers } from './shared.js'
import { File, JsonFileEntry } from './providers/file.js';
import { Vanilla } from './providers/vanilla.js';

providers.registerFactory('file', () => new File((path: string, name: string, def: ModelDefinition) => new JsonFileEntry(path, name, def)))
providers.registerFactory('vanilla', () => new Vanilla())

