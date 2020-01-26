'use strict';

import Base from '../shared_client';
import { Connection, SocketAdapter } from '../connection';
import * as ws from 'ws';
import * as debug from 'debug';
import { WsSocketAdapter } from './connection';

const logger = debug('json-rpc-ws');
export type SocketType = ws | WebSocket;

function wrap(socketConstructor: (address: string) => SocketType, browser: boolean)
{
  return function (address: string): SocketAdapter
  {
    return new WsSocketAdapter(socketConstructor(address), browser);
  }
}

export default class WsClient<TClientConnection extends Connection> extends Base<TClientConnection>
{
  constructor(socketConstructor: (address: string) => SocketType, browser?: boolean)
  {
    super(wrap(socketConstructor, !!browser));
    logger('new Client');
  }
}