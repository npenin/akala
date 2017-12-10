import { Request as BaseRequest, WorkerRouter as Router, Callback, CallbackResponse } from './router';
import * as akala from '@akala/core';
import { Http } from './http';
import * as express from 'express';
import * as stream from 'stream';
export { Router, Callback };
import * as jsonrpc from '@akala/json-rpc-ws'
import * as send from 'send';
import * as onFinished from 'on-finished';
import { PayloadDataType } from '@akala/json-rpc-ws';
import { lchmod } from 'fs';
var log = akala.log('akala:worker');

export { CallbackResponse }

export function createClient<TConnection extends jsonrpc.Connection>(namespace: string): PromiseLike<jsonrpc.Client<TConnection>>
{
    var client = jsonrpc.createClient<TConnection>();
    var resolveUrl: (url: string) => string = akala.resolve('$resolveUrl');
    if (!resolveUrl)
        throw new Error('no url resolver could be found');
    log('creating client to ' + resolveUrl(namespace));
    return new Promise<jsonrpc.Client<TConnection>>((resolve, reject) =>
    {
        client.connect(resolveUrl(namespace), function ()
        {
            resolve(client);
        });
    });
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
    body: any;
}

export function expressWrap(handler: express.Handler)
{
    return function (req: Request, next: akala.NextFunction)
    {
        var callback = req.injector.resolve('$callback');
        var headers: any = {};
        var response = buildResponse(req, callback, next);
        handler(<any>req, response, next);
    }
}

function buildResponse(req: Request, callback: Callback, next: akala.NextFunction): express.Response
{
    return <any>new MyResponse(req, callback, next);
}

class MyResponse extends stream.Transform implements CallbackResponse
{
    constructor(private req: Request, callback: Callback, next: akala.NextFunction)
    {
        super({
            transform: (chunk, _encoding, callback) =>
            {
                callback(null, chunk);
            }, decodeStrings: true
        });
        this.headers = {};
        this.sendStatus = callback
        this.status = callback
        this.send = callback
        this.json = callback
        this.on('pipe', () =>
        {
            this.isStream = true;
        });
        this.on('end', () => { this.send(this); });
    }

    public isStream = false;
    data: any;
    headers = {};
    sendStatus: Callback
    status: Callback
    links = undefined
    send: Callback
    json: Callback
    jsonp = undefined
    sendFile(path: string, options?: any, callback?: akala.NextFunction)
    {
        var encodedPath = encodeURI(path);
        var done = callback;
        var req = this.req;
        var res = this;
        var next = function (err?)
        {
            if (err)
                res.send(500, err);
            else
                res.send(200);
        };
        var opts = options || {};

        if (!path)
        {
            throw new TypeError('path argument is required to res.sendFile');
        }

        // support function as second arg
        if (typeof options === 'function')
        {
            done = options;
            opts = {};
        }

        // create file stream
        var pathname = encodeURI(path);
        var file = send(req, pathname, opts);

        // transfer
        sendfile(res, file, opts, function (err)
        {
            if (done) return done(err);
            if (err && err.code === 'EISDIR') return next();

            // next() all but write errors
            if (err && err.code !== 'ECONNABORTED' && err.syscall !== 'write')
            {
                next(err);
            }
        });
    }
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
            if (field)
                akala.each(field, function (value, key)
                {
                    self.setHeader(key, value);
                });
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

    writeContinue = undefined;
    finished = false;
    writable = true;
    writeHead(statusCode: number, reasonPhrase?: string, headers?: any)
    writeHead(statusCode: number, headers?: any): void
    writeHead(statusCode: number, reasonPhrase?: string | any, headers?: any): void
    {
        log('writeHead');
        this.statusCode = statusCode;
        if (typeof reasonPhrase != 'string')
        {
            headers = reasonPhrase;
            reasonPhrase = null;
        }
        if (reasonPhrase)
            this.statusMessage = reasonPhrase;
        this.header(headers);
        this.send(this);
        this.headersSent = true;
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

    public _write(chunk: any, encoding?: string, callback?: (err: Error) => void): void
    {
        if (!this.headersSent)
            this.writeHead(this.statusCode);

        super['_write'](chunk, encoding, callback);
    }
}

export function handle(app: Router, root: string)
{
    return function handle(request: Request, next?: akala.NextFunction): PromiseLike<CallbackResponse>
    {
        return new Promise((resolve, reject) =>
        {
            function callback(status, data?: PayloadDataType | string)
            {
                var response: CallbackResponse;
                if (arguments.length == 0)
                    return resolve();

                if (isNaN(Number(status)) || Array.isArray(status))
                {
                    response = status;
                    if (typeof (data) == 'undefined')
                    {
                        if (typeof (status) == 'undefined')
                            response = { statusCode: 404, data: 'Not found' };
                        else if (isNaN(Number(response.statusCode)) && !(response instanceof stream.Readable))
                        {
                            data = response as any;
                            response = { statusCode: 200, data: data };
                            status = null;
                        }
                        else
                            data = undefined;
                        status = null;
                    }
                }
                else
                    response = { statusCode: status, data: 'No data' };

                response.statusCode = response.statusCode || 200;

                if (!(data instanceof stream.Readable) && !Buffer.isBuffer(data) && typeof (data) !== 'string' && typeof data != 'number' && typeof (data) != 'undefined')
                {
                    if (!response.headers)
                        response.headers = {};
                    if (!response.headers['Content-Type'])
                        response.headers['Content-Type'] = 'application/json';
                    data = JSON.stringify(data);
                }
                if (typeof (data) != 'undefined')
                    response.data = data;

                resolve(response);
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
            app.handle(request, callback);
        })
    }
}


function sendfile(res, file, options, callback)
{
    var done = false;
    var streaming;

    // request aborted
    function onaborted()
    {
        if (done) return;
        done = true;

        var err = new Error('Request aborted');
        err['code'] = 'ECONNABORTED';
        callback(err);
    }

    // directory
    function ondirectory()
    {
        if (done) return;
        done = true;

        var err = new Error('EISDIR, read');
        err['code'] = 'EISDIR';
        callback(err);
    }

    // errors
    function onerror(err)
    {
        if (done) return;
        done = true;
        callback(err);
    }

    // ended
    function onend()
    {
        if (done) return;
        done = true;
        callback();
    }

    // file
    function onfile()
    {
        streaming = false;
    }

    // finished
    function onfinish(err)
    {
        if (err && err.code === 'ECONNRESET') return onaborted();
        if (err) return onerror(err);
        if (done) return;

        setImmediate(function ()
        {
            if (streaming !== false && !done)
            {
                onaborted();
                return;
            }

            if (done) return;
            done = true;
            callback();
        });
    }

    // streaming
    function onstream()
    {
        streaming = true;
    }

    file.on('directory', ondirectory);
    file.on('end', onend);
    file.on('error', onerror);
    file.on('file', onfile);
    file.on('stream', onstream);
    onFinished(res, onfinish);

    if (options.headers)
    {
        // set headers on successful transfer
        file.on('headers', function headers(res)
        {
            var obj = options.headers;
            var keys = Object.keys(obj);

            for (var i = 0; i < keys.length; i++)
            {
                var k = keys[i];
                res.setHeader(k, obj[k]);
            }
        });
    }

    // pipe
    file.pipe(res);
}