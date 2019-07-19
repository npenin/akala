import * as cluster from 'cluster';
import * as pac from './package';
import { EventEmitter } from 'events';
import * as sequencify from 'sequencify';
import * as akala from '@akala/core';
import * as Orchestrator from 'orchestrator';
import { HttpRouter } from './router';
import * as debug from 'debug';
import { serveRouter } from './master-meta';
const log = debug('akala:master');
import { meta } from './api/jsonrpc';
import { api } from '.'
import * as st from 'serve-static';
import * as jsonrpc from '@akala/json-rpc-ws';
import * as ws from 'ws';
import { relative, sep as pathSeparator, dirname, join as pathJoin } from 'path';
import { updateConfig, getConfig, writeConfig } from './config'

interface Connection extends jsonrpc.Connection
{
    submodule?: string;
}


export function microservice(
    folder: string,
    plugin: string,
    source: string,
    sources: string[],
    config: {},
    modulesDefinitions: { [name: string]: sequencify.definition },
    modulesEvent: { [key: string]: EventEmitter },
    orchestrator: Orchestrator,
    preAuthenticatedRouter: HttpRouter,
    globalWorkers: {},
    app: HttpRouter,
    master: EventEmitter,
    socketModules: { [module: string]: Connection },
    url: string,
    tmpModules: string[]
)
{

    switch (source)
    {
        case '@akala':
            if (plugin == '@akala/server' || plugin == '@akala/client')
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

            preAuthenticatedRouter.useGet('/assets/' + plugin, st('node_modules/' + plugin + '/assets') as any);

            preAuthenticatedRouter.useGet('/' + plugin, st('node_modules/' + plugin + '/views') as any);

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

                modulesEvent[param.module] = modulesEvent[param.module] || new EventEmitter();

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

        debugger;
        var forkArgs = process.argv.slice(2);
        forkArgs.push(plugin, url)
        cluster.setupMaster({
            args: forkArgs,
            // execArgv: []
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
                updateConfig(config[plugin], plugin);
                return;
            }
            cluster.setupMaster({
                args: [plugin, url]
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
            akala.register('$isModule', function (p) { return false; }, true);
            require(masterPath);
            akala.unregister('$module');
            akala.unregister('$isModule');
            // orchestratorLog(globalWorkers);
            // console.log('emitting after-master for ' + plugin);
            modulesEvent[plugin].emit('after-master');

            next();
        });


        if (typeof (modulesEvent[plugin]['master']) != 'undefined')
            modulesEvent[plugin].emit('master', modulesEvent[plugin]['master']);
    });
}