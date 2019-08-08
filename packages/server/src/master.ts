import * as fs from 'fs';
import * as jsonrpc from '@akala/json-rpc-ws';
import * as akala from '@akala/core';
import { join as pathJoin } from 'path';
import * as debug from 'debug';
// import * as $ from 'underscore';
import { EventEmitter } from 'events';
import { router, Request, Response } from './router';
import * as pac from './package';
var log = debug('akala:master');
var orchestratorLog = debug('akala:master:orchestrator');
import * as Orchestrator from 'orchestrator';
import { microservice } from './microservice';
import { updateConfig, getConfig } from './config';
// import * as st from 'serve-static';
import { serveStatic } from './master-meta';

var httpPackage: 'http' | 'https' = 'http';

var port = process.env.PORT || '5678';

// if (process.execArgv && process.execArgv.length >= 1)
//     process.execArgv[0] = process.execArgv[0].replace('-brk', '');



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

var root: string;
var index: string;
var privateKey: string;
var fullchain: string;

var configFile = fs.realpathSync('./config.json');
fs.exists(configFile, function (exists)
{
    var config = exists && require(configFile) || {};

    root = config && config['@akala/server'] && config['@akala/server'].root;
    index = config && config['@akala/server'] && config['@akala/server'].index;
    port = config && config['@akala/server'] && config['@akala/server'].port || port;
    privateKey = config && config['@akala/server'] && config['@akala/server'].privateKey || 'privkey.pem';
    fullchain = config && config['@akala/server'] && config['@akala/server'].fullchain || 'fullchain.pem';
    if (fs.existsSync(privateKey) && fs.existsSync(fullchain))
        httpPackage = 'https';


    var dn = config && config['@akala/server'] && config['@akala/server'].dn || 'localhost';

    akala.register('$rootUrl', httpPackage + '://' + dn + ':' + port);

    var sourcesFile = './sources.list';
    fs.readFile(sourcesFile, 'utf8', function (error, sourcesFileContent)
    {
        var sources: string[] = [];
        var modules: string[] = [];
        if (error && error.code == 'ENOENT')
        {
            var pkg: pac.CoreProperties = require(pathJoin(process.cwd(), './package.json'))
            var [source, folder] = pkg.name.split('/');
            microservice(pkg.name, source, [source], config);
            modules.push(pkg.name)
        }
        else
        {
            sources = JSON.parse(sourcesFileContent);
        }
        akala.eachAsync(sources, function (source, i, next)
        {
            fs.readdir('node_modules/' + source, function (err, dirModules)
            {
                if (err)
                {
                    console.error(err);
                    return;
                }

                dirModules.forEach(function (folder)
                {
                    microservice(source + '/' + folder, source, [source], config);
                    modules.push(source + '/' + folder);
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

                akala.register('$$modules', modules);

                log(modules);

                akala.module('bootstrap', ...modules).init([], function ()
                {
                    log('registering error handler');

                    var serveRoot = serveStatic(root, { index: index || undefined })
                    preAuthenticatedRouter.use(serveStatic(root, { index: index || undefined, fallthrough: true }));
                    preAuthenticatedRouter.get('/favicon.ico', serveStatic(root, { index: index || undefined, fallthrough: false }));
                    preAuthenticatedRouter.get('/manifest.json', serveStatic(root, { index: index || undefined, fallthrough: false }));
                    app.get('*', function (request, response)
                    {
                        if (request.url.endsWith('.map'))
                        {
                            response.sendStatus(404);
                        }
                        serveRoot(request, response, function ()
                        {
                            fs.createReadStream(root + '/index.html').pipe(response);
                        });
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

                });

                akala.module('bootstrap').run(['$rootUrl'], function (url)
                {
                    console.log('server ready and listening on ' + url + '...');
                })

                akala.module('bootstrap').start();
            });
    });

    switch (httpPackage)
    {
        case 'http':
            const http = require('http');
            var server = http.createServer();
            break;
        case 'https':
            // const http2 = require('http2');
            // var server = http2.createSecureServer({ allowHTTP1: true, key: fs.readFileSync('priv.pem'), cert: fs.readFileSync('fullchain.pem') });
            const https = require(httpPackage);
            var server = https.createServer({ key: fs.readFileSync(privateKey), cert: fs.readFileSync(fullchain) });
            break;
    }
    server.listen(port, dn);
    masterRouter.attachTo(server);
});

