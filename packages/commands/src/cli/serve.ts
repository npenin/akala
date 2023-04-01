import { NetConnectOpts, Server } from 'net';
import { Container } from '../model/container.js';
import { unlink } from 'fs';
import { ServeMetadataWithSignal } from '../serve-metadata.js';
import { NetSocketAdapter } from '../net-socket-adapter.js';
import { eachAsync, Injector, noop } from '@akala/core';
import { trigger } from '../triggers/jsonrpc.js';
import { SecureContextOptions, Server as tlsServer } from 'tls';

export interface ServeOptions
{
    options: {
        port?: number;
        tcpPort?: string;
        cert?: string;
        key?: string;
    }
    args: ('local' | 'http' | 'ws' | 'tcp')[];
}

export const serverHandlers = new Injector();

export type ServerHandler<T = { signal: AbortSignal }> = (container: Container<unknown>, options: T) => Promise<void>

function getOrCreateServer(connectionString: string, container: Container<unknown>)
{
    var sockets = container.resolve<Record<string, Server>>('$sockets');
    if (!sockets)
        sockets = container.register('$sockets', {});
    if (connectionString in sockets)
        return sockets[connectionString];
    return sockets[connectionString] = new Server();
}

function getOrCreateSecureServer(options: NetConnectOpts & SecureContextOptions, container: Container<unknown>)
{
    var sockets = container.resolve<Record<string, tlsServer>>('$ssockets');
    if (!sockets)
        sockets = container.register('$ssockets', {});
    const connectionString = getConnectionString(options);
    if (connectionString in sockets)
        return sockets[connectionString];
    return sockets[connectionString] = new tlsServer();
}

export async function getOrCreateServerAndListen(options: NetConnectOpts, container: Container<unknown>)
{
    const connectionString = getConnectionString(options);
    const server = getOrCreateServer(connectionString, container);

    options.signal.addEventListener('abort', () =>
    {
        if ('path' in options)
            unlink(options.path, noop)
    });

    await new Promise<void>((resolve, reject) =>
    {
        server.once('error', reject);
        server.listen(options, resolve);
        console.log(`listening on ${connectionString}`);
    });

    return server;
}


export async function getOrCreateSecureServerAndListen(options: NetConnectOpts, container: Container<unknown>)
{
    const server = getOrCreateSecureServer(options, container);

    await new Promise<void>((resolve, reject) =>
    {
        server.once('error', reject);
        server.listen(options, resolve);
        const connectionString = getConnectionString(options);
        console.log(`listening on ${connectionString}`);
    });

    return server;
}

function getConnectionString(options: NetConnectOpts): string
{
    if ('port' in options)
        return (options.host || '0.0.0.0') + ':' + options.port;
    if ('path' in options)
        return options.path;
    return options;
}

serverHandlers.register<ServerHandler<NetConnectOpts>>('socket', async (container, options) =>
{
    const server = await getOrCreateServerAndListen(options, container);
    server.addListener('connection', (socket) =>
    {
        socket.setDefaultEncoding('utf8');
        container.attach(trigger, new NetSocketAdapter(socket));
    });
});

export default async function <T = void>(container: Container<T>, options: ServeMetadataWithSignal)
{
    console.log(options);
    var failed: Error = null;

    await eachAsync(options, (opt, name) =>
    {
        if (Array.isArray(opt))
        {
            const handler = serverHandlers.resolve<ServerHandler<NetConnectOpts>>(name);
            if (!handler)
                return Promise.reject(new Error('no such handler ' + name + ' is known'))
            return eachAsync(opt, (opt) => handler(container, { signal: options.signal, ...opt }), true);
        }
        return Promise.resolve();
    }, true)

    if (failed)
    {
        console.log(failed);
        console.log('exiting...');
        throw failed;
    }
    else
        console.log('server ready');
}