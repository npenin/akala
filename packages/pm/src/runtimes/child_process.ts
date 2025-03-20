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

export type ChildPRocessRuntimeOptions = { new?: boolean, name: string, keepAttached?: boolean, inspect?: boolean, verbose?: boolean, wait?: boolean, inheritStdio?: boolean }

export default class Runtime extends EventEmitter<ChildProcessRuntimeEventMap> implements RuntimeInstance
{
    private readonly cp: ChildProcess;
    public readonly adapter: IpcAdapter;
    constructor(args: string[], options: ChildPRocessRuntimeOptions)
    {
        super();
        args.unshift(fileURLToPath(new URL('../fork', import.meta.url)));
        if (options.inspect)
            args.unshift("--inspect-brk");
        this.cp = spawn(process.execPath, [require.resolve('../fork')].concat(args), { cwd: process.cwd(), detached: !options.keepAttached, env: Object.assign({ DEBUG_COLORS: process.stdout.isTTY }, process.env), stdio: ['ignore', options.inheritStdio ? 'inherit' : 'pipe', options.inheritStdio ? 'inherit' : 'pipe', 'ipc'], shell: false, windowsHide: true });
        if (!options.inheritStdio)
        {
            this.cp.stderr?.pipe(new NewLinePrefixer(options.name + ' ', { useColors: true })).pipe(process.stderr);
            this.cp.stdout?.pipe(new NewLinePrefixer(options.name + ' ', { useColors: true })).pipe(process.stdout);
        }
        this.adapter = new IpcAdapter(this.cp);
        this.cp.on('close', () => this.emit('exit'));

        if (options.keepAttached)
            this.cp.on('disconnect', () => this.emit('exit'));
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

    public static build(args: string[], options: ChildPRocessRuntimeOptions)
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
}
