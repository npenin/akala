'use strict';

import * as debug from 'debug';
import { ok as assert } from 'assert';

const logger = debug('json-rpc-ws');
// var assert = require('assert').ok;

/*
 * http://www.jsonrpc.org/specification#error_object
 */
class Errors
{
  /**
   *
   */
  constructor()
  {

  }

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
  data?: any;
  stack?: undefined;
}

var errors = new Errors();

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
export default function getError(type: ErrorTypes, id?: number | string, data?: any)
{

  assert(errors[type], 'Invalid error type ' + type);

  var payload: Payload = {
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
};
