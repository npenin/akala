import assert from "assert";
import { each } from "../eachAsync.js";

var array = [1, 2, 3, 4, 5, 6, 7, 8, 9];

function promiseTimeout(delay: number)
{
    return new Promise((resolve) =>
    {
        setTimeout(resolve, delay);
    })
}

describe('testing each async', function ()
{
    it('should accept callbacks', function (done)
    {
        this.timeout(10000);
        const result = [];
        each(array, (x, _i, next) => setTimeout(() =>
        {
            result.push(x + 1);
            next();
        }, Math.random() * 1000), function (e)
        {
            if (e)
                return done(e);
            try
            {
                assert.strictEqual(result.length, array.length);
                assert.strictEqual(result.reduce((p, c) => p + c, 0), array.reduce((p, c) => p + 1 + c, 0));
                done();
            }
            catch (e)
            {
                done(e);
            }
        })
    });

    it('should work with callbacks and errors', function (done)
    {
        this.timeout(10000);
        const result = [];
        each(array, (x, _i, next) => setTimeout(() =>
        {
            result.push(x + 1);
            if (x > 7)
                next(new Error('expected'));
            else
                next();
        }, Math.random() * 1000), function (e: Error)
        {
            if (e && e.message == 'expected')
                return done();
            done(e || new Error('no error received in callback'));
        })
    });

    it('should support mixing promises and callback return', function (done)
    {
        this.timeout(10000);
        const result = [];
        each(array, (x) => promiseTimeout(Math.random() * 1000).then(() => result.push(x + 1)),
            function (e)
            {
                if (e)
                    return done(e);
                try
                {
                    assert.strictEqual(result.length, array.length);
                    assert.strictEqual(result.reduce((p, c) => p + c, 0), array.reduce((p, c) => p + 1 + c, 0));
                    done();
                }
                catch (e)
                {
                    done(e);
                }
            });
    });


    it('should support mixing callbacks and promise return', async function ()
    {
        this.timeout(10000);
        const result = [];
        await each(array, (x, _i, next) => setTimeout(() =>
        {
            result.push(x + 1);
            next();
        }, Math.random() * 1000));

        assert.strictEqual(result.length, array.length);
        assert.strictEqual(result.reduce((p, c) => p + c, 0), array.reduce((p, c) => p + 1 + c, 0));
    });

    it('should accept promises', async function ()
    {
        this.timeout(10000);

        const result = [];
        await each(array, (x) => promiseTimeout(Math.random() * 1000).then(() => result.push(x + 1)))
        assert.strictEqual(result.length, array.length);
        assert.strictEqual(result.reduce((p, c) => p + c, 0), array.reduce((p, c) => p + 1 + c, 0));
    })

    it('should work with promises and errors', async function ()
    {
        this.timeout(10000);

        const result = [];
        await assert.rejects(new Promise((resolve, reject) =>
        {
            each(array, (x) => promiseTimeout(Math.random() * 1000).then(() =>
            {
                result.push(x + 1)
                if (x > 7)
                    throw new Error('expected');
            })).then(resolve, reject)
        }));
    })

})