import assert from "assert";
import { protobuf } from "../parsers/index.js"
import { ProtobufMessage } from "../parsers/protobuf/index.js";
import { Cursor, parserWrite } from "../parsers/_common.js"

describe('protobuf', function ()
{
    type Message1 = ProtobufMessage<{ a: number }>;
    type Message2 = ProtobufMessage<{ b: string }> & Message1;
    type Message3 = ProtobufMessage<{ c: Message1 }> & Message2;
    type Message4 = ProtobufMessage<{ d: number }> & Message3;

    var message1 = protobuf.object<Message1>(protobuf.property('a', 'varint', protobuf.varint));
    const message = protobuf.object<Message4>(
        protobuf.property('a', protobuf.varint),
        protobuf.property('b', protobuf.string()),
        protobuf.property('c', protobuf.sub(message1)),
        protobuf.packed('d', protobuf.varint)
    );

    it('should parse varint', function ()
    {
        const expected = 300;
        const buffer = Buffer.concat(protobuf.varint.write(expected));
        assert.deepStrictEqual(Buffer.from([0b10101100, 0b00000010]), buffer);
        assert.deepStrictEqual(expected, protobuf.varint.read(buffer, new Cursor()));
    })
    it('should parse object with varint', function ()
    {
        const expected: Message1 = { a: 150 };
        var buffer = Buffer.concat(parserWrite(message1, expected, expected));
        assert.deepStrictEqual(Buffer.from([0x08, 0x96, 0x01]), buffer);
        assert.deepStrictEqual(expected, message1.read(buffer, new Cursor(), {}));
    })
    it('should parse object with repeatable varint', function ()
    {
        const expected: Message4 = { d: [3, 270, 86942] };
        debugger;
        var buffer = Buffer.concat(parserWrite(message, expected, expected));
        assert.deepStrictEqual(buffer, Buffer.from([0x22,
            0x06,
            0x03,
            0x8E, 0x02,
            0x9E, 0xA7, 0x05
        ]));
        assert.deepStrictEqual(expected, message.read(buffer, new Cursor(), {}));
    })
    it('should parse object with string', function ()
    {
        const expected = { b: 'testing' };
        var buffer = Buffer.concat(parserWrite(message, expected, expected));
        assert.deepStrictEqual(Buffer.from([0x12, 0x07, 0x74, 0x65, 0x73, 0x74, 0x69, 0x6e, 0x67]), buffer);
        assert.deepStrictEqual(expected, message.read(buffer, new Cursor(), {}));
    })
    it('should parse nested object', function ()
    {
        const expected = { c: { a: 150 } };
        var buffer = Buffer.concat(parserWrite(message, expected, expected));
        assert.deepStrictEqual(Buffer.from([0x1a, 0x03, 0x08, 0x96, 0x01]), buffer);
        assert.deepStrictEqual(expected, message.read(buffer, new Cursor(), {}));
    })
})