import * as akala from '@akala/core';
import * as server from '@akala/server';
// import { AssetRegistration } from '@akala-modules/core';
import { EventEmitter } from 'events';
// import { register } from '@akala/pages'
import { mkdirp } from '@akala/server';
import { promises as fs } from 'fs';

var moduleName = require('../../package.json').name

akala.module('@akala/dashboard', '@akala/pages').init([], function ()
{
    mkdirp('./pages', async function ()
    {
        // register('/', server.master.serveStatic('./pages', { fallthrough: true }));
    })
})