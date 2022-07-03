import ws from 'ws';
import { SocketAdapter, SocketAdapterEventMap } from '../shared-connection';
import { Readable } from 'stream';

/**
 * json-rpc-ws connection
 *
 * @constructor
 * @param {Socket} socket - web socket for this connection
 * @param {Object} parent - parent that controls this connection
 */
export default class WsSocketAdapter implements SocketAdapter<Readable>
{
    constructor(private socket: ws)
    {
    }

    pipe(socket: SocketAdapter<unknown>)
    {
        this.on('message', (message) => socket.send(message));
        this.on('close', () => socket.close());
    }

    get open(): boolean
    {
        return this.socket.readyState == ws.OPEN;
    }

    close(): void
    {
        this.socket.close();
    }

    send(data: string): void
    {
        this.socket.send(data, { binary: false });
    }

    public off<K extends keyof SocketAdapterEventMap>(event: K, handler?: (ev: SocketAdapterEventMap[K]) => void): void
    {
        if (event === 'message')
        {
            this.socket.removeAllListeners(event);
        }
        else
            this.socket.off(event, handler);
    }

    public on<K extends keyof SocketAdapterEventMap>(event: K, handler: (ev: SocketAdapterEventMap[K]) => void): void
    {
        if (event === 'message')
        {
            this.socket.on(event, function (data: ws.Data, isBinary: boolean)
            {
                if (!isBinary)
                {
                    if (Buffer.isBuffer(data))
                        (handler as (ev: SocketAdapterEventMap['message']) => void).call(this, data.toString('utf8'));
                    else
                        (handler as (ev: SocketAdapterEventMap['message']) => void).call(this, data);
                }
                else
                    (handler as (ev: SocketAdapterEventMap['message']) => void).call(this, data);

            });
        }
        else
            this.socket.on(event, handler);
    }
    public once<K extends keyof SocketAdapterEventMap>(event: K, handler: (ev: SocketAdapterEventMap[K]) => void): void
    {
        this.socket.once(event, handler);
    }
}