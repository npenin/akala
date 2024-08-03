import { Routable } from './route.js';
import { Router, RouterOptions } from './router.js';
import { RouterAsync } from './router-async.js';

export * from './route.js'
export * from './router.js'
export * from './route-async.js'
export * from './router-async.js'

export class Router1<T extends Routable> extends Router<[T]>
{
    constructor(options?: RouterOptions)
    {
        super(options);
    }
}
export class Router2<T extends Routable, U> extends Router<[T, U]>
{
    constructor(options?: RouterOptions)
    {
        super(options);
    }
}

export class Router1Async<T extends Routable> extends RouterAsync<[T]>
{
    constructor(options?: RouterOptions)
    {
        super(options);
    }
}
export class Router2Async<T extends Routable, U> extends RouterAsync<[T, U]>
{
    constructor(options?: RouterOptions)
    {
        super(options);
    }
}