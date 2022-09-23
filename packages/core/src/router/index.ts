import { Routable } from './route';
import { Router, RouterOptions } from './router';

export * from './shared'
export * from './composite'
export * from './route'
export * from './router'
export * from './indexed'

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