import { Connection, SerializableObject, PayloadDataType } from './connection';
import { default as Client } from './client';
import { default as Server } from './server';
import { default as Errors } from './errors';
/**
 * json-rpc-ws: a node.js json-rpc websocket client
 * Copyright(c) 2015 Andyet <howdy@andyet.com>
 * MIT Licensed
 */
export { Server, Client, Errors, Connection, SerializableObject, PayloadDataType };
/**
 * Create a new server.
 *
 * @returns {Object} JsonRpcWs Server instance
 * @public
 */
export declare function createServer<TConnection extends Connection>(): Server<TConnection>;
/**
 * Create a new json-rpc websocket connection
 *
 * @returns {Object}JsonRpcWs Client instance
 * @public
 */
export declare function createClient<TConnection extends Connection>(): Client<TConnection>;
