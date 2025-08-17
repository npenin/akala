import
{
  Connection as BaseConnection, type PayloadDataType, type SerializedBuffer, type Payload,
  type Parent,
  JsonRpcSocketAdapter,
} from './shared-connection.js';
import { default as Client } from './shared-client.js';
import { default as Errors, type Payload as ErrorPayload } from './errors.js';
import type { SocketAdapter, SocketAdapterEventMap, SerializableObject } from '@akala/core'

import debug from 'debug';

const logger = debug('akala:json-rpc-ws');

import * as ws from './ws/websocket.js';
export { ws };
export { Client, type SocketAdapter, Errors, BaseConnection, JsonRpcSocketAdapter, type SerializableObject, type PayloadDataType, type SerializedBuffer, type Payload, type ErrorPayload, type SocketAdapterEventMap };

class Readable extends ReadableStream<Uint8Array>
{
  constructor()
  {
    super({
      type: 'bytes', start: (controller) =>
      {
        if (this.buffer.length)
          controller.enqueue(this.buffer.shift());
      },
      pull: (controller) =>
      {
        if (this.buffer.length)
          controller.enqueue(this.buffer.shift());
      }, cancel: reason => { }
    })
  }

  private buffer: (Uint8Array | null)[] = [];

  emitError(error: Error)
  {
    return super.cancel(error);
  }

  push(chunk: Uint8Array | null)
  {
    this.buffer.push(chunk);
  }
}


export class Connection extends BaseConnection<ReadableStream<Uint8Array>>
{
  constructor(socket: SocketAdapter<object>, parent: Parent<ReadableStream, Connection>)
  {
    super(socket, parent as Parent<ReadableStream, BaseConnection<ReadableStream>>);
  }


  protected async sendStream(id: string | number, result: ReadableStream<Uint8Array>): Promise<void>
  {
    const reader = result.getReader();
    const chunk = await reader.read();
    if (!chunk.done && this.socket.open)
      this.sendRaw({ id: id, result: { event: 'data', isBuffer: true, data: { type: 'Buffer', data: chunk.value } } });
    else if (this.socket.open)
      this.sendRaw({ id: id, result: { event: 'end' }, stream: false });
    else
      logger('socket was closed before end of stream')
  }

  protected isStream(result: PayloadDataType<ReadableStream>): result is ReadableStream  
  {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return typeof (result) != 'undefined' && !!result && typeof ((result as any).getReader) == 'function';
  }

  protected buildStream(id: string | number, result: PayloadDataType<ReadableStream<Uint8Array>>): ReadableStream<Uint8Array>
  {
    const s = new Readable();
    const src: SerializableObject = result as SerializableObject;
    Object.getOwnPropertyNames(src).forEach(function (p)
    {
      if (Object.getOwnPropertyDescriptor(result, p) == null)
      {
        const prop = Object.getOwnPropertyDescriptor(src, p);
        if (prop)
          Object.defineProperty(result, p, prop);
      }
    })

    const f = this.responseHandlers[id] = (error, result: { event: string, isBuffer?: boolean, data?: SerializedBuffer }) =>
    {
      if (error)
        s.emitError(error as unknown as Error);
      else
        switch (result.event)
        {
          case 'data':
            if (result.data)
              s.push(Uint8Array.from(result.data.data));

            this.responseHandlers[id as string] = f;
            break;
          case 'end':
            s.push(null);
            break;
        }
    }
    return s;
  }
}
