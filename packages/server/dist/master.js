"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cluster = require("cluster");
const http = require("http");
const url = require("url");
const fs = require("fs");
const st = require("serve-static");
const io = require("socket.io");
const di = require("@akala/core");
const path_1 = require("path");
const debug = require("debug");
const $ = require("underscore");
const events_1 = require("events");
const router_1 = require("./router");
var log = debug('akala:master');
var orchestratorLog = debug('akala:master:orchestrator');
const Orchestrator = require("orchestrator");
const sequencify = require("sequencify");
var port = process.argv[2] || '5678';
debugger;
var app = router_1.router();
di.register('$router', app);
app.use(function (req, res, next) {
    debugger;
    if (!res.status)
        res.status = function (status) {
            res.statusCode = status;
            return res;
        };
    if (!res.sendStatus)
        res.sendStatus = function (status) {
            res.status(status).end();
            return res;
        };
    if (!res.json)
        res.json = function (content) {
            if (typeof (content) != 'undefined')
                switch (typeof (content)) {
                    case 'object':
                        content = JSON.stringify(content);
                }
            res.write(content);
            res.end();
            return res;
        };
    next();
});
var configFile = fs.realpathSync('./config.json');
var sourcesFile = fs.realpathSync('./sources.list');
var orchestrator = new Orchestrator();
orchestrator.onAll(function (e) {
    if (e.src == 'task_not_found')
        console.error(e.message);
    orchestratorLog(e);
});
var socketModules = {};
var modulesEvent = {};
var globalWorkers = {};
var modulesDefinitions = {};
fs.exists(configFile, function (exists) {
    var config = null;
    if (exists)
        config = require(configFile);
    fs.readFile(sourcesFile, 'utf8', function (error, sourcesFileContent) {
        var sources = JSON.parse(sourcesFileContent);
        var tmpModules = [];
        sockets.on('connection', function (socket) {
            log('received connection');
            socket.on('module', function (submodule, cb) {
                log('received module event %s', submodule);
                Object.defineProperty(socketModules, submodule, { configurable: false, writable: true, value: socket });
                socket.on('disconnect', function () {
                    socketModules[submodule] = null;
                });
                socket.join(submodule);
                var moduleEvents = modulesEvent[submodule];
                socket.on('master', function (masterPath, workerPath) {
                    log(submodule + ' emitted master event with ' + masterPath);
                    if (workerPath && workerPath.length > 0)
                        globalWorkers[submodule] = workerPath;
                    moduleEvents.emit('master', masterPath);
                });
                // console.log(submodule);
                modulesEvent[submodule].emit('connected', cb);
            });
        });
        di.eachAsync(sources, function (source, i, next) {
            fs.readdir('node_modules/' + source, function (err, modules) {
                if (err)
                    throw err;
                modules.forEach(function (folder) {
                    var plugin = source + '/' + folder;
                    switch (source) {
                        case '@akala':
                            if (folder == 'server' || folder == 'client')
                                return;
                            break;
                    }
                    var moduleDefinition = require.main.require(plugin + '/package.json');
                    var dependencies = [];
                    if (moduleDefinition.dependencies)
                        Object.keys(moduleDefinition.dependencies).forEach(function (dep) {
                            sources.forEach(function (src) {
                                if (dep.substr(0, src.length) == src)
                                    dependencies.push(dep);
                            });
                        });
                    if (moduleDefinition.optionalDependencies)
                        Object.keys(moduleDefinition.optionalDependencies).forEach(function (dep) {
                            sources.forEach(function (src) {
                                if (dep.substr(0, src.length) == src)
                                    dependencies.push(dep + '?');
                            });
                        });
                    if (config && dependencies.length) {
                        debugger;
                        var activeDependencies = [];
                        dependencies.forEach(function (dep, i) {
                            var isOptional = dep[dep.length - 1] == '?';
                            if (isOptional)
                                dep = dep.substring(0, dep.length - 1);
                            if (config[dep] === false || (config[dep] && config[dep].disabled)) {
                                if (!isOptional)
                                    config[plugin] = false;
                            }
                            else
                                activeDependencies.push(dep);
                        });
                        dependencies = activeDependencies;
                    }
                    if (config && config[plugin] === false)
                        return;
                    modulesDefinitions[plugin] = {
                        name: plugin,
                        dep: dependencies || []
                    };
                    tmpModules.push(plugin);
                    modulesEvent[plugin] = new events_1.EventEmitter();
                    var getDependencies = function () {
                        var localWorkers = [];
                        sequencify(modulesDefinitions, dependencies, localWorkers);
                        return localWorkers;
                    };
                    var masterDependencies = $.map(dependencies || [], function (dep) {
                        return dep + '#master';
                    });
                    orchestrator.add(plugin, masterDependencies, function (next) {
                        var finished = false;
                        modulesEvent[plugin].on('connected', function (callback) {
                            if (!finished)
                                next();
                            finished = true;
                            if (folder != 'assets')
                                app.use('/assets/' + (folder == 'core' ? '' : folder + '/'), st('node_modules/' + plugin + '/assets'));
                            app.use('/bower_components/' + (folder == 'core' ? '' : folder + '/'), st('node_modules/' + plugin + '/bower_components'));
                            app.use('/' + folder, st('node_modules/' + plugin + '/views'));
                            var localWorkers = getDependencies();
                            log('localWorkers for %s: %s', folder, localWorkers);
                            callback(config && config[plugin], $.map(localWorkers, function (dep) { return globalWorkers[dep]; }));
                        });
                        app.all('/api/' + folder, function (req, res, next) {
                            log(folder);
                            // log(req.originalUrl);
                            socketModules[plugin].emit('api', {
                                url: req.url,
                                headers: req.headers,
                                httpVersion: req.httpVersion,
                                ip: req.ip,
                                method: req.method,
                                params: req.params,
                                path: req.path,
                                protocol: req.protocol,
                                query: url.parse(req.url, true).query,
                                rawHeaders: req.rawHeaders,
                                rawTrailers: req.rawTrailers,
                                statusCode: req.statusCode,
                                statusMessage: req.statusMessage,
                                trailers: req.trailers,
                                user: req['user']
                            }, function (status, data) {
                                if (isNaN(Number(status))) {
                                    var socketRes = status;
                                    if (typeof (data) == 'undefined') {
                                        data = status;
                                        status = null;
                                    }
                                    else {
                                        status = socketRes.status || 200;
                                        if (socketRes.headers)
                                            Object.keys(socketRes.headers).forEach(function (header) {
                                                res.setHeader(header, socketRes.headers[header]);
                                            });
                                    }
                                }
                                log(arguments);
                                if (status != null)
                                    res.statusCode = status;
                                if (typeof (data) == 'object')
                                    data = JSON.stringify(data);
                                if (typeof (data) != 'undefined')
                                    res.write(data);
                                res.end();
                            });
                            // }
                            // , function (err: Error, req: express.Request, res: express.Response, next: express.NextFunction)
                            //     {
                            //         if (err)
                            //         {
                            //             console.error('error occurred in ' + module);
                            //             console.error(err.stack);
                            //         }
                        });
                        cluster.setupMaster({
                            args: [plugin, port],
                        });
                        var worker = cluster.fork();
                        app.use('/api/manage/restart/' + folder, function () {
                            worker.kill();
                        });
                        var handleCrash = function () {
                            cluster.setupMaster({
                                args: [plugin, port]
                            });
                            worker = cluster.fork();
                            worker.on('exit', handleCrash);
                        };
                        worker.on('exit', handleCrash);
                    });
                    orchestrator.add(plugin + '#master', [plugin], function (next) {
                        modulesEvent[plugin].once('master', function (masterPath) {
                            log('moduleReady %s', masterPath);
                            if (!masterPath)
                                return next();
                            masterPath = path_1.relative(path_1.dirname(module.filename), masterPath);
                            if (path_1.sep == '\\')
                                masterPath = masterPath.replace(/\\/g, '/');
                            log('path being required: ' + masterPath);
                            di.register('$module', plugin, true);
                            di.register('$config', config[plugin], true);
                            require(masterPath);
                            di.unregister('$config');
                            di.unregister('$module');
                            // orchestratorLog(globalWorkers);
                            next();
                        });
                    });
                });
                next();
            });
        }, function (error) {
            if (error) {
                debugger;
                console.error(error);
            }
            var modules = tmpModules;
            di.register('$$modules', modules);
            di.register('$$socketModules', socketModules);
            di.register('$$sockets', sockets);
            log(modules);
            var masterDependencies = [];
            $.each(modules, function (e) {
                masterDependencies.push(e + '#master');
            });
            orchestrator.add('@akala/server#master', function () { });
            orchestrator.add('default', masterDependencies, function () {
                sockets.emit('ready');
                log('registering error handler');
                app.use(function (err, req, res, next) {
                    log('pwic');
                    debugger;
                    try {
                        if (err) {
                            console.error('error occurred');
                            console.error(err.stack);
                            res.statusCode = 500;
                            res.write(JSON.stringify(err));
                            res.end();
                        }
                        else
                            res.sendStatus(404);
                    }
                    catch (e) {
                        console.error(e.stack);
                        res.statusCode = 500;
                        res.end();
                    }
                });
            });
            orchestrator.start('default');
        });
    });
});
// https.createServer({}, app).listen(443);
var server = http.createServer();
app.attachTo(server);
var sockets = io(server);
server.listen(port);
//# sourceMappingURL=master.js.map