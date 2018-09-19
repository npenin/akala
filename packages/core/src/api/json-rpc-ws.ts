import * as jsonrpc from '@akala/json-rpc-ws'
import { Proxy, each } from '../each'
import { extend, module } from '../helpers'

import * as debug from 'debug'
import { PayloadDataType, Payload } from '@akala/json-rpc-ws/lib/connection';
import { Api, IClientBuilder, IServerProxyBuilder, IClientProxyBuilder } from './base';

var log = debug('akala:metadata')
var clientLog = debug('akala:metadata:client');

export type Connection = jsonrpc.Connection;

export class JsonRpcWs<TConnection extends jsonrpc.Connection,
    TServerOneWay,
    TServerTwoWay,
    TClientOneWay,
    TClientTwoWay,
    TServerOneWayProxy extends TServerOneWay,
    TServerTwoWayProxy extends TServerTwoWay,
    TClientOneWayProxy extends TClientOneWay,
    TClientTwoWayProxy extends TClientTwoWay>

    implements IServerProxyBuilder<jsonrpc.Client<TConnection>, TConnection, TServerOneWay, TServerTwoWay, TClientOneWay, TClientTwoWay, TServerOneWayProxy, TServerTwoWayProxy, TClientOneWayProxy, TClientTwoWayProxy>,
    IClientProxyBuilder<TConnection, TConnection, TServerOneWay, TServerTwoWay, TClientOneWay, TClientTwoWay, TServerOneWayProxy, TServerTwoWayProxy, TClientOneWayProxy, TClientTwoWayProxy>,
    IClientBuilder<jsonrpc.Client<TConnection>, TConnection, TServerOneWay, TServerTwoWay, TClientOneWay, TClientTwoWay, TServerOneWayProxy, TServerTwoWayProxy, TClientOneWayProxy, TClientTwoWayProxy>
{
    constructor(public api: Api<TConnection, TServerOneWay, TServerTwoWay,
        TClientOneWay,
        TClientTwoWay,
        TServerOneWayProxy,
        TServerTwoWayProxy,
        TClientOneWayProxy,
        TClientTwoWayProxy>)
    {

    }

    public createServerProxy(client: jsonrpc.Client<TConnection>): Partial<TServerOneWayProxy & TServerTwoWayProxy>
    {
        var proxy: Partial<TServerOneWayProxy & TServerTwoWayProxy> = {};
        each(this.api.serverOneWayConfig, function (config, serverKey)
        {
            if (config['jsonrpcws'] !== false)
                proxy[serverKey] = <any>function (params)
                {
                    log('calling ' + serverKey + ' with %o', params);
                    return new Promise<void>((resolve, reject) =>
                    {
                        client.send(serverKey as string, params, function (error)
                        {
                            if (error)
                                reject(error);
                            else
                                resolve();
                        });
                    });
                }
        });

        each(this.api.serverTwoWayConfig, function (config, serverKey)
        {
            if (config['jsonrpcws'] !== false)
                proxy[serverKey] = <any>function (params)
                {
                    log('calling ' + serverKey + ' with %o', params);
                    return new Promise<PayloadDataType>((resolve, reject) =>
                    {
                        client.send(serverKey as string, params, function (error, result)
                        {
                            if (error)
                                reject(error);
                            else
                                resolve(result);
                        });
                    });
                }
        });

        return proxy;
    }


    public createClientProxy(client: TConnection): Partial<TClientOneWayProxy & TClientTwoWayProxy>
    {
        var proxy: Partial<TClientOneWayProxy & TClientTwoWayProxy> = {};
        each(this.api.clientOneWayConfig, function (config, clientKey)
        {
            if (config['jsonrpcws'] !== false)
                proxy[clientKey] = <any>function (params)
                {
                    log('calling ' + clientKey + ' with %o', params);
                    return new Promise<PayloadDataType>((resolve, reject) =>
                    {
                        client.sendMethod(clientKey as string, params, function (error, result)
                        {
                            if (error)
                                reject(error);
                            else
                                resolve(result);
                        });
                    });
                }
        });

        each(this.api.clientTwoWayConfig, function (config, clientKey)
        {
            if (config['jsonrpcws'] !== false)
                proxy[clientKey] = <any>function (params)
                {
                    log('calling ' + clientKey + ' with %o', params);
                    return new Promise<PayloadDataType>((resolve, reject) =>
                    {
                        client.sendMethod(clientKey as string, params, function (error, result)
                        {
                            if (error)
                                reject(error);
                            else
                                resolve(result);
                        });
                    });
                }
        });

        return proxy;
    }

    public createClientFromAbsoluteUrl<T extends TClientOneWay & TClientTwoWay>(url: string, clientImpl: T, ...rest: any[]): PromiseLike<T & { $proxy(): Partial<TServerOneWayProxy & TServerTwoWayProxy> }>
    {
        var client = jsonrpc.createClient<TConnection>();
        var result = this.createClient<T>(client, clientImpl);
        return new Promise((resolve, reject) =>
        {
            client.connect(url, function ()
            {
                resolve(result);
            })
        });
    }

    public createLateBoundClient<T extends TClientOneWay & TClientTwoWay>(clientImpl: T): T & { $proxy(): Partial<TServerOneWayProxy & TServerTwoWayProxy>, $connect(url: string, connected: () => void): void }
    {
        var client = jsonrpc.createClient<TConnection>();
        return extend({
            $connect: function (url, connected)
            {
                client.connect(url, connected);
            }
        }, this.createClient<T>(client, clientImpl));
    }

    public createClient<T extends TClientOneWay & TClientTwoWay>(client: jsonrpc.Client<TConnection>, clientImpl: T, ...dummy: any[]): T & { $proxy(): Partial<TServerOneWayProxy & TServerTwoWayProxy> }
    {
        dummy.unshift(clientImpl);
        dummy.push({
            $proxy: () =>
            {
                return this.createServerProxy(client);
            }
        });
        var clientImplWithProxy = <TClientOneWay & TClientTwoWay & { $proxy(): Partial<TServerOneWayProxy & TServerTwoWayProxy> }>extend.apply(this, dummy);

        each(this.api.clientOneWayConfig, function (config, clientKey)
        {
            if (config['jsonrpcws'] !== false)
                client.expose(clientKey as string, function (params, reply)
                {
                    try
                    {
                        Promise.resolve((<any>clientImplWithProxy[clientKey])(params)).then(function (result)
                        {
                            reply(null, result);
                        }, function (e)
                            {
                                if (e instanceof Error)
                                    reply({ message: e.message, stack: e.stack, argv: process.argv });
                                else
                                    reply(e);
                            });
                    }
                    catch (e)
                    {
                        reply({ message: e.message, stack: e.stack, argv: process.argv });
                    }
                })
        });

        each(this.api.clientTwoWayConfig, function (config, clientKey)
        {
            if (config['jsonrpcws'] !== false)
                client.expose(clientKey as string, function (params, reply)
                {
                    try
                    {
                        Promise.resolve((<any>clientImplWithProxy[clientKey])(params)).then(function (result)
                        {
                            reply(null, result);
                        }, function (e)
                            {
                                if (e instanceof Error)
                                    reply({ message: e.message, stack: e.stack, argv: process.argv });
                                else
                                    reply(e);
                            });
                    }
                    catch (e)
                    {
                        reply({ message: e.message, stack: e.stack, argv: process.argv });
                    }
                });
        });

        return clientImplWithProxy as T & { $proxy(): TServerOneWayProxy & TServerTwoWayProxy };
    }
}

module('$api').register('jsonrpcws', JsonRpcWs);