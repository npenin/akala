'use strict';
import ws from 'ws';
import { Connection } from '../connection.js';
import { default as ClientBase } from './shared-client.js';
import WsSocketAdapter from './ws-socket-adapter.js';
export default class Client extends ClientBase {
    connection(socket) {
        return new Connection(socket, this);
    }
    constructor() {
        super(Client.connect);
    }
    static connect(address) { return new WsSocketAdapter(new ws(address)); }
}
//# sourceMappingURL=client.js.map