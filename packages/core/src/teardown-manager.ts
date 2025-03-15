/** 
 * Callback type for teardown subscriptions that returns true when unsubscribed 
 */
export type Subscription = () => boolean

/**
 * Manages cleanup of subscriptions and disposable resources
 */
export class TeardownManager
{
    /**
     * @param subscriptions - Optional initial array of teardown subscriptions
     */
    constructor(subscriptions?: Subscription[])
    {
        if (subscriptions)
            this.subscriptions = subscriptions;
    }

    protected readonly subscriptions: Subscription[] = [];

    /** 
     * Cleans up all registered subscriptions (implements Disposable pattern)
     */
    [Symbol.dispose]()
    {
        this.subscriptions.forEach(s => s());
        this.subscriptions.length = 0;
    }

    /**
     * Registers a teardown subscription or Disposable
     * @typeParam T - Subscription function or Disposable object
     * @param sub - Subscription callback or Disposable object to register
     * @returns The original subscription for chaining
     */
    teardown<T extends Subscription | Disposable | undefined | null>(sub: T): T
    {
        if (!sub)
            return sub;
        if (Symbol.dispose in sub)
        {
            this.subscriptions.push(() =>
            {
                sub[Symbol.dispose]();
                return true;
            });
        }

        else
            this.subscriptions.push(sub);
        return sub;
    }
}
