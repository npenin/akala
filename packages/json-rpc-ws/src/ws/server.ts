import { ServerAdapter } from '../server.js';
import * as ws from 'ws';
import { SocketAdapter } from '../shared-connection.js';
import WsSocketAdapter from './ws-socket-adapter.js';

export class Adapter implements ServerAdapter
{
  public server?: ws.WebSocketServer;

  close(): void
  {
    this.server?.close();
  }

  onConnection(handler: (socket: SocketAdapter<ws.WebSocket>) => void): void
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
  }

  /**
   *
   */
  constructor(private options?: ws.ServerOptions)
  {
  }
}