'use strict';

import { Base } from './base';
import { default as Errors } from './errors';
import { ReplyCallback, PayloadDataType as BasePayloadDataType, SocketAdapter } from './shared-connection';
import { Connection } from './connection';
import * as stream from 'stream'
import * as debug from 'debug';
import assert = require('assert');
const logger = debug('json-rpc-ws');

export interface ServerAdapter 
{
  close(): void;
  onConnection(arg1: (socket: SocketAdapter) => void): void;
  once(event: 'listening', callback: () => void): void;
  start(): void;
}

export type PayloadDataType = BasePayloadDataType<stream.Readable>;

/**
 * json-rpc-ws server
 *
 */
export default class Server<TConnection extends Connection> extends Base<stream.Readable, TConnection>
{
  constructor(private server?: ServerAdapter)
  {
    super('server');
    logger('new Server');
  }

  connection(socket: SocketAdapter): Connection
  {
    return new Connection(socket, this as any);
  }

  /**
 * Start the server
 *
 * @param {Object} options - optional options to pass to the ws server.
 * @param {function} callback - optional callback which is called once the server has started listening.
 * @public
 */
  public start(server?: ServerAdapter, callback?: () => void)
  {

    logger('Server start');
    if (server && this.server && server !== this.server)
      assert.fail('a ServerAdapter was already defined at construction, and a different server is provided at start');
    if (server)
      this.server = server;
    assert.ok(this.server, 'no ServerAdapter was defined (neither at construction nor at start)');
    this.server?.start();

    if (typeof callback === 'function')
      this.server?.once('listening', callback);

    this.server?.onConnection(socket =>
    {
      this.connected(socket)
    });
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