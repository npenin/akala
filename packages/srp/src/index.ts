import param, { type PredefinedSrpParams, type SrpParams } from "./params.js";

/**
 * Assert a value to be true, or throw error with optional message
 * @param {Boolean} val
 * @param {String} msg
 */
function assert_(val: any, msg?: string): asserts val
{
    if (!val)
        throw new Error(msg || 'assertion');
}

/**
 * Convert a Buffer to a BigInt
 * @param {Buffer} buf
 * @return {BigInt}
 */
export function bufferToBigInt(buf: Uint8Array | ArrayBuffer): bigint
{
    assertIsBuffer(buf);
    return BigInt('0x' + Buffer.from(buf).toString('hex'));
}

/**
 * Calculates a % b, the sane way
 * Modulo in JavaScript: -27 % 7 => -6
 * Modulo in everything else: -27 % 7 => 1
 * @param {BigInt} a
 * @param {BigInt} b
 * @return {BigInt}
 */
function mod(a: bigint, b: bigint)
{
    let result = a % b;
    if (result < 0n)
        result += b;
    return result;
}

/**
 * Calculates b^e % m efficiently
 * https://en.wikipedia.org/wiki/Modular_exponentiation#Right-to-left_binary_method
 * @param {BigInt} b Base
 * @param {BigInt} e Exponent
 * @param {BigInt} m Modulo
 * @return {BigInt}
 */
function powm(b: bigint, e: bigint, m: bigint): bigint
{
    if (m === 1n)
        return 0n;
    let result = 1n;
    b = mod(b, m);
    while (e > 0)
    {
        if (e % 2n === 1n) result = result * b % m;
        e = e >> 1n;
        b = b ** 2n % m;
    }
    return result;
}

/**
 * Convert a BigInt to a Buffer
 * @param {BigInt} n
 * @return {Buffer}
 */
export function bigIntToBuffer(n: bigint): Buffer
{
    assertIsBigInt(n);
    let hex = n.toString(16);
    if (hex.length % 2)
        hex = '0' + hex;
    return Buffer.from(hex, 'hex');
}

/**
 * Pad a buffer to a length
 * Original comment:
 * If a conversion is explicitly specified with the operator PAD(),
 * the integer will first be implicitly converted, then the resultant
 * byte-string will be left-padded with zeros (if necessary) until its
 * length equals the implicitly-converted length of N.
 * @param {Buffer} n Buffer to pad
 * @param {Number} len Desired length of result
 * @return {Buffer}
 */
function padTo(n: Buffer, len: number): Uint8Array<ArrayBuffer>
{
    assertIsBuffer(n, 'n');
    let padding = len - n.length;
    assert_(padding > -1, 'Negative padding.  Very uncomfortable.');
    let result = Buffer.alloc(len);
    result.fill(0, 0, padding);
    n.copy(result, padding);
    assert_(result.length == len);
    return result;
}

/**
 * Pad the SRP N value
 * @param {BigInt} number Number to pad
 * @param {Object} params SRP parameters
 * @return {Buffer}
 */
function padToN(number: bigint, params: SrpParams)
{
    assertIsBigInt(number);
    return padTo(bigIntToBuffer(number), params.N_length_bits / 8);
}

/* never used?
function padToH(number, params) {
  assertIsBigInt(number);
  let hashlen_bits;
  if (params.hash === 'sha1')
    {hashlen_bits = 160;}
  else if (params.hash === 'sha256')
    {hashlen_bits = 256;}
  else if (params.hash === 'sha512')
    {hashlen_bits = 512;}
  else
    {throw Error('cannot determine length of hash \''+params.hash+'\'');}

  return padTo(number.toBuffer(), hashlen_bits / 8);
}
*/

/**
 * Assert the argument to be a Buffer
 * @param {*} arg
 * @param {String} argName Original name of argument
 */
function assertIsBuffer(arg: any, argName?: string): asserts arg is Uint8Array
{
    argName = argName || 'arg';
    assert_(arg instanceof Uint8Array, argName + ' must be a Uint8Array');
}

/**
 * Assert the argument to be a Buffer with a valid SRP N value
 * @param {*} arg
 * @param {SrpParams} params SRP params
 * @param {String} argName Original name of argument
 */
