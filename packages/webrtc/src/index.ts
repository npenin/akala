import { EventEmitter, SocketAdapter, SocketAdapterAkalaEventMap } from "@akala/core";

export type WebRtcPayload = string | Blob | ArrayBuffer | ArrayBufferView<ArrayBuffer>;

export class WebRtcDataChannel extends EventEmitter<SocketAdapterAkalaEventMap<WebRtcPayload>> implements SocketAdapter<WebRtcPayload>
{
    constructor(private connection: RTCDataChannel)
    {
        super();
        connection.addEventListener('message', m =>
        {
            this.emit('message', m.data);
        })
    }
    get open(): boolean { return this.connection.readyState == 'open' };
    close(): Promise<void>
    {
        this.connection.close();
        return new Promise<void>(resolve => this.connection.addEventListener('close', () => resolve(), { once: true }));
    }
    send(data: WebRtcPayload): Promise<void>
    {
        this.connection.send(data as string);
        return Promise.resolve();
    }
    pipe(socket: SocketAdapter<WebRtcPayload>): void
    {
        this.on('message', m => socket.send(m));
        this.on('close', () => socket.close());
    }
}

