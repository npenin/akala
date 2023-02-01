import { replEval } from '../helpers/repl.js'
import * as assert from 'assert'
import 'source-map-support/register'

function equals(input: string, output: string[], message?: string)
{
    assert.deepStrictEqual(replEval(input), output, message);
}

equals('a b', ['a', 'b']);
equals('"a" b', ['a', 'b'], 'double quotes 10');
equals('\'a\' b', ['a', 'b'], 'single quotes 11');

equals('a b"c"', ['a', 'bc'], 'double quotes 13');
equals('a b"\'"', ['a', 'b\''], 'double quotes 14');

equals('a b\'c\'', ['a', 'bc'], 'single quotes 16');
equals('a b\'"\'', ['a', 'b"'], 'single quotes 17');

console.log('ok');