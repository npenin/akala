import { IpcNetConnectOpts, NetConnectOpts } from 'net';
import { platform } from 'os';
import { join } from 'path';
import { ServeOptions } from './cli/serve';
import { NetSocketAdapter } from "./net-socket-adapter";
import { registerCommands } from './generator'
import { CommandProcessor, ICommandProcessor } from './model/processor';
import { HttpClient, JsonRpc } from './processors/index';
import net from 'net'
import ws from 'ws'
import { Injector, ErrorWithStatus } from '@akala/core';
import * as Metadata from './metadata/index';
import { Container } from './model/container';
import { CommonConnectionOptions, connect as tlsconnect, SecureContextOptions, TLSSocket } from 'tls'
import * as jsonrpc from '@akala/json-rpc-ws';

type TlsConnectOpts = NetConnectOpts & SecureContextOptions & CommonConnectionOptions;

export interface ServeMetadataWithSignal extends ServeMetadata
{
    signal: AbortSignal;
}

export type ServeMetadata = { [key in keyof ServeMetadataMap]?: ServeMetadataMap[key][] }

export interface ServeMetadataMap
{
    socket: NetConnectOpts;
    ssocket: NetConnectOpts & TlsConnectOpts;
    https: NetConnectOpts & TlsConnectOpts;
    http: NetConnectOpts;
    wss: NetConnectOpts & TlsConnectOpts;
    ws: NetConnectOpts;
}

export interface ConnectionPreference
{
    preferRemote?: boolean;
    host?: string;
    metadata?: Metadata.Container;
    container?: Container<unknown>;
}

export async function connectByPreference<T = unknown>(options: ServeMetadata, settings: ConnectionPreference, ...orders: (keyof ServeMetadata)[]): Promise<{ container: Container<T>, processor: ICommandProcessor }>
{
    if (!orders || !orders.length)
        orders = ['ssocket', 'socket', 'wss', 'ws', 'https', 'http'];
    const orderedOptions = orders.map(order =>
    {
        if (options[order])
        {
            if (order === 'socket' || order == 'ssocket')
                if (settings?.preferRemote)
                    return options[order].filter(s => !isIpcConnectOption(s)) || options[order].find(s => isIpcConnectOption(s));
                else
                    return options[order].filter(s => isIpcConnectOption(s)) || options[order].find(s => !isIpcConnectOption(s));
            return options[order];
        }
    });
    const container = new Container<T>(settings?.metadata?.name || 'proxy', undefined);
    let processor: CommandProcessor;
    do
    {
        const preferredIndex = orderedOptions.findIndex(options => options);
        if (preferredIndex === -1)
            throw new ErrorWithStatus(404, 'no matching connection preference was found');

        try
        {
            if (orders.length == 0)
                throw new ErrorWithStatus(404, 'No valid connection option could be found')
            processor = await connectWith(orderedOptions[preferredIndex][0], settings?.host, orders[preferredIndex], settings?.container)
            break;
        }
        catch (e)
        {
            console.warn(e);
            orders.shift();
        }
    }
    // eslint-disable-next-line no-constant-condition
    while (true);
    if (settings?.metadata)
        registerCommands(settings.metadata.commands, processor, container);
    else
    {
        var metaContainer = await container.dispatch('$metadata');
        registerCommands(metaContainer.commands, processor, container);
    }

    return { container, processor };

}

