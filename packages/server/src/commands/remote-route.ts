import { State } from '../state.js';
import { CallbackResponse, Request as BaseRequest, Response, HttpRouter } from '../router/index.js';
import { Container } from "@akala/commands";
import stream from "stream";
import { logger } from '@akala/core';
const log = logger('remote-route');

export default function route(this: State, route: string, target: Container<void>, options: { pre?: boolean, auth?: boolean, app?: boolean, get?: boolean, use?: boolean }): void
{
    let method: 'get' | 'use' | 'useGet';

    if (!options)
        options = {};

    if (options.get)
        if (options.use)
            method = 'useGet';
        else
            method = 'get'
    else if (options.use)
        method = 'use';
    else
        method = 'get';

    let router: HttpRouter;

    console.log('registering route to ' + target + ' as ' + route);
    if (options.pre)
        router = this.preAuthenticatedRouter;
    else if (options.auth)
        router = this.authenticationRouter;
    else if (options.app)
        router = this.app;
    else
        router = this.lateBoundRoutes;

    router[method](route, async function (req, res)
    {
        const result: CallbackResponse = await target.dispatch('$request', translateRequest(req));
        return handleResponse(res, null, 200)(result);
    });
}

export async function translateRequest(req: BaseRequest): Promise<Partial<BaseRequest> & { user?: unknown }>
{
    return {
        url: req.url,
        httpVersion: req.httpVersion,
        httpVersionMajor: req.httpVersionMajor,
        httpVersionMinor: req.httpVersionMinor,
        ip: req.ip,
        method: req.method,
        params: req.params,
        path: req.path,
        query: req.query,
        rawHeaders: req.rawHeaders,
        rawTrailers: req.rawTrailers,
        statusCode: req.statusCode,
        statusMessage: req.statusMessage,
        trailers: req.trailers,
        body: await req.body.parse(),
        user: req['user']
    }
}

export function handleResponse(res: Response, locationReplacer: (key: string) => string, defaultStatus: number): (response: CallbackResponse) => void
{
    return function (response)
    {
        const status = response.statusCode || defaultStatus;
        if (response.headers)
            Object.keys(response.headers).forEach(function (header)
            {
                if (header.toLowerCase() == 'location' && locationReplacer != null)
                    response.headers[header] = locationReplacer(response.headers[header] as string);
                res.setHeader(header, response.headers[header]);
            });
        res.writeHead(status, response.statusMessage, response.headers);
        if (response instanceof stream.Readable)
            response.pipe(res);
        else 
        {
            if (Buffer.isBuffer(response.data))
            {
                log.silly('sending buffer');
                res.write(response.data);
            }
            else if (Array.isArray(response.data))
            {
                log.silly('sending array');
                response.data.forEach(function (chunk)
                {
                    res.write(chunk);
                });
            }
            else 
            {
                log.silly('sending object');
                if (typeof (response.data) !== 'string' && typeof response.data != 'number' && typeof (response.data) !== 'undefined')
                    res.write(JSON.stringify(response.data));
                else if (typeof (response.data) != 'undefined')
                    res.write(response.data);
            }
            res.end();
        }
    }
}
