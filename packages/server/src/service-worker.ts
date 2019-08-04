import { EventEmitter } from 'events'
import * as akala from '@akala/core'
import { ChildProcess, fork } from 'child_process';

import * as net from 'net'
import * as udp from 'dgram'

var self = global['self'] = new EventEmitter();

function resolveUrl(namespace: string)
{
    var url = process.argv[3] + '/' + namespace + '/';
    return url;
}

akala.register('$resolveUrl', resolveUrl);

export interface ServiceWorkerOptions
{
    workerStarter: string
    restartOnCrash: boolean;
    retries: number;
    numberOfMinutesBeforeRetryReset: number
}

export class ServiceWorker extends EventEmitter
{
    private cp: ChildProcess | NodeJS.Process;

    public on(evt: 'activate', handler: (evt: ExtendableEvent) => void): this
    public on(evt: 'install', handler: (evt: ExtendableEvent) => void): this
    public on<T>(evt: 'message', handler: (message: any, socket?: net.Socket | udp.Socket) => void): this
    public on(evt: string, handler: (...args: any[]) => void): this
    {
        return super.on(evt, handler);
    }

    private fork(options: Partial<ServiceWorkerOptions>, path: string, config: string)
    {
        var cp = this.cp = fork(require.resolve(options.workerStarter), [path, config]);

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

    constructor(path: string, options?: Partial<ServiceWorkerOptions>)
    {
        super();
        if (!options)
            options = {};
        options = akala.extend({ restartOnCrash: true, retries: 5, numberOfMinutesBeforeRetryReset: 1, workerStarter: require.resolve('./worker') }, options)
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

    public postMessage(message, socket?: net.Socket | udp.Socket)
    {
        this.cp.send(message)
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

export function start<T extends ServiceWorker>(path: string, ctor: new (path: string) => T)
{
    process.on('uncaughtException', function (error)
    {
        console.error(process.argv[2]);
        console.error(error);
        process.exit(500);
    })

    function resolveUrl(namespace: string)
    {
        var url = process.argv[3] + '/' + namespace + '/';
        return url;
    }

    akala.register('$resolveUrl', resolveUrl);

    var sw = akala.register('$worker', new ctor(undefined));

    global['self'] = sw;

    require(path);

    return sw;
}

if (require.main === module)
{
    start(process.argv[2], ServiceWorker)


}