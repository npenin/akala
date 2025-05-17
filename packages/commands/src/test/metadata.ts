import { calculator } from './calculator/index.js'
import assert from 'assert'
import { metadata, helper, commandList, fromObject } from '../generator.js';
import { FileSystem } from '../processors/index.js';
import { describe, it } from 'node:test'
import fsHandler from '@akala/fs';
// import { createRequire } from 'module';

// const require = createRequire(import.meta.url);

describe('test helpers', function ()
{
    it('should generate correct metadata', function ()
    {
        const meta = metadata(calculator)
        assert.ok(meta);
        assert.strictEqual(meta.name, calculator.name);
        assert.ok(meta.commands);
        meta.commands.forEach(metacmd =>
        {
            assert.ok(metacmd);
            assert.ok(metacmd.name, JSON.stringify(metacmd));
            const cmd = calculator.resolve(metacmd.name);
            assert.ok(cmd, `command ${metacmd.name} could not be found in ${JSON.stringify(meta.commands)}`);
            assert.strictEqual(metacmd.name, cmd.name);
            assert.deepStrictEqual(metacmd.config[''].inject || [], cmd.config[''].inject || []);
            assert.deepStrictEqual(metacmd.config, cmd.config);
        })
    })

    it('should generate correct proxy', async function ()
    {
        const meta = helper(calculator)
        assert.ok(meta);
        await meta.reset();
        await meta.increment();
        assert.strictEqual(calculator.state.value, 1);
        await meta.decrement();
        assert.strictEqual(calculator.state.value, 0);
        await meta.increment(2);
        assert.strictEqual(calculator.state.value, 2);

    })


    it('should list 3 commands + 3 default commands', function ()
    {
        const meta = commandList(metadata(calculator))
        assert.ok(meta);
        assert.strictEqual(meta.length, 3);
        assert.notStrictEqual(meta.indexOf('increment'), -1)
        assert.notStrictEqual(meta.indexOf('decrement'), -1)
        assert.notStrictEqual(meta.indexOf('reset'), -1)
    })

    it('should generate correct metadata from object', function ()
    {
        const container = fromObject({
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

        const meta = metadata(calculator)
        const meta2 = metadata(container)
        assert.ok(meta2);
        assert.strictEqual(meta2.name, meta.name + 'Object');
        assert.ok(meta2.commands);
        meta2.commands.forEach(metacmd =>
        {
            assert.ok(metacmd);
            assert.ok(metacmd.name, JSON.stringify(metacmd));
            const cmd = meta.commands.find(c => c.name == metacmd.name);
            if (!cmd)
            {
                assert.fail(`command ${metacmd.name} could not be found in ${JSON.stringify(meta.commands)}`);
                return;
            }
            assert.strictEqual(metacmd.name, cmd.name);
        })
    })

    it('should handle basics from object', async function ()
    {
        const container = fromObject({
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
        await container.dispatch('increment');
        assert.equal(container.state.value, 1)
        await container.dispatch('increment');
        assert.equal(container.state.value, 2)
        await container.dispatch('decrement');
        assert.equal(container.state.value, 1)
        await container.dispatch('decrement');
        assert.equal(container.state.value, 0)

    })


    it('should interpret json properly', async function ()
    {
        const cmds = await FileSystem.discoverMetaCommands(new URL('../../../commands.json', import.meta.url));
        assert.strictEqual(cmds.commands.length, 15);
        // debugger;
        const cmds2 = await FileSystem.discoverMetaCommands(new URL('../../../src/test/metadata.json', import.meta.url), { fs: await fsHandler.process(new URL('../../..', import.meta.url)) });
        assert.strictEqual(cmds2.commands.length, 37);
        assert.strictEqual(cmds2.commands.reduce((prev, current) => prev + (cmds.commands.some(cmd => cmd.name == current.name) ? '' : current.name), ''), 'dummy$initbridgenameproxyreadyreload-metadatarestartstartstatusstop$init-akalaconnectdiscoverinstalllinkloglsmapuninstallupdateversion')
    })
})
