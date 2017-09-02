import { Request as BaseRequest, WorkerRouter as Router, Callback, CallbackResponse } from './router';
import * as akala from '@akala/core';
import { Http } from './http';
import * as express from 'express';
import * as stream from 'stream';
export { Router, Callback };
import * as jsonrpc from 'json-rpc-ws'
var log = akala.log('akala:worker');

export { CallbackResponse }

export function createClient<TConnection extends jsonrpc.Connection>(namespace: string): PromiseLike<jsonrpc.Client<TConnection>>
{
    var client = jsonrpc.createClient<TConnection>();
    var resolveUrl: (url: string) => string = akala.resolve('$resolveUrl');
    if (!resolveUrl)
        throw new Error('no url resolver could be found');
    var deferred = new akala.Deferred<jsonrpc.Client<TConnection>>();
    client.connect(resolveUrl(namespace), function ()
    {
        deferred.resolve(client);
    });
    return deferred;
}


export type MasterRegistration = (from?: string, masterPath?: string, workerPath?: string) => void;

export interface resolve
{
    (param: '$http'): Http
    (param: '$request'): Request
    (param: '$callback'): Callback
    (param: '$router'): Router
    (param: '$io'): <TConnection extends jsonrpc.Connection>(namespace: string) => PromiseLike<jsonrpc.Client<TConnection>>
    (param: '$bus'): jsonrpc.Client<jsonrpc.Connection>
    (param: '$master'): MasterRegistration
    (param: string): any
}

export interface WorkerInjector extends akala.Injector
{
    resolve: resolve;
}

export interface Request extends BaseRequest   
{
    injector?: WorkerInjector;
    [key: string]: any;
}

export function expressWrap(handler: express.RequestHandler)
{
    return function (req: Request, next: akala.NextFunction)
    {
        var callback = req.injector.resolve('$callback');
        var headers: any = {};
        var response = buildResponse(callback, next);
        handler(<any>req, response, next);
    }
}

function buildResponse(callback: Callback, next: akala.NextFunction): express.Response
{
    return new MyResponse(callback, next);
}

class MyResponse extends stream.Writable implements CallbackResponse
{
    constructor(callback: Callback, next: akala.NextFunction)
    {
        super({ decodeStrings: true });
        this.headers = {};
        this.sendStatus = callback
        this.status = callback
        this.send = callback
        this.json = callback
    }

    data: any;
    headers = {};
    sendStatus: Callback
    status: Callback
    links = undefined
    send: Callback
    json: Callback
    jsonp = undefined
    sendFile = undefined
    sendfile = undefined
    download = undefined
    contentType(type: string) { this.setHeader('contentType', type); return this; }
    type = undefined
    format = undefined
    attachment = undefined
    set(field: any): this
    set(field: string, value?: string): this
    set(field: string | any, value?: string): this
    {
        return this.header(field, value);
    }

    header(field: any): this
    header(field: string, value?: string): this
    header(field: string | any, value?: string): this
    {
        if (typeof field == 'string')
        {
            if (typeof (value) == 'undefined')
                return this.headers[field];
            this.setHeader(field, value);
            return this;
        }
        else
        {
            var self = this;
            Object.keys(field).forEach(function (key)
            {
                self.setHeader(key, field[key]);
            })
        }
    }
    headersSent = false
    get = undefined
    clearCookie = undefined
    cookie = undefined
    location(location: string) { this.setHeader('location', location); return this; }
    setHeader(field: string, value: string)
    {
        this.headers[field] = value;
    }
    /**
        * Redirect to the given `url` with optional response `status`
        * defaulting to 302.
        *
        * The resulting `url` is determined by `res.location()`, so
        * it will play nicely with mounted apps, relative paths,
        * `"back"` etc.
        *
        * Examples:
        *
        *    res.redirect('/foo/bar');
        *    res.redirect('http://example.com');
        *    res.redirect(301, 'http://example.com');
        *    res.redirect('http://example.com', 301);
        *    res.redirect('../login'); // /blog/post/1 -> /blog/login
        */
    redirect(url: string): void
    redirect(status: number, url: string): void
    redirect(url: string, status: number): void
    redirect(url: string | number, status?: number | string): void
    {
        if (typeof (status) == 'undefined')
            status = 302
        if (typeof (url) == 'number' && typeof (status) == 'string')
        {
            var swap = url;
            url = status;
            status = swap;
        }
        this.setHeader('location', <string>url);
        this.send(status);
    }

