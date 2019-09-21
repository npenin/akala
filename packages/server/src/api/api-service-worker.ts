import * as akala from '@akala/core'
import { ServiceWorker, ServiceWorkerOptions, start, ExtendableEvent } from "../service-worker";
import * as jsonrpc from '@akala/json-rpc-ws';
import { WorkerRouter } from "../router";
import * as ws from 'ws';
import * as net from 'net';
import * as udp from 'dgram';
import { Request } from '../master-meta';

export class ApiServiceWorker extends ServiceWorker
{
    constructor(path: string, options?: Partial<ServiceWorkerOptions>)
    {
        if (!options)
            options = {};
        if (!options.workerStarter)
            options.workerStarter = module.filename;
        super(path, options)
    }

    public on<T>(evt: 'message', handler: (message: any, socket?: net.Socket | udp.Socket) => void): this
    public on(evt: 'activate', handler: (evt: ExtendableEvent) => void): this
    public on(evt: 'install', handler: (evt: ExtendableEvent) => void): this
    public on(evt: string, handler: (...args: any[]) => void): this
    public on(evt: string, handler: (...args: any[]) => void): this
    {
        return super.on(evt, handler);
    }
}

if (require.main === module)
{
    var worker = start(process.argv[2], process.argv[3], ApiServiceWorker);

    worker.on('activate', function ()
    {
        const log = akala.log('akala:api-service-worker:' + worker.path);
        akala.register('$router', new WorkerRouter());

        let server = jsonrpc.createServer<jsonrpc.Connection>();
        akala.register('jsonrpcws', server);
        let wss = server.server = new ws.Server({ noServer: true, clientTracking: true })

        wss.on('connection', function (...args)
        {
            log('received connection');
            server.connected.apply(server, args);
        });

        worker.on('message', function (message: { request: Request, head: Buffer }, socket: net.Socket)
        {
            wss.handleUpgrade(message.request, socket, message.head, client =>
            {
                log('emitting connection event');
                wss.emit('connection', client, message.request);
            });
        })
    })
}