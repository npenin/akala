import { calculator } from './calculator'
import * as assert from 'assert'
import * as jsonrpc from '@akala/json-rpc-ws'
import * as ws from 'ws'
import { metadata, proxy, helper } from '../generator';
import { JsonRpc, LogProcessor } from '../processors';

describe('test jsonrpcws processing', function ()
{
    let server: ws.Server;

    this.afterAll(function (done)
    {
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

    it('should serve commands', function (done)
    {
        calculator.dispatch('reset')
        assert.strictEqual(calculator.state.value, 0)
        client.send('increment', undefined, function (error?)
        {
            assert.ifError(error);
            assert.strictEqual(calculator.state.value, 1)
            client.send('decrement', { param: [2] }, function (error)
            {
                done(error)
            });
        })
    });

    it('should work with proxy commands', async function ()
    {
        const container = metadata(calculator);
        const calculatorProxy = proxy(container, new LogProcessor(new JsonRpc(client.getConnection()), function (cmd, args)
        {
            console.log(args);
            return Promise.resolve();
        }));
        calculator.dispatch('reset');
        assert.equal(calculator.state.value, 0)

        await calculatorProxy.dispatch('increment')
        assert.equal(calculator.state.value, 1, 'increment failed')

        await calculatorProxy.dispatch('decrement', 2)
        assert.equal(calculator.state.value, -1, 'decrement failed')
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

})