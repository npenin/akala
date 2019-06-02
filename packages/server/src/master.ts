import * as cluster from 'cluster';
import * as url from 'url';
import * as fs from 'fs';
import * as st from 'serve-static';
import * as jsonrpc from '@akala/json-rpc-ws';
import * as ws from 'ws';
import * as akala from '@akala/core';
import { relative, sep as pathSeparator, dirname, join as pathJoin } from 'path';
import { serveRouter } from './master-meta';
import * as debug from 'debug';
// import * as $ from 'underscore';
import { EventEmitter } from 'events';
import { router, Request, Response, CallbackResponse } from './router';
import * as pac from './package';
var log = debug('akala:master');
var orchestratorLog = debug('akala:master:orchestrator');
import * as Orchestrator from 'orchestrator';
import * as sequencify from 'sequencify';
import { meta } from './api/jsonrpc';
import { api } from '.'
import { promisify } from 'util'
import { WorkerInjectorImpl } from './worker-meta';

var httpPackage: 'http' | 'https';
if (!fs.existsSync('privkey.pem') || !fs.existsSync('fullchain.pem'))
    httpPackage = 'http'
else
    httpPackage = 'https';

var master = new EventEmitter();
master.setMaxListeners(Infinity);

var port = process.env.PORT || '5678';

if (process.execArgv && process.execArgv.length >= 1)
    process.execArgv[0] = process.execArgv[0].replace('-brk', '');


async function updateConfig(newConfig, key: string)
{
    var config = await getConfig();
    var keys = key.split('.');
    keys.reduce(function (config, key, i)
    {
        if (keys.length == i + 1)
        {
            config[key] = newConfig;
            console.log(config);
        }
        else if (typeof (config[key]) == 'undefined')
            config[key] = {};

        return config[key];
    }, config);
    writeConfig(config);
}

akala.register('$updateConfig', new Proxy(updateConfig, {
    get: function (uc, key: string)
    {
        return function (config, subKey)
        {
            return uc(config, key + '.' + subKey);
        }
    }
}));
akala.registerFactory('$config', new Proxy(getConfig, {
    get: function (c, key: string)
    {
        return function ()
        {
            return c().then(function (config) { return config[key]; });
        }
    }
}));

function writeConfig(config)
{
    return promisify(fs.writeFile)('./config.json', JSON.stringify(config, null, 4), 'utf8').catch(function (err)
    {
        if (err)
            console.error(err);
    });
}

function getConfig()
{
    return promisify(fs.readFile)('./config.json', 'utf8').then(function (content)
    {
        return JSON.parse(content);
    }, function (err)
        {
            writeConfig({}).then(function (config)
            {
                return {};
            })
        });
}

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
    port = config && config['@akala/server'] && config['@akala/server'].port || port;
    var dn = config && config['@akala/server'] && config['@akala/server'].dn || 'localhost';

    fs.readFile(sourcesFile, 'utf8', function (error, sourcesFileContent)
    {
        if (error && error.code == 'ENOENT')
            return;
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
                    if (moduleDefinition.peerDependencies)
                        Object.keys(moduleDefinition.peerDependencies).forEach(function (dep)
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

                            preAuthenticatedRouter.useGet('/assets/' + folder, st('node_modules/' + plugin + '/assets'));

                            preAuthenticatedRouter.useGet('/' + plugin, st('node_modules/' + plugin + '/views'));

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

                        var server = serveRouter(app, '/');

                        var sockets = api.jsonrpcws(meta).createServer('/api/manage/' + plugin, {
                            register(p, c?: Connection)
                            {
                                return server.register(p, c)
                            },
                            master(param: { masterPath?: string, workerPath?: string }, socket: Connection)
                            {
                                log(arguments);
                                log(socket.submodule + ' emitted master event with ' + (param && param.masterPath));
                                if (param && param.workerPath && param.workerPath.length > 0)
                                {
                                    log('registering worker ' + param.workerPath);
                                    globalWorkers[socket.submodule] = param.workerPath;
                                }

                                if (modulesEvent[socket.submodule].listenerCount('master') == 0)
                                    modulesEvent[socket.submodule]['master'] = param && param.masterPath;

                                modulesEvent[socket.submodule].emit('master', param && param.masterPath);
                            },
                            updateConfig: function (param)
                            {
                                return new Promise<any>((resolve, reject) =>
                                {
                                    akala.eachAsync(param, function (config, key, next)
                                    {
                                        updateConfig(config, key).then(function ()
                                        {
                                            next();
                                        }, next);
                                    }, function (err?)
                                        {
                                            if (err)
                                                reject(err);
                                            resolve();
                                        });
                                });
                            },
                            getConfig: async function (param: { key?: string })
                            {
                                var config = await getConfig()
                                if (param.key)
                                {
                                    return param.key.split('.').reduce(function (config, key)
                                    {
                                        return config[key];
                                    }, config);
                                }
                                else
                                    return config;
                            },
                            module: function (param: { module: string }, socket: Connection)
                            {
                                log('received module event %s', param.module);
                                socket.submodule = param.module;
                                Object.defineProperty(socketModules, param.module, { configurable: false, writable: true, value: socket });

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
                            }
                        });

                        master.on('ready', function ()
                        {
                            sockets.ready(null);
                        });

                        cluster.setupMaster(<any>{
                            args: [plugin, httpPackage + '://' + dn + ':' + port],
                            execArgv: []
                        });
                        var worker = cluster.fork();
                        app.get('/api/manage/restart/' + folder, function ()
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
                                args: [plugin, dn + ':' + port]
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
                            require(masterPath);
                            akala.unregister('$module');
                            // orchestratorLog(globalWorkers);
                            // console.log('emitting after-master for ' + plugin);
                            modulesEvent[plugin].emit('after-master');

                            next();
                        });


                        if (typeof (modulesEvent[plugin]['master']) != 'undefined')
                            modulesEvent[plugin].emit('master', modulesEvent[plugin]['master']);
                    });

                });

                next();
            });
        }, function (error?)
            {
                if (error)
                {
                    console.error(error);
                    return;
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
                        if (request.url.endsWith('.map'))
                        {
                            response.sendStatus(404);
                        }
                        fs.createReadStream(root + '/index.html').pipe(response);
                    });

                    masterRouter.use(function (err, req: Request, res: Response, next)
                    {
                        try
                        {
                            if (err)
                            {
                                console.error('error occurred on ' + req.url);

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

    if (httpPackage == 'http')
    {
        const http = require('http');
        var server = http.createServer();
    }
    else
    {
        const https = require('https');
        var server = https.createServer({ key: fs.readFileSync('privkey.pem'), cert: fs.readFileSync('fullchain.pem') });
    }
    // var server = http2.createSecureServer({ allowHTTP1: true, key: fs.readFileSync('priv.pem'), cert: fs.readFileSync('fullchain.pem') });
    server.listen(port, dn);
    masterRouter.attachTo(server);
});

