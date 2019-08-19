import { calculator } from './calculator'
import * as assert from 'assert'
import { metadata, proxy, helper, commandList, fromObject } from '../generator';

describe('test helpers', function ()
{
    it('should generate correct metadata', function ()
    {
        var meta = metadata(calculator)
        assert.ok(meta);
        assert.strictEqual(meta.name, calculator.name);
        assert.ok(meta.commands);
        meta.commands.forEach(metacmd =>
        {
            assert.ok(metacmd);
            assert.ok(metacmd.name, JSON.stringify(metacmd));
            var cmd = calculator.resolve(metacmd.name);
            assert.ok(cmd, `command ${metacmd.name} could not be found in ${JSON.stringify(meta.commands)}`);
            assert.strictEqual(metacmd.name, cmd.name);
            assert.deepStrictEqual(metacmd.inject, cmd.inject || []);
            assert.deepStrictEqual(metacmd.config, cmd.config);
        })
    })

    it('should generate correct proxy', function ()
    {
        var meta = helper(calculator)
        assert.ok(meta);
        meta.reset();
        meta.increment();
        assert.strictEqual(calculator.state.value, 1);
        meta.decrement();
        assert.strictEqual(calculator.state.value, 0);
        meta.increment(2);
        assert.strictEqual(calculator.state.value, 2);

    })


    it('should list 3 commands', function ()
    {
        var meta = commandList(metadata(calculator))
        assert.ok(meta);
        assert.strictEqual(meta.length, 3);
        assert.notStrictEqual(meta.indexOf('increment'), -1)
        assert.notStrictEqual(meta.indexOf('decrement'), -1)
        assert.notStrictEqual(meta.indexOf('reset'), -1)
    })

    it('should generate correct metadata from object', function ()
    {
        var container = fromObject({
            value: 0, increment(step?: number | string)
            {
                if (step && typeof (step) == 'string')
                    step = Number(step);
                this.value += (step as number | undefined) || 1;
            },
            decrement(step?: number | string)
            {
                if (step && typeof (step) == 'string')
                    step = Number(step);
                this.value -= (step as number | undefined) || 1;
            }, reset()
            {
                this.value = 0;
            }
        }, calculator.name + 'Object');

        var meta = metadata(calculator)
        var meta2 = metadata(container)
        assert.ok(meta2);
        assert.strictEqual(meta2.name, meta.name + 'Object');
        assert.ok(meta2.commands);
        meta2.commands.forEach(metacmd =>
        {
            assert.ok(metacmd);
            assert.ok(metacmd.name, JSON.stringify(metacmd));
            var cmd = meta.commands.find(c => c.name == metacmd.name);
            if (!cmd)
            {
                assert.fail(`command ${metacmd.name} could not be found in ${JSON.stringify(meta.commands)}`);
                return;
            }
            assert.strictEqual(metacmd.name, cmd.name);
        })
    })

    it('should handle basics from object', function ()
    {
        var container = fromObject({
            value: 0, increment(step?: number | string)
            {
                if (step && typeof (step) == 'string')
                    step = Number(step);
                this.value += (step as number | undefined) || 1;
            },
            decrement(step?: number | string)
            {
                if (step && typeof (step) == 'string')
                    step = Number(step);
                this.value -= (step as number | undefined) || 1;
            }, reset()
            {
                this.value = 0;
            }
        }, calculator.name + 'Object');


        container.dispatch('reset');
        assert.equal(container.state.value, 0)
        container.dispatch('increment');
        assert.equal(container.state.value, 1)
        container.dispatch('increment');
        assert.equal(container.state.value, 2)
        container.dispatch('decrement');
        assert.equal(container.state.value, 1)
        container.dispatch('decrement');
        assert.equal(container.state.value, 0)

    })

})