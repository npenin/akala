import { ConnectOpts, IpcNetConnectOpts, isIP, ListenOptions, NetConnectOpts } from 'net';
import { platform } from 'os';
import { basename, dirname, join } from 'path';
import { NetSocketAdapter, ServeOptions } from './cli/serve';
import { proxy, registerCommands } from './generator'
import { CommandProcessors } from './model/processor';
import { HttpClient, JsonRpc } from './processors';
import net from 'net'
import WsSocketAdapter from '@akala/json-rpc-ws/lib/ws/ws-socket-adapter';
import ws from 'ws'
import { Injector } from '@akala/core';
import * as Metadata from './metadata';
import { Container } from './model/container';
import { CommonConnectionOptions, connect as tlsconnect, ConnectionOptions, SecureContextOptions, TLSSocket } from 'tls'

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
    container: Metadata.Container;
}

export async function connectByPreference(options: ServeMetadata, settings: ConnectionPreference, ...orders: (keyof ServeMetadata)[])
{
    if (!orders)
        orders = ['ssocket', 'socket', 'wss', 'ws', 'https', 'http'];
    var orderedOptions = orders.map(order =>
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
    do
    {
        var preferredIndex = orders.findIndex((order, index) => order);
        if (preferredIndex === -1)
            throw new Error('no matching connection preference was found');

        var container = new Container(settings?.container?.name || 'proxy', undefined);
        try
        {
            var processor = await connectWith(orderedOptions[preferredIndex], settings?.host, orders[preferredIndex], container)
            break;
        }
        catch (e)
        {
            console.warn(e);
            orders.shift();
        }
    }
    while (true);
    if (settings?.container)
        registerCommands(settings.container.commands, processor, container);

    return { container, processor };

}

export async function connectWith<T>(options: NetConnectOpts, host: string, medium: keyof ServeMetadata, container?: Container<T>): Promise<CommandProcessors<T>>
{
    switch (medium)
    {
        case 'socket':
            let socket = await new Promise<net.Socket>((resolve, reject) =>
            {
                if (!isIpcConnectOption(options) && host)
                    options.host = host;
                var socket = net.connect(options, function ()
                {
                    console.log('connected to ' + JSON.stringify(options));
                    resolve(socket)
                }).on('error', reject);
            });
            return new JsonRpc(JsonRpc.getConnection(new NetSocketAdapter(socket), container), true);
        case 'ssocket':
            const tlsOptions = options as TlsConnectOpts;
            let ssocket = await new Promise<TLSSocket>((resolve, reject) =>
            {
                if (!isIpcConnectOption(tlsOptions) && host)
                    tlsOptions.host = tlsOptions.host || host;
                tlsOptions['servername'] = tlsOptions['host'] || host;
                var socket = tlsconnect(tlsOptions, function ()
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
        case 'http':
        case 'https':
            var path: string;
            if (isIpcConnectOption(options))
                path = options.path;
            else
                path = medium + '://' + (host || options.host || 'localhost') + ':' + options.port;
            let injector = new Injector(container);
            injector.register('$resolveUrl', urlPath => new URL(urlPath, path).toString());
            return new HttpClient(injector);
        case 'ws':
        case 'wss':
            var path: string;
            if (isIpcConnectOption(options))
                path = options.path;
            else
                path = medium + '://' + (host || options.host || 'localhost') + ':' + options.port;
            return new JsonRpc(JsonRpc.getConnection(new WsSocketAdapter(new ws(path)), container), true);
        default:
            var x: never = medium;
            throw new Error('Invalid medium type ' + medium);
    }

}

function isIpcConnectOption(options: NetConnectOpts): options is IpcNetConnectOpts
{
    return typeof options['path'] !== 'undefined';
}

export default function (name: string, options: ServeOptions): ServeMetadata
{
    var args = options._;
    if (!args || args.length == 0)
        args = ['local'];
    var metadata: ServeMetadata = {};

    if (args.indexOf('local') > -1)
    {
        var socketPath: string;
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
        if (typeof options.tcpPort == 'string')
        {
            let indexOfColon = options.tcpPort.lastIndexOf(':');
            if (indexOfColon > -1)
            {
                let host = options.tcpPort.substr(0, indexOfColon);
                let port = Number(options.tcpPort.substr(indexOfColon + 1))
                metadata.socket.push({ port, host });
            }
            else
                metadata.socket.push({ path: options.tcpPort });
        }
        else
            metadata.socket.push({ port: options.tcpPort });
    }

    if (args.indexOf('http') > -1 || args.indexOf('ws') > -1)
    {
        let port: number;
        if (options.port)
            port = options.port;
        else
        {
            if (options.cert && options.key)
                port = 443
            else
                port = 80;
        }
        if (options.cert && options.key)
        {
            if (args.indexOf('ws'))
                metadata.wss = { port, cert: options.cert, key: options.key };
            if (args.indexOf('http'))
                metadata.https = { port, cert: options.cert, key: options.key };
        }
        else
        {
            if (args.indexOf('ws'))
                metadata.ws = { port };
            if (args.indexOf('http'))
                metadata.http = { port };
        }

    }
    return metadata;
}

exports.default.$inject = ['$container', 'options'];