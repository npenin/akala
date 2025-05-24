import { Readable, Writable } from "stream";
import { IpcAdapter } from "../ipc-adapter.js";
import { RuntimeEventMap, RuntimeInstance } from "./shared.js";
import { EventEmitter } from "@akala/core";

export default class Runtime extends EventEmitter<RuntimeEventMap> implements RuntimeInstance
{
    public static readonly name = 'self'
    public readonly runtime = Runtime;
    public readonly adapter: IpcAdapter;
    private stdio: { stderr: Readable, stdout: Readable, stdin: Writable }
    constructor(stdio?: { stderr: Readable, stdout: Readable, stdin: Writable })
    {
        super();
        this.adapter = new IpcAdapter(process);
        if (!stdio)
            this.stdio = process;
    }
    stop(timeoutInMs?: number): Promise<number>
    {
        return Promise.resolve(0);
    }
    get stderr(): Readable { return this.stdio.stderr }
    get stdout(): Readable { return this.stdio.stdout }

    get running() { return true }
}
