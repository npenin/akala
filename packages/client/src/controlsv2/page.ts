import { Binding, ObservableObject, Parser, type Resolvable, SimpleInjector } from "@akala/core"
import { type OutletDefined, type OutletDefinition, outletDefinition } from "../outlet.js"
import { type IScope } from "../scope.js"
import { Control } from "./shared.js";
import { DataContext } from "../common.js";
import { IDataContext } from "../behaviors/context.js";
import { ConstantExpression, ExpressionType, MemberExpression, NewExpression, TypedExpression } from "@akala/core/expressions";
// import { DataContext } from "../common.js";

export const RootElement = Symbol('root html template element');

export type PageType<T extends (new (...args: unknown[]) => {}), TScope extends IScope<object>> = OutletDefined<TScope> & T;

export function pageOutlet<TScope extends IScope<object>>(options: { template: string | Promise<string>, inject?: Resolvable[] })
{
    return function <T extends (new (...args: any[]) => {})>(target: T): OutletDefinition<TScope>
    {
        return {
            template: options.template,
            controller: (element, param) =>
            {
                if (options.inject)
                {
                    const inj = new SimpleInjector();
                    // inj.register(ScopeImpl.injectionToken, scope);
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

export class Page extends Control<{}, HTMLElement>
{
    constructor(el: HTMLElement, contextExpression?: TypedExpression<any>)
    {
        super(el);
        if (el['dataContext'])
        {
            const context = el['dataContext'] as Binding<IDataContext>;
            const indexOfController = context.expression?.type == ExpressionType.NewExpression && context.expression.init.findIndex(e => e.member.type == ExpressionType.ConstantExpression && e.member.value == 'controller');
            const oldValue = context.getValue();
            if (typeof indexOfController == 'number' && indexOfController > -1)
            {
                (context.expression as NewExpression<any>).init.splice(indexOfController, 1, new MemberExpression<any, any, any>(new ConstantExpression(this), new ConstantExpression('controller'), false))
                if (contextExpression)
                    (context.expression as NewExpression<any>).init.splice((context.expression as NewExpression<any>).init.length - 1, 1, new MemberExpression<any, any, any>(contextExpression, new ConstantExpression('context'), false));
                context.emit('change', { oldValue: oldValue, value: context.getValue() });
            }
            else
                DataContext.define(el, { controller: this }, contextExpression);

        }
        else
            DataContext.define(el, { controller: this }, contextExpression);
    }

}
