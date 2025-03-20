import { Routable } from './route.js';
import { Router, RouterOptions } from './router.js';
import { RouterAsync } from './router-async.js';
import { SpecialNextParam } from '../middlewares/shared.js';

export * from './route.js'
export * from './router.js'
export * from './route-async.js'
export * from './router-async.js'


/**
 * Router for handling a single routable type without additional parameters. 
 * Ideal for client-side routing where no response is expected.
 * 
 * @template T - The type of routable component.
 * @template TSpecialNextParam - Type for special next parameters (defaults to SpecialNextParam)
* @extends Router<[T],TSpecialNextParam>
 */
export class Router1<T extends Routable, TSpecialNextParam extends SpecialNextParam = SpecialNextParam> extends Router<[T], TSpecialNextParam>
{
    /**
     * Creates an instance of Router1.
     * @param {RouterOptions} [options] - Optional configuration options for the router. These configure middleware priority and other router behavior.
     */
    constructor(options?: RouterOptions)
    {
        super(options);
    }
}
/**

/**
 * Router for handling one routable type and a secondary parameter (e.g., server response).
 * Useful in server-side scenarios where a response parameter is needed.
 * 
     * @template T - The first routable type.
     * @template U - The second parameter type.
     * @template TSpecialNextParam - Type for special next parameters (defaults to SpecialNextParam)
     * @extends Router<[T,U],TSpecialNextParam>
 */
export class Router2<T extends Routable, U, TSpecialNextParam extends SpecialNextParam = SpecialNextParam> extends Router<[T, U], TSpecialNextParam>
{
    /**
     * Creates an instance of Router2.
     * @param {RouterOptions} [options] - Optional configuration options for the router. These configure middleware priority and other router behavior.
     */
    constructor(options?: RouterOptions)
    {
        super(options);
    }
}

/**
 * Asynchronous router for handling a single routable type without additional parameters. 
 * Suitable for client-side asynchronous operations where no response is expected.
 * 
 * @template T - The type of routable component.
 * @template TSpecialNextParam - Type for special next parameters (defaults to SpecialNextParam)
 * @extends RouterAsync<[T],TSpecialNextParam>
 */
export class Router1Async<T extends Routable, TSpecialNextParam extends SpecialNextParam = SpecialNextParam> extends RouterAsync<[T], TSpecialNextParam>
{
    /**
     * Creates an instance of Router1Async.
     * @param {RouterOptions} [options] - Optional configuration options for the router. These configure middleware priority and other router behavior.
     */
    constructor(options?: RouterOptions)
    {
        super(options);
    }
}
/**
 * Asynchronous router for handling one routable type and a secondary parameter (e.g., server response).
 * Useful in server-side scenarios requiring asynchronous operations with a response parameter.
 * 
 * @template T - The first routable type.
 * @template U - The second parameter type.
 * @template TSpecialNextParam - Type for special next parameters (defaults to SpecialNextParam)
 * @extends RouterAsync<[T,U],TSpecialNextParam>
 */
export class Router2Async<T extends Routable, U, TSpecialNextParam extends SpecialNextParam = SpecialNextParam> extends RouterAsync<[T, U], TSpecialNextParam>
{
    /**
     * Creates an instance of Router2Async.
     * @param {RouterOptions} [options] - Optional configuration options for the router. These configure middleware priority and other router behavior.
     */
    constructor(options?: RouterOptions)
    {
        super(options);
    }
}