export async function connectWith<T>(options: NetConnectOpts, host: string, medium: keyof ServeMetadata, container?: Container<T>): Promise<CommandProcessor>
{
    switch (medium)
    {
        case 'socket':
            {
                const socket = await new Promise<net.Socket>((resolve, reject) =>
                {
                    if (!isIpcConnectOption(options) && host)
                        options.host = host;
                    const socket = net.connect(options, function ()
                    {
                        console.log('connected to ' + JSON.stringify(options));
                        resolve(socket)
                    }).on('error', reject);
                });
                return new JsonRpc(JsonRpc.getConnection(new NetSocketAdapter(socket), container), true);
            }
        case 'ssocket':
            {
                const tlsOptions = options as TlsConnectOpts;
                const ssocket = await new Promise<TLSSocket>((resolve, reject) =>
                {
                    if (!isIpcConnectOption(tlsOptions) && host)
                        tlsOptions.host = tlsOptions.host || host;
                    tlsOptions['servername'] = tlsOptions['host'] || host;
                    const socket = tlsconnect(tlsOptions, function ()
                    {
                        if (!socket.authorized)
                        {
                            reject(socket.authorizationError);
                            return;
                        }
                        console.log('securely connected to ' + JSON.stringify(options));
                        resolve(socket)
                    }).on('error', reject);
                });
                return new JsonRpc(JsonRpc.getConnection(new NetSocketAdapter(ssocket), container), true);
            }
        case 'http':
        case 'https':
            {
                let path: string;
                if (isIpcConnectOption(options))
                    path = options.path;
                else
                    path = medium + '://' + (host || options.host || 'localhost') + ':' + options.port;
                const injector = new Injector(container);
                injector.register('$resolveUrl', urlPath => new URL(urlPath, path).toString());
                return new HttpClient(injector);
            }
        case 'ws':
        case 'wss':
            {
                let path: string;
                if (isIpcConnectOption(options))
                    path = options.path;
                else
                    path = medium + '://' + (host || options.host || 'localhost') + ':' + options.port;
                return new JsonRpc(JsonRpc.getConnection(new jsonrpc.ws.SocketAdapter(new ws(path)), container), true);
            }
        default:
            // eslint-disable-next-line no-case-declarations, @typescript-eslint/no-unused-vars
            const x: never = medium;
            throw new Error('Invalid medium type ' + medium);
    }

}

function isIpcConnectOption(options: NetConnectOpts): options is IpcNetConnectOpts
{
    return typeof options['path'] !== 'undefined';
}

export function parseMetadata(connectionString: string, tls?: boolean): ServeMetadata 
{

    const remote = /^(?:([^:]+):)?(\d+)$/.exec(connectionString);
    if (!remote)
        if (tls)
            return { ssocket: [{ path: connectionString }] };
        else
            return { socket: [{ path: connectionString }] }

    const host = remote[1];
    const port = remote[2];
    if (tls)
        return { ssocket: [{ port: Number(port), host: host }] };
    else
        return { socket: [{ port: Number(port), host: host }] };
}

export default function serveMetadata(name: string, context: ServeOptions): ServeMetadata
{
    let args = context.args;
    if (!args || args.length == 0)
        args = ['local'];
    const metadata: ServeMetadata = {};

    if (args.indexOf('local') > -1)
    {
        let socketPath: string;
        if (platform() == 'win32')
            socketPath = '\\\\?\\pipe\\' + name.replace(/\//g, '\\');
        else
            socketPath = join(process.cwd(), name.replace(/\//g, '-').replace(/^@/g, '') + '.sock');
        metadata.socket = [{ path: socketPath }];
    }


    if (args.indexOf('tcp') > -1)
    {
        if (!metadata['socket'])
            metadata['socket'] = [];
        if (isNaN(Number(context.options.tcpPort)) && context.options.tcpPort)
        {
            const indexOfColon = context.options.tcpPort.lastIndexOf(':');
            if (indexOfColon > -1)
            {
                const host = context.options.tcpPort.substr(0, indexOfColon);
                const port = Number(context.options.tcpPort.substr(indexOfColon + 1))
                metadata.socket.push({ port, host });
            }
            else
                metadata.socket.push({ path: context.options.tcpPort });
        }
        else
            metadata.socket.push({ port: Number(context.options.tcpPort) });
    }

    if (args.indexOf('http') > -1 || args.indexOf('ws') > -1)
    {
        let port: number;
        if (context.options.port)
            port = context.options.port;
        else
        {
            if (context.options.cert && context.options.key)
                port = 443
            else
                port = 80;
        }
        if (context.options.cert && context.options.key)
        {
            if (~args.indexOf('ws'))
                metadata.wss = [{ port, cert: context.options.cert, key: context.options.key }];
            if (~args.indexOf('http'))
                metadata.https = [{ port, cert: context.options.cert, key: context.options.key }];
        }
        else
        {
            if (~args.indexOf('ws'))
                metadata.ws = [{ port }];
            if (~args.indexOf('http'))
                metadata.http = [{ port }];
        }

    }
    return metadata;
}

serveMetadata.$inject = ['$container', 'options'];