import * as fs from 'fs';
import * as akala from '@akala/core';
import { api } from './api';
import { WorkerRouter } from './router';
import * as jsonrpc from '@akala/json-rpc-ws';
import * as debug from 'debug';
import * as path from 'path';
import { resolve, dirname } from 'path';
import { Request, MasterRegistration, Callback, WorkerInjector, handle } from './worker-meta';
import { metaRouter } from './master-meta'
import { EventEmitter } from 'events'
import { meta } from './api/jsonrpc';

process.on('uncaughtException', function (error)
{
    console.error(error);
    process.exit(500);
})
var log = debug('akala:worker:' + process.argv[2]);

var app = new WorkerRouter();

function resolveUrl(namespace: string)
{
    var url = process.argv[3] + '/' + namespace + '/';
    return url;
}

akala.register('$resolveUrl', resolveUrl);

akala.register('$router', app);

akala.resolve('$agent.api/' + process.argv[2]).then(function (socket: jsonrpc.Client<jsonrpc.Connection>)
{
    log('worker connected')
    var worker = akala.register('$worker', new EventEmitter());
    var client = api.jsonrpcws(new akala.DualApi(meta, metaRouter)).createClient(socket, {
        'after-master': () =>
        {
            worker.emit('after-master');
        }, ready: () =>
        {
            worker.emit('ready');
        },
        getContent: handle(app, '/')
    });
    var server = client.$proxy();
    server.register({ path: '/', remap: '/api' });
    akala.register('$bus', client);

    akala.register('$updateConfig', akala.chain(function (config, key: string)
    {
        var configToSave = {};
        configToSave[key] = config;
        return server.updateConfig(configToSave);
    }, function (keys, config, key: string)
        {
            if (key)
            {
                keys = [].concat(keys);
                keys.push(key);
            }
            return [config, keys.join('.')];
        }));


    akala.register('$config', akala.chain(function (key?: string)
    {
        return server.getConfig({ key: key || null });
    }, function (keys, key)
        {
            if (key)
            {
                keys = [].concat(keys);
                keys.push(key);
            }
            return [keys.join('.')];
        }));

    server.module({ module: process.argv[2] }).then(function (param)
    {
        log('emitted module event')
        var masterCalled = false;
        log(param);
        akala.register('$master', function (from?: string, masterPath?: string, workerPath?: string)
        {
            log(from + ' is not the current module path. Ignoring...');
            return;
        });
        akala.register('$isModule', () => { return false });

        for (var worker of param.workers)
        {
            if (!worker)
                continue;
            log('requiring %s for %s', worker, process.argv[2]);
            require(worker);
        }
        process.chdir(path.join(process.cwd(), 'node_modules', process.argv[2]));
        akala.register('$master', function (from?: string, masterPath?: string, workerPath?: string)
        {
            masterCalled = true;
            server.master({ masterPath: masterPath && resolve(dirname(from), masterPath) || null, workerPath: workerPath && resolve(dirname(from), workerPath) || null });
        }, true);

        akala.register('$isModule', (m: string) => { return m == process.argv[2]; }, true);
        log('new cwd: ' + process.cwd());

        require(process.cwd());

        if (!masterCalled)
            server.master(null);
    });
});
