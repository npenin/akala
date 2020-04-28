#!/usr/bin/env node
require('source-map-support').install();
import * as debug from 'debug';
debug.enable('*,-*:verbose');
// debug.enable('*,-*:verbose,-router*');
import program, { CliContext, ICommandBuilder } from './router';
import './sdk';
import './client';
import './plugins';
import './helpers/newmodule';
import './helpers/repl';
import * as fs from 'fs'
import { promisify } from 'util'
import * as akala from '@akala/core'
import mock from 'mock-require'
import { join } from 'path';
import * as cluster from 'cluster'
import { EventEmitter } from 'events';
export default program;
require.cache[module.filename] = module;

mock('@akala/core', akala);


program.command('run [cwd]').action(function (context)
{
    mock('@akala/core', akala)
    mock('@akala/server', require('@akala/server'))
    // debugger;
    var pkg = require(join(process.cwd(), context.params.cwd, './package.json'));
    mock(pkg.name + '/package.json', pkg);

    if (context.params.cwd)
        process.chdir(context.params.cwd);

    akala.unregister('$resolveUrl');

    if (cluster.isWorker)
    {
        process.argv = context.argv;
        akala.register('$isModule', (m) => m == pkg.name);
        akala.register('$master', function (...args)
        {
            akala.onResolve<EventEmitter>('$worker').then(w => w.on('master', function (master: Function)
            {
                master.apply(this, args);
            }));
        });

        var dummyRouter = {};
        akala.register('$router', new Proxy(dummyRouter, {
            get: function (target, property)
            {
                if (property != 'all' &&
                    property != 'checkout' &&
                    property != 'connect' &&
                    property != 'copy' &&
                    property != 'delete' &&
                    property != 'get' &&
                    property != 'head' &&
                    property != 'lock' &&
                    property != 'm-search' &&
                    property != 'merge' &&
                    property != 'mkactivity' &&
                    property != 'mkcalendar' &&
                    property != 'mkcol' &&
                    property != 'move' &&
                    property != 'notify' &&
                    property != 'options' &&
                    property != 'patch' &&
                    property != 'post' &&
                    property != 'prop' &&
                    property != 'find' &&
                    property != 'proppatch' &&
                    property != 'purge' &&
                    property != 'put' &&
                    property != 'report' &&
                    property != 'search' &&
                    property != 'subscribe' &&
                    property != 'trace' &&
                    property != 'unlock' &&
                    property != 'unsubscribe' &&
                    property != 'use')
                    return target[property];
                return function (...args)
                {
                    if (typeof (target[property] == 'undefined'))
                        target[property] = []
                    target[property].push(args);
                }
            }
        }));
        mock(pkg.name, require(process.cwd()));
        akala.unregister('$updateConfig');
        akala.unregister('$configFactory');
        // akala.unregister('$config');5
        akala.unregister('$isModule');
        akala.unregister('$master');
        akala.unregister('$router');

        if (Object.keys(dummyRouter).length)
        {
            akala.onResolve<import('@akala/server').worker.Router>('$router').then(r =>
            {
                Object.keys(dummyRouter).forEach(method => dummyRouter[method].forEach(args => r[method].apply(r, args)))
            });
        }
        // config.init();
        require('@akala/server/dist/worker');
    }
    else
    {
        console.log('running ' + process.cwd());
        akala.register('$isModule', () => false);
        require('@akala/server/dist/master');
    }

    // if (fs.existsSync('./package.json'))
    // {
    //     var pkg = JSON.parse(fs.readFileSync('./package.json', { encoding: 'utf8', flag: 'r' }));
    //     process.argv.splice(2, process.argv.length - 2, pkg.name, 'http://localhost:5678')
    //     require(require.resolve('@akala/server/dist/worker', Module['_nodeModulePaths'](process.cwd())));
    // }
});

export interface CliConfig<T>
{
    command: string;
    param?: { [key in keyof T]: 'param' | 'args' | 'option' } | 'param' | 'args';
    type?: 'json' | 'xml';
}

akala.module('$api').register('cli', class Cli<TConnection, TServerOneWay, TServerTwoWay, TClientOneWay, TClientTwoWay,
    TServerOneWayProxy extends TServerOneWay,
    TServerTwoWayProxy extends TServerTwoWay,
    TClientOneWayProxy extends TClientOneWay,
    TClientTwoWayProxy extends TClientTwoWay> implements akala.IServerBuilder<boolean | string, TConnection,
    TServerOneWay,
    TServerTwoWay,
    TClientOneWay,
    TClientTwoWay,
    TServerOneWayProxy,
    TServerTwoWayProxy,
    TClientOneWayProxy,
    TClientTwoWayProxy>
{
    constructor(public api: akala.Api<TConnection, TServerOneWay, TServerTwoWay, TClientOneWay, TClientTwoWay, TServerOneWayProxy, TServerTwoWayProxy, TClientOneWayProxy, TClientTwoWayProxy>)
    {

    }

    static buildParam(req: CliContext & akala.Request, config: CliConfig<any>, di: akala.Injector)
    {
        switch (config.param)
        {
            case 'param':
                return req.params;
            case 'args':
                return req.args
            default:
                let result: any = {};
                akala.each(config.param, function (value, key)
                {
                    switch (value)
                    {
                        case 'args':
                            result[key] = req.args;
                            break;
                        case 'option':
                            result[key] = req.options[key as string];
                            break;
                        case 'param':
                            result[key] = req.params[key as string];
                            break;
                        default:
                            result[key] = di.resolve(value);
                            break;
                    }
                })
                return result;
        }
    }

    createServer(client: boolean | string, impl: TServerOneWay & TServerTwoWay): Partial<TServerOneWay & TServerTwoWay & {
        proxy: (TConnection) => TClientOneWayProxy & TClientTwoWayProxy;
    }>
    {
        var router: ICommandBuilder = program;
        if (typeof (client) == 'string')
        {
            let indexOfColon = client.indexOf(':');
            if (~indexOfColon)
                router = router.command(client.substr(indexOfColon + 1)).config(client.substr(0, indexOfColon));
            else
                router = router.command(client).config(client);
        }
        akala.each(this.api.serverOneWayConfig, function (config: { cli?: CliConfig<any> }, name)
        {
            if (config && config.cli && config.cli.command)
            {
                var cmd = router.command(config.cli.command).action(function (context)
                {
                    Promise.resolve((impl[name] as any)(Cli.buildParam(context, config.cli, cmd))).then((value) =>
                    {
                        console.log(value)
                    }, (reason) =>
                    {
                        console.error(reason);
                    });
                });
            }
        });

        akala.each(this.api.serverTwoWayConfig, function (config: { cli?: CliConfig<any> }, name)
        {
            if (config && config.cli && config.cli.command)
            {
                var cmd = router.command(config.cli.command).action(function (context)
                {
                    Promise.resolve((impl[name] as any)(Cli.buildParam(context, config.cli, cmd))).then((value) =>
                    {
                        console.log(value)
                    }, (reason) =>
                    {
                        console.error(reason);
                    });
                });
            }
        });

        return impl;
    }

});

(async function ()
{

    if (await promisify(fs.exists)('./config.json'))
    {
        var content = JSON.parse(await promisify(fs.readFile)('./config.json', 'utf-8'));
        if (content.plugins)
        {
            akala.each(content.plugins, function (plugin)
            {
                require(plugin);
            });
        }
    }

    program.process(process.argv.slice(2));
})();