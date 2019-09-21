import { ServiceWorker, ServiceWorkerOptions, start, SocketExchange } from "../service-worker";
import * as net from 'net';
import { Container, CommandNameProcessor, Processors, Trigger, Command } from '@akala/commands';
import * as akala from '@akala/core'
import { LogProcessor } from '@akala/commands/dist/processors';
import { logger } from '..';
import { ApiServiceWorker } from "../api/api-service-worker";

export class CommandWorker<T> extends ServiceWorker implements CommandNameProcessor<T>
{
    public static overJsonRpcWs()
    {
        return new ApiServiceWorker(__filename)
    }

    public get name() { return this.path; }

    public requiresCommandName: true;

    public process(cmd: string, param: { param: any[], [key: string]: any }): any | PromiseLike<any>
    {
        if (require.main === module)
            throw new Error('this is not supported')
        this.postMessage(cmd, param);
    }

    public postMessage(command: string, socket: SocketExchange): Promise<void>
    public postMessage(command: string, param: { param: any[], socket?: SocketExchange, [key: string]: any }): Promise<void>
    public postMessage(command: string, param: SocketExchange | { param: any[], [key: string]: any }): Promise<void>
    {
        if (param instanceof net.Socket)
            return super.postMessage({ command: command }, param);
        if (param instanceof net.Server)
            return super.postMessage({ command: command }, param);
        else if (typeof param.socket != 'undefined')
        {
            let socket = param.socket;
            delete param.socket
            return super.postMessage(Object.assign(param, { command: command }), socket);
        }
        else
            return super.postMessage(Object.assign(param, { command: command }));
    }

    constructor(name: string, commandsPath: string, options?: Partial<ServiceWorkerOptions>)
    {
        if (!options)
            options = {};
        if (!options.workerStarter)
            options.workerStarter = module.filename;
        options.args = [commandsPath];
        super(name, options)
        this.requiresCommandName = true;
    }
}

class Worker extends ServiceWorker implements Trigger
{
    public readonly name: string = 'service-worker';

    private registeredContainers: string[];

    public register<T>(container: Container<T>, _command: Command<T>, worker: Worker)
    {
        if (worker.registeredContainers.indexOf(container.name) != -1)
            return;

        worker.on('message', function (message: { command: string, param: any[], [key: string]: any }, socket?: SocketExchange)
        {
            container.dispatch(message.command, Object.assign({}, message.param, { _trigger: 'service-worker', connection: socket }));
        })
    }
    constructor(name: string)
    {
        super(name)
        Trigger.registerTrigger(this);
    }
}

if (require.main === module)
{
    let worker = start(null, process.argv[3], Worker);
    global['self'] = worker;
    let container: Container<any> = new Container(process.argv[2], {});
    container.attach('service-worker', worker);
    worker.on('activate', function (evt)
    {
        const log = logger('akala:server-worker:' + process.argv[2]);
        container.processor = new LogProcessor(new Processors.FileSystem(container, process.argv[4]), function (cmd, param)
        {
            log.info(cmd);
            log.verbose(param);
        }, function (cmd, param)
        {
            log.info(cmd);
            log.verbose(param);
        });
        evt.waitUntil(Processors.FileSystem.discoverCommands(process.argv[4], container, { recursive: true, processor: container.processor }));
    })
}
else 
{
    let worker = akala.resolve<ServiceWorker>('$worker');
    worker.on('activate', function (evt)
    {
        let container: Container<any> = new Container(process.argv[2], {});
        let server = akala.resolve('jsonrpcws');
        if (!server)
            return;
        container.attach('jsonrpcws', server);

        const log = logger('akala:server-worker:' + process.argv[2]);
        container.processor = new LogProcessor(new Processors.FileSystem(container, process.argv[4]), function (cmd, param)
        {
            log.info(cmd);
            log.verbose(param);
        }, function (cmd, param)
        {
            log.info(cmd);
            log.verbose(param);
        });
        evt.waitUntil(Processors.FileSystem.discoverCommands(process.argv[4], container, { recursive: true, processor: container.processor }));
    })

}