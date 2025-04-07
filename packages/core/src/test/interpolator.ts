import { it, describe } from 'node:test'
import assert from 'assert/strict'
import { Interpolate } from '../interpolate.js'

describe('interpolate', () =>
{
    const interpolator = new Interpolate();

    it('should interpolate', () =>
    {
        assert.strictEqual(interpolator.build('pwet')({}), 'pwet')
        assert.strictEqual(interpolator.build('{{pwet}}')({ pwet: 'pwetpwet' }), 'pwetpwet')

        assert.strictEqual(interpolator.build(`{{options.branch=='main'?'latest':options.branch}}`)({ options: { branch: 'main' } }), 'latest')
        assert.strictEqual(interpolator.build(`{{options.branch=='main'?'latest':options.branch}}`)({ options: { branch: 'dev' } }), 'dev')

        const tag = interpolator.build(`{{options.branch=='main'?'latest':options.branch}}`);

        console.log(tag({ options: { branch: 'main' } }))
        console.log(tag({ options: { branch: 'dev' } }))
    })
    it('should interpolate object', () =>
    {
        assert.strictEqual(interpolator.buildObject('pwet')({}), 'pwet')
        assert.strictEqual(interpolator.buildObject('{{pwet}}')({ pwet: 'pwetpwet' }), 'pwetpwet')

        assert.strictEqual(interpolator.buildObject(`{{options.branch=='main'?'latest':options.branch}}`)({ options: { branch: 'main' } }), 'latest')
        assert.strictEqual(interpolator.buildObject(`{{options.branch=='main'?'latest':options.branch}}`)({ options: { branch: 'dev' } }), 'dev')

        const automateInterpolator = new Interpolate('$(', ')')
        const tag = automateInterpolator.buildObject(['yarn', 'workspace', '$($.name)', 'npm', 'publish', '--access', 'public', '--tag', "$(options.branch=='main' ? 'latest': options.branch)"]);

        console.log(tag({ '$': { name: 'core' }, options: { branch: 'main' } }))
        console.log(tag({ '$': { name: 'core' }, options: { branch: 'dev' } }))
    })
})
