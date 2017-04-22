import { EventEmitter } from 'events'
export function Promisify<T>(o: T)
{
    if (o && o instanceof Promise)
        return o;
    if (o && o['then'])
        return <PromiseLike<T>><any>o;

    var deferred = new Deferred<T>();
    var e = new Error();
    setTimeout(function ()
    {
        // console.debug(e.stack);
        deferred.resolve(o);
    });
    return deferred;
}

export type ResolveHandler<T, TResult> = (value: T) => TResult | PromiseLike<TResult>
export type RejectHandler<TResult> = (reason: any) => void | TResult | PromiseLike<TResult>;

export function isPromiseLike<T>(o: T | PromiseLike<T>): o is PromiseLike<T>
{
    return o && o['then'] && typeof (o['then']) == 'function';
}

export function when(promises: PromiseLike<any>[])
{
    if (promises && !promises.length)
        return Promisify(null);
    if (promises && promises.length == 1)
        return promises[0];
    var results = new Array(promises.length);
    var deferred = new Deferred<any[]>();
    var completed = 0;
    promises.forEach(function (promise, idx)
    {
        promise.then(function (result)
        {
            results[idx] = result;
            if (++completed == promises.length)
                deferred.resolve(results);
        }, function (rejection)
            {
                deferred.reject(rejection);
            });
    })
}

export enum PromiseStatus
{
    Pending = 0,
    Resolved = 1,
    Rejected = 2
}

export class Deferred<T> extends EventEmitter implements PromiseLike<T>
{
    public constructor()
    {
        super();
    }

    public $$status: PromiseStatus = PromiseStatus.Pending;
    public $$value: any;

    public resolve(val: T | PromiseLike<T>)
    {
        if (isPromiseLike(val))
            (<PromiseLike<T>>val).then(this.resolve.bind(this), this.reject.bind(this))
        else
        {
            this.$$status = PromiseStatus.Resolved;
            this.$$value = val;
            this.emit('resolve', val);
        }
    }

    public reject(reason: any)
    {
        this.$$value = reason;
        this.$$status = PromiseStatus.Rejected;
        this.emit('reject', reason);
    }


    then<TResult>(onfulfilled?: ResolveHandler<T, TResult>, onrejected?: RejectHandler<TResult>): PromiseLike<TResult>
    {
        switch (this.$$status)
        {
            case PromiseStatus.Resolved:
                var deferred = new Deferred();
                var result = onfulfilled(<T>this.$$value);
                if (typeof (result) == 'undefined')
                    result = this.$$value;
                setImmediate(deferred.resolve.bind(deferred), Promisify(result));
                return deferred;
            case PromiseStatus.Rejected:
                var deferred = new Deferred();
                var rejection = onrejected(this.$$value);
                if (typeof (rejection) == 'undefined')
                    rejection = this.$$value;
                setImmediate(deferred.reject.bind(deferred), Promisify(rejection));
                return deferred;
            case PromiseStatus.Pending:
                var next = new Deferred<TResult>();
                this.once('resolve', function (value)
                {
                    var result = onfulfilled(value)
                    if (typeof (result) == 'undefined')
                        next.resolve(value);
                    else
                        next.resolve(result);

                });
                this.once('reject', function (value)
                {
                    if (onrejected)
                        next.reject(onrejected(value));
                });
                return next;
        }
    }
}