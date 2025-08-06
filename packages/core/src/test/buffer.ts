import { describe, it } from 'node:test'
import { IsomorphicBuffer } from '../helpers.js';
import assert from 'node:assert/strict'

describe('buffer should handle all functions', () =>
{
    ([
        // IsomorphicBuffer.prototype.readBigInt64BE, IsomorphicBuffer.prototype.readBigInt64LE,
        // IsomorphicBuffer.prototype.readBigUInt64BE, IsomorphicBuffer.prototype.readBigUInt64LE,
        'Double',
        'Float',
        'Int16',
        'Int32',
        'Int8',
        'UInt16',
        'UInt32',
        'UInt8',
    ] as ('Double' | 'Float' | 'Int16' |
        'Int32' |
        'Int8' |
        'UInt16' |
        'UInt32' |
        'UInt8')[]).forEach(f =>
        {
            const endianess = [];
            if (f.endsWith('8'))
                endianess.push('');
            else
                endianess.push('BE', 'LE')

            endianess.forEach(endianess =>
            {
                it('should handle ' + f + endianess, () =>
                {
                    const buffer = Buffer.from('The red dog jumps over the lazy fox');
                    const isobuffer = IsomorphicBuffer.fromBuffer(buffer);
                    let byteLength: number;
                    switch (f)
                    {
                        case 'Double':
                            byteLength = 8;
                            break;
                        case 'Int32':
                        case 'UInt32':
                        case 'Float':
                            byteLength = 4;
                            break;
                        case 'Int16':
                        case 'UInt16':
                            byteLength = 2;
                            break;
                        case 'Int8':
                        case 'UInt8':
                            byteLength = 1
                            break;
                    }

                    const res = isobuffer['read' + f + endianess](0);
                    assert.equal(res, buffer['read' + f + endianess](0));
                    const res2 = isobuffer['read' + f + endianess](isobuffer.length - byteLength);
                    assert.equal(res2, buffer['read' + f + endianess](buffer.length - byteLength));
                })
            });
        })
});
