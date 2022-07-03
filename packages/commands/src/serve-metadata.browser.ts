import { IpcNetConnectOpts, NetConnectOpts } from 'net';
import { platform } from 'os';
import { join } from 'path';
import { ServeOptions } from './cli/serve';
import { registerCommands } from './generator'
import { CommandProcessor, ICommandProcessor } from './model/processor';
import { HttpClient, JsonRpc } from './processors/index';
import ws from 'ws'
import { Injector } from '@akala/core';
import * as Metadata from './metadata/index';
import { Container } from './model/container';
import { CommonConnectionOptions, SecureContextOptions } from 'tls'
import * as jsonrpc from '@akala/json-rpc-ws';

type TlsConnectOpts = NetConnectOpts & SecureContextOptions & CommonConnectionOptions;

export interface ServeMetadata
{
    socket?: (NetConnectOpts)[];
    ssocket?: (TlsConnectOpts)[];
    https?: { port: number, cert: string, key: string };
    http?: { port: number };
    ws?: { port: number };
    wss?: { port: number, cert: string, key: string };
}

export interface ConnectionPreference
{
    preferRemote?: boolean;
    host?: string;
    metadata: Metadata.Container;
    container?: Container<unknown>;
}

export async function connectByPreference<T = unknown>(options: ServeMetadata, settings: ConnectionPreference, ...orders: (keyof ServeMetadata)[]): Promise<{ container: Container<T>, processor: ICommandProcessor }>
{
    if (!orders)
        orders = ['ssocket', 'socket', 'wss', 'ws', 'https', 'http'];
    const orderedOptions = orders.map(order =>
    {
        if (options[order])
        {
            if (order === 'socket' || order == 'ssocket')
                if (options[order].length > 1)
                    if (settings?.preferRemote)
                        return options[order].find(s => !isIpcConnectOption(s));
                    else
                        return options[order].find(s => isIpcConnectOption(s));
                else
                    return options[order][0];
            return options[order];
        }
    });
    const container = new Container<T>(settings?.metadata?.name || 'proxy', undefined);
    let processor: CommandProcessor;
    do
    {
        const preferredIndex = orderedOptions.findIndex(options => options);
        if (preferredIndex === -1)
            throw new Error('no matching connection preference was found');

        try
        {
            processor = await connectWith(orderedOptions[preferredIndex], settings?.host, orders[preferredIndex], settings?.container)
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
        case 'ssocket':
            throw new Error('not supported in browser')
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
        if (isNaN(Number(context.options.tcpPort)))
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
                metadata.wss = { port, cert: context.options.cert, key: context.options.key };
            if (~args.indexOf('http'))
                metadata.https = { port, cert: context.options.cert, key: context.options.key };
        }
        else
        {
            if (~args.indexOf('ws'))
                metadata.ws = { port };
            if (~args.indexOf('http'))
                metadata.http = { port };
        }

    }
    return metadata;
}

serveMetadata.$inject = ['$container', 'options'];