import * as core from '@akala/core';
import * as jsonrpc from '@akala/json-rpc-ws';
import { url } from 'inspector';

export var $$injector: core.Module = window['akala'] = core.extend(core.module('akala', 'akala-services', 'controls'),
    {
        promisify: core.Promisify,
        isPromiseLike: core.isPromiseLike,
        Binding: core.Binding,
        ObservableArray: core.ObservableArray,
        map: core.map,
        each: core.each,
        eachAsync: core.eachAsync,
        extend: core.extend,
        api: core.api,
        Api: core.Api,
        DualApi: core.DualApi,
        module: core.module,
        Module: core.Module,
        service: core.service
    });

export
{
    Promisify as promisify,
    isPromiseLike,
    map,
    each,
    eachAsync,
    extend,
    Binding,
    ObservableArray,
    Translator,
    inject,
    injectNew,
    injectNewWithName,
    injectWithName,
    injectWithNameAsync,
    Api,
    DualApi,
    api,
    module,
    Module
} from '@akala/core';

export var serviceModule: core.Module = core.module('akala-services')

export function resolveUrl(namespace: string)
{
    var root = document.head.querySelector('base').href;
    return new URL(namespace, root);
}

core.register('$resolveUrl', resolveUrl)

export function createClient<TConnection extends jsonrpc.Connection>(namespace: string): PromiseLike<jsonrpc.Client<TConnection>>
{
    var client = jsonrpc.createClient<TConnection>();
    var resolveUrl: (url: string) => string = core.resolve('$resolveUrl');
    if (!resolveUrl)
        throw new Error('no url resolver could be found');
    return new Promise<jsonrpc.Client<TConnection>>((resolve, reject) =>
    {
        client.connect(resolveUrl(namespace), function ()
        {
            resolve(client);
        });
    });
}

$$injector.register('$agent', core.chain(createClient, function (keys, key: string)
{
    keys.push(key);
    return keys;
}))

export function service(name, ...toInject: string[])
{
    return function (target: new (...args: any[]) => any)
    {
        var instance = null;
        if (toInject == null || toInject.length == 0 && target.length > 0)
            throw new Error('missing inject names');
        else
            serviceModule.registerFactory(name, function ()
            {
                return instance || serviceModule.injectWithName(toInject, function () 
                {
                    var args = [null];
                    for (var i = 0; i < arguments.length; i++)
                        args[i + 1] = arguments[i];
                    return instance = new (Function.prototype.bind.apply(target, args));
                })();
            });
    };
}