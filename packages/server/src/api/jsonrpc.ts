import * as akala from '@akala/core';
import * as jsonrpc from '@akala/json-rpc-ws';
import * as master from '../master-meta';
import * as router from '../router';
import { Proxy, Api, JsonRpcWs as JsonRpcWsBase, IServerBuilder, IClientProxyBuilder, IClientBuilder } from '@akala/core';
import { ServiceWorker } from '../service-worker'
import * as ws from 'ws';
import { ApiServiceWorker } from './api-service-worker';
import * as net from 'net'

const log = akala.log('akala:metadata');

export function createServer<TConnection extends akala.Connection>(router: router.HttpRouter, path: string)
{
    var server = jsonrpc.createServer<TConnection & jsonrpc.Connection>();
    var wss = server.server = new ws.Server({ noServer: true, clientTracking: true })

    wss.on('connection', function (...args)
    {
        log('received connection');
        server.connected.apply(server, args);
    });

    router.upgrade(path, 'websocket', function (request, socket, head)
    {
        log('received upgrade request');
        request.method = 'GET';
        try
        {
            wss.handleUpgrade(request, socket, head, client =>
            {
                log('emitting connection event');
                wss.emit('connection', client, request);
            });
        }
        finally
        {
            request.method = 'upgrade';
        }
    });

    return server;
}


export function createServerWorker(router: router.HttpRouter, path: string, worker: ApiServiceWorker | string)
{
    var serviceWorker: ApiServiceWorker;

    if (typeof worker == 'string')
        serviceWorker = new ApiServiceWorker(worker);
    else
        serviceWorker = worker;

    router.upgrade(path, 'websocket', function (request, socket, head)
    {
        log('received upgrade request');
        request.method = 'GET';
        serviceWorker.postMessage({ request, head }, socket);
        request.method = 'upgrade';
    });

    return serviceWorker;
}

export class JsonRpcWs<TConnection extends akala.Connection, TServerOneWay, TServerTwoWay, TClientOneWay, TClientTwoWay, TServerOneWayProxy extends TServerOneWay, TServerTwoWayProxy extends TServerTwoWay, TClientOneWayProxy extends TClientOneWay, TClientTwoWayProxy extends TClientTwoWay>
    extends JsonRpcWsBase<TConnection, TServerOneWay, TServerTwoWay, TClientOneWay, TClientTwoWay, TServerOneWayProxy, TServerTwoWayProxy, TClientOneWayProxy, TClientTwoWayProxy>
    implements IServerBuilder<string, TConnection, TServerOneWay, TServerTwoWay, TClientOneWay, TClientTwoWay, TServerOneWayProxy, TServerTwoWayProxy, TClientOneWayProxy, TClientTwoWayProxy>
{
    constructor(api: Api<TConnection, TServerOneWay, TServerTwoWay, TClientOneWay, TClientTwoWay, TServerOneWayProxy, TServerTwoWayProxy, TClientOneWayProxy, TClientTwoWayProxy>)
    {
        super(api);
    }

    public createServer(path: string, serverImpl: TServerOneWay & TServerTwoWay & Partial<TClientOneWayProxy & TClientTwoWayProxy>)
    {
        var api = this.api;
        return akala.injectWithName(['$router'], function (router: router.HttpRouter)
        {
            log('creating server on ' + path);
            var server = createServer<TConnection>(router, path);

            akala.each(api.serverOneWayConfig, function (config, serverKey)
            {
                if (config['jsonrpcws'] !== false)
                    server.expose(serverKey as string, function (params, reply)
                    {
                        log('receiving ' + serverKey + ' with %o', params);
                        try
                        {
                            var result = (<any>serverImpl[serverKey])(params, this);
                            if (akala.isPromiseLike(result))
                                result.then(function (value)
                                {
                                    log('replying with %o', value);
                                    reply(null, value);
                                }, function (reason)
                                {
                                    reply(reason);
                                });
                            else
                                reply(null, result);
                        }
                        catch (e)
                        {
                            reply({ message: e.message, stack: e.stack, argv: process.argv });
                        }
                    })
            });

            akala.each(api.serverTwoWayConfig, function (config, serverKey)
            {
                if (config['jsonrpcws'] !== false)
                    server.expose(serverKey as string, function (params, reply)
                    {
                        log('receiving ' + serverKey + ' with %o', params);
                        try
                        {

                            var result = (<any>serverImpl[serverKey])(params, this);
                            if (akala.isPromiseLike(result))
                                result.then(function (value)
                                {
                                    log('replying with %o', value);
                                    reply(null, value);
                                }, function (reason)
                                {
                                    reply(reason);
                                });
                            else
                                reply(null, result)
                        }
                        catch (e)
                        {
                            reply({ message: e.message, stack: e.stack, argv: process.argv });
                        }
                    });
            });

            akala.each(api.clientOneWayConfig, function (config, clientKey: any)
            {
                if (!serverImpl[clientKey])
                    serverImpl[clientKey] = function (params)
                    {
                        return new Promise((resolve, reject) =>
                        {
                            log('sending ' + clientKey + ' with %o', params);
                            server.broadcast(clientKey, params);
                        });
                    }
            });

            akala.each(api.clientTwoWayConfig, function (clientKey: any)
            {
                if (!serverImpl[clientKey])
                    serverImpl[clientKey] = function (params, callback)
                    {
                        return new Promise((resolve, reject) =>
                        {
                            log('sending ' + clientKey + ' with %o', params);
                            server.broadcast(clientKey, params, callback);
                        });
                    }
            });

            serverImpl['$proxy'] = (socket: TConnection) => { return akala.api.jsonrpcws(api).createClientProxy(socket); };

            return <any>serverImpl;
        })();
    }
}

akala.module('$api').register('jsonrpcws', JsonRpcWs, true);

export var meta = new Api()
    .connection<{ submodule?: string }>()
    .serverToClientOneWay<void>()({ 'after-master': true, ready: true })
    .clientToServer<{ module: string }, { config: any, workers: any[] }>()({ module: true })
    .clientToServerOneWay<any>()({ updateConfig: true })
    .clientToServer<{ key: string }, any>()({ getConfig: true })
    .clientToServerOneWay<{ masterPath?: string, workerPath?: string }>()({ master: true })
    .clientToServerOneWay<{ path: string, remap: string }>()({ register: true })
    ;