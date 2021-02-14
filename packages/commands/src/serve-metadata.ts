import { ListenOptions } from 'net';
import { platform } from 'os';
import { join } from 'path';
import { ServeOptions } from './cli/serve';

export interface ServeMetadata
{
    socket?: ListenOptions[];
    https?: { port: number, cert: string, key: string };
    http?: { port: number };
    ws?: { port: number };
    wss?: { port: number, cert: string, key: string };
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