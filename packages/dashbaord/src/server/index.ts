import * as akala from '@akala/server';
// import { AssetRegistration } from '@akala-modules/core';
import { EventEmitter } from 'events';
import { register } from '@akala-modules/pages'
import { mkdirp } from '@akala/server';
import { promises as fs } from 'fs';

var moduleName = require('../../package.json').name

akala.exec<void>('$isModule', '$master', '$bus')(function (isModule: akala.worker.IsModule, master: akala.worker.MasterRegistration, client: akala.api.Client<typeof akala.master.metaRouter>)
{
    if (isModule(moduleName))
        master(__filename, './master');

    mkdirp('./pages', async function ()
    {
        var files = await fs.readdir('./pages');
        akala.each(files, (file) =>
        {
            if (file == 'index.html')
                register('/', akala.worker.expressWrap(function (req, res, next)
                {
                    res.sendFile('/' + file, { acceptRanges: false, dotfiles: 'allow', extensions: false }, next);
                }))
            else
                register('/' + file, akala.worker.expressWrap(function (req, res, next)
                {
                    res.sendFile('/' + file, { acceptRanges: false, dotfiles: 'allow', extensions: false }, next);
                }))
        })
    })
})