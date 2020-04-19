import { Transform, TransformCallback } from "stream";

export class NewLinePrefixer extends Transform
{
    constructor(private prefix: string)
    {
        super();
        this.setDefaultEncoding('utf8');
    }

    _transform(chunk: any, encoding: string, callback: TransformCallback): void
    {
        if (Buffer.isBuffer(chunk))
        {
            chunk = chunk.toString(encoding || 'utf8');
        }

        if (typeof chunk != 'string')
            throw new Error(`Unsupported chunk type ${typeof chunk}`)


        callback(null, chunk.replace(/\n/g, `\n${this.prefix}`))

    }
}