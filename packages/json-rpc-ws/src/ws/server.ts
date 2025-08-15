import { type ServerAdapter } from '../server.js';
import * as ws from 'ws';
import type { SocketAdapter } from '@akala/core';
import WsSocketAdapter from './ws-socket-adapter.js';

export class Adapter implements ServerAdapter
{
  public server?: ws.WebSocketServer;
  closed: Promise<void>;

  close(): Promise<void>
  {
    this.server?.close();
    return this.closed;
  }

  onConnection(handler: (socket: SocketAdapter) => void): void
  {
    this.server?.on('connection', function (socket: ws.WebSocket)
    {
      handler(new WsSocketAdapter(socket));
    });
  }

  once(event: 'listening', callback: () => void): void
  {
    this.server?.on(event, callback);
  }

  start(): void
  {
    this.server = new ws.WebSocketServer(this.options);
    this.closed = new Promise<void>(resolve => this.server.once('close', resolve));
  }

  /**
   *
   */
  constructor(private options?: ws.ServerOptions)
  {
  }
}
