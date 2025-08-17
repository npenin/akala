import { Worker } from "worker_threads";
import { Readable } from "stream";
import { NewLinePrefixer } from "../new-line-prefixer.js";
import { MessagePortAdapter } from "../messageport-adapter.js";
import type { RuntimeEventMap, RuntimeInstance } from "./shared.js";
import module from 'module'
import { EventEmitter, SocketAdapter } from "@akala/core";
import { JsonRpcSocketAdapter, Payload } from "@akala/json-rpc-ws";
const require = module.createRequire(import.meta.url);

export default class Runtime extends EventEmitter<RuntimeEventMap> implements RuntimeInstance
{
    public readonly runtime = Runtime;
    private readonly cp: Worker;
    public readonly adapter: SocketAdapter<Payload<Readable>>;
    private _running: boolean;
    constructor(args: string[], options: { new?: boolean, name: string, keepAttached?: boolean, inspect?: boolean, verbose?: number, wait?: boolean })
    {
        super();
        this.cp = new Worker(require.resolve('../fork'), { argv: args, stderr: true, stdout: true })
        this.cp.stderr?.pipe(new NewLinePrefixer(options.name + ' ', { useColors: true })).pipe(process.stderr);
        this.cp.stdout?.pipe(new NewLinePrefixer(options.name + ' ', { useColors: true })).pipe(process.stdout);
        this.adapter = new JsonRpcSocketAdapter(new MessagePortAdapter(this.cp));
        this.cp.on('exit', () => { this._running = false; this.emit('runningChanged') })
    }
    stop(): Promise<number>
    {
        return this.cp.terminate();
    }

    public static build(args: string[], options: { new?: boolean, name: string, keepAttached?: boolean, inspect?: boolean, verbose?: number, wait?: boolean })
    {
        return new Runtime(args, options);
    }

    get stderr(): Readable { return this.cp.stderr }
    get stdout(): Readable { return this.cp.stdout }

    get running() { return this._running; }
}
