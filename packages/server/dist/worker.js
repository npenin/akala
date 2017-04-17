"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const di = require("@akala/core");
const router_1 = require("./router");
const io = require("socket.io-client");
const debug = require("debug");
const path = require("path");
const path_1 = require("path");
process.on('uncaughtException', function (error) {
    console.error(error);
    process.exit(500);
});
var log = debug('akala:worker:' + process.argv[2]);
//log.enabled = process.argv[2]=='devices';
if (!debug.enabled('akala:worker:' + process.argv[2]))
    console.warn(`logging disabled for ${process.argv[2]}`);
var app = new router_1.WorkerRouter(function (error, ...args) {
    var req = args[0];
    if (error) {
        console.error(error);
        req.injector.resolve('$callback')(500, error);
    }
    else
        req.injector.resolve('$callback')(404);
});
di.register('$router', app);
di.register('$io', function (namespace) {
    return io('http://localhost:' + process.argv[3] + namespace);
});
var socket = io('http://localhost:' + process.argv[3]);
di.register('$bus', socket);
socket.on('api', function (request, callback) {
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
    app.handle(request, callback);
});
log('module ' + process.argv[2]);
socket.emit('module', process.argv[2], function (config, workers) {
    log('emitted module event');
    log(workers);
    di.register('$config', config);
    var masterCalled = false;
    di.register('$master', function (from, masterPath, workerPath) {
        masterCalled = true;
        socket.emit('master', masterPath && path_1.resolve(path_1.dirname(from), masterPath) || null, workerPath && path_1.resolve(path_1.dirname(from), workerPath) || null);
    });
    for (var worker of workers) {
        if (!worker)
            continue;
        log('%s for %s', worker, process.argv[2]);
        require(worker);
    }
    require(path.join(process.cwd(), 'node_modules', process.argv[2]));
    if (!masterCalled)
        socket.emit('master', null, null);
});
//# sourceMappingURL=worker.js.map