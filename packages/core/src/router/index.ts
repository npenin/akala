import { Routable } from './route.js';
import { Router, RouterOptions } from './router.js';

export * from './shared.js'
export * from './composite.js'
export * from './route.js'
export * from './router.js'
export * from './indexed.js'

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