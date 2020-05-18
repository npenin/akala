
import SocketAdapter from './ws-socket-adapter';
import { Adapter as ServerAdapter } from './server';
import Server from '../server';
import { Connection } from '../connection';
import Client from './client';
export { SocketAdapter, ServerAdapter }
import debug from 'debug';
import * as ws from 'ws';
const logger = debug('json-rpc-ws');

export function createClient()
{
  logger('create ws client');
  return new Client();
};
export function createServer<TConnection extends Connection = Connection>(options?: ws.ServerOptions)
{
  logger('create ws server');
  if (options)
    return new Server<TConnection>(new ServerAdapter(options));
  else
    return new Server<TConnection>();
};

export const connect = Client.connect;