
import { v4 as uuid } from 'uuid';
import * as debug from 'debug';
import { ok as Assert } from 'assert';
import { default as Errors, Error as ConnectionError, ErrorTypes } from './errors';
import * as ws from 'ws';
import * as stream from 'stream';
const logger = debug('json-rpc-ws');

export type SerializableObject = { [key: string]: string | number | SerializableObject | SerializableObject[] };
export type PayloadDataType = number | SerializableObject | SerializableObject[] | stream.Readable | null | undefined | void | { event: string, isBuffer: boolean, data: string | SerializedBuffer };
export type SerializedBuffer = { type: 'Buffer', data: number[] };

export interface Payload
{
    jsonrpc?: '2.0';
    id?: string | number;
    method?: string;
    params?: any;
    result?: PayloadDataType;
    error?: ConnectionError;
    stream?: boolean;
}

/**
 * Quarantined JSON.parse try/catch block in its own function
 *
 * @param {String} data - json data to be parsed
 * @returns {Object} Parsed json data
 */
var jsonParse = function jsonParse(data: string): any
{

    var payload;
    try
    {
        payload = JSON.parse(data);
    }
    catch (error)
    {
        logger(error);
        payload = null;
    }
    return payload;
};


export type Handler<TConnection extends Connection, ParamType extends PayloadDataType, ParamCallbackType extends PayloadDataType> = (this: TConnection, params: ParamType, reply: ReplyCallback<ParamCallbackType>) => void;
export type ReplyCallback<ParamType> = (error: any, params?: ParamType) => void;

/**
 * JSON spec requires a reply for every request, but our lib doesn't require a
 * callback for every sendMethod. We need a dummy callback to throw into responseHandlers
 * for when the user doesn't supply callback to sendMethod
 */
var emptyCallback = function emptyCallback()
{

    logger('emptycallback');
};

export function isBrowserSocket(parent: { browser: true }, socket: ws | WebSocket): socket is WebSocket
export function isBrowserSocket(parent: { browser: false }, socket: ws | WebSocket): socket is WebSocket
export function isBrowserSocket(parent: { browser: boolean }, socket: ws | WebSocket): socket is WebSocket
export function isBrowserSocket(parent: { browser: boolean }, socket: ws | WebSocket): socket is WebSocket
{
    return socket && parent.browser;
}

/**
 * json-rpc-ws connection
 *
 * @constructor
 * @param {Socket} socket - web socket for this connection
 * @param {Object} parent - parent that controls this connection
 */

export class Connection
{
    /**
     *
     */
    constructor(public socket: ws | WebSocket, public parent: { type: string, browser: boolean, getHandler: (id: string) => Handler<Connection, any, any>, disconnected: (connection: Connection) => void })
    {
        logger('new Connection to %s', parent.type);

        if (isBrowserSocket(parent, socket))
            socket.onmessage = this.message.bind(this);
        else
            socket.on('message', this.message.bind(this));
        // this.on('message', this.message.bind(this));
        this.once('close', this.close.bind(this));
        this.once('error', this.close.bind(this));
        // if (isBrowserSocket(parent, socket))
        // {
        //     socket.addEventListener('close', socketClosed.bind(this), { once: true });
        //     socket.addEventListener('error', socketError.bind(this), { once: true });
        // }
        // else
        // {
        //     socket.once('close', this.close.bind(this));
        //     socket.once('error', this.close.bind(this));
        // }
    }

    public on(event: 'message', handler: (ev: MessageEvent) => void): void
    public on(event: 'error', handler: (ev: Event) => void): void
    public on(event: 'close', handler: (ev: CloseEvent) => void): void
    public on(event: 'message' | 'error' | 'close', handler: (ev?: any) => void): void
    {
        if (isBrowserSocket(this.parent, this.socket))
            this.socket.addEventListener(event, handler);
        else
            this.socket.addEventListener(event, handler);
    }

    public once(event: 'message', handler: (ev: MessageEvent) => void): void
    public once(event: 'error', handler: (ev: Event) => void): void
    public once(event: 'close', handler: (ev: CloseEvent) => void): void
    public once(event: 'message' | 'error' | 'close', handler: (ev?: any) => void): void
    {
        if (isBrowserSocket(this.parent, this.socket))
        {
            this.socket.addEventListener(event, handler, { once: true });
        }
        else
            this.socket.once(event, handler);
    }

    public id = uuid();
    private responseHandlers: { [messageId: string]: ReplyCallback<any> } = {};

    /**
     * Send json payload to the socket connection
     *
     * @param {Object} payload - data to be stringified
     * @private
     * @todo validate payload
     * @todo make sure this.connection exists, is connected
     * @todo if we're not connected look up the response handler from payload.id
     */
    public sendRaw(payload: Payload)
    {
        payload.jsonrpc = '2.0';
        if (isBrowserSocket(this.parent, this.socket))
            this.socket.send(JSON.stringify(payload));
        else
            this.socket.send(JSON.stringify(payload));
    };

