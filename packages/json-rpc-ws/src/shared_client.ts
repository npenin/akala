'use strict';

import { Base } from './base';
import { Connection, isBrowserSocket, PayloadDataType } from './connection';
import * as ws from 'ws';
import * as debug from 'debug';
const logger = debug('json-rpc-ws');
import { ok as assert } from 'assert';

export type SocketType = ws | WebSocket;

export default class Client<TClientConnection extends Connection> extends Base<TClientConnection>
{
  constructor(private socketConstructor: new (address: string) => SocketType, browser: boolean)
  {
    super('client');
    logger('new Client');
    this.browser = browser;
  };

  private socket: SocketType;

  /**
   * Connect to a json-rpc-ws server
   *
   * @param {String} address - url to connect to i.e. `ws://foo.com/`.
   * @param {function} callback - optional callback to call once socket is connected
   * @public
   */
  public connect(address: string, callback: (err?: any) => void)
  {
    logger('Client connect %s', address);
    assert(!this.isConnected(), 'Already connected');
    var self = this;
    var opened = false;
    var socket = this.socket = new this.socketConstructor(address);
    if (isBrowserSocket(this, socket))
    {
      socket.onerror = function onerror(err)
      {
        if (!opened && callback)
        {
          delete socket.onopen;
          callback(err);
        }
      };
      socket.onopen = function onopen()
      {
        opened = true;
        delete socket.onopen;
        self.connected(this);
        if (callback)
        {
          callback();
        }
      };
    }
    else
    {
      socket.once('open', function clientConnected(this: SocketType)
      {

        // The client connected handler runs scoped as the socket so we can pass
        // it into our connected method like thisk
        self.connected(this);
      });
      if (callback)
      {
        socket.once('open', function socketOpen(this: SocketType)
        {

          opened = true;
          callback.apply(this, arguments);
        });
        socket.once('error', function socketError(this: SocketType)
        {

          if (!opened)
          {
            callback.apply(this, arguments);
          }
        });
      }
    }
  };

  /**
   * Test whether we have a connection or not
   *
   * @returns {Boolean} whether or not we have a connection
   * @public
   */
  public isConnected()
  {

    if (Object.keys(this.connections).length === 0)
    {
      return false;
    }
    return true;
  };

  /**
   * Return the current connection (there can be only one)
   *
   * @returns {Object} current connection
   * @public
   */
  public getConnection()
  {
    var ids = Object.keys(this.connections);
    return this.connections[ids[0]];
  };


  /**
   * Close the current connection
   *
   * @param {function} callback - called when the connection has been closed
   * @public
   */
  public disconnect(callback: () => void)
  {

    assert(this.isConnected(), 'Not connected');
    var connection = this.getConnection();
    connection.hangup(callback);
  };

  /**
   * Send a method request
   *
   * @param {String} method - name of method
   * @param {Array} params - optional parameters for method
   * @param {function} callback - optional reply handler
   * @public
   * @todo allow for empty params aka arguments.length === 2
   */
  public send<TParamType extends PayloadDataType, TReplyType extends PayloadDataType>(method: string, params: TParamType, callback?: (error?: any, result?: TReplyType) => void)
  {
    logger('send %s', method);
    assert(this.isConnected(), 'Not connected');
    var connection = this.getConnection();
    connection.sendMethod(method, params, callback);
  };
}