import { MessagePort, Worker } from "worker_threads";
import { Readable } from "stream";
import { IpcAdapter } from "../ipc-adapter.js";
import { NewLinePrefixer } from "../new-line-prefixer.js";
import { MessagePortAdapter } from "../messageport-adapter.js";
import { RuntimeInstance } from "./runtime.js";
import module from 'module'
import EventEmitter from "events";
const require = module.createRequire(import.meta.url);

export default class Runtime extends EventEmitter implements RuntimeInstance
{
    private readonly cp: Worker;
    public readonly adapter: MessagePortAdapter;
    private _running: boolean;
    constructor(args: string[], options: { new?: boolean, name: string, keepAttached?: boolean, inspect?: boolean, verbose?: boolean, wait?: boolean })
    {
        super();
        this.cp = new Worker(require.resolve('../fork'), { argv: args, stderr: true, stdout: true })
        this.cp.stderr?.pipe(new NewLinePrefixer(options.name + ' ', { useColors: true })).pipe(process.stderr);
        this.cp.stdout?.pipe(new NewLinePrefixer(options.name + ' ', { useColors: true })).pipe(process.stdout);
        this.adapter = new MessagePortAdapter(this.cp);
        this.cp.on('exit', () => { this._running = false; this.emit('runningChanged') })
    }
    stop(): Promise<number>
    {
        return this.cp.terminate();
    }

    public static build(args: string[], options: { new?: boolean, name: string, keepAttached?: boolean, inspect?: boolean, verbose?: boolean, wait?: boolean })
    {
        return new Runtime(args, options);
    }

    get stderr(): Readable { return this.cp.stderr }
    get stdout(): Readable { return this.cp.stdout }

    get running() { return this._running; }

    public on(event: 'runningChanged', handler: () => void)
    public on(event: 'exit', handler: () => void)
    public on(event: string, handler: () => void)
    {
        super.on(event, handler);
    }
}