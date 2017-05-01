import * as cluster from 'cluster';
import * as http from 'http';
import * as https from 'https';
import * as url from 'url';
import * as fs from 'fs';
import * as st from 'serve-static';
import * as io from 'socket.io';
import * as di from '@akala/core';
import { relative, sep as pathSeparator, dirname, join as pathJoin } from 'path';
import * as debug from 'debug';
import * as $ from 'underscore';
import { EventEmitter } from 'events';
import { router, Request, Response, CallbackResponse } from './router';
import * as pac from './package';
var log = debug('akala:master');
var orchestratorLog = debug('akala:master:orchestrator');
import * as Orchestrator from 'orchestrator';
import * as sequencify from 'sequencify';

var port = process.argv[2] || '5678';

debugger;
var app = router();
di.register('$router', app);

var configFile = fs.realpathSync('./config.json');
var sourcesFile = fs.realpathSync('./sources.list');
var orchestrator = new Orchestrator();
orchestrator.onAll(function (e)
{
    if (e.src == 'task_not_found')
        console.error(e.message);

    orchestratorLog(e);
})
var socketModules = {};
var modulesEvent = {};
var globalWorkers = {};
var modulesDefinitions: { [name: string]: sequencify.definition } = {};
fs.exists(configFile, function (exists)
{
    var config = null;
    if (exists)
        config = require(configFile);

    fs.readFile(sourcesFile, 'utf8', function (error, sourcesFileContent)
    {
        var sources: string[] = JSON.parse(sourcesFileContent);
        var tmpModules: string[] = [];

        sockets.on('connection', function (socket)
        {
            log('received connection');
            socket.on('module', function (submodule: string, cb: Function)
            {
                log('received module event %s', submodule);
                Object.defineProperty(socketModules, submodule, { configurable: false, writable: true, value: socket });
                socket.on('disconnect', function ()
                {
                    socketModules[submodule] = null;
                })
                socket.join(submodule);

                var moduleEvents = modulesEvent[submodule];
                if (!moduleEvents) //slave
                    moduleEvents = modulesEvent[submodule] = new EventEmitter();

                socket.on('master', function (masterPath?: string, workerPath?: string)
                {
                    log(submodule + ' emitted master event with ' + masterPath);
                    if (workerPath && workerPath.length > 0)
                        globalWorkers[submodule] = workerPath;

                    moduleEvents.emit('master', masterPath);
                });
                // console.log(submodule);
                modulesEvent[submodule].emit('connected', cb);
            });
        });

        di.eachAsync(sources, function (source, i, next)
        {
            fs.readdir('node_modules/' + source, function (err, modules)
            {
                if (err)
                    throw err;

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
                        debugger;
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

                    tmpModules.push(plugin);
                    modulesEvent[plugin] = new EventEmitter();
                    var getDependencies = function ()
                    {
                        var localWorkers = [];
                        sequencify(modulesDefinitions, dependencies, localWorkers)
                        return localWorkers;
                    }

                    var masterDependencies = $.map(dependencies || [], function (dep)
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

                            if (folder != 'assets')
                                app.use('/assets/' + (folder == 'core' ? '' : folder + '/'), <any>st('node_modules/' + plugin + '/assets'));
                            app.use('/bower_components/' + (folder == 'core' ? '' : folder + '/'), <any>st('node_modules/' + plugin + '/bower_components'));

                            app.use('/' + folder, <any>st('node_modules/' + plugin + '/views'));

                            var localWorkers = getDependencies();
                            log('localWorkers for %s: %s', folder, localWorkers);
                            callback(config && config[plugin], $.map(localWorkers, function (dep) { return globalWorkers[dep] }));
                        });

                        app.use('/api/' + folder, function (req: Request, res: Response, next: di.NextFunction)
                        {
                            socketModules[plugin].emit('api', {
                                url: req.url,
                                headers: req.headers,
                                httpVersion: req.httpVersion,
                                ip: req.ip,
                                method: req.method,
                                params: req.params,
                                path: req.path,
                                protocol: req.protocol,
                                query: req.query,
                                rawHeaders: req.rawHeaders,
                                rawTrailers: req.rawTrailers,
                                statusCode: req.statusCode,
                                statusMessage: req.statusMessage,
                                trailers: req.trailers,
                                user: req['user']
                            }, function (status: number | CallbackResponse, data: any)
                                {
                                    if (isNaN(Number(status)))
                                    {
                                        var socketRes: CallbackResponse = status;
                                        if (typeof (data) == 'undefined')
                                        {
                                            data = status;
                                            status = null;
                                        }
                                        else
                                        {
                                            if (socketRes.headers)
                                                Object.keys(socketRes.headers).forEach(function (header)
                                                {
                                                    if (header.toLowerCase() == 'location')
                                                        socketRes.headers[header] = socketRes.headers[header].replace('/api', '/api/' + folder)
                                                    res.setHeader(header, socketRes.headers[header]);
                                                });
                                            res.writeHead(status = socketRes.statusCode || 200);
                                            if (Array.isArray(data))
                                            {
                                                data.forEach(function (chunk)
                                                {
                                                    res.write(chunk);
                                                });
                                                res.end();
                                                return;
                                            }
                                        }
                                    }
                                    log(arguments);
                                    res.statusCode = <number>status || 200;
                                    if (typeof (data) !== 'string' && typeof data != 'number')
                                        data = JSON.stringify(data);
                                    if (typeof (data) != 'undefined')
                                        res.write(data);
                                    console.log(status);
                                    console.log(data);
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
        }, function (error?)
            {
                if (error)
                {
                    debugger;
                    console.error(error);
                }

                var modules = tmpModules;
                di.register('$$modules', modules);
                di.register('$$socketModules', socketModules);
                di.register('$$sockets', sockets);
                log(modules);

                var masterDependencies = [];
                $.each(modules, function (e)
                {
                    masterDependencies.push(e + '#master');
                })

                orchestrator.add('@akala/server#master', function () { });

                orchestrator.add('default', masterDependencies, function ()
                {
                    sockets.emit('ready');
                    log('registering error handler');

                    app.use(function (err, req: Request, res: Response, next)
                    {
                        debugger;
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
app.attachTo(server);
var sockets = io(server);

server.listen(port);