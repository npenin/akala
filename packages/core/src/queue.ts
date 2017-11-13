import * as fs from 'fs';

export class Queue<T>
{
    private filePath: string;
    private pending: T[];
    constructor(private handler: (message: T, next: (processed: boolean) => void) => void, queue?: T[] | string)
    {

        if (typeof (queue) == 'string')
        {
            this.filePath = queue;
            queue = JSON.parse(fs.readFileSync(queue, 'utf8'));
        }
        this.pending = queue as T[] || [];
    }

    public enqueue(message: T)
    {
        this.pending.push(message);
        this.save();
        this.process();
    };

    public save()
    {
        if (this.filePath)
            fs.writeFile(this.filePath, JSON.stringify(this.pending), function (err)
            {
                if (err)
                    console.error(err);
            });

    }

    private processing: boolean = false;
    private current: T;

    public process()
    {
        if (this.processing)
            return;
        this.processing = true;
        var message = this.pending.shift();
        this.current = message;
        if (!message)
            return this.processing = false;
        this.handler(message, (processed) =>
        {
            if (processed === false)
            {
                this.enqueue(message);
            }
            this.save();
            this.processing = false;
            if (processed !== false)
                process.nextTick(this.process.bind(this));
        });
    };
}