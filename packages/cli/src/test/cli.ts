import * as assert from 'assert'
import 'source-map-support/register.js'
import program from '../router/index.js';

program.command('a [opt]').action(async c => c.options)
program.command('b <nopt>').action(async c => c.options)
program.command('c c').action(async c => c)
program.command('c d [opt]').action(async c => c.options)
program.command('c d <nopt>').action(async c => c.options)
program.command('e <nopt1> <nopt2>').action(async c => c.options)
program.command('f [opt1] [opt2]').action(async c => c.options)
program.command('g <nopt1> <nopt2> [opt1] [opt2]').action(async c => c.options)
assert.throws(() => { program.command('h <nopt1> [opt1] <nopt2> [opt2]').action(async c => c.options) });

(async function ()
{
    assert.deepStrictEqual(await program.process<Record<string, string>>({ abort: new AbortController(), args: ['a'], argv: ['a'], options: { help: false }, currentWorkingDirectory: undefined, logger: null }), { opt: undefined })
    assert.deepStrictEqual(await program.process<Record<string, string>>({ abort: new AbortController(), args: ['a', 'x'], argv: ['a', 'x'], options: { help: false }, currentWorkingDirectory: undefined, logger: null }), { opt: 'x' })
    console.log('ok');
})();
