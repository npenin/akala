import { Container } from '../model/container.js';
import { eachAsync } from '@akala/core';
import { serverHandlers } from '../protocol-handler.js';

export interface ServeOptions
{
    options: {
        port?: number;
        tcpPort?: string;
        cert?: string;
        key?: string;
        socketName?: string
    }
    args: ('local' | 'http' | 'ws' | 'tcp')[];
}

// function getOrCreateServer(connectionString: string, container: Container<unknown>)
// {
//     var sockets = container.resolve<Record<string, Server>>('$sockets');
//     if (!sockets)
//         sockets = container.register('$sockets', {});
//     if (connectionString in sockets)
//         return sockets[connectionString];
//     return sockets[connectionString] = new Server();
// }

// function getOrCreateSecureServer(options: NetConnectOpts & SecureContextOptions, container: Container<unknown>)
// {
//     var sockets = container.resolve<Record<string, tlsServer>>('$ssockets');
//     if (!sockets)
//         sockets = container.register('$ssockets', {});
//     const connectionString = getConnectionString(options);
//     if (connectionString in sockets)
//         return sockets[connectionString];
//     return sockets[connectionString] = new tlsServer();
// }

// export async function getOrCreateServerAndListen(options: NetConnectOpts, container: Container<unknown>)
// {
//     const connectionString = getConnectionString(options);
//     const server = getOrCreateServer(connectionString, container);

//     options.signal.addEventListener('abort', () =>
//     {
//         if ('path' in options)
//             unlink(options.path, noop)
//     });

//     await new Promise<void>((resolve, reject) =>
//     {
//         server.once('error', reject);
//         server.listen(options, resolve);
//         console.log(`listening on ${connectionString}`);
//     });

//     return server;
// }


// export async function getOrCreateSecureServerAndListen(options: NetConnectOpts, container: Container<unknown>)
// {
//     const server = getOrCreateSecureServer(options, container);

//     await new Promise<void>((resolve, reject) =>
//     {
//         server.once('error', reject);
//         server.listen(options, resolve);
//         const connectionString = getConnectionString(options);
//         console.log(`listening on ${connectionString}`);
//     });

//     return server;
// }

// function getConnectionString(options: NetConnectOpts): string
// {
//     if ('port' in options)
//         return (options.host || '0.0.0.0') + ':' + options.port;
//     if ('path' in options)
//         return options.path;
//     return options;
// }

export default async function <T = void>(container: Container<T>, options: string[] | Record<string, object>, signal?: AbortSignal)
{
    if (Array.isArray(options))
        await eachAsync(options, async url =>
        {
            try
            {
                await serverHandlers.process(new URL(url), container, { signal });
            }
            catch (e)
            {
                if (e.statusCode == 404)
                    console.error('Cannot listen on ' + url);
                else
                    throw e;
            }
        });
    else
        await eachAsync(options, async (options, url) =>
        {
            try
            {
                await serverHandlers.process(new URL(url), container, { ...options, signal })
            }
            catch (e)
            {
                if (e.statusCode == 404)
                    console.error('Cannot listen on ' + url);
                else
                    throw e;
            }
        })

    Object.keys(options).forEach(o =>
    {
        console.log('listening on ' + o);
    })

    console.log('server ready');
}
