import ws from 'ws';
import { SocketAdapter } from '../shared-connection';
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

    get open()
    {
        return this.socket.readyState == ws.OPEN;
    };

    close(): void
    {
        this.socket.close();
    }

    send(data: string): void
    {
        this.socket.send(data);
    }

    public on(event: "open", handler: () => void): void;
    public on(event: "message", handler: (ev: MessageEvent) => void): void;
    public on(event: "error", handler: (ev: Event) => void): void;
    public on(event: "close", handler: (ev: CloseEvent) => void): void;
    public on(event: "message" | "error" | "close" | "open", handler: (ev?: any) => void): void
    {
        this.socket.on(event, handler);
    }
    public once(event: "open", handler: () => void): void;
    public once(event: "message", handler: (ev: MessageEvent) => void): void;
    public once(event: "error", handler: (ev: Event) => void): void;
    public once(event: "close", handler: (ev: CloseEvent) => void): void;
    public once(event: "message" | "error" | "close" | "open", handler: (ev?: any) => void): void
    {
        this.socket.once(event, handler);
    }
}