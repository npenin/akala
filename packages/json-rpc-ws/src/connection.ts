
import { SerializableObject } from '@akala/core';
import debug from 'debug';
import * as stream from 'stream';
import { Connection as BaseConnection, PayloadDataType, SerializedBuffer, SocketAdapter, Parent } from './shared-connection'
const logger = debug('json-rpc-ws');


function isBuffer(obj: unknown): obj is Uint8Array
{
    return obj && obj instanceof Uint8Array;
}

export class Connection extends BaseConnection<stream.Readable>
{
    constructor(socket: SocketAdapter, parent: Parent<stream.Readable, Connection>)
    {
        super(socket, parent as Parent<stream.Readable, BaseConnection<stream.Readable>>);
    }

    protected isStream(result?: PayloadDataType<stream.Readable>): result is stream.Readable
    {
        return result instanceof stream.Readable;
    }

    protected sendStream(id: string | number, params: stream.Readable): void
    {
        const pt = new stream.PassThrough({ highWaterMark: 128 });
        params.pipe(pt);
        pt.on('data', (chunk: Uint8Array | string) =>
        {
            if (this.socket && this.socket.open)
                if (isBuffer(chunk))
                {
                    if (Buffer.isBuffer(chunk))
                        this.sendRaw({ id: id, result: { event: 'data', isBuffer: true, data: chunk.toJSON() } });
                    else
                        this.sendRaw({ id: id, result: { event: 'data', isBuffer: true, data: { type: 'Buffer', data: chunk } } });
                }
                else
                    this.sendRaw({ id: id, result: { event: 'data', isBuffer: false, data: chunk.toString() } });
            else
            {
                logger('socket was closed before endof stream')
                params.unpipe(pt);
            }
        });
        pt.on('end', () =>
        {
            if (this.socket.open)
                this.sendRaw({ id: id, result: { event: 'end' }, stream: true });
            else
                logger('socket was closed before end of stream')
        });
    }

    protected buildStream(this: Connection, id: string | number, result: PayloadDataType<stream.Readable>): SerializableObject & stream.Readable
    {
        const data: (string | Uint8Array | null)[] = [];
        let canPush = true;

        class temp extends stream.Readable
        {
            constructor()
            {
                super({
                    read: () =>
                    {
                        if (data.length)
                        {
                            while (canPush)
                                canPush = s.push(data.shift());
                        }
                        canPush = true;
                    }
                });

                const src = result as SerializableObject;
                Object.getOwnPropertyNames(src).forEach((p) =>
                {
                    if (Object.getOwnPropertyDescriptor(this, p) == null)
                    {
                        if (src && src[p])
                            this[p] = src[p];
                    }
                });
            }
        }

        const s = result = <SerializableObject & stream.Readable>new temp();
        const f = this.responseHandlers[id] = (error, result: { event: string, isBuffer?: boolean, data?: SerializedBuffer | string }) =>
        {
            if (error)
                s.emit('error', error);
            else
                switch (result.event)
                {
                    case 'data':
                        if (result.data)
                        {
                            let d: Uint8Array | string | undefined = undefined;
                            if (typeof (result.data) == 'string')
                                d = result.data;
                            else
                                d = Uint8Array.from(result.data.data);
                            if (canPush)
                                s.push(d);
                            else
                                data.push(d);
                        }
                        this.responseHandlers[id as string] = f;
                        break;
                    case 'end':
                        if (canPush)
                            s.push(null);
                        else
                            data.push(null);
                        break;
                }
        }
        return s;
    }
}
