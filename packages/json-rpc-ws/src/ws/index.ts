
import { WsSocketAdapter as SocketAdapter } from './connection';
import { default as Server, Adapter as ServerAdapter } from './server';
import { Connection } from '../connection';
import Client from './client';
export { SocketAdapter, ServerAdapter }
import * as debug from 'debug';
import * as ws from 'ws';
const logger = debug('json-rpc-ws');

export function createClient<TConnection extends Connection = Connection>()
{
  logger('create ws client');
  return new Client<TConnection>();
};
export function createServer<TConnection extends Connection = Connection>(options?: ws.ServerOptions)
{
  logger('create ws server');
  if (options)
    return new Server<TConnection>(new ServerAdapter(options));
  else
    return new Server<TConnection>();
};