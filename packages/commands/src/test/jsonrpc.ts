import { calculator } from './calculator/index'
import * as assert from 'assert'
import * as jsonrpc from '@akala/json-rpc-ws'
import * as ws from 'ws'
import { metadata, proxy, helper } from '../generator';
import { JsonRpc, LogProcessor } from '../processors/index';
import { Container } from '../model/container';
// import { Command } from '../model/command';
import { configure } from '../decorators';
import { jsonrpcws } from '../triggers';
import { NetSocketAdapter } from "../net-socket-adapter";
import * as net from 'net';
import { unlink } from 'fs';
import { promisify } from 'util';
import { SelfDefinedCommand } from '../model/command';

describe('test jsonrpcws processing', function ()
{
    let server: ws.Server;

    this.afterAll(function (done)
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
    this.beforeAll(function (done)
    {
        server = new ws.Server({ port: 8888 }, function ()
        {
            if (!server)
                throw new Error('server is not assigned');
            client.connect('ws://localhost:' + server.options.port, done);
        });
        server.on('connection', (socket: ws) => calculator.attach('jsonrpc', new jsonrpc.ws.SocketAdapter(socket)));
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
                client.send('decrement', { param: [2] }, function (error)
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
        const container = metadata(calculator);
        const calculatorProxy = proxy(container, new LogProcessor(new JsonRpc(client.getConnection(), true), function (container, cmd, args)
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
        const container = metadata(calculator);
        const meta = helper(proxy(container, new JsonRpc(client.getConnection())), container);
        assert.ok(meta);
        await meta.reset();
        await meta.increment();
        assert.strictEqual(calculator.state.value, 1);
        await meta.decrement();
        assert.strictEqual(calculator.state.value, 0);
    })

    it('should be able to call incoming container', async function ()
    {
        const socketPath = './' + this.test.title + '.sock';
        try
        {
            const c1 = new Container('c1', {});
            const c2 = new Container('c2', {});
            c1.register(configure({ jsonrpc: { inject: ['connectionAsContainer'] } })(new SelfDefinedCommand(function (container: Container<void>)
            {
                return container.dispatch('cmd');
            }, 'cmd')));

            c2.register(new SelfDefinedCommand(function ()
            {
                return 'x';
            }, 'cmd'));

            const server = new net.Server().listen({ path: socketPath }).on('connection', (socket) =>
            {
                c1.attach(jsonrpcws, new NetSocketAdapter(socket));
            });

            const socket = new net.Socket();
            const c1Client = await new Promise<Container<void>>((resolve) =>
            {
                socket.connect({ path: socketPath }, function ()
                {
                    resolve(proxy(metadata(c1), new JsonRpc(JsonRpc.getConnection(new NetSocketAdapter(socket), c2), true)));
                });
            })

            assert.strictEqual(await c1Client.dispatch('cmd'), 'x');

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