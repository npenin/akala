import * as akala from '@akala/core';

export * from './shared.js'

export * from './commands/command-processor.js'
export * from './commands/command.js'
export * from './Query.js'
export * from './exceptions.js'
export * from './string-builder.js'
export * from './providers/file.js'
export * from './providers/vanilla.js'
import * as expressions from './expressions/index.js'

export { expressions }

akala.module('@akala/storage');

import { providers } from './shared.js'
import { File } from './providers/file.js';
import { Vanilla } from './providers/vanilla.js';

providers.registerFactory('file', () => new File())
providers.registerFactory('vanilla', () => new Vanilla())

