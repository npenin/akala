'use strict';

import { ServerAdapter } from '../server';
import * as ws from 'ws';
import { SocketAdapter } from '../connection';

export default class Adapter implements ServerAdapter
{
  readonly server: ws.Server;

  close(): void
  {
    this.server.close();
  }

  onConnection(handler: (socket: SocketAdapter<ws | WebSocket>) => void): void
  {
    this.server.on('connection', handler);
  }

  once(event: 'listening', callback: () => void): void
  {
    this.server.on(event, callback);
  }

  /**
   *
   */
  constructor(options?: ws.ServerOptions)
  {
    this.server = new ws.Server(options);
  }
}

