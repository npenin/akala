import { NotSupportedException } from './exceptions'

export class StringBuilder
{
    clear()
    {
        this.chunks.length = 0
    }
    constructor(init?: string)
    {
        this.chunks.push(init);
    }

    private chunks: string[] = [];
    private renderedString: string;
    public get length() { return this.chunks.reduce((prev, current) => { return prev + current.length }, 0); }
    public set length(value: number)
    {
        if (value == 0)
            this.clear();
        else
        {
            throw new NotSupportedException();
        }
    }
    public append(s: string): this
    public append(date: Date): this
    public append(number: number): this
    public append(format: TemplateStringsArray, ...rest: string[]): this
    public append(format: string | Date | number | TemplateStringsArray, ...rest: string[]): this
    public append(format: string | Date | number | TemplateStringsArray, ...rest: string[]): this
    {
        this.renderedString = null;
        switch (typeof format)
        {
            case 'string':
                this.chunks.push(format);
                break;
            case 'object':
                if (format instanceof Date)
                    this.append(format.toISOString());
                else
                    this.chunks.push(String.raw(format, ...rest));
                break;
            default:
                this.chunks.push(format.toString());
                break;
            case 'undefined':
                break;
        }
        return this;
    }

    public appendLine(): this
    public appendLine(s: string): this
    public appendLine(date: Date): this
    public appendLine(number: number): this
    public appendLine(format: TemplateStringsArray, ...rest: string[]): this
    public appendLine(format?: string | Date | number | TemplateStringsArray, ...rest: string[]): this
    {
        this.append(format, ...rest);
        this.append('\n');
        return this;
    }

    public get(offset: number, length: number = 1)
    {
        var index = this.chunkAt(offset);
        if (~index)
        {
            return this.chunks[index[0]].substr(index[1], length);
        }
        throw new NotSupportedException();
    }

    private chunkAt(offset: number): [number, number]
    {
        var index = 0;
        for (var i = 0; i < this.chunks.length; i++)
        {
            if (this.chunks[i].length + index > offset)
                return [i, index];
            index += this.chunks[i].length;
        }
        return [-1, 0];
    }

    public remove(offset: number, length: number = 1)
    {
        this.renderedString = null;
        var index = this.chunkAt(offset);
        var chunk = this.chunks[index[0]];
        this.chunks[index[0]] = chunk.substr(0, index[1]);
        if (index[1] + length < chunk.length)
            this.chunks.splice(index[0] + 1, 0, chunk.substr(index[1] + length));
        return this;
    }

    public insert(offset: number, content: string)
    {
        this.renderedString = null;
        var index = this.chunkAt(offset);
        var chunk = this.chunks[index[0]];
        this.chunks[index[0]] = chunk.substr(0, index[1]);
        this.chunks.splice(index[0] + 1, 0, content);
        if (index[1] + length < chunk.length)
            this.chunks.splice(index[0] + 2, 0, chunk.substr(index[1] + length));
        return this;
    }

    public toString()
    {
        if (this.renderedString)
            return this.renderedString;
        return this.renderedString = this.chunks.join('');
    }
}