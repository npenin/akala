// import * as server from '@akala/server';
// import { AssetRegistration } from '@akala-modules/core';
// import { EventEmitter } from 'events';
// import { register } from '@akala/pages'
import { promises as fs } from 'fs';
import { module } from '@akala/core';

// eslint-disable-next-line @typescript-eslint/no-var-requires
// const moduleName = require('../../package.json').name

module('@akala/dashboard', '@akala/pages').activate([], async function ()
{
    await fs.mkdir('./pages', { recursive: true });
    // register('/', server.master.serveStatic('./pages', { fallthrough: true }));
})