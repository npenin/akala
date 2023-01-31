import { Connection as BaseConnection, PayloadDataType, SerializedBuffer, Payload, SocketAdapter, SocketAdapterEventMap } from './shared-connection';
import { Connection } from './connection'
import { default as Client } from './shared-client';
import { default as Server, ServerAdapter } from './server';
import { default as Errors, Payload as ErrorPayload } from './errors';

/**
 * json-rpc-ws: a node.js json-rpc websocket client
 * Copyright(c) 2015 Andyet <howdy@andyet.com>
 * MIT Licensed
 */

import * as ws from './ws/index';
export { ws };
export { Server, Client, ServerAdapter, SocketAdapter, Errors, BaseConnection, Connection, PayloadDataType, SerializedBuffer, Payload, ErrorPayload, SocketAdapterEventMap };