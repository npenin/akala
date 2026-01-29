import { replEval } from '../helpers/repl.js'
import * as assert from 'assert'
import { describe, it } from 'node:test'

function equals(input: string, output: string[], message?: string)
{
    assert.deepStrictEqual(replEval(input), output, message);
}

describe('replEval', () =>
{
    it('should parse simple space-separated arguments', () =>
    {
        equals('a b', ['a', 'b']);
    })

    it('should handle double quotes', () =>
    {
        equals('"a" b', ['a', 'b'], 'double quotes 10');
        equals('a b"c"', ['a', 'bc'], 'double quotes 13');
        equals('a b"\'"', ['a', 'b\''], 'double quotes 14');
    })

    it('should handle single quotes', () =>
    {
        equals('\'a\' b', ['a', 'b'], 'single quotes 11');
        equals('a b\'c\'', ['a', 'bc'], 'single quotes 16');
        equals('a b\'"\'', ['a', 'b"'], 'single quotes 17');
    })
})
