import SocketAdapter from './ws-socket-adapter.js';
import { Adapter as ServerAdapter } from './server.js';
import Server from '../server.js';
import Client from './client.js';
export { SocketAdapter, ServerAdapter };
import debug from 'debug';
const logger = debug('json-rpc-ws');
export function createClient() {
    logger('create ws client');
    return new Client();
}
export function createServer(options) {
    logger('create ws server');
    if (options)
        return new Server(new ServerAdapter(options));
    else
        return new Server();
}
export { Client };
export const connect = Client.connect;
//# sourceMappingURL=index.js.map