    private buildStream(id: string | number, result: PayloadDataType)
    {
        var data: (string | Buffer | null)[] = [];
        var canPush = true;

        class temp extends stream.Readable
        {
            constructor()
            {
                super({
                    read: () =>
                    {
                        if (data.length)
                        {
                            while (canPush)
                                canPush = s.push(data.shift());
                        }
                        canPush = true;
                    }
                });

                var o: any = this;
                var src = result as SerializableObject;
                Object.getOwnPropertyNames(src).forEach(function (p)
                {
                    if (Object.getOwnPropertyDescriptor(o, p) == null)
                    {
                        if (src && src[p])
                            o[p] = src[p];
                    }
                })
            }
        }

        var s = result = <SerializableObject & stream.Readable>new temp();
        var f = this.responseHandlers[id] = (error, result: { event: string, isBuffer?: boolean, data?: SerializedBuffer | string }) =>
        {
            if (!!error)
                s.emit('error', error);
            else
                switch (result.event)
                {
                    case 'data':
                        var d: Buffer | string | undefined = undefined;
                        if (result.data)
                        {
                            if (typeof (result.data) == 'string')
                                d = result.data;
                            else
                                d = Buffer.from(result.data.data);
                            if (canPush)
                                s.push(d);
                            else
                                data.push(d);
                        }
                        this.responseHandlers[id as string] = f;
                        break;
                    case 'end':
                        if (canPush)
                            s.push(null);
                        else
                            data.push(null);
                        break;
                }
        }
        return result;
    }


    /**
     * Validate payload as valid jsonrpc 2.0
     * http://www.jsonrpc.org/specification
     * Reply or delegate as needed
     *
     * @param {Object} payload - payload coming in to be validated
     * @returns {void}
     */
    public processPayload(payload: Payload): void
    {
        var version = payload.jsonrpc;
        var id = payload.id;
        var method = payload.method;
        var params = payload.params;
        var result = payload.result;
        var error = payload.error;
        if (version !== '2.0')
        {
            return this.sendError('invalidRequest', id, { info: 'jsonrpc must be exactly "2.0"' });
        }
        //Will either have a method (request), or result or error (response)
        if (typeof method === 'string')
        {
            var handler = this.parent.getHandler(method);
            if (!handler)
            {
                return this.sendError('methodNotFound', id, { info: 'no handler found for method ' + method });
            }
            if (id !== undefined && id !== null && typeof id !== 'string' && typeof id !== 'number')
            {
                return this.sendError('invalidRequest', id, { info: 'id, if provided, must be one of: null, string, number' });
            }
            if (params !== undefined && params !== null && typeof params !== 'object')
            {
                return this.sendError('invalidRequest', id, { info: 'params, if provided, must be one of: null, object, array' });
            }
            logger('message method %s', payload.method);
            if (id === null || typeof id === 'undefined')
            {
                return handler.call(this, params, emptyCallback);
            }
            var handlerCallback = function handlerCallback(this: Connection, err: any, reply: PayloadDataType)
            {
                logger('handler got callback %j, %j', err, reply);
                return this.sendResult(id, err, reply);
            };
            if (payload.stream)
                params = this.buildStream(id, params);

            return handler.call(this, params, handlerCallback.bind(this));
        }
        // needs a result or error at this point
        if (result === undefined && error === undefined)
        {
            return this.sendError('invalidRequest', id, { info: 'replies must have either a result or error' });
        }
        if (typeof id === 'string' || typeof id === 'number')
        {
            logger('message id %s result %j error %j', id, result, error);
            var responseHandler = this.responseHandlers[id];
            if (!responseHandler)
            {
                return this.sendError('invalidRequest', id, { info: 'no response handler for id ' + id });
            }

            delete this.responseHandlers[id];
            if (payload.stream)
            {
                result = this.buildStream(id, result);
            }
            return responseHandler.call(this, error, result);
        }
    }