function assertIsNBuffer(arg: any, params: SrpParams, argName?: string)
{
    argName = argName || 'arg';
    assert_(Buffer.isBuffer(arg), 'Type error: ' + argName + ' must be a Uint8Array');
    if (arg.length != params.N_length_bits / 8)
    {
        assert_(false, `${argName} was ${arg.length}, expected ${params.N_length_bits / 8}`);
    }
}

/**
 * Assert the argument to be a BigInt
 * @param {*} arg
 */
function assertIsBigInt(arg: any): asserts arg is bigint
{
    assert_(typeof arg === 'bigint');
}

function mergeUInt8Arrays(sources: (ArrayBuffer | BufferSource | Uint8Array)[]): Uint8Array<ArrayBuffer>
{
    // Calculate total length
    const totalLength = sources.reduce((sum, source) =>
    {
        if (source instanceof Uint8Array)
            return sum + source.length;
        if (ArrayBuffer.isView(source))
            return sum + source.byteLength;
        if (source instanceof ArrayBuffer)
            return sum + source.byteLength;
        throw new TypeError('Unsupported source type');
    }, 0);

    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const source of sources)
    {
        let arr: Uint8Array;
        if (source instanceof Uint8Array)
            arr = source;
        else if (ArrayBuffer.isView(source))
            arr = new Uint8Array(source.buffer, source.byteOffset, source.byteLength);
        else if (source instanceof ArrayBuffer)
            arr = new Uint8Array(source);
        else
            throw new TypeError('Unsupported source type');
        result.set(arr, offset);
        offset += arr.length;
    }
    return result;
}

/**
 * compute the intermediate value x as a hash of three buffers:
 * salt, identity, and password.  And a colon.  FOUR buffers.
 *      x = H(s | H(I | ":" | P))
 * @param {Object} params SRP parameters
 * @param {Buffer} salt Salt
 * @param {Buffer} I User identity
 * @param {Buffer} P User password
 * @return {BigInt} User secret
 */
async function getx(params: SrpParams, salt: Uint8Array, I: Uint8Array, P: Uint8Array)
{
    assertIsBuffer(salt, 'salt (salt)');
    assertIsBuffer(I, 'identity (I)');
    assertIsBuffer(P, 'password (P)');
    let hashIP = await crypto.subtle.digest(params.hash, mergeUInt8Arrays([I, new Uint8Array([':'.charCodeAt(0)]), P]))

    let hashX = await crypto.subtle.digest(params.hash, mergeUInt8Arrays([salt, hashIP]));
    return bufferToBigInt(new Uint8Array(hashX));
}

/**
 * The verifier is calculated as described in Section 3 of [SRP-RFC].
 * We give the algorithm here for convenience.
 *
 * The verifier (v) is computed based on the salt (s), user name (I),
 * password (P), and group parameters (N, g).
 *
 *         x = H(s | H(I | ":" | P))
 *         v = g^x % N
 *
 * @param {Object} params SRP parameters
 * @param {Buffer} salt Salt
 * @param {Buffer} I User identity
 * @param {Buffer} P User password
 * @return {Buffer}
 */
export async function computeVerifier(params: SrpParams, salt: Uint8Array, I: Uint8Array, P: Uint8Array): Promise<Uint8Array>
{
    assertIsBuffer(salt, 'salt (salt)');
    assertIsBuffer(I, 'identity (I)');
    assertIsBuffer(P, 'password (P)');
    let vNum = powm(params.g, await getx(params, salt, I, P), params.N);
    return padToN(vNum, params);
}

/**
 * calculate the SRP-6 multiplier
 * @param {SrpParams} params SRP parameters
 * @return {bigint}
 */
async function getk(params: SrpParams): Promise<bigint>
{
    let kBuf = await crypto.subtle.digest(params.hash, mergeUInt8Arrays([
        padToN(params.N, params),
        padToN(params.g, params)
    ]));
    return bufferToBigInt(new Uint8Array(kBuf));
}

/**
 * Generate a random key
 * @param {number} bytes Length of key
 * @return {Uint8Array}
 */
export function genKey(bytes: number = 32): Uint8Array
{
    const buffer = new Uint8Array(bytes);
    return crypto.getRandomValues(buffer);
}

/**
 * The server key exchange message also contains the server's public
 * value (B).  The server calculates this value as B = k*v + g^b % N,
 * where b is a random number that SHOULD be at least 256 bits in length
 * and k = H(N | PAD(g)).
 *
 * Note: as the tests imply, the entire expression is mod N.
 *
 * @param {Object} params SRP parameters
 * @param {BigInt} k SRP multiplier (k)
 * @param {BigInt} v SRP verifier
 * @param {BigInt} b Server secret exponent (b)
 * @return {Buffer} Server public message (B)
 */
