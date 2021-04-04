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
        this.socket.send(data);
    }

    public on<K extends keyof SocketAdapterEventMap>(event: K, handler: (ev: SocketAdapterEventMap[K]) => void): void
    {
        this.socket.on(event, handler);
    }
    public once<K extends keyof SocketAdapterEventMap>(event: K, handler: (ev: SocketAdapterEventMap[K]) => void): void
    {
        this.socket.once(event, handler);
    }
}