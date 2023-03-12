import { ChildProcess, spawn } from "child_process";
import { Readable } from "stream";
import { IpcAdapter } from "../ipc-adapter.js";
import { NewLinePrefixer } from "../new-line-prefixer.js";
import { RuntimeInstance } from "./runtime.js";
import module from 'module'
import EventEmitter from "events";
const require = module.createRequire(import.meta.url);

export default class Runtime implements RuntimeInstance, EventEmitter
{
    private readonly cp: ChildProcess;
    public readonly adapter: IpcAdapter;
    constructor(args: string[], options: { new?: boolean, name: string, keepAttached?: boolean, inspect?: boolean, verbose?: boolean, wait?: boolean })
    {
        if (options.inspect)
            this.cp = spawn(process.execPath, ["--inspect-brk", require.resolve('../fork')].concat(args), { cwd: process.cwd(), detached: !options.keepAttached, env: Object.assign({ DEBUG_COLORS: process.stdout.isTTY }, process.env), stdio: ['ignore', 'pipe', 'pipe', 'ipc'], shell: false, windowsHide: true })
        else
            this.cp = spawn(process.execPath, [require.resolve('../fork')].concat(args), { cwd: process.cwd(), detached: !options.keepAttached, env: Object.assign({ DEBUG_COLORS: process.stdout.isTTY }, process.env), stdio: ['ignore', 'pipe', 'pipe', 'ipc'], shell: false, windowsHide: true });
        this.cp.stderr?.pipe(new NewLinePrefixer(options.name + ' ', { useColors: true })).pipe(process.stderr);
        this.cp.stdout?.pipe(new NewLinePrefixer(options.name + ' ', { useColors: true })).pipe(process.stdout);
        this.adapter = new IpcAdapter(this.cp);
        this.cp.on('close', () => this.emit('exit'));
    }
    stop(timeoutInMs?: number): Promise<number>
    {
        return new Promise((resolve) =>
        {
            this.cp.on('exit', (code, signal) =>
            {
                clearTimeout(timeout);
                resolve(code);
            })
            this.cp.kill('SIGINT');
            const timeout = setTimeout(() => { this.cp.kill() }, timeoutInMs || 5000)
        })
    }
    addListener(eventName: string, listener: (...args: any[]) => void): this
    {
        this.cp.addListener(eventName, listener);
        return this;
    }
    once(eventName: string, listener: (...args: any[]) => void): this
    {
        this.cp.once(eventName, listener);
        return this;
    }
    removeListener(eventName: string, listener: (...args: any[]) => void): this
    {
        this.cp.removeListener(eventName, listener);
        return this;
    }
    off(eventName: string, listener: (...args: any[]) => void): this
    {
        this.cp.off(eventName, listener);
        return this;
    }
    removeAllListeners(event?: string): this
    {
        this.cp.removeAllListeners(event);
        return this;
    }
    setMaxListeners(n: number): this
    {
        this.cp.setMaxListeners(n);
        return this;
    }
    getMaxListeners(): number
    {
        return this.cp.getMaxListeners();
    }
    listeners(eventName: string): Function[]
    {
        return this.cp.listeners(eventName);
    }
    rawListeners(eventName: string | symbol): Function[]
    {
        return this.cp.rawListeners(eventName);
    }
    emit(eventName: string | symbol, ...args: any[]): boolean
    {
        return this.cp.emit(eventName, ...args);
    }
    listenerCount(eventName: string | symbol): number
    {
        return this.cp.listenerCount(eventName);
    }
    prependListener(eventName: string, listener: (...args: any[]) => void): this
    {
        this.cp.prependListener(eventName, listener);
        return this;
    }
    prependOnceListener(eventName: string, listener: (...args: any[]) => void): this
    {
        this.cp.prependOnceListener(eventName, listener);
        return this;
    }
    eventNames(): (string | symbol)[]
    {
        return this.cp.eventNames();
    }

    public static build(args: string[], options: { new?: boolean, name: string, keepAttached?: boolean, inspect?: boolean, verbose?: boolean, wait?: boolean })
    {
        return new Runtime(args, options);
    }

    public unref()
    {
        this.cp.unref();
    }

    get stderr(): Readable { return this.cp.stderr }
    get stdout(): Readable { return this.cp.stdout }

    get running() { return this.cp.exitCode === null }

    public on(event: 'runningChanged', handler: () => void)
    public on(event: 'exit', handler: () => void)
    public on(event: string, handler: () => void)
    {
        this.cp.on(event, handler);
    }
}