function getB(params: SrpParams, k: bigint, v: bigint, b: bigint): Uint8Array
{
    assertIsBigInt(v);
    assertIsBigInt(k);
    assertIsBigInt(b);
    let N = params.N;
    let r = (k * v + powm(params.g, b, N)) % N;
    return padToN(r, params);
}

/**
 * The client key exchange message carries the client's public value
 * (A).  The client calculates this value as A = g^a % N, where a is a
 * random number that SHOULD be at least 256 bits in length.
 *
 * Note: for this implementation, we take that to mean 256/8 bytes.
 *
 * @param {Object} params SRP parameters
 * @param {BigInt} aNum Client secret component (a)
 * @return {BigInt} Client public component (A)
 */
function getA(params: SrpParams, aNum: bigint): Uint8Array
{
    assertIsBigInt(aNum);
    /* we haven't implemented bitLengtha
    if (Math.ceil(aNum.bitLength() / 8) < 256 / 8) {
      console.warn('getA: client key length', aNum.bitLength(), 'is less than the recommended 256');
    }
    */
    return padToN(powm(params.g, aNum, params.N), params);
}

/**
 * getu() hashes the two public messages together, to obtain a scrambling
 * parameter "u" which cannot be predicted by either party ahead of time.
 * This makes it safe to use the message ordering defined in the SRP-6a
 * paper, in which the server reveals their "B" value before the client
 * commits to their "A" value.
 *
 * @param {Object} params SRP parameters
 * @param {Buffer} A Client ephemeral public key (A)
 * @param {Buffer} B Server ephemeral public key (B)
 * @return {BigInt} Shared scrambling parameter (u)
 */
async function getu(params: SrpParams, A: any, B: any)
{
    assertIsNBuffer(A, params, 'A');
    assertIsNBuffer(B, params, 'B');
    let uBuf = await crypto.subtle.digest(params.hash, mergeUInt8Arrays([A, B]));
    return bufferToBigInt(uBuf);
}

/**
 * The TLS premaster secret as calculated by the client
 * @param {Object} params SRP parameters
 * @param {Buffer} kNum SRP multiplier (k)
 * @param {Buffer} xNum User secret (calculated from I, P, and salt) (x)
 * @param {Buffer} aNum Client ephemeral private key (a)
 * @param {BigInt} BNum Server ephemeral public key, obtained from server (B)
 * @param {BigInt} uNum SRP scrambling parameter (u)
 * @return {Buffer}
 */
function clientGetS(params: SrpParams, kNum: bigint, xNum: bigint, aNum: bigint, BNum: bigint, uNum: bigint)
{
    assertIsBigInt(kNum);
    assertIsBigInt(xNum);
    assertIsBigInt(aNum);
    assertIsBigInt(BNum);
    assertIsBigInt(uNum);
    let g = params.g;
    let N = params.N;
    if (BNum <= 0 || N <= BNum)
    {
        throw new Error('invalid server-supplied \'B\', must be 1..N-1');
    }
    let SNum = powm(BNum - kNum * powm(g, xNum, N), aNum + uNum * xNum, N) % N;
    return padToN(SNum, params);
}

/**
 * The TLS premastersecret as calculated by the server
 * @param {Object} params SRP parameters
 * @param {BigInt} vNum Verifier (v)
 * @param {BigInt} ANum Client ephemeral public key (A)
 * @param {BigInt} bNum Server ephemeral private key (b)
 * @param {BigInt} uNum SRP scrambling parameter (u)
 * @return {Buffer}
 * params:
 *         params (obj)     group parameters, with .N, .g, .hash
 *         v (bignum)       verifier (stored on server)
 *         A (bignum)       ephemeral client public key (read from client)
 *         b (bignum)       server ephemeral private key (generated for session)
 *
 * returns: bignum
 */
function serverGetS(params: SrpParams, vNum: bigint, ANum: bigint, bNum: bigint, uNum: bigint)
{
    assertIsBigInt(vNum);
    assertIsBigInt(ANum);
    assertIsBigInt(bNum);
    assertIsBigInt(uNum);
    let N = params.N;
    if (ANum <= 0n || N <= ANum)
    {
        throw new Error('invalid client-supplied \'A\', must be 1..N-1');
    }
    let SNum = powm(ANum * powm(vNum, uNum, N), bNum, N) % N;
    return padToN(SNum, params);
}

