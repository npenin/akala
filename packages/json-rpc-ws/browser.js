'use strict';

var BrowserClient = require('./lib/browser').default;
var Errors = require('./lib/errors').default;
var logger = require('debug')('json-rpc-ws');

module.exports = {
  Client: BrowserClient,
  Errors: Errors,
  createClient: function createClient()
  {
    logger('createClient');
    return new BrowserClient();
  }
};
