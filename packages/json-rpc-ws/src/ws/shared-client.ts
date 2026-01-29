import ClientBase from '../shared-client.js';
import { logger, type SocketAdapter } from '@akala/core';
import { Payload } from '../shared-connection.js';

const log = logger.use('akala:json-rpc-ws');

export default abstract class Client<TStreamable, TConnectOptions> extends ClientBase<TStreamable, TConnectOptions>
{
  constructor(socketConstructor: (address: string, options?: TConnectOptions) => SocketAdapter<Payload<TStreamable>[]>, options?: TConnectOptions)
  {
    super(socketConstructor, options);
    log.debug('new ws Client');
  }
}