/**
 * Compute the shared session key K from S
 *
 * @param {Object} params SRP parameters
 * @param {Buffer} SBuf SRP session key (S)
 * @return {Buffer} SRP strong session key (K)
 */
async function getK(params: SrpParams, SBuf: Uint8Array<ArrayBuffer>)
{
    assertIsNBuffer(SBuf, params, 'S');
    return new Uint8Array(await crypto.subtle.digest(params.hash, SBuf))
}

/**
 * Compute the M1 verification parameter (sent to server)
 * @param {Object} params SRP parameters
 * @param {Buffer} ABuf Client ephemeral public key (A)
 * @param {Buffer} BBuf Server ephemeral public key (B)
 * @param {Buffer} SBuf Shared session key (S)
 * @return {Buffer}
 */
async function getM1(params: SrpParams, ABuf: Uint8Array, BBuf: Uint8Array, SBuf: Uint8Array)
{
    assertIsNBuffer(ABuf, params, 'A');
    assertIsNBuffer(BBuf, params, 'B');
    assertIsNBuffer(SBuf, params, 'S');
    return new Uint8Array(await crypto.subtle.digest(params.hash, mergeUInt8Arrays([ABuf, BBuf, SBuf])));
}

/**
 * Compute the M2 verification parameter (sent to client)
 * @param {Object} params SRP parameters
 * @param {Buffer} ABuf Client ephemeral public key (A)
 * @param {Buffer} MBuf M1 verification parameter (M1)
 * @param {Buffer} KBuf Strong shared session key (K)
 * @return {Buffer}
 */
async function getM2(params: SrpParams, ABuf: Uint8Array, MBuf: Uint8Array, KBuf: Uint8Array)
{
    assertIsNBuffer(ABuf, params, 'A');
    assertIsBuffer(MBuf, 'M');
    assertIsBuffer(KBuf, 'K');
    return new Uint8Array(await crypto.subtle.digest(params.hash, mergeUInt8Arrays([ABuf, MBuf, KBuf])));
}

/**
 * Constant-time buffer equality checking
 * @param {Buffer} buf1
 * @param {Buffer} buf2
 * @return {Boolean}
 */
function equal(buf1: Uint8Array, buf2: Uint8Array): boolean
{
    let mismatch = buf1.length - buf2.length;
    if (mismatch) return false;
    for (let i = 0; i < buf1.length; i++)
    {
        if (buf1[i] ^ buf2[i])
            return false;
    }
    return true;
}

/** Represents an SRP client */
export class Client
{
    public static async createVerifier(key: PredefinedSrpParams, identity: string, password: string)
    {
        const encoder = new TextEncoder();
        const salt = genKey();
        return computeVerifier(param[key], salt, encoder.encode(identity), encoder.encode(password));
    }

    public static login(key: PredefinedSrpParams, salt: Uint8Array, identity: string, password: string)
    {
        const encoder = new TextEncoder();
        return Client.create(param[key], salt, encoder.encode(identity), encoder.encode(password), genKey())
    }

    public static async create(params: SrpParams, saltBuf: Uint8Array, identityBuf: Uint8Array, passwordBuf: Uint8Array, secret1Buf: Uint8Array)
    {
        assertIsBuffer(saltBuf, 'salt (salt)');
        assertIsBuffer(identityBuf, 'identity (I)');
        assertIsBuffer(passwordBuf, 'password (P)');
        assertIsBuffer(secret1Buf, 'secret1');
        const a_num = bufferToBigInt(secret1Buf);
        return new Client(
            {
                params: params,
                k_num: await getk(params),
                x_num: await getx(params, saltBuf, identityBuf, passwordBuf),
                a_num,
                A_buf: getA(params, a_num)
            });
    }

