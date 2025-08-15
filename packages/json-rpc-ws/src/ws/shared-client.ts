import debug from 'debug';
import ClientBase from '../shared-client.js';
import type { SocketAdapter } from '@akala/core';

const logger = debug('akala:json-rpc-ws');

export default abstract class Client<TStreamable, TConnectOptions> extends ClientBase<TStreamable, TConnectOptions>
{
  constructor(socketConstructor: (address: string, options?: TConnectOptions) => SocketAdapter, options?: TConnectOptions)
  {
    super(socketConstructor, options);
    logger('new ws Client');
  }
}
