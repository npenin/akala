import { Connection as BaseConnection, PayloadDataType, SerializedBuffer, Payload, SocketAdapter, Parent } from './shared-connection.js';
import { default as Client } from './shared-client.js';
import { default as Errors, Payload as ErrorPayload } from './errors.js';
import { Deferred, SerializableObject } from '@akala/core'

import debug from 'debug';

const logger = debug('json-rpc-ws');

import * as ws from './ws/browser.js';
import { ReadableStreamDefaultReadResult } from 'stream/web';
export { ws };
export { Client, SocketAdapter, Errors, BaseConnection, SerializableObject, PayloadDataType, SerializedBuffer, Payload, ErrorPayload };

class ByobReader implements ReadableStreamBYOBReader
{
  reader: DefaultReader;
  constructor(private stream: Readable)
  {
    this.reader = new DefaultReader(stream);
    this.reader.releaseLock();
  }
  public emitError(error: Error)
  {
    this.reader.emitError(error);
  }

  get closed(): Promise<undefined>
  {
    return this.reader.closed;
  }
  cancel(reason?: Error): Promise<void>
  {
    return this.reader.cancel(reason);
  }

  public push(...chunks: (Uint8Array | null)[])
  {
    this.reader.push(...chunks);
  }

  read<T extends ArrayBufferView>(view: T): Promise<ReadableStreamDefaultReadResult<T>>
  {
    return this.reader.read().then(v =>
    {
      if (!v.done)
      {
        view.byteOffset = v.value.byteOffset;
        view.byteLength = v.value.byteLength;
        view.buffer = v.value.buffer;
      }
      return { done: v.done as false, value: view };
    })
  }
  releaseLock(): void
  {
    if (this.stream.reader === this.reader)
      this.stream.reader = undefined;
  }
}


class DefaultReader implements ReadableStreamDefaultReader<Uint8Array>
{
  private next?: Deferred<ReadableStreamDefaultReadResult<Uint8Array>>;
  constructor(private stream: Readable)
  {
  }

  public emitError(error: Error)
  {
    if (!this.next)
      this.next = new Deferred();
    this.next.reject(error);
    return this.next;
  }

  public push(...chunks: (Uint8Array | null)[])
  {
    if (chunks.length == 0)
      return;
    const totalLength = chunks.reduce((l, chunk) => l + (chunk === null ? 0 : chunk.byteLength - chunk.byteOffset), 0);
    if (totalLength === 0)
    {
      if (!this.next)
        this.next = new Deferred<ReadableStreamDefaultReadResult<Uint8Array>>();
      return this.next.resolve({ done: true });
    }
    const buffer = new Uint8Array(totalLength);
    let start = 0;
    let chunk: Uint8Array | null | undefined = undefined;
    for (chunk of chunks)
    {
      if (chunk === null)
        break;
      for (let i = chunk.byteOffset; i < chunk.byteLength; i++)
      {
        buffer[start++] = chunk[i];
      }
    }

    if (!this.next)
      this.next = new Deferred<ReadableStreamDefaultReadResult<Uint8Array>>();
    this.next.resolve({ value: buffer, done: false });

    if (chunk === null)
    {
      this.next = new Deferred<ReadableStreamDefaultReadResult<Uint8Array>>();
      this.next.resolve({ done: true });
      this.closed.resolve();
    }
  }

  closed: Deferred<undefined> = new Deferred<undefined>();
  cancel(reason?: Error): Promise<void>
  {
    if (this.next)
      return this.next.then(() => Promise.reject(reason));
    else
      return Promise.reject(reason);
  }
  read(): Promise<ReadableStreamDefaultReadResult<Uint8Array>>
  {
    if (!this.next)
      this.next = new Deferred<ReadableStreamDefaultReadResult<Uint8Array>>();
    this.next.finally(() => this.next = undefined);
    return this.next;
  }
  releaseLock(): void
  {
    if (this.stream.reader === this)
      this.stream.reader = undefined;
  }
}

class Readable implements ReadableStream<Uint8Array>
{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  forEach(callbackfn: (value: any, key: number, parent: ReadableStream<Uint8Array>) => void, thisArg?: any): void
  {
    return this.buffer.forEach((x, i) => callbackfn(x, i, thisArg || this))
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  entries(): IterableIterator<[number, any]>
  {
    return this.buffer.entries();
  }
  keys(): IterableIterator<number>
  {
    return this.buffer.keys();

  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  values(): IterableIterator<any>
  {
    return this.buffer.values();
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [Symbol.iterator](): IterableIterator<any>
  {
    return this.buffer[Symbol.iterator]();
  }
  private buffer: (Uint8Array | null)[] = [];
  private _reader?: DefaultReader | ByobReader;
  private target?: WritableStream<unknown>;
  public get reader(): DefaultReader | ByobReader | undefined
  {
    return this._reader;
  }

  public set reader(reader: DefaultReader | ByobReader | undefined)
  {
    this._reader = reader;
    if (reader && this.buffer.length)
    {
      reader.push(...this.buffer);
    }
  }

  get locked(): boolean
  {
    return !!this.reader && !this.target;
  }
  cancel(_reason?: Error): Promise<void>
  {

    if (this.reader)
      return this.reader.cancel(_reason);
    if (this.target)
      return this.target.abort(_reason);

    return Promise.resolve();
  }

  emitError(error: Error)
  {
    if (this.reader)
      return this.reader.emitError(error);
    if (this.target)
      return this.target.abort(error);
  }

  push(chunk: Uint8Array | null)
  {
    if (!this.reader)
      this.buffer.push(chunk);
    else
      this.reader.push(chunk);
  }

  getReader(options: { mode: "byob" }): ReadableStreamBYOBReader;
  getReader(): ReadableStreamDefaultReader<Uint8Array>;
  getReader(options?: ReadableStreamGetReaderOptions): ReadableStreamReader<Uint8Array>
  {
    if (this.locked)
      throw new Error('stream is already locked');

    if (options && options.mode === 'byob')
    {
      return this.reader = new ByobReader(this);
    }
    return this.reader = new DefaultReader(this);
  }
  pipeThrough<T>({ writable, readable }: { writable: WritableStream<Uint8Array>; readable: ReadableStream<T>; }, options?: StreamPipeOptions | undefined): ReadableStream<T>
  {
    this.pipeTo(writable, options);
    return readable;
  }
  async pipeTo(dest: WritableStream<Uint8Array>, options?: StreamPipeOptions | undefined): Promise<void>
  {
    this.target = dest;
    const writer = dest.getWriter();
    let chunk: Uint8Array | null | undefined;
    while (typeof (chunk = this.buffer.shift()) != 'undefined')
    {
      if (chunk)
        await writer.write(chunk);
      if (chunk === null && options && options.preventClose)
        await writer.close()
    }
  }
  tee(): [ReadableStream<Uint8Array>, ReadableStream<Uint8Array>]
  {
    throw new Error("Method not implemented.");
  }
}


export class Connection extends BaseConnection<ReadableStream<Uint8Array>>
{
  constructor(socket: SocketAdapter, parent: Parent<ReadableStream, Connection>)
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
