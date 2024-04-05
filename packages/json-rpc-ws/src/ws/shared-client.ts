import debug from 'debug';
import ClientBase from '../shared-client.js';
import { SocketAdapter } from '../shared-connection.js';

const logger = debug('json-rpc-ws');

export default abstract class Client<TStreamable, TConnectOptions> extends ClientBase<TStreamable, TConnectOptions>
{
  constructor(socketConstructor: (address: string, options?: TConnectOptions) => SocketAdapter, options?: TConnectOptions)
  {
    super(socketConstructor, options);
    logger('new ws Client');
  }
}