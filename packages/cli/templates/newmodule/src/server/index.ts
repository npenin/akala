import * as akala from '@akala/server';
import { AssetRegistration } from '@akala-modules/core';
import { EventEmitter } from 'events';

var moduleName = require('../../package.json').name

akala.injectWithName(['$isModule', '$master', '$worker'], function (isModule: akala.worker.IsModule, master: akala.worker.MasterRegistration, worker: EventEmitter)
{
    if (isModule(moduleName))
    {
        worker.on('ready', function ()
        {
            // Called when all modules have been initialized
        });
        master(__filename, './master');

        akala.injectWithNameAsync([AssetRegistration.name], function (va: AssetRegistration)
        {
            va.register('/js/tiles.js', require.resolve('../tile'));
            va.register('/js/routes.js', require.resolve('../routes'));
        });

    }
})()