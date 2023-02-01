import 'source-map-support/register'
import * as r from '../router/index.js'
import 'mocha'
import assert from 'assert';

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
        return Promise.reject();
    });

    const ra = new Router();

    const rb = new Router();

    ra.use('/:id?', async function (req)
    {
        console.log('a' + req.path);
        return req.params.id;
    });

    rb.use('/:id?', async function (req)
    {
        console.log('b' + req.path);
        return req.params.id;
    })

    router.useMiddleware('/api/a', ra);
    router.useMiddleware('/api/b', rb);

    it('works with simple non matching path', () =>
    {
        return router.process({ path: '/' }).catch((x) => typeof x === 'undefined' ? Promise.resolve() : Promise.reject(new Error('should not have matched anything')));
    });
    it('does not catch non matching routes', async () =>
    {
        await router.process({ path: '/a' }).catch((x) => typeof x === 'undefined' ? Promise.resolve() : Promise.reject(new Error('matched when it should not')));
        await router.process({ path: '/api/pwic' }).catch((x) => typeof x === 'undefined' ? Promise.resolve() : Promise.reject(new Error('matched when it should not')));
    });
    it('catches obvious path', () =>
    {
        return router.process({ path: '/api/a' }).catch(() =>
            Promise.reject(new Error('should never reach that point'))
        );
    });
    it('catches path with id', async () =>
    {
        assert.strictEqual('pwet', await router.process({ path: '/api/a/pwet' }).catch(() =>
            Promise.reject(new Error('should never reach that point'))
        ));
    });
    // router.handleRoute({ path: '/api/b' });
    // router.handleRoute({ path: '/api/b/pwic' });
});