import * as fs from 'fs';
import * as di from '@akala/core';
import { WorkerRouter } from './router';
import * as io from 'socket.io-client';
import * as debug from 'debug';
import * as path from 'path';
import { resolve, dirname } from 'path';
import { Request, MasterRegistration, Callback, WorkerInjector } from './worker-meta';
import { Http } from './http';
process.on('uncaughtException', function (error)
{
    console.error(error);
    process.exit(500);
})
var log = debug('akala:worker:' + process.argv[2]);
//log.enabled = process.argv[2]=='devices';
if (!debug.enabled('akala:worker:' + process.argv[2]))
    console.warn(`logging disabled for ${process.argv[2]}`);


var app = new WorkerRouter();


di.register('$router', app);
di.register('$io', function (namespace: string)
{
    return io('http://localhost:' + process.argv[3] + namespace);
});
di.register('$http', new Http());
var socket = io('http://localhost:' + process.argv[3]);

di.register('$bus', socket);
socket.on('api', function (request: Request, callback: Callback)
{
    var requestInjector: WorkerInjector = new di.Injector();
    requestInjector.register('$request', request);
    // requestInjector.register('$response', response);
    requestInjector.register('$callback', callback);
    Object.defineProperty(request, 'injector', { value: requestInjector, enumerable: false, configurable: false, writable: false });
    if (request.url == '/')
        request.url = '';
    request.url = '/api' + request.url;
    if (request.params)
        for (var i in request.params)
            requestInjector.register('param.' + i, request.params[i]);
    if (request.query)
        for (var i in request.query)
            requestInjector.register('query.' + i, request.query[i]);

    log(request.url);

    app.handle(request, function ()
    {
        callback.apply(this, arguments);
    });
});

log('module ' + process.argv[2]);
socket.emit('module', process.argv[2], function (config, workers)
{
    log('emitted module event')
    log(workers);
    di.register('$config', config);
    var masterCalled = false;
    di.register('$master', function (from?: string, masterPath?: string, workerPath?: string)
    {
        masterCalled = true;
        socket.emit('master', masterPath && resolve(dirname(from), masterPath) || null, workerPath && resolve(dirname(from), workerPath) || null);
    });
    for (var worker of workers)
    {
        if (!worker)
            continue;
        log('%s for %s', worker, process.argv[2]);
        require(worker);
    }
    require(path.join(process.cwd(), 'node_modules', process.argv[2]));

    if (!masterCalled)
        socket.emit('master', null, null);
});

