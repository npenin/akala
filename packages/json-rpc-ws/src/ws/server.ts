'use strict';

import { ServerAdapter, default as BaseServer } from '../server';
import * as ws from 'ws';
import { SocketAdapter, Connection } from '../connection';


export class Adapter implements ServerAdapter
{
  private server?: ws.Server;

  close(): void
  {
    this.server?.close();
  }

  onConnection(handler: (socket: SocketAdapter<ws | WebSocket>) => void): void
  {
    this.server?.on('connection', handler);
  }

  once(event: 'listening', callback: () => void): void
  {
    this.server?.on(event, callback);
  }

  start()
  {
    this.server = new ws.Server(this.options);
  }

  /**
   *
   */
  constructor(private options?: ws.ServerOptions)
  {
  }
}


export default class Server<TConnection extends Connection = Connection> extends BaseServer<TConnection>
{
  constructor(adapter?: Adapter)
  {
    super(adapter);
  }
}