    /**
     * The constructor
     */
    private constructor(private _private: {
        params: SrpParams,
        k_num: bigint,
        x_num: bigint,
        a_num: bigint
        A_buf: Uint8Array
        K_buf?: Uint8Array,
        M1_buf?: Uint8Array,
        M2_buf?: Uint8Array,
        S_buf?: Uint8Array,
        u_num?: bigint
    })
    {
    }
    /**
     * Compute the client ephemeral public key (A)
     * @return {Buffer}
     */
    computeA(): Uint8Array
    {
        return this._private.A_buf;
    }
    /**
     * Set the B value obtained from the server
     * @param {Buffer} BBuf Server ephemeral public key (B)
     */
    async setB(BBuf: Uint8Array)
    {
        let p = this._private;
        let BNum = bufferToBigInt(BBuf);
        let uNum = await getu(p.params, p.A_buf, BBuf);
        let SBuf = clientGetS(p.params, p.k_num, p.x_num, p.a_num, BNum, uNum);
        p.K_buf = await getK(p.params, SBuf);
        p.M1_buf = await getM1(p.params, p.A_buf, BBuf, SBuf);
        p.M2_buf = await getM2(p.params, p.A_buf, p.M1_buf, p.K_buf);
        p.u_num = uNum; // only for tests
        p.S_buf = SBuf; // only for tests
    }
    /**
     * Compute the M1 verification value
     * @return {Buffer}
     */
    computeM1()
    {
        if (this._private.M1_buf === undefined)
        {
            throw new Error('incomplete protocol');
        }
        return this._private.M1_buf;
    }
    /**
     * Verify server M2 verification value. Throws if incorrect
     * @param {Buffer} serverM2Buf
     */
    checkM2(serverM2Buf: Uint8Array)
    {
        if (!equal(this._private.M2_buf, serverM2Buf))
        {
            throw new Error('server is not authentic');
        }
    }
    /**
     * Compute the shared session key (K)
     * @return {Buffer}
     */
    computeK()
    {
        if (this._private.K_buf === undefined)
        {
            throw new Error('incomplete protocol');
        }
        return this._private.K_buf;
    }
}

/** Represents a server */
export class Server
{
    public static async fromClient(key: PredefinedSrpParams, thumbprint: Uint8Array)
    {
        return this.create(param[key], thumbprint, genKey());
    }

    public static async create(params: SrpParams, verifierBuf: Uint8Array, secret2Buf: Uint8Array)
    {
        assertIsBuffer(verifierBuf, 'verifier');
        assertIsBuffer(secret2Buf, 'secret2');
        const k = await getk(params);
        const b = bufferToBigInt(secret2Buf)
        const v = bufferToBigInt(verifierBuf)
        return new Server({
            params: params,
            k_num: k,
            b_num: b,
            v_num: v,
            B_buf: getB(params, k, v, b)
        });
    }

    /**
     * The constructor
     */
    private constructor(private _private: {
        params: SrpParams,
        k_num: bigint,
        b_num: bigint
        v_num: bigint
        B_buf: Uint8Array
        K_buf?: Uint8Array,
        M1_buf?: Uint8Array,
        M2_buf?: Uint8Array,
        S_buf?: Uint8Array,
        u_num?: bigint
    })
    {
    }

    /**
     * Compute the server ephemeral public key (B)
     * @return {Buffer}
     */
    computeB(): Uint8Array
    {
        return this._private.B_buf;
    }
    /**
     * Set the A value received from the client
     * @param {Buffer} ABuf Client ephemeral public key (A)
     */
    async setA(ABuf: Uint8Array)
    {
        let p = this._private;
        let ANum = bufferToBigInt(ABuf);
        let uNum = await getu(p.params, ABuf, p.B_buf);
        let SBuf = serverGetS(p.params, p.v_num, ANum, p.b_num, uNum);
        p.K_buf = await getK(p.params, SBuf);
        p.M1_buf = await getM1(p.params, ABuf, p.B_buf, SBuf);
        p.M2_buf = await getM2(p.params, ABuf, p.M1_buf, p.K_buf);
        p.u_num = uNum; // only for tests
        p.S_buf = SBuf; // only for tests
    }
    /**
     * Verify M1 verification value. Throws if incorrect
     * @param {Buffer} clientM1Buf
     * @return {Buffer} Server M2 verification value
     */
    checkM1(clientM1Buf: Uint8Array)
    {
        if (typeof this._private.M1_buf === 'undefined')
            throw new Error('incomplete protocol');
        if (!equal(this._private.M1_buf, clientM1Buf))
            throw new Error('client did not use the same password');
        return this._private.M2_buf;
    }
    /**
     * Compute the shared session key (K)
     * @return {Buffer}
     */
    computeK()
    {
        if (this._private.K_buf === undefined)
        {
            throw new Error('incomplete protocol');
        }
        return this._private.K_buf;
    }
}

export { param, type SrpParams } from './params.js'
