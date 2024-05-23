'use strict';

import debug from 'debug';

const logger = debug('json-rpc-ws');

/*
 * http://www.jsonrpc.org/specification#error_object
 */
export class Errors
{
  parseError: Error = { code: -32700, message: 'Parse error' }
  invalidRequest: Error = { code: -32600, message: 'Invalid Request' }
  methodNotFound: Error = { code: -32601, message: 'Method not found' }
  invalidParams: Error = { code: -32602, message: 'Invalid params' }
  internalError: Error = { code: -32603, message: 'Internal error' }
  serverError: Error = { code: -32000, message: 'Server error' }
}

export type ErrorTypes = keyof Errors;

export interface Error
{
  code: number;
  message: string;
  data?: unknown;
  stack?: undefined;
}

const errors = new Errors();

export interface Payload
{
  error: Error,
  id?: string | number;
}

/**
 * Returns a valid jsonrpc2.0 error reply
 *
 * @param {String} type - type of error
 * @param {Number|String|null} id - optional id for reply message
 * @param {Any} data - optional data attribute for error message
 * @returns {Object|null} mreply object that can be sent back
 */
export default function getError(type: ErrorTypes, id?: number | string, data?: unknown): Payload
{

  if (!errors[type])
    throw new Error('Invalid error type ' + type);

  const payload: Payload = {
    error: errors[type],
  };
  if (typeof id === 'string' || typeof id === 'number')
  {
    payload.id = id;
  }
  if (typeof data !== 'undefined')
  {
    payload.error.data = data;
  }
  logger('error %j', payload);
  return payload;
}
