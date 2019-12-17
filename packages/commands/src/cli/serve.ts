import { Server } from 'net';
import { platform } from 'os';
import * as ws from 'ws'
import { Container } from '../container';

export default async function (container: Container<void>, options: { port?: number, cert?: string, key?: string, _: ('local' | 'http' | 'ws')[] })
{
    var args = options._;
    if (!args || args.length == 0)
        args = ['local'];

    if (args.indexOf('local') > -1)
    {
        let server = new Server((socket) =>
        {
            container.attach('jsonrpc', socket);
        });

        if (platform() == 'win32')
            server.listen('\\\\?\\pipe\\' + container.name.replace(/\//g, '\\'))
        else
            server.listen('/var/run/' + container.name.replace(/\//g, '-') + '.sock');
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
            const https = await import('https');
            let server = https.createServer({ cert: options.cert, key: options.key });
            if (args.indexOf('http') > -1)
                container.attach('http', server);
            if (args.indexOf('ws') > -1)
                container.attach('ws', server);
            server.listen(port);
        }
        else
        {
            const http = await import('http');
            let server = http.createServer();
            if (args.indexOf('http') > -1)
                container.attach('http', server);
            if (args.indexOf('ws') > -1)
            {
                var wsServer = new ws.Server({ server });
                container.attach('jsonrpcws', wsServer);
            }
            server.listen(port);
        }
    }
    console.log('server listening');
}

exports.default.$inject = ['container', 'options'];