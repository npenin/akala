// import type { IpcNetConnectOpts, NetConnectOpts } from 'node:net';
import { registerCommands } from './generator.js'
import { CommandProcessor, ICommandProcessor } from './model/processor.js';
import { HttpClient } from './processors/index.js';
import { SimpleInjector } from '@akala/core';
import * as Metadata from './metadata/index.js';
import { Container } from './model/container.js';

export interface ServeMetadata
{
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
        orders = ['wss', 'ws', 'https', 'http'];
    const orderedOptions = orders.map(order =>
    {
        if (options[order])
            return options[order];
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

export type NetConnectOpts = IpcNetConnectOpts | TcpNetConnectOpts;
type IpcNetConnectOpts = { path: string };
type TcpNetConnectOpts = { host?: string, port?: number }

export async function connectWith<T>(options: NetConnectOpts, host: string, medium: keyof ServeMetadata, container?: Container<T>): Promise<CommandProcessor>
{
    switch (medium)
    {
        case 'http':
        case 'https':
            {
                let path: string;
                if (isIpcConnectOption(options))
                    path = options.path;
                else
                    path = medium + '://' + (host || options.host || 'localhost') + ':' + options.port;
                const injector = new SimpleInjector(container);
                injector.register('$resolveUrl', urlPath => new URL(urlPath, path).toString());
                return new HttpClient(injector);
            }
        case 'ws':
        case 'wss':
            {
                throw new Error('WebSocket are not yet supported');
                // let path: string;
                // if (isIpcConnectOption(options))
                //     path = options.path;
                // else
                //     path = medium + '://' + (host || options.host || 'localhost') + ':' + options.port;
                // return new JsonRpc(JsonRpc.getConnection(new jsonrpc.ws.SocketAdapter(new ws(path)), container), true);
            }
        default:
            // eslint-disable-next-line no-case-declarations, @typescript-eslint/no-unused-vars
            const x: never = medium;
            throw new Error('Invalid medium type ' + x);
    }

}

function isIpcConnectOption(options: NetConnectOpts): options is IpcNetConnectOpts
{
    return typeof options['path'] !== 'undefined';
}


export default function serveMetadata(context): ServeMetadata
{
    throw new Error('Not supported in browser');
}
