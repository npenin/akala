import { IsomorphicBuffer } from "../helpers.js";
import { SocketAdapter } from "./shared.js";
import { SocketProtocolAdapter } from "./shared.socket-protocol-adapter.js";

// export type SocketProtocolAdapter<T> = SocketAdapter<T>;

export interface SocketProtocolTransformer<TMessage, TSource = string | IsomorphicBuffer>
{
    receive: (data: TSource, self: SocketProtocolAdapter<unknown>) => TMessage[];
    send: (data: TMessage, self: SocketProtocolAdapter<unknown>) => TSource;
    close?: (socket: SocketAdapter) => Promise<void>;
}

export function pipeSocketProtocolTransformer<TSource, TIntermediate, TTarget>(source: SocketProtocolTransformer<TIntermediate, TSource>, target: SocketProtocolTransformer<TTarget, TIntermediate>)
{
    const result: SocketProtocolTransformer<TTarget, TSource> = {
        receive(data, self)
        {
            return source.receive(data, self)?.flatMap(inter => target.receive(inter, self));
        },
        send(data, self)
        {
            return source.send(target.send(data, self), self);
        },
        async close(socket)
        {
            await source.close?.(socket);
            await target.close?.(socket);
        }
    };

    return result;
}
