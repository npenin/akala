import { Connection as BaseConnection, PayloadDataType, SerializableObject, SerializedBuffer, SocketAdapter, Parent, Deferred } from './shared-connection'
import Errors from './errors';
import debug from 'debug';

const logger = debug('json-rpc-ws');

import Client from './ws/browser'

export { Client }
export { Errors }
export function createClient()
{
  logger('createClient');
  return new Client();
}

class ByobReader implements ReadableStreamBYOBReader
{
  reader: DefaultReader;
  constructor(private stream: Readable)
  {
    this.reader = new DefaultReader(stream);
    this.reader.releaseLock();
  }
  public emitError(error: any)
  {
    this.reader.emitError(error);
  }

  get closed(): Promise<void>
  {
    return this.reader.closed;
  }
  cancel(reason?: any): Promise<void>
  {
    return this.reader.cancel(reason);
  }

  public push(...chunks: (Uint8Array | null)[])
  {
    this.reader.push(...chunks);
  }

  read<T extends ArrayBufferView>(view: T): Promise<ReadableStreamReadResult<T>>
  {
    return this.reader.read().then(v =>
    {
      if (!v.done)
      {
        view.byteOffset = v.value.byteOffset;
        view.byteLength = v.value.byteLength;
        view.buffer = v.value.buffer;
      }
      return { done: v.done, value: view };
    })
  }
  releaseLock(): void
  {
    if (this.stream.reader === this)
      this.stream.reader = undefined;
  }
}


class DefaultReader implements ReadableStreamDefaultReader<Uint8Array>
{
  private next?: Deferred<ReadableStreamReadResult<Uint8Array>>;
  constructor(private stream: Readable)
  {
  }

  public emitError(error: any)
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
    var totalLength = chunks.reduce((l, chunk) => l + (chunk === null ? 0 : chunk.byteLength - chunk.byteOffset), 0);
    if (totalLength === 0)
    {
      if (!this.next)
        this.next = new Deferred<ReadableStreamReadResult<Uint8Array>>();
      return this.next.resolve({ done: true });
    }
    var buffer = new Uint8Array(totalLength);
    var start = 0;
    var chunk: Uint8Array | null | undefined = undefined;
    for (chunk of chunks)
    {
      if (chunk === null)
        break;
      for (var i = chunk.byteOffset; i < chunk.byteLength; i++)
      {
        buffer[start++] = chunk[i];
      }
    }

    if (!this.next)
      this.next = new Deferred<ReadableStreamReadResult<Uint8Array>>();
    this.next.resolve({ value: buffer, done: false });

    if (chunk === null)
    {
      this.next = new Deferred<ReadableStreamReadResult<Uint8Array>>();
      this.next.resolve({ done: true });
      this.closed.resolve();
    }
  }

  closed: Deferred<void> = new Deferred<void>();
  cancel(reason?: any): Promise<void>
  {
    if (this.next)
      return this.next.then(() => Promise.reject(reason));
    else
      return Promise.reject(reason);
  }
  read(): Promise<ReadableStreamReadResult<Uint8Array>>
  {
    if (!this.next)
      this.next = new Deferred<ReadableStreamReadResult<Uint8Array>>();
    this.next.finally(() => this.next = undefined);
    return this.next;
  }
  releaseLock(): void
  {
    if (this.stream.reader === this)
      this.stream.reader = undefined;
  }
}

class Readable implements ReadableStream
{
  private buffer: (Uint8Array | null)[] = [];
  private _reader?: DefaultReader | ByobReader;
  private target?: WritableStream<any>;
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

  constructor()
  {
  }
  get locked(): boolean
  {
    return !!this.reader && !this.target;
  }
  cancel(_reason?: any): Promise<void>
  {

    if (this.reader)
      return this.reader.cancel(_reason);
    if (this.target)
      return this.target.abort(_reason);

    return Promise.resolve();
  }

  emitError(error: any)
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

  getReader(options: { mode: "byob"; }): ReadableStreamBYOBReader;
  getReader(): ReadableStreamDefaultReader<any>;
  getReader(options?: any): ReadableStreamBYOBReader | ReadableStreamDefaultReader<any>
  {
    if (this.locked)
      throw new Error('stream is already locked');

    if (options && options.mode === 'byob')
    {
      return this.reader = new ByobReader(this);
    }
    return this.reader = new DefaultReader(this);
  }
  pipeThrough<T>({ writable, readable }: { writable: WritableStream<any>; readable: ReadableStream<T>; }, options?: PipeOptions | undefined): ReadableStream<T>
  {
    this.pipeTo(writable, options);
    return readable;
  }
  async pipeTo(dest: WritableStream<any>, options?: PipeOptions | undefined): Promise<void>
  {
    this.target = dest;
    var writer = dest.getWriter();
    var chunk: Uint8Array | null | undefined;
    while (typeof (chunk = this.buffer.shift()) != 'undefined')
    {
      if (chunk)
        await writer.write(chunk);
      if (chunk === null && options && options.preventClose)
        await writer.close()
    }
  }
  tee(): [ReadableStream<any>, ReadableStream<any>]
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


  protected async sendStream(id: string | number, result: ReadableStream<Uint8Array>)
  {
    var reader = result.getReader();
    var chunk = await reader.read();
    if (!chunk.done && this.socket.open)
      this.sendRaw({ id: id, result: { event: 'data', isBuffer: true, data: { type: 'Buffer', data: chunk.value } } });
    else if (this.socket.open)
      this.sendRaw({ id: id, result: { event: 'end' }, stream: false });
    else
      logger('socket was closed before end of stream')
  }

  protected isStream(result: PayloadDataType<ReadableStream>): result is ReadableStream  
  {
    return typeof (result) != 'undefined' && !!result && typeof ((result as any).getReader) == 'function';
  }

  protected buildStream(id: string | number, result: PayloadDataType<ReadableStream>)
  {
    var s = result = new Readable();
    var src: SerializableObject = result as any;
    Object.getOwnPropertyNames(src).forEach(function (p)
    {
      if (Object.getOwnPropertyDescriptor(result, p) == null)
      {
        var prop = Object.getOwnPropertyDescriptor(src, p);
        if (prop)
          Object.defineProperty(result, p, prop);
      }
    })

    var f = this.responseHandlers[id] = (error, result: { event: string, isBuffer?: boolean, data?: SerializedBuffer }) =>
    {
      if (!!error)
        s.emitError(error);
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
    return result;
  }
}
