import { SocketAdapter, SocketAdapterEventMap } from "@akala/json-rpc-ws";
import { MessagePort, Worker } from "worker_threads";

export class MessagePortAdapter implements SocketAdapter
{
    private isOpen: boolean = true;

    get open(): boolean { return this.isOpen; }
    close(): void
    {
        if (this.cp instanceof Worker)
            this.cp.terminate();
        else
            this.cp.close();
    }
    send(data: string): void
    {
        this.cp.postMessage(data);
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
                this.cp.once('close', () => handler(null));
                break;
        }
    }

    constructor(private cp: MessagePort | Worker)
    {
        cp.on('close', () => this.isOpen = false);
    }
    off<K extends keyof SocketAdapterEventMap>(event: K, handler?: (this: unknown, ev: SocketAdapterEventMap[K]) => void): void
    {
        this.cp.off(event, handler);
    }

    pipe(socket: SocketAdapter<unknown>)
    {
        this.on('message', (message) => socket.send(message));
        this.on('close', () => socket.close());
    }

    // _write(chunk: string | Buffer, encoding: string, callback: (error?: any) => void)
    // {
    //     // The underlying source only deals with strings.
    //     if (Buffer.isBuffer(chunk))
    //         chunk = chunk.toString('utf8');
    //     if (this.cp.send)
    //         this.cp.send(chunk + '\n', callback);
    //     else
    //         callback(new Error('there is no send method on this process'));
    // }

    // _read()
    // {
    // }
}
