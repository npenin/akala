import ClientBase from '../shared-client';
import debug from 'debug';
import { SocketAdapter } from '../shared-connection';

const logger = debug('json-rpc-ws');

export default abstract class Client<TStreamable> extends ClientBase<TStreamable>
{
  constructor(socketConstructor: (address: string) => SocketAdapter)
  {
    super(socketConstructor);
    logger('new ws Client');
  }
}