import { Api, DualApi, IServerProxyBuilder, IClientBuilder, IServerBuilder } from './base'

export * from './base';

import { JsonRpcWs } from './json-rpc-ws'
import * as jsonrpc from '@akala/json-rpc-ws'
import { Rest } from './rest'
import './rest';
import './json-rpc-ws';
import { module, each } from '../helpers';
import { Http } from '../http';

export namespace api
{
    export function jsonrpcws<TConnection extends jsonrpc.Connection, TServerOneWay, TServerTwoWay, TClientOneWay, TClientTwoWay, TServerOneWayProxy extends TServerOneWay, TServerTwoWayProxy extends TServerTwoWay, TClientOneWayProxy extends TClientOneWay, TClientTwoWayProxy extends TClientTwoWay>(api: Api<TConnection, TServerOneWay, TServerTwoWay, TClientOneWay, TClientTwoWay, TServerOneWayProxy, TServerTwoWayProxy, TClientOneWayProxy, TClientTwoWayProxy>)
        : JsonRpcWs<TConnection, TServerOneWay, TServerTwoWay, TClientOneWay, TClientTwoWay, TServerOneWayProxy, TServerTwoWayProxy, TClientOneWayProxy, TClientTwoWayProxy>
    {
        return new (module('$api').resolve('jsonrpcws'))(api);
    }

    export function rest<TConnection, TServerOneWay, TServerTwoWay, TClientOneWay, TClientTwoWay, TServerOneWayProxy extends TServerOneWay, TServerTwoWayProxy extends TServerTwoWay, TClientOneWayProxy extends TClientOneWay, TClientTwoWayProxy extends TClientTwoWay>(api: Api<TConnection, TServerOneWay, TServerTwoWay, TClientOneWay, TClientTwoWay, TServerOneWayProxy, TServerTwoWayProxy, TClientOneWayProxy, TClientTwoWayProxy>)
        : Rest<TConnection, TServerOneWay, TServerTwoWay, TClientOneWay, TClientTwoWay, TServerOneWayProxy, TServerTwoWayProxy, TClientOneWayProxy, TClientTwoWayProxy>
    {
        return new (module('$api').resolve('rest'))(api);
    }

    export type ServerProxy<T extends Api<any, any, any, any, any, any, any, any, any>> = T extends Api<any, any, any, any, any, infer OW, infer TW, any, any> ? OW & TW : any;
    export type Server<T extends Api<any, any, any, any, any, any, any, any, any>> = T extends Api<infer OW, infer TW, any, any, any, any, any, any, any> ? OW & TW : any;
    export type ClientProxy<T extends Api<any, any, any, any, any, any, any, any, any>> = T extends Api<any, any, any, any, any, any, any, infer OW, infer TW> ? OW & TW : any;
    export type Client<T extends Api<any, any, any, any, any, any, any, any, any>> = T extends Api<any, infer OW, infer TW, any, any, any, any, any, any> ? OW & TW : any;

}

export function server<TConnection extends jsonrpc.Connection, TServerOneWay, TServerTwoWay, TClientOneWay, TClientTwoWay, TServerOneWayProxy extends TServerOneWay, TServerTwoWayProxy extends TServerTwoWay, TClientOneWayProxy extends TClientOneWay, TClientTwoWayProxy extends TClientTwoWay>(api: Api<TConnection, TServerOneWay, TServerTwoWay, TClientOneWay, TClientTwoWay, TServerOneWayProxy, TServerTwoWayProxy, TClientOneWayProxy, TClientTwoWayProxy>, config)
{
    return function (impl: new () => TServerOneWay & TServerTwoWay)
    {
        var implInstance = new impl();
        buildServer(api, config, implInstance);
        return implInstance;
    }
}

export function buildServer<TConnection extends jsonrpc.Connection, TServerOneWay, TServerTwoWay, TClientOneWay, TClientTwoWay, TServerOneWayProxy extends TServerOneWay, TServerTwoWayProxy extends TServerTwoWay, TClientOneWayProxy extends TClientOneWay, TClientTwoWayProxy extends TClientTwoWay>(api: Api<TConnection, TServerOneWay, TServerTwoWay, TClientOneWay, TClientTwoWay, TServerOneWayProxy, TServerTwoWayProxy, TClientOneWayProxy, TClientTwoWayProxy>, config, implInstance: TServerOneWay & TServerTwoWay)
{
    each(config, function (cfg, key)
    {
        if (cfg === false)
            return;
        var builderCtor = module('$api').resolve(key as string);
        if (builderCtor)
        {
            var builder = new builderCtor(api) as IServerBuilder<any, TConnection, TServerOneWay, TServerTwoWay, TClientOneWay, TClientTwoWay, TServerOneWayProxy, TServerTwoWayProxy, TClientOneWayProxy, TClientTwoWayProxy>;
            if (builder.createServer)
                builder.createServer(cfg, implInstance);
        }
    })
}

