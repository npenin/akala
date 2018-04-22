import * as jsonrpc from '@akala/json-rpc-ws'
import { Proxy } from '../each'
import { extend } from '../helpers'

import * as debug from 'debug'
import { PayloadDataType, Payload } from '@akala/json-rpc-ws/lib/connection';
import { Api } from './base';

var log = debug('akala:metadata')
var clientLog = debug('akala:metadata:client');

export class Builder<TConnection extends jsonrpc.Connection,
    TServerOneWay,
    TServerTwoWay,
    TClientOneWay,
    TClientTwoWay,
    TServerOneWayProxy extends TServerOneWay,
    TServerTwoWayProxy extends TServerTwoWay,
    TClientOneWayProxy extends TClientOneWay,
    TClientTwoWayProxy extends TClientTwoWay>
{
    constructor(private api: Api<{
        [key: string]: any
    }, TConnection, TServerOneWay, TServerTwoWay,
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
        this.api.serverOneWayKeys.forEach(function (serverKey)
        {
            proxy[serverKey] = <any>function (params)
            {
                log('calling ' + serverKey + ' with %o', params);
                return new Promise<void>((resolve, reject) =>
                {
                    client.send(serverKey, params, function (error)
                    {
                        if (error)
                            reject(error);
                        else
                            resolve();
                    });
                });
            }
        });

        this.api.serverTwoWayKeys.forEach(function (serverKey)
        {
            proxy[serverKey] = <any>function (params)
            {
                log('calling ' + serverKey + ' with %o', params);
                return new Promise<PayloadDataType>((resolve, reject) =>
                {
                    client.send(serverKey, params, function (error, result)
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
        this.api.clientOneWayKeys.forEach(function (clientKey)
        {
            proxy[clientKey] = <any>function (params)
            {
                log('calling ' + clientKey + ' with %o', params);
                return new Promise<PayloadDataType>((resolve, reject) =>
                {
                    client.sendMethod(clientKey, params, function (error, result)
                    {
                        if (error)
                            reject(error);
                        else
                            resolve(result);
                    });
                });
            }
        });

        this.api.clientTwoWayKeys.forEach(function (clientKey)
        {
            proxy[clientKey] = <any>function (params)
            {
                log('calling ' + clientKey + ' with %o', params);
                return new Promise<PayloadDataType>((resolve, reject) =>
                {
                    client.sendMethod(clientKey, params, function (error, result)
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

    public createClientFromAbsoluteUrl(url: string, clientImpl: TClientOneWay & TClientTwoWay, ...rest: any[]): PromiseLike<TClientOneWay & TClientTwoWay & { $proxy(): Partial<TServerOneWayProxy & TServerTwoWayProxy> }>
    {
        var client = jsonrpc.createClient<TConnection>();
        var result = this.createClient(client)(clientImpl);
        return new Promise((resolve, reject) =>
        {
            client.connect(url, function ()
            {
                resolve(result);
            })
        });
    }

    public createLateBoundClient(clientImpl: TClientOneWay & TClientTwoWay): TClientOneWay & TClientTwoWay & { $proxy(): Partial<TServerOneWayProxy & TServerTwoWayProxy>, $connect(url: string, connected: () => void): void }
    {
        var client = jsonrpc.createClient<TConnection>();
        return extend({
            $connect: function (url, connected)
            {
                client.connect(url, connected);
            }
        }, this.createClient(client)(clientImpl));
    }

    public createClient(client: jsonrpc.Client<TConnection>): (clientImpl: TClientOneWay & TClientTwoWay, ...dummy: any[]) => TClientOneWay & TClientTwoWay & { $proxy(): Partial<TServerOneWayProxy & TServerTwoWayProxy> }
    {
        return (clientImpl: TClientOneWay & TClientTwoWay, ...dummy: any[]) =>
        {
            dummy.unshift(clientImpl);
            dummy.push({
                $proxy: () =>
                {
                    return this.createServerProxy(client);
                }
            });
            var clientImplWithProxy = <TClientOneWay & TClientTwoWay & { $proxy(): Partial<TServerOneWayProxy & TServerTwoWayProxy> }>extend.apply(this, dummy);

            this.api.clientOneWayKeys.forEach(function (clientKey)
            {
                client.expose(clientKey, function (params, reply)
                {
                    try
                    {
                        Promise.resolve((<any>clientImplWithProxy[clientKey])(params)).then(function (result)
                        {
                            reply(null, result);
                        }, function (reason)
                            {
                                reply(reason);
                            });
                    }
                    catch (e)
                    {
                        reply({ message: e.message, stack: e.stack, argv: process.argv });
                    }
                })
            });

            this.api.clientTwoWayKeys.forEach(function (clientKey)
            {
                client.expose(clientKey, function (params, reply)
                {
                    try
                    {
                        Promise.resolve((<any>clientImplWithProxy[clientKey])(params)).then(function (result)
                        {
                            reply(null, result);
                        }, function (reason)
                            {
                                reply(reason);
                            });
                    }
                    catch (e)
                    {
                        reply({ message: e.message, stack: e.stack, argv: process.argv });
                    }
                });
            });

            return clientImplWithProxy;
        }
    }
}