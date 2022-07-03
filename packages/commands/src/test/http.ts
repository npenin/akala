/* eslint-disable no-debugger */
import { calculator } from './calculator/index'
import * as assert from 'assert'
import * as http from 'http';
import { HttpClient } from '../processors/http-client';
import { metadata, proxy } from '../generator';
import * as akala from '@akala/core'
import * as pathRegexp from 'path-to-regexp';

describe('test http processing', function ()
{
    let server: http.Server;
    this.beforeAll(function (done)
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
                var cmdName = url.substr(1, indexOfSecondSlash - 1);
                const cmd = calculator.resolve(cmdName);
                if (cmd && cmd.config && cmd.config.http && cmd.config.http.inject)
                {
                    const config = cmd.config.http;
                    const keys: pathRegexp.Key[] = [];
                    const regexp = pathRegexp.pathToRegexp(config.route, keys);
                    const match = url.match(regexp)
                    if (match && config.inject)
                    {
                        match.forEach(function (value, i)
                        {
                            if (i > 0 && config.inject)
                            {
                                const key = keys[i - 1]
                                const indexOfParam = config.inject.indexOf('route.' + key.name);
                                if (indexOfParam > -1)
                                    params[indexOfParam] = value;
                            }
                        })
                    }
                }
            }
            else
                cmdName = url.substr(1);
            Promise.resolve(calculator.dispatch(cmdName, { param: params })).then(function (result)
            {
                if (typeof result != 'undefined')
                {
                    res.writeHead(200);
                    res.write(JSON.stringify(result).toString());
                }
                else
                {
                    res.writeHead(204, 'OK', { 'content-length': 0 });
                }
                res.end();
            })
        });
        server.on('error', function (err)
        {
            done(err);
        })
        server.listen(8887, function ()
        {
            done();
        });
    })

    this.afterAll(function (done)
    {
        server.close(function (err)
        {
            done(err);
        })
    })

    it('should handle basics', async function ()
    {
        debugger;
        calculator.dispatch('reset');
        akala.defaultInjector.register('$resolveUrl', function (url: string)
        {
            return new URL(url, 'http://localhost:8887/');
        })
        const container = metadata(calculator);
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