///<reference types="mocha" />
import * as assert from 'assert'
import 'source-map-support/register'
import { array, bit, string, uint16, uint16LE, uint2, uint3, uint32, uint32LE, uint4, uint5, uint6, uint64, uint7, uint8 } from '../parsers/index.js'
import { Cursor, Parser, parserWrite } from '../parsers/_common.js'

function readType(name: string, type: Parser<number>, length: number)
{
    describe(name, function ()
    {
        it('should return ' + length + '/8', function ()
        {
            assert.strictEqual(type.length, length / 8);
        })
        it('should read and write from buffer', function ()
        {
            var expected: number = 0;
            for (let j = 0; j < length; j++)
            {
                expected += Math.pow(2, j);
            }
            if (length >= 16)
                this.timeout(0);

            var buffer = Buffer.allocUnsafe(Math.ceil(length / 8) + 1);
            var expectedBuffer = Buffer.allocUnsafe(Math.ceil(length / 8) + 1);
            for (let x = 0; x < expected; x++)
            {
                if (length == 32 && x != 0b1001100110011001)
                    continue;

                expectedBuffer.fill(0);
                if (length > 8)
                    if (name.endsWith('LE'))
                        expectedBuffer.writeUIntLE(x, 0, length / 8);
                    else
                        expectedBuffer.writeUIntBE(x, 0, length / 8);

                let c = new Cursor();
                for (let i = 0; i < 7; i++)
                {
                    // if (x == 1 && i == 1 && length == 3)
                    //     debugger;
                    buffer.fill(0)
                    c.offset = i / 8;
                    try
                    {
                        assert.strictEqual(type.write(buffer, c, x), undefined, 'writing in buffer');
                    }
                    catch (e)
                    {
                        console.error(`failed in writing at ${i}/8 in buffer for ${x} (${x.toString(2)})`);
                        assert.fail(e);
                    }
                    if (i == 0 && length > 8)
                    {
                        assert.deepStrictEqual(buffer, expectedBuffer, `comparing buffers after write for ${x} (${x.toString(2)})`);
                    }
                    c.offset = i / 8;
                    assert.deepStrictEqual(type.read(buffer, c), x, `reading ${i} / 8 in buffer [${buffer.toJSON().data}] for ${x} (${x.toString(2)})`);
                }
            }
        })
    })
}

function readArrayType(name: string, type: Parser<number>, length: number)
{
    var arrayType = array(uint8, type);
    describe(name + '[]', function ()
    {
        it('should return -1', function ()
        {
            assert.strictEqual(arrayType.length, -1);
        })
        it('should read and write from buffer', function ()
        {
            var expectedValue = 0;
            var arrayElementLength = type.length;
            for (let i = 0; i < 8 * arrayElementLength; i++)
            {
                expectedValue += Math.pow(2, i);
            }

            var expected: number[] = [];
            for (let i = 0; i < length; i++)
            {
                expected.push(expectedValue);
            }

            var buffer: Buffer = Buffer.alloc(length * type.length + 1);

            parserWrite(arrayType, buffer, new Cursor(), expected);
            assert.deepStrictEqual(arrayType.read(buffer, new Cursor()), expected, 'reading array in buffer');
        })
    })
}

describe('read', function ()
{
    readType('bit', bit, 1)
    readType('uint2', uint2, 2)
    readType('uint3', uint3, 3)
    readType('uint4', uint4, 4)
    readType('uint5', uint5, 5)
    readType('uint6', uint6, 6)
    readType('uint7', uint7, 7)
    readType('uint8', uint8, 8)
    readType('uint16', uint16, 16)
    readType('uint32', uint32, 32)
    readType('uint16LE', uint16LE, 16)
    readType('uint32LE', uint32LE, 32)

    readArrayType('uint8', uint8, 4)
    readArrayType('uint16', uint16, 4)
    readArrayType('uint32', uint32, 4)

    describe('string', function ()
    {
        var s = string(uint8);
        it('should return -1', function ()
        {
            assert.strictEqual(s.length, -1);
        })
        it('should read from buffer', function ()
        {
            var expected = 'string'
            var buffer: Buffer = Buffer.alloc(expected.length + 1);
            parserWrite(s, buffer, new Cursor(), expected);
            assert.strictEqual(s.read(buffer, new Cursor()), 'string', 'reading in buffer');
        })
    })

    describe('uint64', function ()
    {
        it('should return 8', function ()
        {
            assert.equal(uint64.length, 8);
        })
        it('should read from buffer', function ()
        {
            var expected = BigInt(1234567890);
            var buffer = Buffer.alloc(8);

            uint64.write(buffer, new Cursor(), expected)
            assert.strictEqual(uint64.read(buffer, new Cursor()), expected, 'reading in buffer');
        })
    })
})
