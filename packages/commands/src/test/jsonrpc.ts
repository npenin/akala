import { calculator } from './calculator/index.js'
import * as assert from 'assert'
import * as jsonrpc from '@akala/json-rpc-ws'
import * as ws from 'ws'
import { metadata, proxy, helper } from '../generator.js';
import { JsonRpc, LogEventProcessor } from '../processors/index.js';
import { Container } from '../model/container.js';
// import { Command } from '../model/command';
import { configure } from '../decorators.js';
import * as net from 'net';
import { unlink } from 'fs';
import { promisify } from 'util';
import { SelfDefinedCommand } from '../model/command.js';
import { describe, it, before, after } from 'node:test'
import $metadataCmd from '../commands/$metadata.js';
import { extractCommandMetadata } from '../metadata/command.js';
import { LongMessageProtocolTransformer, SocketProtocolAdapter, TcpSocketAdapter } from '@akala/core';

describe('test jsonrpcws processing', function ()
{
    let server: ws.WebSocketServer;

    after(function (_, done)
    {
        if (client.isConnected())
            client.disconnect().then(function ()
            {
                if (server)
                    server.close(done);
                else
                    done();
            }, done);
    })
    before(function (_, done)
    {
        server = new ws.WebSocketServer({ port: 8888 }, function ()
        {
            if (!server)
                throw new Error('server is not assigned');
            client.connect('ws://localhost:' + server.options.port, done);
        });
        server.on('connection', (socket: ws.WebSocket) => calculator.attach('jsonrpc', new jsonrpc.JsonRpcSocketAdapter(new jsonrpc.ws.SocketAdapter(socket))));
    })

    const client = jsonrpc.ws.createClient();

    it('should serve commands', async function ()
    {
        await calculator.dispatch('reset')
        assert.strictEqual(calculator.state.value, 0)
        await new Promise<void>((resolve, reject) =>
        {
            client.send('increment', undefined, function (error?)
            {
                assert.ifError(error);
                assert.strictEqual(calculator.state.value, 1)
                client.send('decrement', { params: [2] }, function (error)
                {
                    if (error)
                        reject(error);
                    else
                        resolve()
                });
            })
        })
    });

    it('should work with proxy commands', async function ()
    {
        const container = metadata(calculator, false, true);
        const calculatorProxy = proxy(container, new LogEventProcessor(new JsonRpc(client.getConnection()), null, function (container, cmd, args)
        {
            console.log(args);
        }));
        await calculator.dispatch('reset');
        assert.strictEqual(calculator.state.value, 0)

        await calculatorProxy.dispatch('increment')
        assert.strictEqual(calculator.state.value, 1, 'increment failed')

        await calculatorProxy.dispatch('decrement', 2)
        assert.strictEqual(calculator.state.value, -1, 'decrement failed')
    })


    it('should generate correct proxy', async function ()
    {
        const container = metadata(calculator, false, true);
        const meta = helper(proxy(container, new JsonRpc(client.getConnection())), container);
        assert.ok(meta);
        await meta.reset();
        await meta.increment();
        assert.strictEqual(calculator.state.value, 1);
        await meta.decrement();
        assert.strictEqual(calculator.state.value, 0);
    })

    it('should be able to call incoming container', async function (x)
    {
        const socketPath = './' + x.fullName + '.sock';
        try
        {
            const c1 = new Container('c1', {});
            const c2 = new Container('c2', {});
            c1.register(configure({ jsonrpc: { inject: ['connectionAsContainer'] } })(new SelfDefinedCommand(async function (container: Container<void>)
            {
                const meta = await container.dispatch(extractCommandMetadata($metadataCmd));
                meta.commands.forEach(cmd => container.register(cmd));
                return await container.dispatch('b');
            }, 'a')));

            c2.register(new SelfDefinedCommand(function ()
            {
                return 'x';
            }, 'b'));

            const server = new net.Server().listen({ path: socketPath }).on('connection', (socket) =>
            {
                c1.attach(JsonRpc.trigger, new SocketProtocolAdapter(LongMessageProtocolTransformer(jsonrpc.JsonNDRpcSocketAdapter()), new TcpSocketAdapter(socket)));
            });

            const socket = new net.Socket();
            const c1Client = await new Promise<Container<void>>((resolve) =>
            {
                socket.connect({ path: socketPath }, function ()
                {
                    resolve(proxy(metadata(c1, false, true), new JsonRpc(JsonRpc.getConnection(new SocketProtocolAdapter(LongMessageProtocolTransformer(jsonrpc.JsonNDRpcSocketAdapter()), new TcpSocketAdapter(socket)), c2))));
                });
            })

            assert.strictEqual(await c1Client.dispatch('a'), 'x');

            await promisify(socket.end).bind(socket)()

            await new Promise<void>((resolve, reject) =>
            {
                server.close(err =>
                {
                    if (err)
                        reject(err)
                    else
                        resolve()
                });
            });
        }
        finally
        {
            await new Promise<void>((resolve) => unlink(socketPath, () =>
            {
                resolve();
            }));
        }
    })
})
