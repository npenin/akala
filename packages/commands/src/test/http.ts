import { calculator } from './calculator'
import * as assert from 'assert'
import * as http from 'http';
import { HttpClient, HttpConfiguration } from '../processors/http-client';
import { metadata, proxy } from '../generator';
import * as akala from '@akala/core'
import * as pathRegexp from 'path-to-regexp';

describe('test http processing', function ()
{
    var server: http.Server;
    this.beforeAll(function (done)
    {
        server = http.createServer(function (req, res)
        {
            var url = req.url;
            if (!url)
            {
                res.writeHead(500);
                res.end();
                return;
            }
            var params: string[] = [];
            var indexOfSecondSlash = url.indexOf('/', 1);
            if (indexOfSecondSlash > 0)
            {
                var cmdName = url.substr(1, indexOfSecondSlash - 1);
                var cmd = calculator.resolve(cmdName);
                if (cmd && cmd.config && cmd.config.http && cmd.config.http.inject)
                {
                    var config = cmd.config.http as any as HttpConfiguration;
                    var keys: pathRegexp.Key[] = [];
                    var regexp = pathRegexp.default(config.route, keys);
                    var match = url.match(regexp)
                    if (match && config.inject)
                    {
                        match.forEach(function (value, i)
                        {
                            if (i > 0 && config.inject)
                            {
                                var key = keys[i - 1]
                                var indexOfParam = config.inject.indexOf('route.' + key.name);
                                if (indexOfParam > -1)
                                    params[indexOfParam] = value;
                            }
                        })
                    }
                }
            }
            else
                cmdName = url.substr(1);
            Promise.resolve(calculator.dispatch(cmdName, ...params)).then(function (result)
            {
                res.writeHead(200);
                if (typeof result != 'undefined')
                    res.write(JSON.stringify(result).toString());
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
        akala.register('$resolveUrl', function (url: string)
        {
            return new URL(url, 'http://localhost:8887/');
        })
        var container = metadata(calculator);
        var calculatorProxy = proxy(container, new HttpClient(akala.resolve('$injector')));
        assert.equal(calculator.state.value, 0)
        await calculatorProxy.dispatch('increment');
        assert.equal(calculator.state.value, 1)
        await calculatorProxy.dispatch('increment', 2);
        assert.equal(calculator.state.value, 3)
        await calculatorProxy.dispatch('decrement');
        assert.equal(calculator.state.value, 2)
        await calculatorProxy.dispatch('decrement');
        assert.equal(calculator.state.value, 1)
    })
})