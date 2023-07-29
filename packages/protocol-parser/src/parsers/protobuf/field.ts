import Uint3 from "../uint3.js";
import Uint5 from "../uint5.js";
import { Cursor, Parser } from "../_common.js";

export type WireType = 'varint' | '64-bit' | 'length-delimited' | 'start-group' | 'end-group' | '32-bit';

export class Field implements Parser<{ fieldId: number; type: WireType; }>
{
    length: 1 = 1;
    read(buffer: Buffer, cursor: Cursor): { fieldId: number; type: WireType; }
    {
        var wireType = Uint3.prototype.read(buffer, cursor);
        var fieldId = Uint5.prototype.read(buffer, cursor);
        var wireTypeString: WireType;
        switch (wireType)
        {
            case 0:
                wireTypeString = 'varint';
                break;
            case 1:
                wireTypeString = '64-bit';
                break;
            case 2:
                wireTypeString = 'length-delimited';
                break;
            case 3:
                wireTypeString = 'start-group';
                break;
            case 4:
                wireTypeString = 'end-group';
                break;
            case 5:
                wireTypeString = '32-bit';
                break;

        }
        return { fieldId, type: wireTypeString };

    }
    write(buffer: Buffer, cursor: Cursor, value: { fieldId: number; type: WireType; }): void
    {
        switch (value.type)
        {
            case 'varint':
                Uint3.prototype.write(buffer, cursor, 0);
                break;
            case '64-bit':
                Uint3.prototype.write(buffer, cursor, 1);
                break;
            case 'length-delimited':
                Uint3.prototype.write(buffer, cursor, 2);
                break;
            case 'start-group':
                Uint3.prototype.write(buffer, cursor, 3);
                break;
            case 'end-group':
                Uint3.prototype.write(buffer, cursor, 4);
                break;
            case '32-bit':
                Uint3.prototype.write(buffer, cursor, 5);
                break;
            default:
                var x: never = value.type;
                throw new Error('Not supported');
        }
        Uint5.prototype.write(buffer, cursor, value.fieldId);
    }

}
