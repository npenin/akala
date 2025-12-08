import { Base } from './base.js';
import debug from 'debug';
const logger = debug('akala:json-rpc-ws');
import { type PayloadDataType, Connection, Payload } from './shared-connection.js';
import { type Error as MyError } from './errors.js'
import { ErrorWithStatus, HttpStatusCode, IncompleteMessageError, IsomorphicBuffer, SocketProtocolTransformer, type SocketAdapter } from '@akala/core';

/**
 * json-rpc-ws connection
 *
 * @constructor
 * @param {Socket} socket - web socket for this connection
 * @param {Object} parent - parent that controls this connection
 */
export function JsonNDRpcTransformer<T>(): SocketProtocolTransformer<any, string[]>
{
    return {
        receive(chunks: string[] | IsomorphicBuffer[])
        {
            if (typeof chunks !== 'object' || !Array.isArray(chunks))
                if (typeof chunks == 'string')
                    chunks = [chunks];
                else if (typeof chunks == 'object' && (chunks as any) instanceof IsomorphicBuffer)
                    chunks = [chunks];

            let stringCount: number = 0;
            let bufferCount: number = 0;

            for (const chunk of chunks)
            {
                if (typeof chunk == 'string')
                    stringCount++;
                else if (chunk instanceof IsomorphicBuffer)
                    bufferCount++;
                else
                    throw new ErrorWithStatus(HttpStatusCode.BadRequest, 'Expected a string or IsomorphicBuffer, but got ' + typeof chunk);
            }

            let data: string;
            if (stringCount > bufferCount)
                data = chunks.reduce((previous, current) => previous + (typeof current == 'string' ? current : current.toString('utf8')), '') as string;
            else if (bufferCount == chunks.length)
                data = IsomorphicBuffer.concat(chunks as IsomorphicBuffer[]).toString('utf-8');
            else
                data = chunks.reduce((previous, chunk) => previous + (typeof chunk == 'string' ? chunk : chunk.toString('utf8')), '') as string;

            let messages = data.split('\n');
            if (messages.length == 1)
                throw new IncompleteMessageError([], messages);

            if (messages[messages.length - 1] != '')
                throw new IncompleteMessageError(
                    messages.slice(0, messages.length - 1).map(message => JSON.parse(message)),
                    [messages[messages.length - 1]]);

            return messages.slice(0, messages.length - 1).map(data => JSON.parse(data));
        },
        send(data: T)
        {
            return [JSON.stringify(data) + '\n'];
        }
    }
}

export default abstract class Client<TStreamable, TConnectOptions> extends Base<TStreamable>
{
    constructor(private socketConstructor: (address: string, options?: TConnectOptions) => SocketAdapter<Payload<TStreamable>>, private options?: TConnectOptions)
    {
        super('client');
        logger('new Client');
    }

    public socket?: SocketAdapter<Payload<TStreamable>>;

    /**
     * Connect to a json-rpc-ws server
     *
     * @param {String} address - url to connect to i.e. `ws://foo.com/`.
     * @param {function} callback - optional callback to call once socket is connected
     * @public
     */
    public connect(address: string, callback: (err?: Event) => void): void
    {
        logger('Client connect %s', address);
        if (this.isConnected())
            throw new Error('Already connected');
        let opened = false;
        const socket = this.socket = this.socketConstructor(address, this.options);

        socket.once('open', () =>
        {
            // The client connected handler runs scoped as the socket so we can pass
            // it into our connected method like thisk
            this.connected(socket);
            opened = true;
            if (callback)
                callback.call(this);
        });
        if (callback)
            this.socket.once('error', function socketError(err)
            {
                if (!opened)
                {
                    callback.call(self, err);
                }
            });
    }

    /**
     * Test whether we have a connection or not
     *
     * @returns {Boolean} whether or not we have a connection
     * @public
     */
    public isConnected(): boolean
    {
        return Object.keys(this.connections).length !== 0;
    }

    /**
     * Return the current connection (there can be only one)
     *
     * @returns {Object} current connection
     * @public
     */
    public getConnection(): Connection<TStreamable>
    {
        const ids = Object.keys(this.connections);
        return this.connections[ids[0]];
    }


    /**
     * Close the current connection
     */
    public disconnect(): Promise<CloseEvent>
    {
        if (!this.isConnected())
            throw new Error('Not connected');
        const connection = this.getConnection();
        return connection.hangup();
    }

    /**
     * Send a method request
     *
     * @param {String} method - name of method
     * @param {Array} params - optional parameters for method
     * @param {function} callback - optional reply handler
     * @public
     * @todo allow for empty params aka arguments.length === 2
     */
    public send<TParamType extends PayloadDataType<TStreamable>, TReplyType extends PayloadDataType<TStreamable>>(method: string, params: TParamType, callback?: (error?: MyError, result?: TReplyType) => void): void
    {
        logger('send %s', method);
        if (!this.isConnected())
            throw new Error('Not connected');
        const connection = this.getConnection();
        connection.sendMethod(method, params, callback);
    }
}
