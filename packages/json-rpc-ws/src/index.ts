'use strict';
import { Connection, SerializableObject, PayloadDataType, SerializedBuffer, Payload, SocketAdapter } from './connection';
import { default as Client } from './ws/client';
import { default as Server, ServerAdapter } from './server';
import { default as Errors, Payload as ErrorPayload } from './errors';
import * as debug from 'debug';
const logger = debug('json-rpc-ws');

/**
 * json-rpc-ws: a node.js json-rpc websocket client
 * Copyright(c) 2015 Andyet <howdy@andyet.com>
 * MIT Licensed
 */

export { Server, Client, ServerAdapter, SocketAdapter, Errors, Connection, SerializableObject, PayloadDataType, SerializedBuffer, Payload, ErrorPayload };
import wsServerAdapter from './ws/server'
export namespace ws
{
  export var ServerAdapter = wsServerAdapter;

  export function createServer<TConnection extends Connection>()
  {
    logger('createServer');
    return new Server<TConnection>();
  };

  export function createClient<TConnection extends Connection>()
  {
    logger('createClient');
    return new Client<TConnection>();
  };
}