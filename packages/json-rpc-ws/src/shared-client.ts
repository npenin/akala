import { Base } from './base.js';
import debug from 'debug';
const logger = debug('json-rpc-ws');
import { SocketAdapter, PayloadDataType, Connection } from './shared-connection.js';
import { Error as MyError } from './errors.js'

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
  public connect(address: string, callback: (err?: Event) => void): void
  {
    logger('Client connect %s', address);
    if (this.isConnected())
      throw new Error('Already connected');
    let opened = false;
    const socket = this.socket = this.socketConstructor(address);

    socket.once('open', () =>
    {
      // The client connected handler runs scoped as the socket so we can pass
      // it into our connected method like thisk
      this.connected(socket);
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
  public isConnected(): boolean
  {
    return Object.keys(this.connections).length !== 0;
  }

  /**
   * Return the current connection (there can be only one)
   *
   * @returns {Object} current connection
   * @public
   */
  public getConnection(): Connection<TStreamable>
  {
    const ids = Object.keys(this.connections);
    return this.connections[ids[0]];
  }


  /**
   * Close the current connection
   */
  public disconnect(): Promise<CloseEvent>
  {
    if (!this.isConnected())
      throw new Error('Not connected');
    const connection = this.getConnection();
    return connection.hangup();
  }

  /**
   * Send a method request
   *
   * @param {String} method - name of method
   * @param {Array} params - optional parameters for method
   * @param {function} callback - optional reply handler
   * @public
   * @todo allow for empty params aka arguments.length === 2
   */
  public send<TParamType extends PayloadDataType<TStreamable>, TReplyType extends PayloadDataType<TStreamable>>(method: string, params: TParamType, callback?: (error?: MyError, result?: TReplyType) => void): void
  {
    logger('send %s', method);
    if (!this.isConnected())
      throw new Error('Not connected');
    const connection = this.getConnection();
    connection.sendMethod(method, params, callback);
  }
}