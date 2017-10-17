import * as cluster from 'cluster';
import * as http from 'http';
import * as https from 'https';
import * as url from 'url';
import * as fs from 'fs';
import * as st from 'serve-static';
import * as jsonrpc from '@akala/json-rpc-ws';
import * as ws from 'ws';
import * as akala from '@akala/core';
import { relative, sep as pathSeparator, dirname, join as pathJoin } from 'path';
import { serveRouter } from './master-meta';
import { meta } from './sharedComponent/metadata';
import * as debug from 'debug';
// import * as $ from 'underscore';
import { EventEmitter } from 'events';
import { router, Request, Response, CallbackResponse } from './router';
import * as pac from './package';
var log = debug('akala:master');
var orchestratorLog = debug('akala:master:orchestrator');
import * as Orchestrator from 'orchestrator';
import * as sequencify from 'sequencify';

var master = new EventEmitter();
master.setMaxListeners(Infinity);

var port = process.argv[2] || '5678';

if (process.execArgv && process.execArgv.length >= 1)
    process.execArgv[0] = process.execArgv[0].replace('-brk', '');

var lateBoundRoutes = router();
var preAuthenticatedRouter = router();
var authenticationRouter = router();
var app = router();
akala.register('$preAuthenticationRouter', preAuthenticatedRouter);
akala.register('$authenticationRouter', authenticationRouter);
akala.register('$router', lateBoundRoutes);
var masterRouter = router();
masterRouter.use(preAuthenticatedRouter.router);
masterRouter.use(authenticationRouter.router);
masterRouter.use(lateBoundRoutes.router);
masterRouter.use(app.router);

var configFile = fs.realpathSync('./config.json');
var sourcesFile = fs.realpathSync('./sources.list');
var orchestrator = new Orchestrator();
orchestrator.onAll(function (e)
{
    if (e.src == 'task_not_found')
        console.error(e.message);
    if (e.src == 'task_err')
        console.error(e.err);

    orchestratorLog(e);
});

interface Connection extends jsonrpc.Connection
{
    submodule?: string;
}

var socketModules: { [module: string]: Connection } = {};
var modulesEvent: { [module: string]: EventEmitter } = {};
var globalWorkers = {};
var modulesDefinitions: { [name: string]: sequencify.definition } = {};
var root: string;

