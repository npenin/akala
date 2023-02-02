import ClientBase from '../shared-client.js';
import { SocketAdapter } from '../shared-connection.js';
export default abstract class Client<TStreamable> extends ClientBase<TStreamable> {
    constructor(socketConstructor: (address: string) => SocketAdapter);
}