    /**
        * Render `view` with the given `options` and optional callback `fn`.
        * When a callback function is given a response will _not_ be made
        * automatically, otherwise a response of _200_ and _text/html_ is given.
        *
        * Options:
        *
        *  - `cache`     boolean hinting to the engine it should cache
        *  - `filename`  filename of the view being rendered
        */
    render = undefined;

    locals: any;

    charset: string;

    /**
     * Adds the field to the Vary response header, if it is not there already.
     * Examples:
     *
     *     res.vary('User-Agent').render('docs');
     *
     */
    vary = undefined;

    app = undefined;
    setTimeout = undefined;
    addTrailers = undefined;
    chunks: (string | Buffer)[] = [];

    // Extended base methods
    write(buffer: Buffer): boolean
    write(buffer: Buffer, cb?: Function): boolean
    write(str: string, cb?: Function): boolean
    write(str: string, encoding?: string, cb?: Function): boolean
    write(str: string, encoding?: string, fd?: string): boolean
    write(chunk: any, encoding?: string): any;
    write(str: string | Buffer, encoding?: string | Function, fd?: string | Function): boolean
    write(str: string | Buffer, encoding?: string | Function, fd?: string | Function): boolean
    {
        if (typeof str != 'string')
        {
            if (typeof (encoding) == 'string')
                str = str.toString(encoding);
        }
        this.chunks.push(str);
        return true;
    }

    writeContinue = undefined;
    writable = true;
    writeHead(statusCode: number, reasonPhrase?: string, headers?: any)
    writeHead(statusCode: number, headers?: any): void
    writeHead(statusCode: number, reasonPhrase?: string | any, headers?: any): void
    {
        this.statusCode = statusCode;
        if (typeof reasonPhrase != 'string')
        {
            headers = reasonPhrase;
            reasonPhrase = null;
        }
        if (reasonPhrase)
            this.statusMessage = reasonPhrase;
        this.header(headers);
    }
    statusCode: number;
    statusMessage: string;
    sendDate: boolean;
    getHeader(name: string)
    {
        return this.headers[name];
    };
    removeHeader(name: string): void
    {
        delete this.headers[name];
    }

    protected _write(chunk: any, encoding?: string, callback?: Function): void
    {
        if (encoding)
            this.chunks.push(chunk.toString(encoding));
        else
            this.chunks.push(chunk);
        if (callback)
            callback();
    }


    finished: boolean;

    // Extended base methods
    end(): void;
    end(buffer: Buffer, cb?: Function): void;
    end(str: string, cb?: Function): void;
    end(str: string, encoding?: string, cb?: Function): void;
    end(data?: any, encoding?: string): void;
    end(data?: any, encoding?: string | Function, cb?: Function): void
    {
        this.write(data, encoding, cb);
        this.send(akala.extend(this, { data: this.chunks }));
    }
}

export function handle(app: Router, root: string)
{
    return function handle(request: Request, next?: akala.NextFunction): PromiseLike<CallbackResponse>
    {
        function callback(status, data?)
        {
            if (isNaN(Number(status)))
            {
                var socketRes: CallbackResponse = status;
                if (typeof (data) == 'undefined')
                {
                    if (typeof (status) == 'undefined')
                        socketRes = { statusCode: 404, data: undefined };
                    else
                        data = socketRes.data;
                    status = null;
                }
            }
            else
                socketRes = { statusCode: status, data: undefined };
            socketRes.statusCode = socketRes.statusCode || 200;
            if (!Buffer.isBuffer(data) && typeof (data) !== 'string' && typeof data != 'number')
                data = JSON.stringify(data);
            if (typeof (data) != 'undefined')
                socketRes.data = data;

            deferred.resolve(socketRes);
        }

        var requestInjector: WorkerInjector = new akala.Injector();
        requestInjector.register('$request', request);
        requestInjector.register('$callback', callback);
        // log(request);
        Object.defineProperty(request, 'injector', { value: requestInjector, enumerable: false, configurable: false, writable: false });
        if (request.url == '/')
            request.url = '';
        request.url = root + request.url;

        log(request.url);
        var deferred = new akala.Deferred<CallbackResponse>();
        app.handle(request, callback);

        return deferred;
    }
}