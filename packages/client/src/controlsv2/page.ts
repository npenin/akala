import { ObservableObject, Parser, Resolvable, SimpleInjector } from "@akala/core"
import { OutletDefined, OutletDefinition, outletDefinition } from "../outlet.js"
import { IScope, ScopeImpl } from "../scope.js"
// import { DataContext } from "../common.js";

export const RootElement = Symbol('root html template element');

export type PageType<T extends (new (...args: unknown[]) => {}), TScope extends IScope<object>> = OutletDefined<TScope> & T;

export function pageOutlet<TScope extends IScope<object>>(options: { template: string | Promise<string>, inject?: Resolvable[] })
{
    return function <T extends (new (...args: any[]) => {})>(target: T): OutletDefinition<TScope>
    {
        return {
            template: options.template,
            controller: (scope, element, param) =>
            {
                if (options.inject)
                {
                    const inj = new SimpleInjector();
                    inj.register(ScopeImpl.injectionToken, scope);
                    inj.register(RootElement, element);
                    inj.register('param', param);
                    const result = inj.injectNewWithName(options.inject || [], target)();
                    if ('dataContext' in element && typeof element.dataContext == 'object')
                        ObservableObject.setValue(element.dataContext, Parser.parameterLess.parse('controller'), result);
                    // DataContext.define(element, { controller: result });
                    element['controller'] = result;
                    return result;
                }
                const result = new target();
                element['controller'] = result;
                return result;
            }
        } as OutletDefinition<TScope>;
    }
}

export function page<TScope extends IScope<object>>(options: { template: string | Promise<string>; inject?: Resolvable[] })
{
    return function <T extends new (...args: any[]) => {}>(target: T): T & OutletDefined<TScope>
    {
        return withOutlet(target, pageOutlet(options)(target));
    };
}

export function withOutlet<T extends new (...args: any[]) => {}, TScope extends IScope<object>>(target: T, def: OutletDefinition<TScope>): T & OutletDefined<TScope>
{
    return class extends target
    {
        static readonly [outletDefinition] = def;
    } as T & OutletDefined<TScope>;
}

export { TeardownManager as Page } from '../teardown-manager.js'