fs.exists(configFile, function (exists)
{
    var config = exists && require(configFile) || {};

    root = config && config['@akala/server'] && config['@akala/server'].root;

    fs.readFile(sourcesFile, 'utf8', function (error, sourcesFileContent)
    {
        var sources: string[] = JSON.parse(sourcesFileContent);
        var tmpModules: string[] = [];

        akala.eachAsync(sources, function (source, i, next)
        {
            fs.readdir('node_modules/' + source, function (err, modules)
            {
                if (err)
                {
                    console.error(err);
                    return;
                }

                modules.forEach(function (folder)
                {
                    var plugin = source + '/' + folder;
                    switch (source)
                    {
                        case '@akala':
                            if (folder == 'server' || folder == 'client')
                                return;
                            break;
                    }

                    var moduleDefinition: pac.CoreProperties = require.main.require(plugin + '/package.json');
                    var dependencies: string[] = [];
                    if (moduleDefinition.dependencies)
                        Object.keys(moduleDefinition.dependencies).forEach(function (dep)
                        {
                            sources.forEach(function (src)
                            {
                                if (dep.substr(0, src.length) == src)
                                    dependencies.push(dep);
                            })
                        });
                    if (moduleDefinition.optionalDependencies)
                        Object.keys(moduleDefinition.optionalDependencies).forEach(function (dep)
                        {
                            sources.forEach(function (src)
                            {
                                if (dep.substr(0, src.length) == src)
                                    dependencies.push(dep + '?');
                            })
                        });

                    if (config && dependencies.length)
                    {
                        var activeDependencies = [];
                        dependencies.forEach(function (dep, i)
                        {
                            var isOptional = dep[dep.length - 1] == '?';
                            if (isOptional)
                                dep = dep.substring(0, dep.length - 1);
                            if (config[dep] === false || (config[dep] && config[dep].disabled))
                            {
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

                    // log(modulesDefinitions);

                    tmpModules.push(plugin);
                    modulesEvent[plugin] = new EventEmitter();
                    var getDependencies = function ()
                    {
                        var localWorkers = [];
                        sequencify(modulesDefinitions, dependencies, localWorkers)
                        return localWorkers;
                    }

                    var masterDependencies = akala.map(dependencies || [], function (dep)
                    {
                        return dep + '#master';
                    });

                    orchestrator.add(plugin, masterDependencies, function (next)
                    {
                        var finished = false;
                        modulesEvent[plugin].on('connected', function (callback)
                        {
                            if (!finished)
                                next();
                            finished = true;

                            app.useGet('/assets/' + folder, st('node_modules/' + plugin + '/assets'));
                            app.useGet('/bower_components/' + folder, st('node_modules/' + plugin + '/bower_components'));

                            app.useGet('/' + folder, st('node_modules/' + plugin + '/views'));

                            var localWorkers = getDependencies();
                            log('localWorkers for %s: %s', folder, localWorkers);
                            callback({
                                config: config && config[plugin], workers: akala.grep(akala.map(localWorkers, function (dep)
                                {
                                    log('resolving ' + dep + ' to ' + globalWorkers[dep]);
                                    return globalWorkers[dep];
                                }), function (dep)
                                    {
                                        return !dep;
                                    })
                            });
                            log('callback called')
                        });

                        var sockets = serveRouter(app, '/api/' + plugin, meta, {
                            master: function (param: { masterPath?: string, workerPath?: string }, socket: Connection)
                            {
                                // log(arguments);
                                log(socket.submodule + ' emitted master event with ' + (param && param.masterPath));
                                if (param && param.workerPath && param.workerPath.length > 0)
                                {
                                    log('registering worker ' + param.workerPath);
                                    globalWorkers[socket.submodule] = param.workerPath;
                                }

                                modulesEvent[socket.submodule].emit('master', param && param.masterPath);
                            }, module: function (param: { module: string }, socket: Connection)
                            {
                                log('received module event %s', param.module);
                                socket.submodule = param.module;
                                Object.defineProperty(socketModules, param.module, { configurable: false, writable: true, value: this });

                                var proxy = this.$proxy(socket);

                                if (socket.socket instanceof ws)
                                    socket.socket.on('close', function ()
                                    {
                                        socketModules[param.module] = null;
                                    });
                                // socket.join(submodule);

                                var moduleEvents = modulesEvent[param.module] = modulesEvent[param.module] || new EventEmitter();

                                modulesEvent[param.module].on('after-master', function ()
                                {
                                    log('after-master');
                                    // console.log('emitting after-master for ' + submodule);
                                    proxy['after-master'](null);
                                });

                                return new Promise<{ config: any, workers: string[] }>((resolve, reject) =>
                                {
                                    // console.log(submodule);
                                    modulesEvent[param.module].emit('connected', resolve);
                                });

                                // var deferred = new akala.Deferred<any>();
                                // return deferred;
                            }
                        });

                        master.on('ready', function ()
                        {
                            sockets.ready(null);
                        });

                        cluster.setupMaster(<any>{
                            args: [plugin, port],
                            execArgv: []
                        });
                        var worker = cluster.fork();
                        app.use('/api/manage/restart/' + folder, function ()
                        {
                            worker.kill();
                        });

                        var restart = 0;
                        setInterval(function ()
                        {
                            restart = 0;
                        }, 60000);

                        var handleCrash = function ()
                        {
                            restart++;
                            if (restart == 5) //5 restart in 1 min
                            {
                                console.warn(plugin + ' has crashed 5 times in 1 minute. Disabling it');
                                if (config[plugin])
                                    config[plugin].disabled = true;
                                else
                                    config[plugin] = false;
                                fs.writeFile(configFile, JSON.stringify(config, null, 4), function (err?)
                                {
                                    if (err)
                                        console.error(err);
                                });
                                return;
                            }
                            cluster.setupMaster({
                                args: [plugin, port]
                            });
                            worker = cluster.fork();

                            worker.on('exit', handleCrash);
                        };
                        worker.on('exit', handleCrash);
                    });

                    orchestrator.add(plugin + '#master', [plugin], function (next)
                    {
                        modulesEvent[plugin].once('master', function (masterPath)
                        {
                            log('moduleReady %s', masterPath);
                            if (!masterPath)
                                return next();
                            masterPath = relative(dirname(module.filename), masterPath);
                            if (pathSeparator == '\\')
                                masterPath = masterPath.replace(/\\/g, '/');
                            log('path being required: ' + masterPath);
                            akala.register('$module', plugin, true);
                            akala.register('$config', config[plugin], true);
                            require(masterPath);
                            akala.unregister('$config');
                            akala.unregister('$module');
                            // orchestratorLog(globalWorkers);
                            // console.log('emitting after-master for ' + plugin);
                            modulesEvent[plugin].emit('after-master');

                            next();
                        });
                    });

                });

                next();
            });
        }, function (error?)
            {
                if (error)
                {
                    console.error(error);
                }

                var modules = tmpModules;
                akala.register('$$modules', modules);
                akala.register('$$socketModules', socketModules);
                // akala.register('$$sockets', sockets);
                log(modules);

                var masterDependencies = [];
                akala.each(modules, function (e)
                {
                    masterDependencies.push(e + '#master');
                });

                orchestrator.add('@akala/server#master', function () { });

                orchestrator.add('default', masterDependencies, function ()
                {
                    master.emit('ready');
                    log('registering error handler');

                    app.get('*', function (request, response)
                    {
                        fs.createReadStream(root + '/index.html').pipe(response);
                    });

                    masterRouter.use(function (err, req: Request, res: Response, next)
                    {
                        try
                        {
                            if (err)
                            {
                                console.error('error occurred');
                                console.error(err.stack);
                                res.statusCode = 500;
                                res.write(JSON.stringify(err));
                                res.end();
                            }
                            else
                                res.sendStatus(404);
                        }
                        catch (e)
                        {
                            console.error(e.stack)
                            res.statusCode = 500;
                            res.end();
                        }
                    });
                    console.log('server ready...');
                });

                orchestrator.start('default');
            });
    });
});
// https.createServer({}, app).listen(443);
var server = http.createServer();
masterRouter.attachTo(server);

server.listen(port);