import { EventEmitter } from 'events'
import * as akala from '@akala/core'
import { ChildProcess, fork } from 'child_process';

import * as net from 'net'

function resolveUrl(namespace: string)
{
    var url = akala.resolve('$rootUrl') + '/' + namespace + '/';
    return url;
}

function isMainProcess(p: ChildProcess | NodeJS.Process): p is NodeJS.Process
{
    return typeof p['argv'] != 'undefined';
}

akala.register('$resolveUrl', resolveUrl);

export interface ServiceWorkerOptions
{
    workerStarter: string
    restartOnCrash: boolean;
    retries: number;
    numberOfMinutesBeforeRetryReset: number
    args?: string[];
}

export class ServiceWorker extends EventEmitter
{
    private cp: ChildProcess | NodeJS.Process;

    public on(evt: 'activate', handler: (evt: ExtendableEvent) => void): this
    public on(evt: 'install', handler: (evt: ExtendableEvent) => void): this
    public on(evt: string, handler: (message: any, socket?: any) => void): this
    public on(evt: string, handler: (...args: any[]) => void): this
    {
        return super.on(evt, handler);
    }

    private fork(options: Partial<ServiceWorkerOptions>, path: string, config: string)
    {
        var args = [path, config]
        if (options.args)
            args.push(...options.args);

        var cp = this.cp = fork(require.resolve(options.workerStarter), args);

        cp.on('exit', () =>
        {
            if (options.retries)
            {
                options.retries--;
                this.fork(options, path, config);
                cp.send('activate');
            }
        })

        cp.on('message', (...args) =>
        {
            var eventType = args[0];
            if (typeof eventType == 'string' && (eventType === 'install' || eventType === 'activate'))
            {
                let ev = new ExtendableEvent();
                this.emit(eventType, ev);
                this[eventType](ev);
            }
            else
                this.emit('message', ...args);
        });

        cp.on('exit', (...args) =>
        {
            this.emit('exit', ...args);
        })
        cp.on('disconnect', (...args) =>
        {
            this.emit('disconnect', ...args);
        })
        cp.on('error', (...args) =>
        {
            this.emit('exit', ...args);
        })
    }

    constructor(public readonly path: string, public readonly options?: Partial<ServiceWorkerOptions>)
    {
        super();
        if (!options)
            options = {};
        options = akala.extend({ restartOnCrash: true, retries: 5, numberOfMinutesBeforeRetryReset: 1, workerStarter: __filename }, options)
        if (typeof (path) != 'undefined')
        {
            akala.exec<void>('$rootUrl')((config: string) =>
            {
                if (options.restartOnCrash)
                {
                    var maxRetries = options.retries;
                    var currentTry = 0;
                    var retryTimeout: NodeJS.Timeout;
                    Object.defineProperty(options, 'retries', {
                        get()
                        {
                            return currentTry;
                        },
                        set(value)
                        {
                            if (retryTimeout)
                                clearTimeout(retryTimeout)
                            currentTry = value;
                            retryTimeout = setTimeout(function ()
                            {
                                currentTry = maxRetries;
                                retryTimeout = undefined;
                            }, options.numberOfMinutesBeforeRetryReset * 60000);
                        }
                    });
                    this.fork(options, path, config);
                }
                else
                    this.fork({ retries: 0 }, path, config);

                this.cp.send('install');
            })
        }
        else
        {
            var cp = this.cp = process;
            cp.on('message', (...args) =>
            {
                var eventType = args[0];
                if (typeof eventType == 'string' && (eventType === 'install' || eventType === 'activate'))
                {
                    let ev = new ExtendableEvent();
                    this.emit(eventType, ev);
                    ev.complete().then(() =>
                    {
                        cp.send(eventType);
                    });
                }
                else
                    this.emit('message', ...args);
            });
        }
    }

    public postMessage(message, socket?: net.Socket)
    {
        return new Promise<void>((resolve, reject) =>
        {
            if (isMainProcess(this.cp))
                this.cp.send(message, socket, null, function (err?: any)
                {
                    if (err)
                        reject(err);
                    else
                        resolve();
                })
            else
                this.cp.send(message, socket, null, function (err?: any)
                {
                    if (err)
                        reject(err);
                    else
                        resolve();
                })
        })
    }



    public kill(arg0: number & string, arg1: string | number)
    {
        this.cp.kill(arg0, arg1)
    }

    private install(ev: ExtendableEvent)
    {
        return ev.complete().then(() =>
        {
            this.cp.send('activate');
        })
    }
    private activate(ev: ExtendableEvent)
    {
        return ev.complete();
    }

}

export class ExtendableEvent
{
    private promises: PromiseLike<any>[] = [];

    public waitUntil<T>(p: PromiseLike<T>): void
    {
        this.promises.push(p)
    }

    public complete()
    {
        return Promise.all(this.promises);
    }
}

export function start<T extends ServiceWorker>(path: string, rootUrl: string, ctor: new (path: string) => T)
{
    process.on('uncaughtException', function (error)
    {
        console.error(path);
        console.error(error);
        process.exit(500);
    })

    akala.register('$rootUrl', rootUrl)

    var sw = akala.register('$worker', new ctor(undefined));

    global['self'] = sw;

    require(path);

    return sw;
}

if (require.main === module)
{
    start(process.argv[2], process.argv[3], ServiceWorker)
}