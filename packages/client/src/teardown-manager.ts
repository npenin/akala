import { Subscription } from '@akala/core';


export class TeardownManager
{
    constructor(subscriptions?: Subscription[])
    {
        if (subscriptions)
            this.subscriptions = subscriptions;
    }

    protected readonly subscriptions: Subscription[] = [];

    [Symbol.dispose]()
    {
        this.subscriptions.forEach(s => s());
        this.subscriptions.length = 0;
    }

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
