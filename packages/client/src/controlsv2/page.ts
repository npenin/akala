import { Resolvable, SimpleInjector, Subscription } from "@akala/core"
import { OutletDefinition } from "../outlet.js"
import { IScope, Scope } from "../scope.js"

export const RootElement = Symbol('root html template element');
export const outletDefinition = Symbol()

export function page<TScope extends IScope<object>>(options: { template: string | Promise<string>, inject?: Resolvable[] })
{
    return function <T>(target: T & (new (...args: unknown[]) => unknown)): T & { [outletDefinition]: OutletDefinition<TScope> }
    {
        target[outletDefinition] = {
            template: options.template,
            controller: (scope, element, param) =>
            {
                if (options.inject)
                {
                    const inj = new SimpleInjector();
                    inj.register(Scope.injectionToken, scope);
                    inj.register(RootElement, element);
                    inj.register('param', param);
                    return inj.injectNewWithName(options.inject || [], target)();
                }
                return new target();
            }
        } as OutletDefinition<TScope>;
        return target as any;
        // serviceModule.activate(['$outlet'], (outlet: OutletService) => outlet.use(route, outletName, ))
    }
}

export class Page
{
    protected readonly subscriptions: Subscription[] = [];

    [Symbol.dispose]()
    {
        this.subscriptions.forEach(s => s());
        this.subscriptions.length = 0;
    }

    subscribe(sub: Subscription)
    {
        this.subscriptions.push(sub);
    }
}