import ws from 'ws';
/**
 * json-rpc-ws connection
 *
 * @constructor
 * @param {Socket} socket - web socket for this connection
 * @param {Object} parent - parent that controls this connection
 */
export default class WsSocketAdapter {
    socket;
    constructor(socket) {
        this.socket = socket;
    }
    pipe(socket) {
        this.on('message', (message) => socket.send(message));
        this.on('close', () => socket.close());
    }
    get open() {
        return this.socket.readyState == ws.OPEN;
    }
    close() {
        this.socket.close();
    }
    send(data) {
        this.socket.send(data, { binary: false });
    }
    off(event, handler) {
        if (event === 'message') {
            this.socket.removeAllListeners(event);
        }
        else
            this.socket.off(event, handler);
    }
    on(event, handler) {
        if (event === 'message') {
            this.socket.on(event, function (data, isBinary) {
                if (!isBinary) {
                    if (Buffer.isBuffer(data))
                        handler.call(this, data.toString('utf8'));
                    else
                        handler.call(this, data);
                }
                else
                    handler.call(this, data);
            });
        }
        else
            this.socket.on(event, handler);
    }
    once(event, handler) {
        this.socket.once(event, handler);
    }
}
//# sourceMappingURL=ws-socket-adapter.js.map