    /**
     * Send a result message
     *
     * @param {String} id - id for the message
     * @param {Object} error - error for the message
     * @param {String|Object|Array|Number} result - result for the message
     * @public
     *
     */
    public sendResult(id: string | number | undefined, error: ConnectionError | undefined, result?: PayloadDataType, isStream?: boolean)
    {

        logger('sendResult %s %s %j %j', id, isStream, error, result);
        // Assert(id, 'Must have an id.');
        // Assert(error || result, 'Must have an error or a result.');
        Assert(!(error && result), 'Cannot have both an error and a result');

        var response: Payload = { id: id, stream: !!isStream || result instanceof stream.Readable };

        if (result)
        {
            response.result = result;
            if (response.stream && result instanceof stream.Readable)
            {
                logger('result is stream');
                var self = this;
                var pt = new stream.PassThrough({ highWaterMark: 128 });
                result.pipe(pt);
                pt.on('data', function (chunk)
                {
                    if (self.socket.readyState == ws.OPEN)
                        if (Buffer.isBuffer(chunk))
                            self.sendResult(id, undefined, { event: 'data', isBuffer: true, data: chunk.toJSON() });
                        else
                            self.sendResult(id, undefined, { event: 'data', isBuffer: false, data: chunk });
                    else
                        logger('socket was closed before endof stream')
                });
                pt.on('end', function ()
                {
                    if (self.socket.readyState == ws.OPEN)
                        self.sendResult(id, undefined, { event: 'end' });
                    else
                        logger('socket was closed before end of stream')
                });
            }
        }
        else
        {
            response.error = error;
        }

        this.sendRaw(response);
    };

    /**
     * Send a method message
     *
     * @param {String} method - method for the message
     * @param {Array|Object|null} params  - params for the message
     * @param {function} callback - optional callback for a reply from the message
     * @public
     */
    public sendMethod<TParamType extends PayloadDataType, TReplyType extends PayloadDataType>(method: string, params?: TParamType, callback?: ReplyCallback<TReplyType>)
    {
        var id = uuid();
        Assert((typeof method === 'string') && (method.length > 0), 'method must be a non-empty string');
        Assert(params === null || params === undefined || params instanceof Object, 'params, if provided,  must be an array, object or null');
        logger('sendMethod %s', method, id);
        if (callback)
        {
            this.responseHandlers[id] = callback;
        }
        else
        {
            this.responseHandlers[id] = emptyCallback;
        }
        var request: Payload = {
            id: id,
            method: method
        };

        if (params)
        {
            if (params instanceof stream.Readable)
            {
                var self = this;
                request.stream = true;
                var pt = new stream.PassThrough({ highWaterMark: 128 });
                params.pipe(pt);
                pt.on('data', function (chunk)
                {
                    if (Buffer.isBuffer(chunk))
                        self.sendRaw({ id: id, result: { event: 'data', isBuffer: true, data: chunk.toJSON() } });
                    else
                        self.sendRaw({ id: id, result: { event: 'data', isBuffer: false, data: chunk } });
                });
                pt.on('end', function ()
                {
                    self.sendRaw({ id: id, result: { event: 'end' }, stream: false });
                });
            }

            request.params = params;
        }

        this.sendRaw(request);
    };

    /**
     * Send an error message
     *
     * @param {Object} error - json-rpc error object (See Connection.errors)
     * @param {String|Number|null} id - Optional id for reply
     * @param {Any} data - Optional value for data portion of reply
     * @public
     */
    public sendError(error: ErrorTypes, id: number | string | undefined, data?: any)
    {

        logger('sendError %s', error);
        //TODO if id matches a responseHandler, we should dump it right?
        this.sendRaw(Errors(error, id, data));
    };

    /**
     * Called when socket gets 'close' event
     *
     * @param {ConnectionError} error - optional error object of close wasn't expected
     * @private
     */
    public close(error?: ConnectionError | 1000 | Error)
    {

        logger('close');
        if (error && error !== 1000)
        {
            debugger;
            logger('close error %s', error.stack || error);
        }
        this.parent.disconnected(this); //Tell parent what went on so it can track connections
        delete this.socket;
    }

    /**
     * Hang up the current socket
     *
     * @param {function} callback - called when socket has been closed
     * @public
     */
    public hangup(callback: () => void)
    {
        logger('hangup');
        Assert(this.socket, 'Not connected');
        if (typeof callback === 'function')
        {
            var socket = this.socket;
            if (isBrowserSocket(this.parent, socket))
            {
                socket.onerror = () =>
                {
                    delete socket.onerror;
                    callback();
                };
                socket.onclose = () =>
                {
                    delete socket.onclose;
                    callback();
                };
            }
            else
            {
                socket.once('error', callback);
                socket.once('close', callback);
            }
        }
        this.socket.close();
    };

    /**
     * Incoming message handler
     *
     * @param {String} data - message from the websocket
     * @returns {void}
     * @private
     */
    private message(data: string | { data: string }): Payload | void
    {
        //Validate as json first, easy reply if it's not
        //If it's an array iterate and handle
        //If it's an object handle
        //name of handle function ?!?!?
        logger('message %j', data);
        var payload;
        if (this.parent.browser && typeof (data) !== 'string') 
        {
            payload = jsonParse(data.data);
        }
        else if (typeof (data) == 'string')
        {

            payload = jsonParse(data);
        }

        if (payload === null)
        {
            return Errors('parseError');
        }
        //Object or array
        if (payload instanceof Array)
        {
            payload.forEach(this.processPayload, this);
        }
        else
        {
            this.processPayload(payload);
        }
    };
}