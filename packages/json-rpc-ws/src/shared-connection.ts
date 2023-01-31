import { v4 as uuid } from 'uuid';
import debug from 'debug';
import { default as Errors, Error as ConnectionError, ErrorTypes } from './errors';
import { SerializableObject } from '@akala/core';
const logger = debug('json-rpc-ws');

export type PayloadDataType<T> = number | SerializableObject | SerializableObject[] | boolean | boolean[] | number[] | string | string[] | null | undefined | void | { event: string, isBuffer: boolean, data: string | SerializedBuffer } | T;
export type SerializedBuffer = { type: 'Buffer', data: Uint8Array | number[] };

export type Payload<T> = SerializablePayload | StreamPayload<T>;

interface CommonPayload
{
    jsonrpc?: '2.0';
    id?: string | number;
    method?: string;
    error?: ConnectionError;
}
export interface SerializablePayload extends CommonPayload
{
    params?: PayloadDataType<void>;
    result?: PayloadDataType<void>;
    stream?: false;
}
export interface StreamPayload<T> extends CommonPayload
{
    params?: T;
    result?: PayloadDataType<T>;
    stream?: true;
}

export type Handler<TConnection extends Connection<TStreamable>, TStreamable, ParamType extends PayloadDataType<TStreamable>, ParamCallbackType extends PayloadDataType<TStreamable>> = (this: TConnection, params: ParamType, reply: ReplyCallback<ParamCallbackType>) => void;
export type ReplyCallback<ParamType> = (error: ConnectionError, params?: ParamType) => void;


