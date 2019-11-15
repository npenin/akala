import * as jsonrpcws from '@akala/json-rpc-ws'
import { CommandNameProcessor } from '../processor'
import { Writable, Transform, Readable } from 'stream';
import { v4 } from 'uuid'
import debug from 'debug'
const log = debug('akala:commands:jsonrpc')

export class JsonRPC<T> extends CommandNameProcessor<T>
{
    private transform: Transform;

    public process(command: string, params: { param: jsonrpcws.SerializableObject[], [key: string]: jsonrpcws.SerializableObject | jsonrpcws.SerializableObject[] | string | number })
    {
        return new Promise<void>((resolve, reject) =>
        {
            var messageId = v4();
            var waitingReply = this.stream instanceof Readable;
            if (waitingReply)
            {
                this.stream.on('data', function (replyString: Buffer)
                {
                    try
                    {
                        log(replyString);
                        var reply = JSON.parse(replyString.toString());
                        if (reply.jsonrpc != '2.0')
                            reject('invalid json rpc reply');
                        if (reply.id == messageId)
                        {
                            if (reply.error)
                                reject(reply.error);
                            else
                                resolve(reply.result);
                        }
                    }
                    catch (e)
                    {
                        reject(e);
                    }
                })
            }

            this.transform.write({ jsonrpc: '2.0', id: messageId, method: command, params: params }, function (error)
            {

                if (error)
                    reject(error);
                else if (!waitingReply)
                    resolve();
            });
            this.stream.on('error', reject);
        });
    }

    constructor(private stream: Writable)
    {
        super('jsonrpc');
        this.transform = new Transform({
            objectMode: true,
            transform(chunk, encoding, callback)
            {
                try
                {
                    callback(null, JSON.stringify(chunk as any) + '\n')
                }
                catch (e)
                {
                    callback(e);
                }
            }
        });
        this.transform.pipe(this.stream);
    }
}