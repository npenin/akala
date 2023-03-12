import { ChildProcess, spawn, StdioPipe } from "child_process";
import { Readable, Writable } from "stream";
import { IpcAdapter } from "../ipc-adapter.js";
import { NewLinePrefixer } from "../new-line-prefixer.js";
import { RuntimeInstance } from "./runtime.js";
import module from 'module'
import EventEmitter from "events";
const require = module.createRequire(import.meta.url);

export default class Runtime implements RuntimeInstance, EventEmitter
{
    public readonly adapter: IpcAdapter;
    private stdio: { stderr: Readable, stdout: Readable, stdin: Writable }
    constructor(stdio?: { stderr: Readable, stdout: Readable, stdin: Writable })
    {
        this.adapter = new IpcAdapter(process);
        if (!stdio)
            this.stdio = process;
    }
    stop(timeoutInMs?: number): Promise<number>
    {
        return new Promise((resolve) =>
        {
            process.on('exit', (code, signal) =>
            {
                clearTimeout(timeout);
                resolve(code);
            })
            process.kill(process.pid, 'SIGINT')
            const timeout = setTimeout(() => { process.exit() }, timeoutInMs || 5000)
        })
    }
    addListener(eventName: NodeJS.Signals, listener: (...args: any[]) => void): this
    {
        process.addListener(eventName, listener);
        return this;
    }
    once(eventName: string, listener: (...args: any[]) => void): this
    {
        process.once(eventName, listener);
        return this;
    }
    removeListener(eventName: string, listener: (...args: any[]) => void): this
    {
        process.removeListener(eventName, listener);
        return this;
    }
    off(eventName: string, listener: (...args: any[]) => void): this
    {
        process.off(eventName, listener);
        return this;
    }
    removeAllListeners(event?: string): this
    {
        process.removeAllListeners(event);
        return this;
    }
    setMaxListeners(n: number): this
    {
        process.setMaxListeners(n);
        return this;
    }
    getMaxListeners(): number
    {
        return process.getMaxListeners();
    }
    listeners(eventName: NodeJS.Signals): Function[]
    {
        return process.listeners(eventName);
    }
    rawListeners(eventName: string | symbol): Function[]
    {
        return process.rawListeners(eventName);
    }
    emit(eventName: NodeJS.Signals, ...args: any[]): boolean
    {
        return process.emit(eventName, ...args);
    }
    listenerCount(eventName: string | symbol): number
    {
        return process.listenerCount(eventName);
    }
    prependListener(eventName: NodeJS.Signals, listener: (...args: any[]) => void): this
    {
        process.prependListener(eventName, listener);
        return this;
    }
    prependOnceListener(eventName: NodeJS.Signals, listener: (...args: any[]) => void): this
    {
        process.prependOnceListener(eventName, listener);
        return this;
    }
    eventNames(): (string | symbol)[]
    {
        return process.eventNames();
    }

    get stderr(): Readable { return this.stdio.stderr }
    get stdout(): Readable { return this.stdio.stdout }

    get running() { return true }

    public on(event: 'runningChanged', handler: () => void)
    public on(event: 'exit', handler: () => void)
    public on(event: string, handler: () => void)
    {
        process.on(event, handler);
    }
}