import * as akala from '@akala/core'
import * as router from './router';
import * as debug from 'debug';
import * as worker from './worker-meta'
export { CoreProperties as Package } from '../src/package';
import * as stream from 'stream'
import * as express from 'express';
import * as send from 'send'

var log = debug('akala:master');

var httpRouter = router.HttpRouter;
type request = router.Request & { body?: any };
type response = router.Response;
export { httpRouter as Router, request as Request, response as Response };

export function serveStatic(path, options?: send.SendOptions & { fallthrough?: boolean })
{
    if (!options)
        options = {};
    if (typeof (options.fallthrough) == 'undefined')
        options.fallthrough = true;

    return function (req: request, res: response, ...next: akala.NextFunction[])
    {
        var sendstr = send(req, path || req.url, options);
        sendstr.on('error', function (error)
        {
            if (error && error.code == "ENOENT")
                if (options.fallthrough)
                    next[next.length - 1]();
                else
                    res.status(404).end();
            else
                next[next.length - 1](error);
        });
        sendstr.pipe(res);
    }
}

export function expressWrap(handler: express.Handler)
{
    return function (req: router.Request, response: router.Response, ...rest)
    {
        handler(req as any, response as any, rest[rest.length - 1]);
    }
}
export function expressWrapError(handler: express.ErrorRequestHandler)
{
    return function (error, req: router.Request, response: router.Response, ...rest)
    {
        handler(error, req as any, response as any, rest[rest.length - 1]);
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
