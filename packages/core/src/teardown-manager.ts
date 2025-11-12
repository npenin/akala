
/**
 * Checks if an object is a Promise-like instance
 * @template T - The expected resolved value type
 * @param {T | PromiseLike<T>} o - The object to check
 * @returns {boolean} True if the object has a 'then' method, indicating it's Promise-like
 */
export function isPromiseLike<T>(o: T | PromiseLike<T>): o is PromiseLike<T>
{
    return o && o['then'] && typeof (o['then']) == 'function';
}

/** 
 * Callback type for teardown subscriptions that returns true when unsubscribed 
 */
export type Subscription = () => boolean
export type AsyncSubscription = () => Promise<boolean>

export function combineSubscriptions(...subs: (void | undefined | Subscription)[]): Subscription
{
    return () =>
    {
        let unsubscribed = false;

        for (const sub of subs)
        {
            const result = sub && sub();
            unsubscribed ||= result;
        }

        return unsubscribed = true;
    };
}

export function teardown(subscription: Subscription | AsyncSubscription, abort: AbortSignal)
{
    abort.addEventListener('abort', () => subscription());
}

export function combineAsyncSubscriptions(...subs: (void | undefined | Subscription | AsyncSubscription)[]): AsyncSubscription
{
    return async () =>
    {
        let unsubscribed = false;

        for (const sub of subs)
        {
            const result = sub && await sub();
            unsubscribed ||= result;
        }

        return unsubscribed;
    };
}

/**
 * Manages cleanup of subscriptions and disposable resources
 */
export class TeardownManager implements Disposable
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

/**
 * Manages cleanup of subscriptions and disposable resources
 */
export class AsyncTeardownManager implements AsyncDisposable
{
    /**
     * @param subscriptions - Optional initial array of teardown subscriptions
     */
    constructor(subscriptions?: (AsyncSubscription | Subscription)[])
    {
        if (subscriptions)
            this.subscriptions = subscriptions;
    }

    protected readonly subscriptions: (AsyncSubscription | Subscription)[] = [];

    /** 
     * Cleans up all registered subscriptions (implements Disposable pattern)
     */
    async [Symbol.asyncDispose]()
    {
        await Promise.all(this.subscriptions.map(s => s()));
        this.subscriptions.length = 0;
    }

    /** 
     * Cleans up all registered subscriptions (implements Disposable pattern)
     */
    [Symbol.dispose]()
    {
        const subs = this.subscriptions.slice(0);
        this.subscriptions.length = 0;
        subs.map(s => s());
    }

    /**
     * Registers a teardown subscription or Disposable
     * @typeParam T - Subscription function or Disposable object
     * @param sub - Subscription callback or Disposable object to register
     * @returns The original subscription for chaining
     */
    teardown<T extends Promise<AsyncSubscription | AsyncDisposable | Subscription | Disposable | undefined | null> | AsyncSubscription | AsyncDisposable | Subscription | Disposable | undefined | null>(sub: T): T
    {
        if (!sub)
            return sub;

        if (isPromiseLike(sub))
            return sub.then(s => { this.teardown(s); return s; }) as T;


        if (Symbol.dispose in sub)
            this.subscriptions.push(() =>
            {
                sub[Symbol.dispose]();
                return Promise.resolve(true);
            });
        else if (Symbol.asyncDispose in sub)
            this.subscriptions.push(async () =>
            {
                await sub[Symbol.asyncDispose]();
                return true;
            });
        else
            this.subscriptions.push(sub);
        return sub;
    }
}

export class StatefulSubscription implements Disposable
{
    private _unsubscribed: boolean = false;
    constructor(private readonly _unsubscribe: () => void)
    {
    }

    public readonly unsubscribe: Subscription = () =>
    {
        if (this._unsubscribed)
            return false;
        this._unsubscribe()
        return this._unsubscribed = true;
    }

    public get unsubscribed(): boolean
    {
        return this._unsubscribed;
    }

    [Symbol.dispose](): void
    {
        this._unsubscribe();
    }
}

export class StatefulAsyncSubscription implements AsyncDisposable
{
    private _unsubscribed: boolean = false;
    constructor(private readonly _unsubscribe: () => Promise<any>)
    {
    }

    public readonly unsubscribe: AsyncSubscription = async () =>
    {
        if (this._unsubscribed)
            return false;
        await this._unsubscribe()
        return this._unsubscribed = true;
    }

    public get unsubscribed(): boolean
    {
        return this._unsubscribed;
    }

    async [Symbol.asyncDispose](): Promise<void>
    {
        await this._unsubscribe();
    }
}

export class ReplaceableSubscription extends StatefulSubscription
{
    constructor(private subscription?: Subscription)
    {
        super(() =>
        {
            this.subscription?.();
            this.subscription = null;
        });
    }
    public update(subscription: Subscription, unsubscribePrevious?: boolean): void
    {
        if (unsubscribePrevious)
            this.subscription?.();
        this.subscription = subscription;
    }
}

export class ReplaceableAsyncSubscription extends StatefulSubscription
{
    constructor(private subscription?: AsyncSubscription)
    {
        super(() =>
        {
            this.subscription?.();
            this.subscription = null;
        });
    }
    public update(subscription: AsyncSubscription, unsubscribePrevious?: boolean): void
    {
        if (unsubscribePrevious)
            this.subscription?.();
        this.subscription = subscription;
    }
}
