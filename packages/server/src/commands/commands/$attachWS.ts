import * as akala from '@akala/core'
import { Container } from '@akala/commands';
import * as ws from 'ws'
import * as jsonrpc from '@akala/json-rpc-ws'

let server = jsonrpc.createServer<jsonrpc.Connection>();
akala.register('jsonrpcws', server);

let wss = server.server = new ws.Server({ noServer: true, clientTracking: true })

wss.on('connection', function (...args)
{
    server.connected.apply(server, args);
});

export { wss, server };

export default function attach(container: Container<any>)
{
    container.attach('jsonrpcws', akala.resolve('jsonrpcws'));
};

attach.$inject = ['$container'];
