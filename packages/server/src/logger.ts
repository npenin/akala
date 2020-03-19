
import * as cluster from 'cluster';
import * as core from '@akala/core'

let customOutputs = ['error', 'warn', 'verbose', 'debug', 'info']

export interface Logger
{
    error?: debug.IDebugger,
    warn?: debug.IDebugger,
    verbose?: debug.IDebugger,
    debug?: debug.IDebugger,
    info?: debug.IDebugger,
    [key: string]: debug.IDebugger
}

export var logger: Logger & ((rootNamespace: string) => Logger) = <any>new Proxy(function (rootNamespace: string): Logger
{
    return new Proxy({}, {
        get: function (target, prop)
        {
            if (!Reflect.has(target, prop) && typeof (prop) == 'string')
                target[prop] = log(prop + ':' + rootNamespace);
            return Reflect.get(target, prop);
        }
    })
}, {
    get: function (target, prop)
    {
        if (!Reflect.has(target, prop) && typeof (prop) == 'string')
            target[prop] = log(prop);
        return Reflect.get(target, prop);
    }
});

export function log(namespace: string): debug.Debugger
{
    if (!cluster.isMaster)
    {
        var customOutput = customOutputs.find(o => namespace.startsWith(o + ':'));
        if (customOutput)
            namespace = namespace.substring((customOutput + ':').length);

        customOutput = customOutput || customOutputs.find(o => namespace == o);

        var moduleNamespace = process.argv[2].replace(/[@\/]/g, ':');
        if (moduleNamespace[0] == ':')
            moduleNamespace = moduleNamespace.substring(1);
        if (customOutput)
        {
            if (namespace == moduleNamespace || customOutput == namespace)
                namespace = moduleNamespace = customOutput + ':' + moduleNamespace;
            else
                moduleNamespace = customOutput + ':' + moduleNamespace;
        }
        if (!namespace.startsWith(moduleNamespace))
            namespace = moduleNamespace + ':' + namespace;
    }
    return core.log(namespace);
}