import debug from 'debug';
import ClientBase from '../shared-client.js';
import { SocketAdapter } from '../shared-connection.js';

const logger = debug('json-rpc-ws');

export default abstract class Client<TStreamable> extends ClientBase<TStreamable>
{
  constructor(socketConstructor: (address: string) => SocketAdapter)
  {
    super(socketConstructor);
    logger('new ws Client');
  }
}