export function client<TConnection extends jsonrpc.Connection, TServerOneWay, TServerTwoWay, TClientOneWay, TClientTwoWay, TServerOneWayProxy extends TServerOneWay, TServerTwoWayProxy extends TServerTwoWay, TClientOneWayProxy extends TClientOneWay, TClientTwoWayProxy extends TClientTwoWay>(api: Api<TConnection, TServerOneWay, TServerTwoWay, TClientOneWay, TClientTwoWay, TServerOneWayProxy, TServerTwoWayProxy, TClientOneWayProxy, TClientTwoWayProxy>, config)
{
    return function (impl: new () => TClientOneWay & TClientTwoWay)
    {
        var implInstance = new impl();
        buildClient(api, config, implInstance);
        return implInstance;
    }
}

export function buildClient<TConnection extends jsonrpc.Connection, TServerOneWay, TServerTwoWay, TClientOneWay, TClientTwoWay, TServerOneWayProxy extends TServerOneWay, TServerTwoWayProxy extends TServerTwoWay, TClientOneWayProxy extends TClientOneWay, TClientTwoWayProxy extends TClientTwoWay>(api: Api<TConnection, TServerOneWay, TServerTwoWay, TClientOneWay, TClientTwoWay, TServerOneWayProxy, TServerTwoWayProxy, TClientOneWayProxy, TClientTwoWayProxy>, config, implInstance: TClientOneWay & TClientTwoWay)
{
    each(config, function (cfg, key)
    {
        if (cfg === false)
            return;
        createClient(key as string, api, cfg, implInstance);
    })
}

export function createServerProxy<T, TConnection,
    TServerOneWay,
    TServerTwoWay,
    TClientOneWay,
    TClientTwoWay,
    TServerOneWayProxy extends TServerOneWay,
    TServerTwoWayProxy extends TServerTwoWay,
    TClientOneWayProxy extends TClientOneWay,
    TClientTwoWayProxy extends TClientTwoWay>(builderName: string, api: Api<TConnection,
        TServerOneWay,
        TServerTwoWay,
        TClientOneWay,
        TClientTwoWay,
        TServerOneWayProxy,
        TServerTwoWayProxy,
        TClientOneWayProxy,
        TClientTwoWayProxy>, client: T)
{
    var builder: new (api: Api<TConnection, TServerOneWay, TServerTwoWay, TClientOneWay, TClientTwoWay, TServerOneWayProxy, TServerTwoWayProxy, TClientOneWayProxy, TClientTwoWayProxy>) =>
        IServerProxyBuilder<T, TConnection,
        TServerOneWay,
        TServerTwoWay,
        TClientOneWay,
        TClientTwoWay,
        TServerOneWayProxy,
        TServerTwoWayProxy,
        TClientOneWayProxy,
        TClientTwoWayProxy> = module('$api').resolve(builderName);
    if (!builder)
        return null;
    return new builder(api).createServerProxy(client);
}

export function createClient<T, TImpl extends TClientOneWay & TClientTwoWay, TConnection,
    TServerOneWay,
    TServerTwoWay,
    TClientOneWay,
    TClientTwoWay,
    TServerOneWayProxy extends TServerOneWay,
    TServerTwoWayProxy extends TServerTwoWay,
    TClientOneWayProxy extends TClientOneWay,
    TClientTwoWayProxy extends TClientTwoWay>(builderName: string, api: Api<TConnection,
        TServerOneWay,
        TServerTwoWay,
        TClientOneWay,
        TClientTwoWay,
        TServerOneWayProxy,
        TServerTwoWayProxy,
        TClientOneWayProxy,
        TClientTwoWayProxy>, client: T, clientImplementation: TImpl)
{
    var builder: new (api: Api<TConnection, TServerOneWay, TServerTwoWay, TClientOneWay, TClientTwoWay, TServerOneWayProxy, TServerTwoWayProxy, TClientOneWayProxy, TClientTwoWayProxy>) =>
        IClientBuilder<T, TConnection,
        TServerOneWay,
        TServerTwoWay,
        TClientOneWay,
        TClientTwoWay,
        TServerOneWayProxy,
        TServerTwoWayProxy,
        TClientOneWayProxy,
        TClientTwoWayProxy> = module('$api').resolve(builderName);
    if (!builder)
        return null;
    return new builder(api).createClient(client, clientImplementation);
}
