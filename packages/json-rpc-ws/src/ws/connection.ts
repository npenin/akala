import * as ws from 'ws';
import { SocketAdapter } from '../connection';

export function isBrowserSocket(browser: true, socket: ws | WebSocket): socket is WebSocket
export function isBrowserSocket(browser: false, socket: ws | WebSocket): socket is ws
export function isBrowserSocket(browser: boolean, socket: ws | WebSocket): socket is WebSocket
export function isBrowserSocket(browser: boolean, socket: ws | WebSocket): socket is WebSocket
{
    return socket && browser;
}

/**
 * json-rpc-ws connection
 *
 * @constructor
 * @param {Socket} socket - web socket for this connection
 * @param {Object} parent - parent that controls this connection
 */

export class WsSocketAdapter implements SocketAdapter
{
    constructor(private socket: ws | WebSocket, private browser: boolean)
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
        if (isBrowserSocket(this.browser, this.socket))
            this.socket.addEventListener(event, handler);
        else
            this.socket.addEventListener(event, handler);
    }
    public once(event: "open", handler: () => void): void;
    public once(event: "message", handler: (ev: MessageEvent) => void): void;
    public once(event: "error", handler: (ev: Event) => void): void;
    public once(event: "close", handler: (ev: CloseEvent) => void): void;
    public once(event: "message" | "error" | "close" | "open", handler: (ev?: any) => void): void
    {
        if (isBrowserSocket(this.browser, this.socket))
            this.socket.addEventListener(event, handler, { once: true });
        else
            this.socket.once(event, handler);
    }
}