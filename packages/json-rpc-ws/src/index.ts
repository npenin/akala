import { Connection as BaseConnection, type PayloadDataType, type SerializedBuffer, type Payload } from './shared-connection.js';
import { Connection } from './connection.js'
import { default as Client, JsonNDRpcSocketAdapter } from './shared-client.js';
import { default as Server, type ServerAdapter } from './server.js';
import { default as Errors, type Payload as ErrorPayload } from './errors.js';
export { JsonNDRpcSocketAdapter };

/**
 * json-rpc-ws: a node.js json-rpc websocket client
 * Copyright(c) 2015 Andyet <howdy@andyet.com>
 * MIT Licensed
 */

import * as ws from './ws/index.js';
export { ws };
export
{
    Server,
    Client,
    type ServerAdapter,
    Errors,
    BaseConnection,
    Connection,
    type PayloadDataType,
    type SerializedBuffer,
    type Payload,
    type ErrorPayload,
};
