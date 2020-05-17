import { Transform, TransformCallback } from "stream";

export class NewLinePrefixer extends Transform
{
    constructor(private prefix: string)
    {
        super();
        this.setDefaultEncoding('utf8');
        this.setEncoding('utf8');
    }

    private blankNewLine = true;

    _transform(chunk: any, encoding: BufferEncoding | 'buffer', callback: TransformCallback): void
    {
        if (Buffer.isBuffer(chunk))
        {
            if (encoding == 'buffer')
                encoding = 'utf8';
            chunk = chunk.toString(encoding || 'utf8');
        }

        if (typeof chunk != 'string')
            throw new Error(`Unsupported chunk type ${typeof chunk}`)

        if (this.blankNewLine)
            chunk = this.prefix + chunk;

        this.blankNewLine = /\n$/.test(chunk);

        callback(null, chunk.replace(/\n([^$])/g, `\n${this.prefix}$1`))

    }
}