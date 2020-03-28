'use strict';
import { Connection, SerializableObject, PayloadDataType, SerializedBuffer, Payload, SocketAdapter } from './shared-connection';
import { default as Client } from './ws/client';
import { default as Server, ServerAdapter } from './server';
import { default as Errors, Payload as ErrorPayload } from './errors';

/**
 * json-rpc-ws: a node.js json-rpc websocket client
 * Copyright(c) 2015 Andyet <howdy@andyet.com>
 * MIT Licensed
 */

import * as ws from './ws';
export { ws };
export { Server, Client, ServerAdapter, SocketAdapter, Errors, Connection, SerializableObject, PayloadDataType, SerializedBuffer, Payload, ErrorPayload };