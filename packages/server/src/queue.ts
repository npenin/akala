import * as fs from 'fs';
import * as core from '@akala/core'

export class Queue<T> extends core.Queue<T>
{
    private filePath: string;

    constructor(handler: (message: T, next: (processed: boolean) => void) => void, queue?: T[] | string)
    {
        if (typeof (queue) == 'string')
        {
            var queueObj = JSON.parse(fs.readFileSync(queue, 'utf8'));
            super(handler, queueObj);
            this.filePath = queue;
        }
        else
            super(handler, queue);
    }

    public save()
    {
        if (this.filePath)
            fs.writeFile(this.filePath, JSON.stringify(this.pending), function (err)
            {
                if (err)
                    console.error(err);
            });
    }
}