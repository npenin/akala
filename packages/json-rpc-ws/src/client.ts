'use strict';

import * as WebSocket from 'ws';
import { JsonRpcWs } from './shared_client';

var Client = JsonRpcWs(WebSocket, false);
export default Client;
export { Client }