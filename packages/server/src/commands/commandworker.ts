import { ServiceWorker, ServiceWorkerOptions, start } from "../service-worker";
import * as net from 'net';
import { Container, CommandNameProcessor } from '@akala/commands';
import { FileSystem } from './processors/fs';
import { LogProcessor } from '@akala/commands/dist/processors';
import { logger } from '..';

export class CommandWorker<T> extends ServiceWorker implements CommandNameProcessor<T>
{
    public get name() { return this.path; }

    public requiresCommandName: true;

    public process(cmd: string, ...args: any[])
    {
        if (require.main === module)
            throw new Error('this is not supported')
        else
        {
            this.postMessage(cmd, ...args);
        }
    }

    public postMessage(command: string, socket: net.Socket): Promise<void>
    public postMessage(command: string, ...args: any[]): Promise<void>
    public postMessage(command: string, ...args: any[]): Promise<void>
    {
        return super.postMessage({ command: command, args: args });
    }

    constructor(path: string, commandsPath: string, options?: Partial<ServiceWorkerOptions>)
    {
        if (!options)
            options = {};
        if (!options.workerStarter)
            options.workerStarter = module.filename;
        options.args = [commandsPath];
        super(path, options)
        this.requiresCommandName = true;
    }
}

class Worker<T> extends CommandWorker<T>
{
    constructor(path: string)
    {
        super(path, '')
    }
}

if (require.main === module)
{
    var worker = start(process.argv[2], process.argv[3], Worker);
    var container: Container<any> = new Container(worker.path, {});
    worker.on('activate', function ()
    {
        const log = logger('akala:server-worker:' + worker.path);
        container.processor = new LogProcessor(new FileSystem(container, process.argv[4]), function (cmd, ...args)
        {
            log.info(cmd);
            log.verbose(args);
        }, function (cmd, ...args)
            {
                log.info(cmd);
                log.verbose(args);
            });
        FileSystem.discoverCommands(process.argv[4], container, { recursive: true, processor: container.processor });

        worker.on('message', function (message: { command: string, args: any[] }, socket: any)
        {
            container.dispatch(message.command, { param: message.args, connection: socket });
        })
    })
}