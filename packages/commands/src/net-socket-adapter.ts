import { Socket } from 'net';
import { TLSSocket, connect as tlsconnect } from 'tls'
import { protocolHandlers as handlers } from './protocol-handler.js';
import { JsonRpc } from './processors/jsonrpc.js';
import { type Container } from './metadata/container.js';
import { TcpSocketAdapter } from '@akala/core';
import { JsonRpcSocketAdapter } from '@akala/json-rpc-ws';

handlers.useProtocol('tcp', async (url) =>
{
    const socket = new Socket();
    await new Promise<void>(resolve => socket.connect({ port: url.port && Number(url.port) || 31416, host: url.hostname }, resolve));

    const connection = JsonRpc.getConnection(new JsonRpcSocketAdapter(new TcpSocketAdapter(socket)));

    return {
        processor: new JsonRpc(connection), getMetadata: () => new Promise<Container>((resolve, reject) => connection.sendMethod<any, any>('$metadata', { params: true }, (err, metadata) =>
            typeof (err) == 'undefined' ? resolve(metadata) : reject(err)
        ))
    };
});

handlers.useProtocol('tcps', async (url) =>
{
    const socket = await new Promise<TLSSocket>(resolve => { const socket = tlsconnect({ port: url.port && Number(url.port) || 31416, host: url.hostname, servername: url.hostname }, () => resolve(socket)) });

    const connection = JsonRpc.getConnection(new JsonRpcSocketAdapter(new TcpSocketAdapter(socket)));

    return {
        processor: new JsonRpc(connection), getMetadata: () => new Promise<Container>((resolve, reject) => connection.sendMethod<any, any>('$metadata', { params: true }, (err, metadata) =>
            typeof (err) == 'undefined' ? resolve(metadata) : reject(err)
        ))
    };
});

handlers.useProtocol('unix', async (url) =>
{
    const socket = new Socket();
    await new Promise<void>(resolve => socket.connect({ path: url.hostname + url.pathname }, resolve));

    const connection = JsonRpc.getConnection(new JsonRpcSocketAdapter(new TcpSocketAdapter(socket)));

    return {
        processor: new JsonRpc(connection), getMetadata: () => new Promise<Container>((resolve, reject) => connection.sendMethod<any, any>('$metadata', undefined, (err, metadata) =>
            typeof (err) == 'undefined' ? resolve(metadata) : reject(err)
        ))
    };
});


handlers.useProtocol('unixs', async (url) =>
{
    const socket = await new Promise<TLSSocket>(resolve => { const socket = tlsconnect({ path: url.hostname + url.pathname }, () => resolve(socket)) });

    const connection = JsonRpc.getConnection(new JsonRpcSocketAdapter(new TcpSocketAdapter(socket)));

    return {
        processor: new JsonRpc(connection), getMetadata: () => new Promise<Container>((resolve, reject) => connection.sendMethod<any, any>('$metadata', undefined, (err, metadata) =>
            typeof (err) == 'undefined' ? resolve(metadata) : reject(err)
        ))
    };
});
