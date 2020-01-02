import * as jsonrpcws from '@akala/json-rpc-ws'
import { CommandNameProcessor } from '../processor'
import { Writable, Readable } from 'stream';
import { v4 } from 'uuid'
import debug from 'debug'
import * as rpc from 'vscode-jsonrpc'
import * as rpcMessages from 'vscode-jsonrpc/lib/messages'

const log = debug('akala:commands:jsonrpc')

export class JsonRPC<T> extends CommandNameProcessor<T>
{
    private writer: rpc.StreamMessageWriter;
    private reader?: rpc.StreamMessageReader;

    public process(command: string, params: { param: jsonrpcws.SerializableObject[], [key: string]: jsonrpcws.SerializableObject | jsonrpcws.SerializableObject[] | string | number })
    {
        return new Promise<void>((resolve, reject) =>
        {
            var messageId = v4();
            var waitingReply = !!this.reader;
            if (waitingReply)
            {
                this.reader?.listen(function (reply: rpcMessages.ResponseMessage)
                {
                    log(reply);
                    if (reply.jsonrpc != '2.0')
                        reject('invalid json rpc reply');


                    if (typeof reply.id != 'undefined' && reply.id == messageId)
                    {
                        if (reply.error)
                            reject(reply.error);
                        else
                            resolve(reply.result);
                    }
                } as rpc.DataCallback);
            }

            try
            {
                this.writer.write({ jsonrpc: '2.0', id: messageId, method: command, params: params } as rpc.RequestMessage);
            }
            catch (e)
            {
                reject(e);
            }
            this.stream.on('error', reject);
        });
    }

    constructor(private stream: Writable)
    {
        super('jsonrpc');
        this.writer = new rpc.StreamMessageWriter(stream);
        if (stream instanceof Readable)
            this.reader = new rpc.StreamMessageReader(stream);
    }
}