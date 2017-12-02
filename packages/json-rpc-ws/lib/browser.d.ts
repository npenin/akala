import { default as ClientBase } from './shared_client';
import { Connection } from './connection';
export default class Client<TConnection extends Connection> extends ClientBase<TConnection> {
    constructor();
}
