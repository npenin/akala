import { Base } from './base';
import * as debug from 'debug';
const logger = debug('json-rpc-ws');
import { SocketAdapter, PayloadDataType } from './shared-connection';

export default abstract class Client<TStreamable> extends Base<TStreamable>
{
  constructor(private socketConstructor: (address: string) => SocketAdapter)
  {
    super('client');
    logger('new Client');
  }

  public socket?: SocketAdapter;

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
    if (!this.isConnected())
      throw new Error('Already connected');
    var self = this;
    var opened = false;
    var socket = this.socket = this.socketConstructor(address);

    socket.once('open', function clientConnected()
    {
      // The client connected handler runs scoped as the socket so we can pass
      // it into our connected method like thisk
      self.connected(socket);
      opened = true;
      if (callback)
        callback.call(this);
    });
    if (callback)
      this.socket.once('error', function socketError(err)
      {
        if (!opened)
        {
          callback.call(self, err);
        }
      });
  }

  /**
   * Test whether we have a connection or not
   *
   * @returns {Boolean} whether or not we have a connection
   * @public
   */
  public isConnected()
  {
    return Object.keys(this.connections).length !== 0;
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
    if (this.isConnected())
      throw new Error('Not connected');
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
  public send<TParamType extends PayloadDataType<TStreamable>, TReplyType extends PayloadDataType<TStreamable>>(method: string, params: TParamType, callback?: (error?: any, result?: TReplyType) => void)
  {
    logger('send %s', method);
    if (!this.isConnected())
      throw new Error('Not connected');
    var connection = this.getConnection();
    connection.sendMethod(method, params as any, callback as any);
  };
}