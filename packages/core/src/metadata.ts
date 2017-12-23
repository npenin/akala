import * as jsonrpc from '@akala/json-rpc-ws'
import { Proxy } from './each'
import { extend } from './helpers'

import * as debug from 'debug'

var log = debug('akala:metadata')
var clientLog = debug('akala:metadata:client');

export class Metadata<
    TConnection extends jsonrpc.Connection,
    TServerOneWay,
    TServerTwoWay,
    TClientOneWay,
    TClientTwoWay,
    TServerOneWayProxy extends TServerOneWay,
    TServerTwoWayProxy extends TServerTwoWay,
    TClientOneWayProxy extends TClientOneWay,
    TClientTwoWayProxy extends TClientTwoWay>
{
    constructor()
    {
    }

    public serverOneWayKeys: (keyof TServerOneWay)[] = [];
    public serverTwoWayKeys: (keyof TServerTwoWay)[] = [];
    public clientOneWayKeys: (keyof TClientOneWay)[] = [];
    public clientTwoWayKeys: (keyof TClientTwoWay)[] = [];

    connection<TConnectionNew extends TConnection>(): Metadata<TConnectionNew, TServerOneWay, TServerTwoWay, TClientOneWay, TClientTwoWay, TServerOneWayProxy, TServerTwoWayProxy, TClientOneWayProxy, TClientTwoWayProxy>
    {
        return <any>this;
    }

    clientToServerOneWay<TIn>(): <TImpl>(impl: TImpl) => Metadata<
        TConnection,
        TServerOneWay & Proxy<TImpl, (this: TServerOneWay & TServerTwoWay & { $proxy(socket: TConnection): Partial<TClientOneWayProxy & TClientTwoWayProxy> }, p: TIn, connection?: TConnection) => PromiseLike<void> | void>,
        TServerTwoWay,
        TClientOneWay,
        TClientTwoWay,
        TServerOneWayProxy & Proxy<TImpl, (p: TIn) =>  PromiseLike<void>>,
        TServerTwoWayProxy,
        TClientOneWayProxy,
        TClientTwoWayProxy>
    {
        return (impl) =>
        {
            this.serverOneWayKeys = this.serverOneWayKeys.concat(<any>Object.keys(impl));
            return <any>this;
        }
    }

    clientToServer<TIn, TOut>(): <TImpl>(impl: TImpl) => Metadata<
        TConnection,
        TServerOneWay,
        TServerTwoWay & Proxy<TImpl, (this: TServerOneWay & TServerTwoWay & { $proxy(socket: TConnection): Partial<TClientOneWayProxy & TClientTwoWayProxy> }, p: TIn, connection?: TConnection) => TOut | PromiseLike<TOut>>,
        TClientOneWay,
        TClientTwoWay,
        TServerOneWayProxy,
        TServerTwoWayProxy & Proxy<TImpl, (p: TIn) => PromiseLike<TOut>>,
        TClientOneWayProxy,
        TClientTwoWayProxy>
    {
        return (impl) =>
        {
            this.serverTwoWayKeys = this.serverTwoWayKeys.concat(<any>Object.keys(impl));
            return <any>this;
        }
    }

    serverToClientOneWay<TIn>(): <TImpl>(impl: TImpl) => Metadata<
        TConnection,
        TServerOneWay,
        TServerTwoWay,
        TClientOneWay & Proxy<TImpl, (p: TIn) => PromiseLike<void> | void>,
        TClientTwoWay,
        TServerOneWayProxy,
        TServerTwoWayProxy,
        TClientOneWayProxy & Proxy<TImpl, (p: TIn) => PromiseLike<void>>,
        TClientTwoWayProxy>
    {
        return (impl) =>
        {
            this.clientOneWayKeys = this.clientOneWayKeys.concat(<any>Object.keys(impl));
            return <any>this;
        }
    }

    serverToClient<TIn, TOut>(): <TImpl>(impl: TImpl) => Metadata<
        TConnection,
        TServerOneWay,
        TServerTwoWay,
        TClientOneWay,
        TClientTwoWay & Proxy<TImpl, (p: TIn) => TOut | PromiseLike<TOut>>,
        TServerOneWayProxy,
        TServerTwoWayProxy,
        TClientOneWayProxy,
        TClientTwoWayProxy & Proxy<TImpl, (p: TIn) => PromiseLike<TOut>>>
    {
        return (impl) =>
        {
            this.clientTwoWayKeys = this.clientTwoWayKeys.concat(<any>Object.keys(impl));
            return <any>this;
        }
    }

    public createServerProxy(client: jsonrpc.Client<TConnection>): Partial<TServerOneWayProxy & TServerTwoWayProxy>
    {
        var proxy: Partial<TServerOneWayProxy & TServerTwoWayProxy> = {};
        this.serverOneWayKeys.forEach(function (serverKey)
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

        this.serverTwoWayKeys.forEach(function (serverKey)
        {
            proxy[serverKey] = <any>function (params)
            {
                log('calling ' + serverKey + ' with %o', params);
                return new Promise((resolve, reject) =>
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
        this.clientOneWayKeys.forEach(function (clientKey)
        {
            proxy[clientKey] = <any>function (params)
            {
                log('calling ' + clientKey + ' with %o', params);
                return new Promise((resolve, reject) =>
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

        this.clientTwoWayKeys.forEach(function (clientKey)
        {
            proxy[clientKey] = <any>function (params)
            {
                log('calling ' + clientKey + ' with %o', params);
                return new Promise((resolve, reject) =>
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

            this.clientOneWayKeys.forEach(function (serverKey)
            {
                client.expose(serverKey, function (params, reply)
                {
                    try
                    {
                        Promise.resolve(clientImplWithProxy[serverKey](params)).then(function (result)
                        {
                            reply(null, result);
                        }, reply);
                    }
                    catch (e)
                    {
                        reply(e);
                    }
                })
            });

            this.clientTwoWayKeys.forEach(function (serverKey)
            {
                client.expose(serverKey, function (params, reply)
                {
                    try
                    {
                        Promise.resolve(clientImplWithProxy[serverKey](params)).then(function (result)
                        {
                            reply(null, result);
                        }, reply);
                    }
                    catch (e)
                    {
                        reply(e);
                    }
                });
            });

            return clientImplWithProxy;
        }
    }
}

export class DualMetadata<

    TConnection extends jsonrpc.Connection,
    TServerOneWay,
    TServerTwoWay,
    TClientOneWay,
    TClientTwoWay,
    TServerOneWayProxy extends TServerOneWay,
    TServerTwoWayProxy extends TServerTwoWay,
    TClientOneWayProxy extends TClientOneWay,
    TClientTwoWayProxy extends TClientTwoWay,

    TOConnection extends jsonrpc.Connection,
    TOServerOneWay,
    TOServerTwoWay,
    TOClientOneWay,
    TOClientTwoWay,
    TOServerOneWayProxy extends TOServerOneWay,
    TOServerTwoWayProxy extends TOServerTwoWay,
    TOClientOneWayProxy extends TOClientOneWay,
    TOClientTwoWayProxy extends TOClientTwoWay>
    extends Metadata<
    TConnection & TOConnection,
    TServerOneWay & TOServerOneWay,
    TServerTwoWay & TOServerTwoWay,
    TClientOneWay & TOClientOneWay,
    TClientTwoWay & TOClientTwoWay,
    TServerOneWayProxy & TOServerOneWayProxy,
    TServerTwoWayProxy & TOServerTwoWayProxy,
    TClientOneWayProxy & TOClientOneWayProxy,
    TClientTwoWayProxy & TOClientTwoWayProxy>
{
    constructor(meta1: Metadata<
        TConnection,
        TServerOneWay,
        TServerTwoWay,
        TClientOneWay,
        TClientTwoWay,
        TServerOneWayProxy,
        TServerTwoWayProxy,
        TClientOneWayProxy,
        TClientTwoWayProxy>,
        meta2: Metadata<
            TOConnection,
            TOServerOneWay,
            TOServerTwoWay,
            TOClientOneWay,
            TOClientTwoWay,
            TOServerOneWayProxy,
            TOServerTwoWayProxy,
            TOClientOneWayProxy,
            TOClientTwoWayProxy>)
    {
        super();
        this.clientOneWayKeys = (<(keyof (TClientOneWay & TOClientOneWay))[]>(<any>meta1).clientOneWayKeys).concat((<any>meta2).clientOneWayKeys);
        this.clientTwoWayKeys = (<(keyof (TClientTwoWay & TOClientTwoWay))[]>(<any>meta1).clientTwoWayKeys).concat((<any>meta2).clientTwoWayKeys);
        this.serverOneWayKeys = (<(keyof (TServerOneWay & TOServerOneWay))[]>(<any>meta1).serverOneWayKeys).concat((<any>meta2).serverOneWayKeys);
        this.serverTwoWayKeys = (<(keyof (TServerTwoWay & TOServerTwoWay))[]>(<any>meta1).serverTwoWayKeys).concat((<any>meta2).serverTwoWayKeys);

    }

    public createClient(client: jsonrpc.Client<TConnection & TOConnection>): (clientImpl: TClientOneWay & TClientTwoWay & TOClientOneWay & TOClientTwoWay) =>
        TClientOneWay & TClientTwoWay & TOClientOneWay & TOClientTwoWay & { $proxy(): Partial<TServerOneWayProxy & TServerTwoWayProxy & TOServerOneWayProxy & TOServerTwoWayProxy> }
    public createClient(client: jsonrpc.Client<TConnection & TOConnection>): (clientImpl: TClientOneWay & TClientTwoWay, clientImpl2: TOClientOneWay & TOClientTwoWay) =>
        TClientOneWay & TClientTwoWay & TOClientOneWay & TOClientTwoWay & { $proxy(): Partial<TServerOneWayProxy & TServerTwoWayProxy & TOServerOneWayProxy & TOServerTwoWayProxy> }
    public createClient(client: jsonrpc.Client<TConnection & TOConnection>): (clientImpl: TClientOneWay & TClientTwoWay | TClientOneWay & TClientTwoWay & TOClientOneWay & TOClientTwoWay, clientImpl2?: TOClientOneWay & TOClientTwoWay) =>
        TClientOneWay & TClientTwoWay & TOClientOneWay & TOClientTwoWay & { $proxy(): Partial<TServerOneWayProxy & TServerTwoWayProxy & TOServerOneWayProxy & TOServerTwoWayProxy> }
    {
        return super.createClient(client);
    }
}