import { ChildProcess, SendHandle, Serializable, spawn } from "child_process";
import { Readable } from "stream";
import { IpcAdapter } from "../ipc-adapter.js";
import { NewLinePrefixer } from "../new-line-prefixer.js";
import { RuntimeEventMap, RuntimeInstance } from "./shared.js";
import { EventEmitter, IEvent } from "@akala/core";
import { fileURLToPath } from "url";

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
    private readonly cp: ChildProcess;
    public readonly adapter: IpcAdapter;
    constructor(args: string[], options: ChildProcessRuntimeOptions, signal?: AbortSignal)
    {
        super();
        args.unshift(fileURLToPath(new URL('../fork.js', import.meta.url)));
        if (options.inspect)
            args.unshift("--inspect-brk");
        this.cp = spawn(process.execPath, args, { cwd: process.cwd(), detached: !options.keepAttached, env: Object.assign({ DEBUG_COLORS: process.stdout.isTTY }, process.env), stdio: ['ignore', options.inheritStdio ? 'inherit' : 'pipe', options.inheritStdio ? 'inherit' : 'pipe', 'ipc'], shell: false, windowsHide: true });
        if (!options.inheritStdio)
        {
            this.cp.stderr?.pipe(new NewLinePrefixer(options.name + ' ', { useColors: true })).pipe(process.stderr);
            this.cp.stdout?.pipe(new NewLinePrefixer(options.name + ' ', { useColors: true })).pipe(process.stdout);
        }
        this.adapter = new IpcAdapter(this.cp);
        this.cp.on('close', (code, signal) => { this.emit('close', code, signal); this.emit('exit') });
        this.cp.on('message', (message, sendHandle) => this.emit('message', message, sendHandle));

        this.cp.on('disconnect', () => { this.emit('disconnect'); });
        if (options.keepAttached)
            this.cp.on('disconnect', () => { this.emit('exit') });

        signal?.addEventListener('abort', () =>
        {
            return this.stop(5000);
        })
    }
    stop(timeoutInMs?: number): Promise<number>
    {
        return new Promise((resolve) =>
        {
            this.cp.on('exit', (code) =>
            {
                clearTimeout(timeout);
                resolve(code);
            })
            this.cp.kill('SIGINT');
            const timeout = setTimeout(() => { this.cp.kill() }, timeoutInMs || 5000)
        })
    }

    public static build(args: string[], options: ChildProcessRuntimeOptions, signal?: AbortSignal)
    {
        return new Runtime(args, options, signal) as Runtime & RuntimeInstance;


    }

    public unref()
    {
        this.cp.unref();
    }

    get stderr(): Readable { return this.cp.stderr }
    get stdout(): Readable { return this.cp.stdout }

    get running() { return this.cp.exitCode === null }
}
