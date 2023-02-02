import debug from 'debug';
import ClientBase from '../shared-client.js';
const logger = debug('json-rpc-ws');
export default class Client extends ClientBase {
    constructor(socketConstructor) {
        super(socketConstructor);
        logger('new ws Client');
    }
}
//# sourceMappingURL=shared-client.js.map