import * as r from '../router/index.js'
import assert from 'assert';
import { describe, it } from 'node:test'

class Router extends r.Router1<{ path: string, params?: Record<string, unknown> }>
{
    constructor(options?: r.RouterOptions)
    {
        super(options);
    }
}

describe('router', () =>
{
    const router = new Router();

    router.use('/api', function ()
    {
        console.log('api');
        throw undefined;
    });

    const ra = new Router();

    const rb = new Router();

    ra.use('/{id}', function (req)
    {
        console.log('a' + req.path);
        return req.params.id;
    });

    rb.use('/{id}', function (req)
    {
        console.log('b' + req.path);
        return req.params.id;
    })

    router.useMiddleware('/api/a', ra);
    router.useMiddleware('/api/b', rb);

    it('works with simple non matching path', () =>
    {
        let isOk = false;
        try
        {
            router.process({ path: '/' })
        }
        catch (x)
        {
            if (typeof x === 'undefined')
                isOk = true;

        }
        if (!isOk)
            assert.fail('should not have matched anything')
    });
    it('does not catch non matching routes', () =>
    {
        try { router.process({ path: '/a' }) } catch (x) 
        {
            if (typeof x !== 'undefined')
                assert.fail('matched when it should not')
        }
        try { router.process({ path: '/api/pwic' }) } catch (x) 
        {
            if (typeof x !== 'undefined')
                assert.fail('matched when it should not')
        }
    });
    it('catches obvious path', () =>
    {
        try { router.process({ path: '/api/a' }) } catch (x) 
        {
            if (typeof x !== 'undefined')
                assert.fail('should never reach that point');
        }
    });
    it('catches path with id', () =>
    {
        const result = router.process({ path: '/api/a/pwet' });
        assert.strictEqual('pwet', result);
    });
    // router.handleRoute({ path: '/api/b' });
    // router.handleRoute({ path: '/api/b/pwic' });
});
