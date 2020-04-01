import * as akala from '@akala/core';

export * from './shared'

export * from './commands/command-processor'
export * from './commands/command'
export * from './Query'
export * from './exceptions'
export * from './string-builder'
export * from './providers/file'
export * from './providers/vanilla'
import * as expressions from './expressions'

export { expressions }

akala.module('@akala/storage');

import { providers } from './shared'
import { File } from './providers/file';
import { Vanilla } from './providers/vanilla';

providers.registerFactory('file', () => new File())
providers.registerFactory('vanilla', () => new Vanilla())

