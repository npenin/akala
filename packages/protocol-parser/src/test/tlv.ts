import assert from "assert";
import { parsers, tlv } from "../index.js"
import { Cursor, parserWrite } from "../parsers/_common.js"

const tlv8 = tlv(parsers.uint8, 0xFF, 'utf8');

type PairMessage = {
    method: PairMethod;
    username: string;
    salt: Buffer;
    publicKey: Buffer;
    passwordProof: Buffer;
    encryptedData: Buffer;
    state: PairState;
    error: PairErrorCode;
    retryDelay: number;
    certificate: Buffer;
    signature: Buffer;
    permissions: Buffer;
    fragmentData: Buffer;
    fragmentLast: Buffer;
}

enum PairMethod
{
    Setup = 0x0,
    SetupWithAuth = 0x1,
    PairVerify = 0x2,
    AddPairing = 0x3,
    RemovePairing = 0x4,
    ListPairings = 0x5
}
enum PairState
{
    M1 = 0x01,
    M2 = 0x02,
    M3 = 0x03,
    M4 = 0x04,
    M5 = 0x05,
    M6 = 0x06
}
enum PairErrorCode
{

}

const pairMessage = tlv8.objectByName<Partial<PairMessage>>({
    method: { index: 0, parser: tlv8.number },
    username: { index: 1, parser: tlv8.string },
    salt: { index: 2, parser: tlv8.buffer },
    publicKey: { index: 3, parser: tlv8.buffer },
    passwordProof: { index: 4, parser: tlv8.buffer },
    encryptedData: { index: 5, parser: tlv8.buffer },
    state: { index: 6, parser: tlv8.number },
    error: { index: 7, parser: tlv8.number },
    retryDelay: { index: 8, parser: tlv8.number },
    certificate: { index: 9, parser: tlv8.number },
    signature: { index: 10, parser: tlv8.number },
    permissions: { index: 11, parser: tlv8.number },
    fragmentData: { index: 12, parser: tlv8.number },
    fragmentLast: { index: 13, parser: tlv8.number },
});

describe('tlv', function ()
{

    it('should encode properly', function ()
    {
        const actual = Buffer.concat(pairMessage.write({
            state: PairState.M1,
            method: PairMethod.Setup,
        }));

        const expected = encode(pairMessage.mapByName.state.index, PairState.M1, pairMessage.mapByName.method.index, PairMethod.Setup)
        assert.deepStrictEqual(expected, actual);
    })

    it('should decode properly', function ()
    {
        const expected = {
            state: PairState.M1,
            method: PairMethod.Setup,
        };

        const actual = pairMessage.read(Buffer.concat(pairMessage.write(expected)), new Cursor());

        assert.deepStrictEqual(expected, actual);
    })
})

type TLVEncodable = Buffer | number | string;

function encode(type: number, data: TLVEncodable | TLVEncodable[], ...args: any[]): Buffer
{
    const encodedTLVBuffers: Buffer[] = [];

    // coerce data to Buffer if needed
    if (typeof data === "number")
    {
        data = Buffer.from([data]);
    } else if (typeof data === "string")
    {
        data = Buffer.from(data);
    }

    if (Array.isArray(data))
    {
        let first = true;
        for (const entry of data)
        {
            if (!first)
            {
                encodedTLVBuffers.push(Buffer.from([0, 0])); // push delimiter
            }

            first = false;
            encodedTLVBuffers.push(encode(type, entry));
        }

        if (first)
        { // we have a zero length array!
            encodedTLVBuffers.push(Buffer.from([type, 0]));
        }
    } else if (data.length <= 255)
    {
        encodedTLVBuffers.push(Buffer.concat([Buffer.from([type, data.length]), data]));
    } else
    { // otherwise it doesn't fit into one tlv entry, thus we push multiple
        let leftBytes = data.length;
        let currentIndex = 0;

        for (; leftBytes > 0;)
        {
            if (leftBytes >= 255)
            {
                encodedTLVBuffers.push(Buffer.concat([Buffer.from([type, 0xFF]), data.slice(currentIndex, currentIndex + 255)]));
                leftBytes -= 255;
                currentIndex += 255;
            } else
            {
                encodedTLVBuffers.push(Buffer.concat([Buffer.from([type, leftBytes]), data.slice(currentIndex)]));
                leftBytes -= leftBytes;
            }
        }
    }

    // do we have more arguments to encode?
    if (args.length >= 2)
    {

        // chop off the first two arguments which we already processed, and process the rest recursively
        const [nextType, nextData, ...nextArgs] = args;
        const remainingTLVBuffer = encode(nextType, nextData, ...nextArgs);

        // append the remaining encoded arguments directly to the buffer
        encodedTLVBuffers.push(remainingTLVBuffer);
    }

    return Buffer.concat(encodedTLVBuffers);
}