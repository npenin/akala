import { Transform, TransformCallback } from "stream";

interface Options
{
    useColors?: boolean
}

const colors = [6, 2, 3, 4, 5, 1];

function selectColor(namespace)
{
    let hash = 0;

    for (let i = 0; i < namespace.length; i++)
    {
        hash = ((hash << 5) - hash) + namespace.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
    }

    return colors[Math.abs(hash) % colors.length];
}

export class NewLinePrefixer extends Transform
{
    constructor(private prefix: string, options?: Options)
    {
        super();
        this.setDefaultEncoding('utf8');
        this.setEncoding('utf8');
        if (options?.useColors)
        {
            const c = selectColor(prefix);
            const colorCode = '\u001B[3' + (c < 8 ? c : '8;5;' + c);
            this.prefix = `  ${colorCode};1m${prefix} \u001B[0m`;
        }
    }

    private blankNewLine = true;

    _transform(chunk: string | Buffer, encoding: BufferEncoding | 'buffer', callback: TransformCallback): void
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