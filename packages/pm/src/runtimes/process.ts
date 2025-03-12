import { Readable, Writable } from "stream";
import { IpcAdapter } from "../ipc-adapter.js";
import { RuntimeEventMap, RuntimeInstance } from "./shared.js";
import { EventEmitter } from "@akala/core";

export default class Runtime extends EventEmitter<RuntimeEventMap> implements RuntimeInstance
{
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
    get stderr(): Readable { return this.stdio.stderr }
    get stdout(): Readable { return this.stdio.stdout }

    get running() { return true }
}
