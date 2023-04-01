export class Queue<T>
{
    protected pending: T[];
    constructor(private handler: (message: T, next: (processed: boolean) => void) => void, queue?: T[])
    {
        this.pending = queue || [];
    }

    public enqueue(message: T)
    {
        this.pending.push(message);
        this.save();
        this.process();
    }

    public save(_throw?: boolean)
    {
        if (_throw)
            throw new Error('You need to define where and how to save the queue.');
    }

    private processing = false;
    //eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore 6133
    private current: T;

    public process()
    {
        if (this.processing)
            return;
        this.processing = true;
        const message = this.pending.shift();
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
    }
}