/**
 * Quarantined JSON.parse try/catch block in its own function
 *
 * @param {String} data - json data to be parsed
 * @returns {Object} Parsed json data
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const jsonParse = function jsonParse(data: string): any
{

    let payload;
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
const emptyCallback = function emptyCallback()
{

    logger('emptycallback');
};

export interface SocketAdapterEventMap
{
    message: string;
    open: Event;
    error: Event;
    close: CloseEvent;
}


export interface SocketAdapter<TSocket = unknown>
{
    readonly open: boolean;
    close(): void;
    send(data: string): void;

    on<K extends keyof SocketAdapterEventMap>(event: K, handler: (this: TSocket, ev: SocketAdapterEventMap[K]) => void): void

    once<K extends keyof SocketAdapterEventMap>(event: K, handler: (this: TSocket, ev: SocketAdapterEventMap[K]) => void): void;

    off<K extends keyof SocketAdapterEventMap>(event: K, handler?: (this: TSocket, ev: SocketAdapterEventMap[K]) => void): void

    pipe(socket: SocketAdapter): void;
}

export interface Parent<TStreamable, TConnection extends Connection<TStreamable>>
{
    type: string;
    getHandler: (method: string) => Handler<TConnection, TStreamable, PayloadDataType<TStreamable>, PayloadDataType<TStreamable>>;
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
    constructor(public readonly socket: SocketAdapter, public readonly parent: Parent<TStreamable, Connection<TStreamable>>)
    {
        if (!this.socket.send)
            throw new Error('socket.send is not defined');
        logger('new Connection to %s', parent.type);

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


    public on<K extends keyof SocketAdapterEventMap>(event: K, handler: (ev: SocketAdapterEventMap[K]) => void): void
    {
        this.socket.on(event, handler);
    }

    public once<K extends keyof SocketAdapterEventMap>(event: K, handler: (ev: SocketAdapterEventMap[K]) => void): void
    {
        this.socket.once(event, handler);
    }

    public readonly id = uuid();
    protected readonly responseHandlers: { [messageId: string]: ReplyCallback<unknown> } = {};

    /**
     * Send json payload to the socket connection
     *
     * @param {Object} payload - data to be stringified
     * @private
     * @todo validate payload
     * @todo make sure this.connection exists, is connected
     * @todo if we're not connected look up the response handler from payload.id
     */
    public sendRaw(payload: Payload<TStreamable>): void
    {
        payload.jsonrpc = '2.0';
        this.socket.send(JSON.stringify(payload));
    }


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
        const version = payload.jsonrpc;
        const id = payload.id;
        const method = payload.method;
        let params = payload.params;
        let result = payload.result;

        if (typeof payload.error == 'object' && payload.error && 'stack' in payload.error && 'message' in payload.error)
        {
            const error = new Error();
            payload.error = Object.assign(error, { stack: error.stack, message: error.message, name: error.name }, payload.error);
        }
        const error = payload.error;

        if (version !== '2.0')
        {
            return this.sendError('invalidRequest', id, { info: 'jsonrpc must be exactly "2.0"' });
        }
        //Will either have a method (request), or result or error (response)
        if (typeof method === 'string')
        {
            const handler = this.parent.getHandler(method);
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
            const handlerCallback = function handlerCallback(this: Connection<TStreamable>, err: ConnectionError, reply: PayloadDataType<TStreamable>)
            {
                logger('handler got callback %j, %j', err, reply);
                if (typeof this.socket != 'undefined')
                    this.sendResult(id, err, reply);
                else
                    console.error('no socket to reply to');
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
            const responseHandler = this.responseHandlers[id];
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

    protected abstract buildStream(id: string | number, result: PayloadDataType<TStreamable>): TStreamable;
    protected abstract sendStream(id: string | number, result: TStreamable): void;
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
    public sendResult(id: string | number | undefined, error: ConnectionError | undefined, result?: PayloadDataType<TStreamable>, isStream?: boolean): void
    {

        logger('sendResult %s %s %j %j', id, isStream, error, result);
        // Assert(id, 'Must have an id.');
        // Assert(error || result, 'Must have an error or a result.');
        if (error && result)
            throw new Error('Cannot have both an error and a result');

        const response: Payload<TStreamable> = { id: id, stream: !!isStream || this.isStream(result) };

        if (result)
        {
            let cleanResult: PayloadDataType<TStreamable>;
            if (typeof result == 'object' && !Array.isArray(result))
            {
                cleanResult = {};
                Object.getOwnPropertyNames(result).forEach(p =>
                {
                    if (p[0] != '_')
                        Object.defineProperty(cleanResult, p, Object.getOwnPropertyDescriptor(result, p) as PropertyDescriptor)
                });
            }
            else
                cleanResult = result;

            response.result = cleanResult;
            if (response.stream)
            {
                if (typeof id == 'undefined')
                    throw new Error('streams are not supported without an id');
                logger('result is stream');
                this.sendStream(id, result as TStreamable);
            }
        }
        else
        {
            if (error instanceof Error)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                error = Object.fromEntries([...Object.entries(error), ['message', error.message], ['stack', error.stack]]) as any;
            response.error = error;
        }

        this.sendRaw(response);
    }

    /**
     * Send a method message
     *
     * @param {String} method - method for the message
     * @param {Array|Object|null} params  - params for the message
     * @param {function} callback - optional callback for a reply from the message
     * @public
     */
    public sendMethod<TParamType extends PayloadDataType<TStreamable>, TReplyType extends PayloadDataType<TStreamable>>(method: string, params?: TParamType, callback?: ReplyCallback<TReplyType>): void
    {
        const id = uuid();
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
        const request: Payload<TStreamable> = {
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
    }

    /**
     * Send an error message
     *
     * @param {Object} error - json-rpc error object (See Connection.errors)
     * @param {String|Number|null} id - Optional id for reply
     * @param {Any} data - Optional value for data portion of reply
     * @public
     */
    public sendError(error: ErrorTypes, id: number | string | undefined, data?: SerializableObject): void
    {

        logger('sendError %s', error);
        //TODO if id matches a responseHandler, we should dump it right?
        this.sendRaw(Errors(error, id, data));
    }

    /**
     * Called when socket gets 'close' event
     *
     * @param {ConnectionError} error - optional error object of close wasn't expected
     * @private
     */
    public close(error?: ConnectionError | 1000 | Error | Event): void
    {

        logger('close');
        if (error && error !== 1000)
        {
            // debugger;
            logger('close error %s', error['stack'] || error);
        }
        this.parent.disconnected(this); //Tell parent what went on so it can track connections
        // delete this.socket;
    }

    /**
     * Hang up the current socket
     */
    public hangup(): Promise<CloseEvent>
    {
        logger('hangup');
        if (!this.socket)
            throw new Error('Not connected');
        return new Promise<CloseEvent>((resolve, reject) =>
        {
            const socket = this.socket;
            socket.once('error', reject);
            socket.once('close', resolve);
            this.socket.close();
        });
    }

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
        let payload;
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
            console.error(data);
            return this.sendError('parseError', -1);
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
    }
}