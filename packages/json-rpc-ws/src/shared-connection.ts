import { v4 as uuid } from 'uuid';
import * as debug from 'debug';
import { default as Errors, Error as ConnectionError, ErrorTypes } from './errors';
const logger = debug('json-rpc-ws');


export type SerializableObject = { [key: string]: string | number | SerializableObject | SerializableObject[] };

export type PayloadDataType<T> = number | SerializableObject | SerializableObject[] | null | undefined | void | { event: string, isBuffer: boolean, data: string | SerializedBuffer } | T;
export type SerializedBuffer = { type: 'Buffer', data: Uint8Array };

export interface Payload<T>
{
    jsonrpc?: '2.0';
    id?: string | number;
    method?: string;
    params?: any;
    result?: PayloadDataType<T>;
    error?: ConnectionError;
    stream?: boolean;
}

export class Deferred<T> extends Promise<T>
{
    private _resolve?: (value?: T | PromiseLike<T> | undefined) => void;
    private _reject?: (reason?: any) => void;
    resolve(_value?: T | PromiseLike<T> | undefined): void
    {
        if (typeof (this._resolve) == 'undefined')
            throw new Error('Not Implemented');

        this._resolve(_value);
    }
    reject(_reason?: any): void
    {
        if (typeof (this._reject) == 'undefined')
            throw new Error('Not Implemented');

        this._reject(_reason);
    }
    constructor()
    {
        var _resolve;
        var _reject;
        super((resolve, reject) =>
        {
            _resolve = resolve;
            _reject = reject;
        });
        this._resolve = _resolve;
        this._reject = _reject;
    }
}

export type Handler<TConnection extends Connection<TStreamable>, TStreamable, ParamType extends PayloadDataType<TStreamable>, ParamCallbackType extends PayloadDataType<TStreamable>> = (this: TConnection, params: ParamType, reply: ReplyCallback<ParamCallbackType>) => void;
export type ReplyCallback<ParamType> = (error: any, params?: ParamType) => void;


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

/**
 * JSON spec requires a reply for every request, but our lib doesn't require a
 * callback for every sendMethod. We need a dummy callback to throw into responseHandlers
 * for when the user doesn't supply callback to sendMethod
 */
var emptyCallback = function emptyCallback()
{

    logger('emptycallback');
};

export interface SocketAdapter<TSocket = any>
{
    readonly open: boolean;
    close(): void;
    send(data: string): void;

    on(event: 'message', handler: (this: TSocket, ev: MessageEvent) => void): void;
    on(event: 'open', handler: (this: TSocket) => void): void;
    on(event: 'error', handler: (this: TSocket, ev: Event) => void): void;
    on(event: 'close', handler: (this: TSocket, ev: CloseEvent) => void): void;
    on(event: 'message' | 'error' | 'close' | 'open', handler: (ev?: any) => void): void

    once(event: 'message', handler: (this: TSocket, ev: MessageEvent) => void): void;
    once(event: 'open', handler: (this: TSocket) => void): void;
    once(event: 'error', handler: (this: TSocket, ev: Event) => void): void;
    once(event: 'close', handler: (this: TSocket, ev: CloseEvent) => void): void;
    once(event: 'message' | 'error' | 'close' | 'open', handler: (ev?: any) => void): void
}

export interface Parent<TStreamable, TConnection extends Connection<TStreamable>>
{
    type: string;
    getHandler: (method: string) => Handler<TConnection, TStreamable, any, any>;
    disconnected: (connection: TConnection) => void
}

/**
 * json-rpc-ws connection
 *
 * @constructor
 * @param {SocketAdapter} socket - socket adapter for this connection
 * @param {Object} parent - parent that controls this connection
 */

export abstract class Connection<TStreamable>
{
    /**
     *
     */
    constructor(public socket: SocketAdapter, public parent: Parent<TStreamable, Connection<TStreamable>>)
    {
        if (!this.socket.send)
            throw new Error('socket.send is not defined');
        logger('new Connection to %s', parent.type);

        socket.on('message', this.message.bind(this));
        // this.on('message', this.message.bind(this));
        this.once('close', this.close.bind(this) as any);
        this.once('error', this.close.bind(this) as any);
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
        this.socket.on(event, handler);
    }

