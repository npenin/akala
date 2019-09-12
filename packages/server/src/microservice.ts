import * as pac from './package';
import * as akala from '@akala/core';
import { HttpRouter } from './router';
import * as debug from 'debug';
import * as master from './master-meta'

export function microservice(
    plugin: string,
    source: string,
    sources: string[],
    config: {},
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
        dependencies.forEach(function (dep)
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


    var module = akala.module(
        plugin,
        ...dependencies
    );
    // module.register('$config', akala.chain(function (keys: string[])
    // {
    //     akala.resolve('$config.' + plugin + '.' + keys.join('.'));
    // }, function (keys, key: string)
    //     {
    //         keys.push(key);
    //         return keys;
    //     }));

    module.init(['$preAuthenticationRouter'], function (preAuthenticatedRouter: HttpRouter)
    {
        preAuthenticatedRouter.useGet('/assets/' + plugin, master.serveStatic('node_modules/' + plugin + '/assets'));

        preAuthenticatedRouter.useGet('/' + plugin, master.serveStatic('node_modules/' + plugin + '/views') as any);

    });

    require(plugin);
}