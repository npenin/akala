import { Readable, PassThrough } from "stream";
import { RuntimeEventMap, RuntimeInstance } from "./shared.js";
import { EventEmitter, SocketAdapter } from "@akala/core";
import { Payload } from "@akala/json-rpc-ws";

const sockBase = `http+unix://${encodeURIComponent("/var/run/docker.sock")}`;

async function dockerFetch(path: string, options?: RequestInit): Promise<any>
{
    const res = await fetch(sockBase + path, {
        ...options,
        headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
    });
    if (!res.ok) throw new Error(`Docker API error ${res.status}`);
    try
    {
        return await res.json();
    } catch
    {
        return await res.text();
    }
}

/**
 * Stream multiplexer: splits Docker's multiplexed attach stream into stdout/stderr
 */
function demuxDockerStream(stream: Readable, stdout: PassThrough, stderr: PassThrough)
{
    let buffer = Buffer.alloc(0);

    stream.on("data", (chunk: Buffer) =>
    {
        buffer = Buffer.concat([buffer, chunk]);
        while (buffer.length >= 8)
        {
            const streamType = buffer.readUInt8(0);
            const length = buffer.readUInt32BE(4);
            if (buffer.length < 8 + length) return; // wait for more
            const payload = buffer.subarray(8, 8 + length);
            if (streamType === 1) stdout.write(payload);
            else if (streamType === 2) stderr.write(payload);
            buffer = buffer.subarray(8 + length);
        }
    });

    stream.on("end", () =>
    {
        stdout.end();
        stderr.end();
    });
}

export class Runtime extends EventEmitter<RuntimeEventMap> implements RuntimeInstance
{
    static readonly name = "docker";

    static async build(
        args: string[],
        options: { new?: boolean; name: string; keepAttached?: boolean; inspect?: boolean; verbose?: boolean; wait?: boolean }
    ): Promise<Runtime>
    {
        const image = args[0];
        const cmd = args.slice(1);

        // ensure image is pulled
        await dockerFetch(`/images/create?fromImage=${encodeURIComponent(image)}`, { method: "POST" });

        // create container
        const container = await dockerFetch(`/containers/create?name=${options.name}`, {
            method: "POST",
            body: JSON.stringify({
                Image: image,
                Cmd: cmd.length ? cmd : undefined,
                AttachStdout: true,
                AttachStderr: true,
                Tty: false,
            }),
        });

        // start container
        await dockerFetch(`/containers/${container.Id}/start`, { method: "POST" });

        return new Runtime(container.Id);
    }

    public readonly runtime = Runtime;
    private containerId: string;
    private _running = true;

    private _stdout = new PassThrough();
    private _stderr = new PassThrough();

    constructor(id: string)
    {
        super();
        this.containerId = id;

        this.attach();
        this.monitor();
    }
    get adapter(): SocketAdapter<Payload<Readable>>
    {
        return null;
    }

    get running(): boolean
    {
        return this._running;
    }

    get stdout(): Readable
    {
        return this._stdout;
    }

    get stderr(): Readable
    {
        return this._stderr;
    }

    async stop(): Promise<number>
    {
        await dockerFetch(`/containers/${this.containerId}/stop`, { method: "POST" });
        this._running = false;
        this.emit("runningChanged");
        const info: any = await dockerFetch(`/containers/${this.containerId}/json`);
        const code = info?.State?.ExitCode ?? 0;
        this.emit("exit", code, null);
        return code;
    }

    private async attach()
    {
        const url = `${sockBase}/containers/${this.containerId}/attach?stdout=1&stderr=1&stream=1`;
        const res = await fetch(url, { method: "POST" });
        if (!res.body) throw new Error("No body from Docker attach");

        const nodeStream = Readable.fromWeb(res.body as any) as Readable;
        demuxDockerStream(nodeStream, this._stdout, this._stderr);
    }

    private async monitor()
    {
        const check = async () =>
        {
            const info: any = await dockerFetch(`/containers/${this.containerId}/json`);
            const running = info?.State?.Running ?? false;
            if (running !== this._running)
            {
                this._running = running;
                this.emit("runningChanged");
                if (!running)
                {
                    this.emit("exit", info.State.ExitCode, info.State.Error || null);
                }
            }
            setTimeout(check, 2000);
        };
        check();
    }
}
