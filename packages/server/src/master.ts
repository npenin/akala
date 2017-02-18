import * as cluster from 'cluster';
import * as http from 'http';
import * as https from 'https';
import * as url from 'url';
import * as fs from 'fs';
import * as express from 'express';
import * as io from 'socket.io';
import * as di from 'akala-core';
import { relative, sep as pathSeparator, dirname, join as pathJoin } from 'path';
import * as debug from 'debug';
import * as $ from 'underscore';
import { EventEmitter } from 'events';
var log = debug('akala:master');
var orchestratorLog = debug('akala:master:orchestrator');
import * as Orchestrator from 'orchestrator';
import * as sequencify from 'sequencify';

var port = process.argv[2] || '5678';

var app = express.Router();
di.register('$router', app);
app.use(function (req, res, next)
{
    if (!res.status)
        res.status = function (status: number)
        {
            res.statusCode = status;
            return res;
        }

    if (!res.sendStatus)
        res.sendStatus = function (status: number)
        {
            res.status(status).end();
            return res;
        }

    if (!res.sendStatus)
        res.json = function (content: any)
        {
            if (typeof (content) != 'undefined')
                switch (typeof (content))
                {
                    case 'object':
                        content = JSON.stringify(content);
                }
            res.write(content);
            res.end();
            return res;
        }
    next();
});

var configFile = fs.realpathSync('./domojs.json');
var orchestrator = new Orchestrator();
orchestrator.onAll(function (e)
{
    orchestratorLog(e);
})
var socketModules = {};
var modulesEvent = {};
var globalWorkers = {};
var modulesDefinitions: { [name: string]: sequencify.definition } = {};

fs.readdir('modules', function (err, modules)
{
    if (err)
        throw err;
    fs.exists(configFile, function (exists)
    {
        var config = null;
        if (exists)
            config = require(configFile);

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

                socket.on('master', function (masterPath?: string, workerPath?: string)
                {
                    log(submodule + ' emitted master event with ' + masterPath);
                    if (workerPath && workerPath.length > 0)
                        globalWorkers[submodule] = workerPath;

                    moduleEvents.emit('master', masterPath);
                });

                modulesEvent[submodule].emit('connected', cb);
            });
        })

        var tmpModules = [];
        modules.forEach(function (folder)
        {
            if (!config || config[folder] !== false && (!config[folder] || !config[folder].disabled))
            {
                tmpModules.push(folder);
                modulesEvent[folder] = new EventEmitter();
                var getDependencies = function ()
                {
                    var localWorkers = [];
                    sequencify(modulesDefinitions, modulesDefinitions[folder].dep, localWorkers)
                    return localWorkers;
                }

                var moduleDefinition = require(pathJoin(process.cwd(), 'modules/' + folder + '/package.json'));
                modulesDefinitions[folder] = {
                    name: folder,
                    dep: moduleDefinition.runDependencies || []
                };
                var masterDependencies = $.map(moduleDefinition.runDependencies || [], function (dep)
                {
                    return dep + '#master';
                });

                orchestrator.add(folder, masterDependencies, function (next)
                {
                    var finished = false;
                    modulesEvent[folder].on('connected', function (callback)
                    {
                        if (!finished)
                            next();
                        finished = true;

                        if (folder != 'assets')
                            app.use('/assets/' + (folder == 'core' ? '' : folder), express.static('modules/' + folder + '/assets'));
                        app.use('/bower_components/' + (folder == 'core' ? '' : folder), express.static('modules/' + folder + '/bower_components'));

                        app.use('/' + folder, express.static('modules/' + folder + '/views'));

                        var localWorkers = getDependencies();
                        log('localWorkers for %s: %s', folder, localWorkers);
                        callback(config && config[folder], $.map(localWorkers, function (dep) { return globalWorkers[dep] }));
                    });

                    app.use('/api/' + folder, function (req: express.Request, res: express.Response, next: express.NextFunction)
                    {
                        log(folder);
                        log(req.originalUrl);



                        socketModules[folder].emit('api', {
                            url: req.url,
                            fresh: req.fresh,
                            headers: req.headers,
                            hostname: req.hostname,
                            httpVersion: req.httpVersion,
                            ip: req.ip,
                            ips: req.ips,
                            method: req.method,
                            originalUrl: req.originalUrl,
                            params: req.params,
                            path: req.path,
                            protocol: req.protocol,
                            query: url.parse(req.url, true).query,
                            rawHeaders: req.rawHeaders,
                            rawTrailers: req.rawTrailers,
                            route: req.route,
                            secure: req.secure,
                            stale: req.stale,
                            statusCode: req.statusCode,
                            statusMessage: req.statusMessage,
                            subdomains: req.subdomains,
                            trailers: req.trailers,
                            xhr: req.xhr,
                            user: req['user']
                        }, function (status: number, data: any)
                            {
                                if (isNaN(status))
                                {
                                    data = status;
                                    status = null;
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
                    }, function (err: Error, req: express.Request, res: express.Response, next: express.NextFunction)
                        {
                            if (err)
                            {
                                console.error('error occurred in ' + module);
                                console.error(err.stack);
                            }
                        });

                    cluster.setupMaster({
                        args: [folder, port],
                    });
                    var worker = cluster.fork();
                    app.use('/api/manage/restart/' + folder, function ()
                    {
                        worker.kill();
                    });

                    var handleCrash = function ()
                    {
                        cluster.setupMaster({
                            args: [folder, port]
                        });
                        worker = cluster.fork();
                        worker.on('exit', handleCrash);
                    };
                    worker.on('exit', handleCrash);
                });

                orchestrator.add(folder + '#master', [folder], function (next)
                {
                    modulesEvent[folder].once('master', function (masterPath)
                    {
                        log('moduleReady %s', masterPath);
                        if (!masterPath)
                            return next();
                        masterPath = relative(dirname(module.filename), masterPath);
                        if (pathSeparator == '\\')
                            masterPath = masterPath.replace(/\\/g, '/');
                        log('path being required: ' + masterPath);
                        di.register('$module', folder, true);
                        di.register('$config', config[folder], true);
                        require(masterPath);
                        di.unregister('$config');
                        di.unregister('$module');
                        // orchestratorLog(globalWorkers);


                        next();
                    });
                });
            }
        });

        modules = tmpModules;
        di.register('$$modules', modules);
        di.register('$$socketModules', socketModules);
        di.register('$$sockets', sockets);
        log(modules);

        var masterDependencies = [];
        $.each(modules, function (e)
        {
            masterDependencies.push(e + '#master');
        })

        orchestrator.add('default', masterDependencies, function ()
        {
            sockets.emit('ready');
            log('registering error handler');

            modules.forEach(module =>
            {
            });

            app.use(function deadend(req: express.Request, res: express.Response, next: express.NextFunction)
            {
                res.sendStatus(404);
            });

            app.use(function (err, req: express.Request, res: express.Response, next: express.NextFunction)
            {
                log('pwic');
                try
                {
                    if (err)
                    {
                        console.error('error occurred');
                        console.error(err.stack);
                        res.status(500);
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
        });

        orchestrator.start('default');
    });
});
// https.createServer({}, app).listen(443);
var server = http.createServer(<any>app);
var sockets = io(server);

server.listen(port);