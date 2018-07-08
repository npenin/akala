'use strict';
import * as debug from 'debug';
import * as uuid from 'uuid';
const logger = debug('json-rpc-ws');
import * as ws from 'ws';


import { Connection, Handler, PayloadDataType } from './connection';



/**
 * Base functionality shared by client and server
 *
 * @constructor
 * @public
 */
export class Base<TConnection extends Connection>
{
  constructor(public type: string)
  {

  }

  public id = uuid();

  public browser: boolean = false;

  private requestHandlers: { [method: string]: Handler<TConnection, any, any> } = {};

  protected connections: { [id: string]: TConnection } = {};


  /**
   * Add a handler function for a given method
   *
   * @param {String} method - name of the method to add handler for.
   * @param {function} handler - function to be passed params for given method.
   * @todo enforce handler w/ two-param callback
   * @public
   */
  public expose<TParamType extends PayloadDataType, TReplyType extends PayloadDataType>(method: string, handler: Handler<TConnection, TParamType, TReplyType>)
  {

    logger('registering handler for %s', method);
    if (this.requestHandlers[method])
    {
      throw Error('cannot expose handler, already exists ' + method);
    }
    this.requestHandlers[method] = handler;
  };

  /**
   * Connected event handler
   *
   * @param {Object} socket - new socket connection
   * @private
   */
  public connected(socket: ws | WebSocket)
  {
    logger('%s connected', this.type);
    var connection = new Connection(socket, this as any);
    this.connections[connection.id] = <any>connection;
  };

  /**
   * Disconnected event handler
   *
   * @param {Object} connection - connection object that has been closed
   * @private
   */
  public disconnected(connection: TConnection)
  {

    logger('disconnected');
    delete this.connections[connection.id];
  };

  /**
   * Test if a handler exists for a given method
   *
   * @param {String} method - name of method
   * @returns {Boolean} whether or not there are any handlers for the given method
   * @public
   */
  public hasHandler(method: string)
  {

    if (this.requestHandlers[method] !== undefined)
    {
      return true;
    }
    return false;
  };

  /**
   * Get handler for a given method
   *
   * @param {String} method - name of method
   * @returns {Array}  - handler for given method
   * @public
   */
  public getHandler(method: string)
  {

    return this.requestHandlers[method];
  };

  /**
   * Get a connection by id
   *
   * @param {id} id - id of the connection to get
   * @returns {Connection} - Connection
   * @public
   */
  public getConnection(id: string)
  {
    return this.connections[id];
  };

  /**
   * Shut down all existing connections
   *
   * @public
   */
  public hangup()
  {
    logger('hangup');
    var connections = Object.keys(this.connections);
    connections.forEach(function hangupConnection(this: Base<TConnection>, id)
    {
      this.connections[id].close();
      delete this.connections[id];
    }, this);
  };
}