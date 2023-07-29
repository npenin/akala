///<reference types="mocha" />
import * as self from '../index.js'
import * as assert from 'assert'
import 'source-map-support/register'
import { object, uint16, uint8, string, buffer, bit, property, chooseProperty, emancipate } from '../parsers/index.js'
import { Cursor, parserWrite } from '../parsers/_common.js'

interface TestType
{
    length: self.uint8;
    type: self.uint16;
    sequenceNumber: self.uint8;
    raw: Buffer;
}
interface TestType2
{
    length: self.uint8;
    type: self.uint16;
    sequenceNumber: self.uint8;
    message: string;
}
interface SuperType
{
    prop1: self.uint8;
    type: self.uint8;
    sub: TestType | TestType2
}

var frame = object<TestType>(
    property('length', uint8),
    property('type', uint16),
    property('sequenceNumber', uint8),
    property('raw', buffer(uint8)),
)
var frame2 = object<TestType2>(
    property('length', uint8),
    property('type', uint16),
    property('sequenceNumber', uint8),
    property('message', string(uint8))
);

var superframe = object<SuperType>(
    property('prop1', uint8),
    property('type', uint16),
    chooseProperty<SuperType>('type', 'sub', {
        1: frame,
        2: frame2
    })
);

var obj = superframe;

describe('frame', function ()
{
    it('should read and write from buffer', function ()
    {
        var expected: TestType = { length: 10, type: 5, sequenceNumber: 0, raw: Buffer.from([0xff, 0xf5, 0x5f, 0x55]) }
        var protocol = frame;

        var buffer: Buffer = Buffer.concat(parserWrite(protocol, expected, expected));
        assert.deepStrictEqual(buffer, Buffer.from([10, 0, 5, 0, 4, 0xff, 0xf5, 0x5f, 0x55]))
        assert.deepStrictEqual(protocol.read(buffer, new Cursor(), expected), expected, 'frame writing and reading');
    })
})


describe('frame', function ()
{
    it('should read and write from buffer', function ()
    {
        var expected = { sign: 0, value: 167 }
        var protocol = object<typeof expected>(
            property('sign', emancipate(bit)),
            property('value', emancipate(uint16))
        );
        var buffer = Buffer.concat(parserWrite(protocol, expected, expected));
        assert.deepStrictEqual(buffer, Buffer.from([0, 78, 1]), 'frame writing')
        assert.deepStrictEqual(protocol.read(buffer, new Cursor(), {}), expected, 'frame reading');
    })
})

describe('subframe', function ()
{
    it('should read and write from buffer', function ()
    {
        var expected: SuperType = { type: 1, prop1: 17, sub: { length: 10, type: 1, sequenceNumber: 0, raw: Buffer.from([0xff, 0xf5, 0x5f, 0x55]) } }
        var buffer: Buffer = Buffer.concat(parserWrite(obj, expected));
        assert.deepStrictEqual(buffer, Buffer.from([17, 0, 1, 10, 0, 1, 0, 4, 0xff, 0xf5, 0x5f, 0x55]))
        assert.deepStrictEqual(obj.read(buffer, new Cursor(), {}), expected, 'frame writing and reading');

        var expected: SuperType = { type: 2, prop1: 17, sub: { length: 10, type: 1, sequenceNumber: 0, message: 'Buffer.from([0xff, 0xf5, 0x5f, 0x55]' } }
        var buffer = Buffer.concat(parserWrite(obj, expected));
        assert.deepStrictEqual(buffer, Buffer.from([17, 0, 2, 10, 0, 1, 0, 36, 66, 117, 102, 102, 101, 114, 46, 102, 114, 111, 109, 40, 91, 48, 120, 102, 102, 44, 32, 48, 120, 102, 53, 44, 32, 48, 120, 53, 102, 44, 32, 48, 120, 53, 53, 93]))
        assert.deepStrictEqual(obj.read(buffer, new Cursor(), {}), expected, 'frame writing and reading');

        var expected: SuperType = { type: 3, prop1: 17, sub: { length: 10, type: 1, sequenceNumber: 0, message: 'Buffer.from([0xff, 0xf5, 0x5f, 0x55]' } }
        try
        {
            parserWrite(obj, expected);
            assert.fail('unsupported type still passing');
        }
        catch (e)
        {
            assert.strictEqual(e.message, 'No parser could be found for type in ' + JSON.stringify(expected))
        }
        try
        {
            assert.deepStrictEqual(expected, obj.read(Buffer.from([17, 0, 3, 10, 0, 1, 0, 66, 117, 102, 102, 101, 114, 46, 102, 114, 111, 109, 40, 91, 48, 120, 102, 102, 44, 32, 48, 120, 102, 53, 44, 32, 48, 120, 53, 102, 44, 32, 48, 120, 53, 53, 93]), new Cursor(), {}))
            assert.fail('unsupported type still passing');
        }
        catch (e)
        {
            assert.strictEqual(e.message, 'No parser could be found for type in {"prop1":17,"type":3}')
        }
    })
})