import { ServerAdapter } from '../server';
import * as ws from 'ws';
import { SocketAdapter } from '../shared-connection';
import WsSocketAdapter from './ws-socket-adapter';

export class Adapter implements ServerAdapter
{
  public server?: ws.Server;

  close(): void
  {
    this.server?.close();
  }

  onConnection(handler: (socket: SocketAdapter<ws>) => void): void
  {
    this.server?.on('connection', function (socket)
    {
      handler(new WsSocketAdapter(socket));
    });
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