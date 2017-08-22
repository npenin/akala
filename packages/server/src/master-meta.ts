import * as akala from '@akala/core'
import * as router from './router';
import * as debug from 'debug';
import * as jsonrpc from 'json-rpc-ws'
import * as ws from 'ws'
import { DualMetadata, createServerFromDualMeta } from './sharedComponent/metadata'
import * as worker from './worker-meta'
export { CoreProperties as Package } from '../src/package';
import { createServer } from './sharedComponent/jsonrpc';
import { Proxy, Metadata } from '@akala/core';
import { Connection } from 'json-rpc-ws'

var log = debug('akala:master');

var httpRouter = router.HttpRouter;

export { httpRouter as Router };

export var metaRouter = new akala.Metadata()
    .connection<Connection>()
    .serverToClient<Partial<worker.Request>, router.CallbackResponse>()({ getContent: true })
    .clientToServerOneWay<{ path: string }>()({ register: true })

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
        res.writeHead(response.statusCode, response.statusMessage);
        if (Array.isArray(response.data))
        {
            response.data.forEach(function (chunk)
            {
                res.write(chunk);
            });
        }
        else 
        {
            if (typeof (response.data) !== 'string' && typeof response.data != 'number')
                response.data = JSON.stringify(response.data);
            if (typeof (response.data) != 'undefined')
                res.write(response.data);
        }
        console.log(response.statusCode);
        console.log(response.data);
        res.end();
    }
}

export function serveRouter<TOConnection extends jsonrpc.Connection,
    TOServerOneWay,
    TOServerTwoWay,
    TOClientOneWay,
    TOClientTwoWay,
    TOServerOneWayProxy extends TOServerOneWay,
    TOServerTwoWayProxy extends TOServerTwoWay,
    TOClientOneWayProxy extends TOClientOneWay,
    TOClientTwoWayProxy extends TOClientTwoWay>(router: router.HttpRouter, path: string, other?: Metadata<TOConnection,
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

    return createServerFromDualMeta(metaRouter, other)(subRouter, '/', {
        register: function (params: { path: string }, socket: TOConnection)
        {
            var locationReplacer = function (header)
            {
                return header.replace(path, path + params.path)
            };

            var client = this.$proxy(socket);

            subRouter.use(params.path, function (req: router.Request, res: router.Response, next: akala.NextFunction)
            {
                if ((<ws>socket.socket).readyState == ws.CLOSED || socket.socket.readyState == ws.CLOSING)
                {
                    next();
                    return;
                }
                client.getContent(translateRequest(req)).then(handleResponse(res, locationReplacer, 200), handleResponse(res, locationReplacer, 500));
            });
        }
    }, impl);
}