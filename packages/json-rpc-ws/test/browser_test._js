'use strict';

/**
 * Browser test code
 * This code is browserified and sent to phantomjs
 * as part of the test suite, it is not part of the
 * library itself
 */
require('debug').enable('json-rpc-ws');

var JsonRpcWs = require('../lib/browser');
var browserClient = JsonRpcWs.createClient();

browserClient.expose('info', function info(params, reply)
{

  reply(null, 'browser');
});

window.browserClient = browserClient;
