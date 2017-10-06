'use strict';

import { JsonRpcWs } from './shared_client';

var Client = JsonRpcWs(WebSocket, true);
export default Client;
export { Client }