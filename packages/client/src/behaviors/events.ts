import { Binding, Subscription } from "@akala/core";
import { Composer } from "../template.js";
import { DataContext } from "./context.js";
import { AttributeComposer } from "./shared.js";
import { ConstantExpression, MemberExpression, NewExpression } from "@akala/core/expressions";

export class EventComposer<T extends Partial<Disposable>> extends AttributeComposer<T> implements Composer<T>
{
    getContext(item: HTMLElement, options?: T)
    {
        return new Binding(DataContext.find(item), new NewExpression<{ context: any, controller: T }>(
            new MemberExpression(new MemberExpression(undefined, new ConstantExpression('context'), false), new ConstantExpression('context'), false),
            new MemberExpression(new ConstantExpression(options) as any, new ConstantExpression('controller'), false),
        ));
    }

    constructor()
    {
        super('on')
    }

    optionName = 'controller';

    applyInternal<const TKey extends PropertyKey>(item: HTMLElement, options: T, event: TKey, handler: unknown): Subscription | void
    {
        item.addEventListener(event as any, handler as (...args: unknown[]) => unknown);
        return () => { item.removeEventListener(event as any, handler as (...args: unknown[]) => unknown); return true; };
    }
}