import assert from "assert";
import { each } from "../eachAsync.js";
import { delay } from "../promiseHelpers.js";

var array = [1, 2, 3, 4, 5, 6, 7, 8, 9];

describe('testing each async', function ()
{
    it('should support mixing promises and callback return', function (done)
    {
        this.timeout(10000);
        const result = [];
        each(array, (x) => delay(Math.random() * 1000).then(() => { result.push(x + 1) })).then(done, e =>
        {
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
        await each(array, (x, _i) => delay(Math.random() * 1000).then(() =>
        {
            result.push(x + 1);
        }));

        assert.strictEqual(result.length, array.length);
        assert.strictEqual(result.reduce((p, c) => p + c, 0), array.reduce((p, c) => p + 1 + c, 0));
    });

    it('should accept promises', async function ()
    {
        this.timeout(10000);

        const result = [];
        await each(array, (x) => delay(Math.random() * 1000).then(() => { result.push(x + 1) }))
        assert.strictEqual(result.length, array.length);
        assert.strictEqual(result.reduce((p, c) => p + c, 0), array.reduce((p, c) => p + 1 + c, 0));
    })

    it('should work with promises and errors', async function ()
    {
        this.timeout(10000);

        const result = [];
        await assert.rejects(new Promise((resolve, reject) =>
        {
            each(array, (x) => delay(Math.random() * 1000).then(() =>
            {
                result.push(x + 1)
                if (x > 7)
                    throw new Error('expected');
            })).then(resolve, reject)
        }));
    })

})