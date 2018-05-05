import * as akala from '@akala/core'
import * as router from './router';
import * as debug from 'debug';
import * as jsonrpc from '@akala/json-rpc-ws'
import * as ws from 'ws'
import * as worker from './worker-meta'
export { CoreProperties as Package } from '../src/package';
import { createServer } from './api/jsonrpc';
import { Proxy, Api, DualApi } from '@akala/core';
import { Connection } from '@akala/json-rpc-ws'
import * as stream from 'stream'
import * as bodyparser from 'body-parser'
import * as express from 'express';
import { api } from '.';

var log = debug('akala:master');

var httpRouter = router.HttpRouter;

export { httpRouter as Router };

export var metaRouter = new akala.Api()
    .connection<Connection>()
    .serverToClient<Partial<worker.Request>, router.CallbackResponse>()({ getContent: true })
    .clientToServerOneWay<{ path: string }>()({ register: true })


export function expressWrap(handler: express.Handler)
{
    return function (req: router.Request, response: router.Response, ...rest)
    {
        handler(req as any, response as express.Response, rest[rest.length - 1]);
    }
}

export function translateRequest(req: router.Request): Partial<worker.Request>
{
    return {
        url: req.url,
        headers: req.headers,
        httpVersion: req.httpVersion,
        httpVersionMajor: req.httpVersionMajor,
        httpVersionMinor: req.httpVersionMinor,
        ip: req.ip,
        method: req.method,
        params: req.params,
        path: req.path,
        protocol: req.protocol,
        query: req.query,
        rawHeaders: req.rawHeaders,
        rawTrailers: req.rawTrailers,
        statusCode: req.statusCode,
        statusMessage: req.statusMessage,
        trailers: req.trailers,
        body: req['body'],
        user: req['user']
    }
}

export function handleResponse(res: router.Response, locationReplacer: (key: string) => string, defaultStatus: number): (response: worker.CallbackResponse) => void
{
    return function (response)
    {
        var status = response.statusCode || defaultStatus;
        if (response.headers)
            Object.keys(response.headers).forEach(function (header)
            {
                if (header.toLowerCase() == 'location' && locationReplacer != null)
                    response.headers[header] = locationReplacer(response.headers[header]);
                res.setHeader(header, response.headers[header]);
            });
        res.writeHead(status, response.statusMessage, response.headers);
        if (response instanceof stream.Readable)
            response.pipe(res);
        else 
        {
            if (Buffer.isBuffer(response.data))
            {
                log('sending buffer');
                res.write(response.data);
            }
            else if (Array.isArray(response.data))
            {
                log('sending array');
                response.data.forEach(function (chunk)
                {
                    res.write(chunk);
                });
            }
            else 
            {
                log('sending object');
                if (typeof (response.data) !== 'string' && typeof response.data != 'number' && typeof (response.data) !== 'undefined')
                    res.write(JSON.stringify(response.data));
                else if (typeof (response.data) != 'undefined')
                    res.write(response.data);
            }
            res.end();
        }
    }
}

export function serveRouter<TOConnection extends Connection,
    TOServerOneWay,
    TOServerTwoWay,
    TOClientOneWay,
    TOClientTwoWay,
    TOServerOneWayProxy extends TOServerOneWay,
    TOServerTwoWayProxy extends TOServerTwoWay,
    TOClientOneWayProxy extends TOClientOneWay,
    TOClientTwoWayProxy extends TOClientTwoWay>(router: router.HttpRouter, path: string, other?: Api<TOConnection,
        TOServerOneWay,
        TOServerTwoWay,
        TOClientOneWay,
        TOClientTwoWay,
        TOServerOneWayProxy,
        TOServerTwoWayProxy,
        TOClientOneWayProxy,
        TOClientTwoWayProxy>, impl?: TOServerOneWay & TOServerTwoWay)
{
    var subRouter = new httpRouter();
    log('creating server on ' + path);
    router.use(path, subRouter.router);

    return api.jsonrpcws(new DualApi(metaRouter, other)).createServer(path, akala.extend({
        register: function (params: { path: string }, socket: TOConnection)
        {
            var locationReplacer = function (header)
            {
                return header.replace(path, path + params.path)
            };

            var client = this.$proxy(socket);

            subRouter.use(params.path, function (req: router.Request, res: router.Response, next: akala.NextFunction)
            {
                if (socket.socket.readyState == ws.CLOSED || socket.socket.readyState == ws.CLOSING)
                {
                    next();
                    return;
                }
                bodyparser.json()(req as any, res as any, function (err)
                {
                    bodyparser.urlencoded({ extended: true })(req as any, res as any, function (err)
                    {
                        client.getContent(translateRequest(req)).then(handleResponse(res, locationReplacer, 200), handleResponse(res, locationReplacer, 500));
                    })
                })
            });
        }
    }, impl));
}