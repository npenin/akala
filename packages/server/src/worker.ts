import * as express from 'express';
import * as fs from 'fs';
import * as di from 'akala-core';
import * as io from 'socket.io-client';
import * as debug from 'debug';
import * as path from 'path';
import { resolve, dirname } from 'path';
var log = debug('akala:worker:' + process.argv[2]);
//log.enabled = process.argv[2]=='devices';
if (!debug.enabled('akala:worker:' + process.argv[2]))
    console.warn(`logging disabled for ${process.argv[2]}`);

var app = express.Router();
di.register('$router', app);
di.register('$io', function (namespace: string)
{
    return io('http://localhost:' + process.argv[3] + namespace);
});
var socket = io('http://localhost:' + process.argv[3]);

di.register('$bus', socket);
socket.on('api', function (request: express.Request, callback: Function)
{
    var requestInjector = new di.Injector();
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

    app(request, <any>{ send: callback }, function (err)
    {
        if (err)
            callback(500, err);
        else
            callback(404);
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
    require(path.join(process.cwd(), 'modules/' + process.argv[2]));
    if (!masterCalled)
        socket.emit('master', null, null);
    app.use(function (err: Error, req, res, next)
    {
        log(arguments);
        console.error(err.stack);
        res.send(500, 'Something broke!');
    });
});

