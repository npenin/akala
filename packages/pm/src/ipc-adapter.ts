import { ChildProcess } from "child_process";
import * as jsonrpc from '@akala/json-rpc-ws';
import { SocketAdapterEventMap } from "@akala/json-rpc-ws";

export class IpcAdapter implements jsonrpc.SocketAdapter
{
    get open(): boolean { return !!this.cp.pid; }


    pipe(socket: jsonrpc.SocketAdapter<unknown>)
    {
        this.on('message', (message) => socket.send(message));
        this.on('close', () => socket.close());
    }

    close(): void
    {
        this.cp.disconnect();
    }
    send(data: string): void
    {
        if (this.cp.send)
            this.cp.send(data + '\n');

        else
            console.warn(`process ${this.cp.pid} does not support send over IPC`);
    }
    off<K extends keyof SocketAdapterEventMap>(event: K, handler: (ev: SocketAdapterEventMap[K]) => void): void
    {
        switch (event)
        {
            case 'message':
                this.cp.off('message', handler);
                break;
            case 'open':
                handler(null);
                break;
            case 'close':
                this.cp.off('disconnect', handler);
                break;
        }
    }
    on<K extends keyof SocketAdapterEventMap>(event: K, handler: (ev: SocketAdapterEventMap[K]) => void): void
    {
        switch (event)
        {
            case 'message':
                this.cp.on('message', handler);
                break;
            case 'open':
                handler(null);
                break;
            case 'close':
                this.cp.on('disconnect', handler);
                break;
        }
    }

    once<K extends keyof SocketAdapterEventMap>(event: K, handler: (ev: SocketAdapterEventMap[K]) => void): void
    {
        switch (event)
        {
            case 'message':
                this.cp.once('message', handler);
                break;
            case 'open':
                handler(null);
                break;
            case 'close':
                this.cp.once('disconnect', () => handler(null));
                break;
        }
    }

    constructor(private cp: ChildProcess | typeof process)
    {
    }

}
