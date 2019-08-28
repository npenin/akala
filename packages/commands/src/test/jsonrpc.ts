import { calculator } from './calculator'
import * as assert from 'assert'
import * as jsonrpc from '@akala/json-rpc-ws'
import { metadata, proxy, helper } from '../generator';
import { JsonRpcWs, LogProcessor } from '../processors';

describe('test jsonrpcws processing', function ()
{
    var server = jsonrpc.createServer();
    calculator.attach('jsonrpcws', server);

    this.afterAll(function (done)
    {
        client.disconnect(function ()
        {
            server.stop();
            done();
        })
    })
    this.beforeAll(function (done)
    {
        server.start({ port: 8888 }, function ()
        {
            if (!server.server)
                throw new Error('server is not assigned');
            client.connect('ws://localhost:' + server.server.options.port, done);
        });
    })

    var client = jsonrpc.createClient();

    it('should serve commands', function (done)
    {
        calculator.dispatch('reset')
        assert.equal(calculator.state.value, 0)
        client.send('increment', null, function (error?)
        {
            assert.ifError(error);
            assert.equal(calculator.state.value, 1)
            client.send('decrement', { param: [2] } as any, function (error: any)
            {
                done(error)
            });
        })
    });

    it('should work with proxy commands', async function ()
    {
        var container = metadata(calculator);
        var calculatorProxy = proxy(container, new LogProcessor(new JsonRpcWs(client.getConnection()), function (cmd, args)
        {
            console.log(args);
        }));
        calculator.dispatch('reset');
        assert.equal(calculator.state.value, 0)

        await calculatorProxy.dispatch('increment')
        assert.equal(calculator.state.value, 1)

        await calculatorProxy.dispatch('decrement', 2)
        assert.equal(calculator.state.value, -1)
    })


    it('should generate correct proxy', async function ()
    {
        var container = metadata(calculator);
        var meta = helper(proxy(container, new JsonRpcWs(client.getConnection())), container);
        assert.ok(meta);
        await meta.reset();
        await meta.increment();
        assert.strictEqual(calculator.state.value, 1);
        await meta.decrement();
        assert.strictEqual(calculator.state.value, 0);
    })

})