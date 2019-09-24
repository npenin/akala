import { Request } from '../../master-meta'
import * as net from 'net';
import { wss, server } from './$attachWS'

export default function upgrade(request: Request, head: Buffer, socket: net.Socket, trigger: string)
{
    if (!server['requestHandlers']['$upgrade'])
        throw new Error('you need to call $attachWS first');

    if (trigger !== 'jsonrpcws')
        throw new Error('this command can only be triggered by jsonrpcws');

    wss.handleUpgrade(request, socket, head, client =>
    {
        wss.emit('connection', client, request);
    });
};

upgrade.$inject = ['param.0', 'param.1', 'connection', '_trigger'];
