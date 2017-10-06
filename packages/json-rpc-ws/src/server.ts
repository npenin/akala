'use strict';

import { Base } from './base';
import { default as Errors } from './errors';
import { Connection, ReplyCallback } from './connection';
import * as WebSocket from 'ws';
import * as debug from 'debug';
const logger = debug('json-rpc-ws');



/**
 * json-rpc-ws server
 *
 */
export class Server<TConnection extends Connection> extends Base<TConnection>
{
  constructor()
  {
    super('server');
    logger('new Server');
  }

  private server: WebSocket.Server;

  /**
 * Start the server
 *
 * @param {Object} options - optional options to pass to the ws server.
 * @param {function} callback - optional callback which is called once the server has started listening.
 * @public
 */
  public start(options?: WebSocket.ServerOptions, callback?: () => void)
  {

    logger('Server start');
    this.server = new WebSocket.Server(options);
    if (typeof callback === 'function')
    {
      this.server.once('listening', callback);
    }
    this.server.on('connection', this.connected.bind(this));
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
    this.server.close();
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
  public send<TParam extends any[] | object | null, TReplyParam>(id: string, method: string, params: TParam, callback: ReplyCallback<TReplyParam>)
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
}