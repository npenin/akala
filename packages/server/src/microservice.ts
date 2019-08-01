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

export function microservice(
    plugin: string,
    source: string,
    sources: string[],
    config: {},
    // modulesDefinitions: { [name: string]: akala.Module },
    preAuthenticatedRouter: HttpRouter,
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


    akala.module(
        plugin,
        ...dependencies || []
    ).init([], function ()
    {
        preAuthenticatedRouter.useGet('/assets/' + plugin, st('node_modules/' + plugin + '/assets') as any);

        preAuthenticatedRouter.useGet('/' + plugin, st('node_modules/' + plugin + '/views') as any);

    });

    require(plugin);
}