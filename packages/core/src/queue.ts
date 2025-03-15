/**
 * A generic queue class for processing messages with handler functions
 * @template T - Type of messages stored in the queue
 */
export class Queue<T>
{
    protected pending: T[];
    /**
     * Creates a Queue instance
     * @param handler - The function to handle queue messages. Receives message and next callback.
     * @param queue - Optional initial array of messages (default empty array)
     */
    constructor(private handler: (message: T, next: (processed: boolean) => void) => void, queue?: T[])
    {
        this.pending = queue || [];
    }

    /**
     * Adds a message to the queue and triggers processing
     * @param message - The message to add to the queue
     */
    public enqueue(message: T)
    {
        this.pending.push(message);
        this.save();
        this.process();
    }

    /**
     * Placeholder method for queue persistence (to be implemented)
     * @param _throw - If true, throws error to indicate not implemented
     * @throws {Error} When _throw is true
     */
    public save(_throw?: boolean)
    {
        if (_throw)
            throw new Error('You need to define where and how to save the queue.');
    }

    /** @private Flag indicating if queue is currently processing */
    private processing = false;

    /** @private Currently processed message */
    //eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore 6133
    private current: T;

    /**
     * Starts processing messages in the queue
     * @private
     */
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
