import { SocketAdapter, SocketAdapterEventMap } from "@akala/json-rpc-ws";
import { ChildProcess } from 'child_process'

export class ProcessStdioAdapter implements SocketAdapter
{
    get open(): boolean { return !!this.process.pid; }


    pipe(socket: SocketAdapter<unknown>)
    {
        this.on('message', (message) => socket.send(message));
        this.on('close', () => socket.close());
    }

    close(): void
    {
        this.process.disconnect();
    }
    send(data: string): void
    {
        this.process.stdout.write(data + '\n');
    }
    off<K extends keyof SocketAdapterEventMap>(event: K, handler: (ev: SocketAdapterEventMap[K]) => void): void
    {
        switch (event)
        {
            case 'message':
                this.process.stdin.off('data', handler);
                break;
            case 'open':
                handler(null);
                break;
            case 'close':
                this.process.off('disconnect', handler);
                break;
        }
    }
    on<K extends keyof SocketAdapterEventMap>(event: K, handler: (ev: SocketAdapterEventMap[K]) => void): void
    {
        switch (event)
        {
            case 'message':
                this.process.stdin.on('data', handler);
                break;
            case 'open':
                handler(null);
                break;
            case 'close':
                this.process.stdin.on('close', handler);
                break;
        }
    }

    once<K extends keyof SocketAdapterEventMap>(event: K, handler: (ev: SocketAdapterEventMap[K]) => void): void
    {
        switch (event)
        {
            case 'message':
                this.process.stdin.once('message', handler);
                break;
            case 'open':
                handler(null);
                break;
            case 'close':
                this.process.stdin.once('close', () => handler);
                break;
        }
    }

    constructor(private process: NodeJS.Process)
    {
    }

}

export class ChildProcessStdioAdapter implements SocketAdapter
{
    get open(): boolean { return !!this.process.pid; }


    pipe(socket: SocketAdapter<unknown>)
    {
        this.on('message', (message) => socket.send(message));
        this.on('close', () => socket.close());
    }

    close(): void
    {
        this.process.disconnect();
    }
    send(data: string): void
    {
        this.process.stdin.write(data + '\n');
    }
    off<K extends keyof SocketAdapterEventMap>(event: K, handler: (ev: SocketAdapterEventMap[K]) => void): void
    {
        switch (event)
        {
            case 'message':
                this.process.stdout.off('data', handler);
                break;
            case 'open':
                handler(null);
                break;
            case 'close':
                this.process.stdout.on('close', handler);
                break;
        }
    }
    on<K extends keyof SocketAdapterEventMap>(event: K, handler: (ev: SocketAdapterEventMap[K]) => void): void
    {
        switch (event)
        {
            case 'message':
                this.process.stdout.on('data', handler);
                break;
            case 'open':
                handler(null);
                break;
            case 'close':
                this.process.stdout.on('close', handler);
                break;
        }
    }

    once<K extends keyof SocketAdapterEventMap>(event: K, handler: (ev: SocketAdapterEventMap[K]) => void): void
    {
        switch (event)
        {
            case 'message':
                this.process.stdin.once('message', handler);
                break;
            case 'open':
                handler(null);
                break;
            case 'close':
                this.process.stdin.once('close', () => handler);
                break;
        }
    }

    constructor(private process: ChildProcess)
    {
    }

}
