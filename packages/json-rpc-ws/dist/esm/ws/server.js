import * as ws from 'ws';
import WsSocketAdapter from './ws-socket-adapter.js';
export class Adapter {
    options;
    server;
    close() {
        this.server?.close();
    }
    onConnection(handler) {
        this.server?.on('connection', function (socket) {
            handler(new WsSocketAdapter(socket));
        });
    }
    once(event, callback) {
        this.server?.on(event, callback);
    }
    start() {
        this.server = new ws.WebSocketServer(this.options);
    }
    /**
     *
     */
    constructor(options) {
        this.options = options;
    }
}
//# sourceMappingURL=server.js.map