/* eslint-disable no-debugger */
import { calculator } from './calculator/index.js'
import * as assert from 'assert'
import * as http from 'http';
import { HttpClient } from '../processors/http-client.js';
import { metadata, proxy } from '../generator.js';
import * as akala from '@akala/core'
import { UrlTemplate } from '@akala/core';
import { describe, it, before, after } from 'node:test'

describe('test http processing', function ()
{
    let server: http.Server;
    before(function (_, done)
    {
        server = http.createServer(function (req, res)
        {
            const url = req.url;
            if (!url)
            {
                res.writeHead(500);
                res.end();
                return;
            }
            const params: string[] = [];
            const indexOfSecondSlash = url.indexOf('/', 1);
            if (indexOfSecondSlash > 0)
            {
                var cmdName = url.substring(1, indexOfSecondSlash);
                const cmd = calculator.resolve(cmdName);
                if (cmd?.config?.http?.inject)
                {
                    const config = cmd.config.http;
                    const template = UrlTemplate.parse(config.route);
                    const match = UrlTemplate.match(url, template)
                    if (match && config.inject)
                    {
                        (config.inject as akala.Resolvable[]).forEach((inject, i) =>
                        {
                            if (inject == 'route.step')
                            {
                                params[i] = match.variables.step as string;
                            }
                        })
                    }
                }
            }
            else
                cmdName = url.substring(1);
            Promise.resolve(calculator.dispatch(cmdName, { params: params })).then(function (result)
            {
                if (typeof result != 'undefined')
                {
                    res.writeHead(200);
                    res.write(JSON.stringify(result).toString());
                }
                else
                {
                    res.writeHead(akala.HttpStatusCode.NoContent, 'OK', { 'content-length': 0 });
                }
                res.end();
            })
        });

        server.on('error', done)
        server.listen(8887, done);
    })

    after(function (_, done)
    {
        server.close(done);
    })

    it('should handle basics', async function ()
    {
        await calculator.dispatch('reset');
        akala.defaultInjector.register('$resolveUrl', function (url: string)
        {
            return new URL(url, 'http://localhost:8887/');
        })
        const container = metadata(calculator, false, true);
        const calculatorProxy = proxy(container, new HttpClient(akala.defaultInjector.resolve('$injector')));
        assert.strictEqual(calculator.state.value, 0)
        await calculatorProxy.dispatch('increment');
        assert.strictEqual(calculator.state.value, 1)
        await calculatorProxy.dispatch('increment', 2);
        assert.strictEqual(calculator.state.value, 3)
        await calculatorProxy.dispatch('decrement');
        assert.strictEqual(calculator.state.value, 2)
        await calculatorProxy.dispatch('decrement');
        assert.strictEqual(calculator.state.value, 1)
    })
})
