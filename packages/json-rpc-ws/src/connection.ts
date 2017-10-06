
import { v4 as uuid } from 'uuid';
import * as debug from 'debug';
import { ok as Assert } from 'assert';
import { default as Errors, Error as ConnectionError, ErrorTypes } from './errors';
import * as ws from 'ws';
const logger = debug('json-rpc-ws');

export interface Payload
{
  jsonrpc?: '2.0';
  id?: string | number;
  method?: string;
  params?: any;
  result?: string | object | Array<any> | number;
  error?: ConnectionError;
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


export type Handler<TConnection extends Connection, ParamType, ParamCallbackType> = (this: TConnection, params: ParamType, reply: ReplyCallback<ParamCallbackType>) => void;
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

/**
 * Socket onclose handler for browser WebSocket
 */
var socketClosed = function socketClosed(this: Connection)
{
  delete this.socket.onclose;
  this.close();
};

/**
 * Socket onerror handler for browser WebSocket
 */
var socketError = function socketError(this: Connection)
{
  delete this.socket.onerror;
  this.close();
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
    {
      socket.onmessage = this.message.bind(this);
      socket.onclose = socketClosed.bind(this);
      socket.onerror = socketError.bind(this);
    }
    else
    {
      socket.on('message', this.message.bind(this));
      socket.once('close', this.close.bind(this));
      socket.once('error', this.close.bind(this));
    }
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
      var handlerCallback = function handlerCallback(this: Connection, err: any, reply: ReplyCallback<any>)
      {

        logger('handler got callback %j, %j', err, reply);
        return this.sendResult(id, err, reply);
      };
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
  public sendResult(id: string | number | undefined, error: ConnectionError | undefined, result: string | object | Array<any> | number | undefined)
  {

    logger('sendResult %s %j %j', id, error, result);
    // Assert(id, 'Must have an id.');
    Assert(error || result, 'Must have an error or a result.');
    Assert(!(error && result), 'Cannot have both an error and a result');

    var response: Payload = { id: id };

    if (result)
    {
      response.result = result;
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
  public sendMethod(method: string, params: Array<any> | object | null, callback?: ReplyCallback<any>)
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