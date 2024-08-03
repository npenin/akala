import * as fs from 'fs';
import * as core from '@akala/core'

export class Queue<T> extends core.Queue<T>
{
    private filePath: string;

    constructor(handler: (message: T, next: (processed: boolean) => void) => void, queue?: T[] | string)
    {
        if (typeof (queue) == 'string')
        {
            const queueObj = JSON.parse(fs.readFileSync(queue, 'utf8'));
            super(handler, queueObj);
            this.filePath = queue;
        }
        else
            super(handler, queue);
    }

    public save(): Promise<void> | void
    {
        if (this.filePath)
            return fs.promises.writeFile(this.filePath, JSON.stringify(this.pending)).catch(function (err)
            {
                console.error(err);
                throw err;
            });
        return super.save(true)
    }
}