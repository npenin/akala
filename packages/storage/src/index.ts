
export * from './shared.js'
export * from './expression-executor.js'
export * from './commands/command-processor.js'
export * from './commands/command.js'
export * from './Query.js'
export * from './exceptions.js'
export * from './string-builder.js'
export * from './providers/file.js'
export * from './providers/vanilla.js'
import { ModelDefinition, ModelMode } from './common.js';
import { module } from '@akala/core'

module('@akala/storage');

export { ModelDefinition, ModelMode };

import { providers } from './shared.js'
import { File } from './providers/file.js';
import { Vanilla } from './providers/vanilla.js';
import { basename, dirname } from 'path/posix'

providers.useProtocol('file+json', (url) => File.fromJson(url.hostname + url.pathname ? '' : dirname(url.pathname), basename(url.pathname)))
providers.useProtocol('memory', () => Promise.resolve(new Vanilla()))
