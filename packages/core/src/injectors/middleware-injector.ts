import { Middleware } from '../middlewares/shared.js';
import { Injector } from './shared.js';
import { process } from '../middlewares/shared.js';


export class MiddlewareInjector extends Injector
{
    public static inspect = Symbol('inspect');

    onResolve<T = unknown>(name: string | symbol): PromiseLike<T>;
    onResolve<T = unknown>(name: string | symbol, handler: (value: T) => void): void;
    onResolve<T>(name: string | symbol, handler?: (value: T) => void): void | PromiseLike<T>
    {
        if (handler)
        {
            this.onResolve(name).then(handler)
            return;
        }
        return process<PromiseLike<T>>(this.middleware, name, true)
    }
    inspect(): void
    {
        process(this.middleware, MiddlewareInjector.inspect)
    }
    constructor()
    {
        super();
    }

    public middleware: Middleware<[param: string | symbol, sync?: boolean]>;

    public resolve<T = unknown>(param: string): T
    {
        return process<T>(this.middleware, param, true)
    }
}
