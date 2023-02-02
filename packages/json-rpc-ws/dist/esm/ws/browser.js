'use strict';
import { default as ClientBase } from './shared-client.js';
import { Connection } from '../browser.js';
/**
 * json-rpc-ws connection
 *
 * @constructor
 * @param {Socket} socket - web socket for this connection
 * @param {Object} parent - parent that controls this connection
 */
export class WebSocketAdapter {
    socket;
    constructor(socket) {
        this.socket = socket;
    }
    pipe(socket) {
        this.on('message', (message) => socket.send(message));
        this.on('close', () => socket.close());
    }
    get open() {
        return this.socket.readyState == WebSocket.OPEN;
    }
    close() {
        this.socket.close();
    }
    send(data) {
        this.socket.send(data);
    }
    messageListeners = [];
    off(event, handler) {
        switch (event) {
            case 'message':
                Function;
                {
                    let listeners = this.messageListeners;
                    if (handler)
                        listeners = listeners.filter(f => f[0] == handler);
                    listeners.forEach(l => this.socket.removeEventListener('message', l[1]));
                }
                break;
            case 'close':
            case 'error':
            case 'open':
                //eslint-disable-next-line @typescript-eslint/no-explicit-any
                this.socket.removeEventListener(event, handler);
                break;
            default:
                throw new Error(`Unsupported event ${event}`);
        }
    }
    on(event, handler) {
        switch (event) {
            case 'message':
                {
                    const x = function (ev) { return handler.call(this, ev.data); };
                    this.messageListeners.push([handler, x]);
                    this.socket.addEventListener('message', x);
                }
                break;
            case 'close':
            case 'error':
            case 'open':
                //eslint-disable-next-line @typescript-eslint/no-explicit-any
                this.socket.addEventListener(event, handler);
                break;
            default:
                throw new Error(`Unsupported event ${event}`);
        }
    }
    once(event, handler) {
        switch (event) {
            case 'message':
                this.socket.addEventListener('message', function (ev) { return handler.call(this, ev.data); }, { once: true });
                break;
            case 'close':
            case 'error':
            case 'open':
                //eslint-disable-next-line @typescript-eslint/no-explicit-any
                this.socket.addEventListener(event, handler, { once: true });
                break;
            default:
                throw new Error(`Unsupported event ${event}`);
        }
    }
}
export default class Client extends ClientBase {
    connection(socket) {
        return new Connection(socket, this);
    }
    constructor() {
        super(Client.connect);
    }
    static connect(address) { return new WebSocketAdapter(new WebSocket(address.replace(/^http/, 'ws'))); }
}
import debug from 'debug';
const logger = debug('json-rpc-ws');
export function createClient() {
    logger('create ws client');
    return new Client();
}
export const connect = Client.connect;
//# sourceMappingURL=browser.js.map