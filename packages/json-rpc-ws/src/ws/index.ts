
import SocketAdapter from './ws-socket-adapter.js';
import { Adapter as ServerAdapter } from './server.js';
import Server from '../server.js';
import { Connection } from '../connection.js';
import Client from './client.js';
export { SocketAdapter, ServerAdapter }
import debug from 'debug';
import * as ws from 'ws';
const logger = debug('json-rpc-ws');

export function createClient(): Client
{
  logger('create ws client');
  return new Client();
}
export function createServer<TConnection extends Connection = Connection>(options?: ws.ServerOptions): Server<TConnection>
{
  logger('create ws server');
  if (options)
    return new Server<TConnection>(new ServerAdapter(options));
  else
    return new Server<TConnection>();
}

export { Client }

export const connect = Client.connect;