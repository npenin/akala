#!/usr/bin/env node
import * as debug from 'debug';
// debug.enable('*');
import program, { CliContext, ICommandBuilder } from './router';
import './sdk';
import './config';
import './client';
import './plugins';
import * as fs from 'fs'
import { promisify } from 'util'
import * as akala from '@akala/core'
import * as mock from 'mock-require'
export default program;

mock('@akala/core', akala);

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
                            result[key] = req.options[key];
                            break;
                        case 'param':
                            result[key] = req.params[key];
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
        akala.each(this.api.serverOneWayConfig, function (config, name)
        {
            if (config && config.cli && config.cli.command)
            {
                var cmd = router.command(config.cli.command).action(function (context)
                {
                    var param = {};

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

        akala.each(this.api.serverTwoWayConfig, function (config, name)
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
            akala.each(content.plugins, function (plugin, name)
            {
                require(plugin);
            });
        }
    }

    program.process(process.argv.slice(2));
})();