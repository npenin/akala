import { ChildProcess, type SendHandle, type Serializable, spawn } from "child_process";
import { Readable } from "stream";
import { IpcAdapter } from "../ipc-adapter.js";
import { NewLinePrefixer } from "../new-line-prefixer.js";
import type { RuntimeEventMap, RuntimeInstance } from "./shared.js";
import { EventEmitter, SocketAdapter, type IEvent } from "@akala/core";
import { fileURLToPath } from "url";
import { JsonRpcSocketAdapter, Payload } from "@akala/json-rpc-ws";

export type ChildProcessRuntimeEventMap = {
    "close": IEvent<[code: number | null, signal: NodeJS.Signals | null], void>
    "disconnect": IEvent<[], void>
    "error": IEvent<[err: Error], void>
    "exit": IEvent<[code: number | null, signal: NodeJS.Signals | null], void>
    "message": IEvent<[message: Serializable, sendHandle: SendHandle], void>
    "spawn": IEvent<[], void>

} & RuntimeEventMap;

export type ChildProcessRuntimeOptions = { new?: boolean, name: string, keepAttached?: boolean, inspect?: boolean, verbose?: number, wait?: boolean, inheritStdio?: boolean }

export default class Runtime extends EventEmitter<ChildProcessRuntimeEventMap> implements RuntimeInstance<ChildProcessRuntimeEventMap>
{
    public readonly runtime = Runtime;
    public static readonly name = 'nodejs';
    private readonly cp: ChildProcess;
    public readonly adapter: SocketAdapter<Payload<Readable>>;
    private readonly stderrPrefixer: NewLinePrefixer;
    private readonly stdoutPrefixer: NewLinePrefixer;
    constructor(args: string[], options: ChildProcessRuntimeOptions, signal?: AbortSignal)
    {
        super();
        args.unshift(fileURLToPath(new URL('../fork.js', import.meta.url)), 'pm', 'run');
        if (options.inspect)
            args.unshift("--inspect-brk");
        this.cp = spawn(process.execPath, args, { cwd: process.cwd(), detached: !options.keepAttached, env: Object.assign({ DEBUG_COLORS: process.stdout.isTTY }, process.env), stdio: ['ignore', options.inheritStdio ? 'inherit' : 'pipe', options.inheritStdio ? 'inherit' : 'pipe', 'ipc'], shell: false, windowsHide: true });
        if (options.keepAttached && !options.inheritStdio)
        {
            this.stderrPrefixer = this.cp.stderr?.pipe(new NewLinePrefixer(options.name + ' ', { useColors: process.stderr.isTTY }), { end: true });
            this.stderrPrefixer.pipe(process.stderr);
            this.stdoutPrefixer = this.cp.stdout?.pipe(new NewLinePrefixer(options.name + ' ', { useColors: process.stdout.isTTY }), { end: true });
            this.stdoutPrefixer.pipe(process.stdout);
            this.on('disconnect', () =>
            {
                this.cp.stderr?.unpipe();
                this.cp.stdout?.unpipe();
                this.stderrPrefixer?.unpipe();
                this.stdoutPrefixer?.unpipe();
            });
        }
        this.adapter = new JsonRpcSocketAdapter(new IpcAdapter(this.cp));
        this.cp.on('exit', (code, signal) => { this.emit('exit', code, signal) });
        this.cp.on('message', (message, sendHandle) => this.emit('message', message, sendHandle));

        this.cp.on('disconnect', () => this.emit('disconnect'));
        if (options.keepAttached)
            this.cp.on('disconnect', () => this.emit('exit', this.cp.exitCode, this.cp.signalCode));

        signal?.addEventListener('abort', () =>
        {
            switch (signal.reason)
            {
                case 'SIGINT':
                case 'SIGTERM':
                    return this.stop(5000, signal.reason);
                default:
                    if (signal.reason?.name !== 'AbortError' || options.keepAttached)
                        return this.stop(5000);
            }
        })
    }
    stop(timeoutInMs?: number, signal?: 'SIGINT' | 'SIGTERM' | 'SIGKILL'): Promise<number>
    {
        return new Promise((resolve) =>
        {
            this.cp.on('exit', (code) =>
            {
                clearTimeout(timeout);
                resolve(code);
            })
            this.cp.kill(signal);
            if (signal == 'SIGTERM')
            {
                this.stderrPrefixer?.unpipe();
                this.stdoutPrefixer?.unpipe();
            }
            const timeout = setTimeout(() => { this.stop(timeoutInMs, signal == 'SIGINT' ? 'SIGTERM' : 'SIGKILL') }, timeoutInMs || 5000)
        })
    }

    public static build(args: string[], options: ChildProcessRuntimeOptions, signal?: AbortSignal)
    {
        return new Runtime(args, options, signal) as Runtime & RuntimeInstance;


    }

    public unref()
    {
        this.cp.unref();
        this.cp.stderr?.unpipe();
        this.cp.stdout?.unpipe();
    }

    get stderr(): Readable { return this.cp.stderr }
    get stdout(): Readable { return this.cp.stdout }

    get running() { return this.cp.exitCode === null }
}