    public once(event: 'message', handler: (ev: MessageEvent) => void): void
    public once(event: 'error', handler: (ev: Event) => void): void
    public once(event: 'close', handler: (ev: CloseEvent) => void): void
    public once(event: 'message' | 'error' | 'close', handler: (ev?: any) => void): void
    {
        this.socket.once(event, handler);
    }

    public id = uuid();
    protected responseHandlers: { [messageId: string]: ReplyCallback<any> } = {};

    /**
     * Send json payload to the socket connection
     *
     * @param {Object} payload - data to be stringified
     * @private
     * @todo validate payload
     * @todo make sure this.connection exists, is connected
     * @todo if we're not connected look up the response handler from payload.id
     */
    public sendRaw(payload: Payload<TStreamable>)
    {
        payload.jsonrpc = '2.0';
        this.socket.send(JSON.stringify(payload));
    };


    /**
     * Validate payload as valid jsonrpc 2.0
     * http://www.jsonrpc.org/specification
     * Reply or delegate as needed
     *
     * @param {Object} payload - payload coming in to be validated
     * @returns {void}
     */
    public processPayload(payload: Payload<TStreamable>): void
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
            var handlerCallback = function handlerCallback(this: Connection<TStreamable>, err: any, reply: PayloadDataType<TStreamable>)
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
                result = this.buildStream(id, result as TStreamable);
            }
            return responseHandler.call(this, error, result);
        }
    }

    protected abstract buildStream(id: string | number, result: TStreamable): any;
    protected abstract sendStream(id: string | number, result: TStreamable): any;
    protected abstract isStream(result: PayloadDataType<TStreamable>): result is TStreamable;


    /**
     * Send a result message
     *
     * @param {String} id - id for the message
     * @param {Object} error - error for the message
     * @param {String|Object|Array|Number} result - result for the message
     * @public
     *
     */
    public sendResult(id: string | number | undefined, error: ConnectionError | undefined, result?: PayloadDataType<TStreamable>, isStream?: boolean)
    {

        logger('sendResult %s %s %j %j', id, isStream, error, result);
        // Assert(id, 'Must have an id.');
        // Assert(error || result, 'Must have an error or a result.');
        if (error && result)
            throw new Error('Cannot have both an error and a result');

        var response: Payload<TStreamable> = { id: id, stream: !!isStream || this.isStream(result) };

        if (result)
        {
            response.result = result;
            if (response.stream && this.isStream(result))
            {
                if (typeof id == 'undefined')
                    throw new Error('streams are not supported without an id');
                logger('result is stream');
                this.sendStream(id, result);
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
    public sendMethod<TParamType extends PayloadDataType<TStreamable>, TReplyType extends PayloadDataType<TStreamable>>(method: string, params?: TParamType, callback?: ReplyCallback<TReplyType>)
    {
        var id = uuid();
        if (typeof method !== 'string' || !method.length)
            throw new Error('method must be a non-empty string');
        if (params !== null && params !== undefined && !(params instanceof Object))
            throw new Error('params, if provided,  must be an array, object or null');
        logger('sendMethod %s', method, id);
        if (callback)
        {
            this.responseHandlers[id] = callback;
        }
        else
        {
            this.responseHandlers[id] = emptyCallback;
        }
        var request: Payload<TStreamable> = {
            id: id,
            method: method
        };

        if (params)
        {
            if (this.isStream(params))
            {
                request.stream = true;
                this.sendStream(id, params)
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
        if (!this.socket)
            throw new Error('Not connected');
        if (typeof callback === 'function')
        {
            var socket = this.socket;
            socket.once('error', callback);
            socket.once('close', callback);
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
    private message(data: string | { data: string }): Payload<TStreamable> | void
    {
        //Validate as json first, easy reply if it's not
        //If it's an array iterate and handle
        //If it's an object handle
        //name of handle function ?!?!?
        logger('message %j', data);
        var payload;
        if (typeof (data) !== 'string') 
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