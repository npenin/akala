import { Connection as BaseConnection } from './shared-connection.js';
import { Connection } from './connection.js';
import { default as Client } from './shared-client.js';
import { default as Server } from './server.js';
import { default as Errors } from './errors.js';
/**
 * json-rpc-ws: a node.js json-rpc websocket client
 * Copyright(c) 2015 Andyet <howdy@andyet.com>
 * MIT Licensed
 */
import * as ws from './ws/index.js';
export { ws };
export { Server, Client, Errors, BaseConnection, Connection };
//# sourceMappingURL=index.js.map