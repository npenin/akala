'use strict';

import { Base } from './base';
import { default as Errors } from './errors';
import { Connection, ReplyCallback, PayloadDataType, SocketAdapter } from './connection';
import * as debug from 'debug';
const logger = debug('json-rpc-ws');

export interface ServerAdapter
{
  close(): void;
  onConnection(arg1: (socket: SocketAdapter) => void): void;
  once(event: 'listening', callback: () => void): void;

}

/**
 * json-rpc-ws server
 *
 */
export default class Server<TConnection extends Connection = Connection> extends Base<TConnection>
{
  private server?: ServerAdapter;

  constructor()
  {
    super('server');
    logger('new Server');
  }

  /**
 * Start the server
 *
 * @param {Object} options - optional options to pass to the ws server.
 * @param {function} callback - optional callback which is called once the server has started listening.
 * @public
 */
  public start(server: ServerAdapter, callback?: () => void)
  {

    logger('Server start');

    this.server = server;

    if (typeof callback === 'function')
    {
      this.server.once('listening', callback);
    }
    this.server.onConnection(this.connected.bind(this));
  };


  /**
   * Stop the server
   *
   * @todo param {function} callback - called after the server has stopped
   * @public
   */
  public stop()
  {

    logger('Server stop');
    this.hangup();
    this.server?.close();
    delete this.server;
  };

  /**
   * Send a method request through a specific connection
   *
   * @param {String} id - connection id to send the request through
   * @param {String} method - name of method
   * @param {Array} params - optional parameters for method
   * @param {replyCallback} callback - optional reply handler
   * @public
   */
  public send<TParam extends PayloadDataType, TReplyParam extends PayloadDataType>(id: string, method: string, params?: TParam, callback?: ReplyCallback<TReplyParam>)
  {
    logger('Server send %s %s', id, method);
    var connection = this.getConnection(id);
    if (connection)
    {
      connection.sendMethod(method, params, callback);
    }
    else if (typeof callback === 'function')
    {
      callback(Errors('serverError').error);
    }
  };

  public broadcast<TParam extends PayloadDataType, TReplyParam extends PayloadDataType>(method: string, params: TParam, callback?: ReplyCallback<TReplyParam>)
  {
    Object.keys(this.connections).forEach((id) =>
    {
      this.send(id, method, params, callback);
    })
  }
}