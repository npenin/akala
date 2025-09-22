import { describe, test } from 'node:test';
import assert from 'node:assert';
import { StringCursor } from '../parser/parser.js';

describe('StringCursor', () =>
{
    test('should read string correctly', () =>
    {
        const cursor = new StringCursor('hello world');
        assert.strictEqual(cursor.read('hello'), true);
        assert.strictEqual(cursor.offset, 5);
    });

    test('should not read past string length', () =>
    {
        const cursor = new StringCursor('hi');
        assert.strictEqual(cursor.read('hello'), false);
        assert.strictEqual(cursor.offset, 0);
    });

    test('should not read if partial match', () =>
    {
        const cursor = new StringCursor('hello');
        assert.strictEqual(cursor.read('help'), false);
        assert.strictEqual(cursor.offset, 0);
    });
});
