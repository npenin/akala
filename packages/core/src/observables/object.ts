import EventEmitter, { AllEventKeys, Event, EventArgs, EventKeys, EventListener, IEvent, disposeEvent } from "../event-emitter.js";
import { EvaluatorAsFunction } from "../parser/evaluator-as-function.js";
import { BinaryExpression } from "../parser/expressions/binary-expression.js";
import { BinaryOperator } from "../parser/expressions/binary-operator.js";
import { ExpressionType } from "../parser/expressions/expression-type.js";
import { ExpressionVisitor } from "../parser/expressions/expression-visitor.js";
import { Expressions, StrictExpressions, TypedExpression } from "../parser/expressions/expression.js";
import { LambdaExpression, TypedLambdaExpression } from "../parser/expressions/lambda-expression.js";
import { MemberExpression } from "../parser/expressions/member-expression.js";
import { ParameterExpression } from "../parser/expressions/parameter-expression.js";

export interface ObjectEvent<T>
{
    readonly property: keyof T;
    readonly value: T[keyof T];
    readonly oldValue: T[keyof T];
}
// export interface IWatched<T>
// {
//     $$watchers?: { [key in keyof T]?: T[key] & ObservableObject<T[key]> };
// }
export const watcher = Symbol.for("akala/watcher");

export type IWatched<T extends object> = T &
{
    [watcher]: ObservableObject<T>;
};

export type IWatchable<T extends object> = {
    [watcher]?: ObservableObject<T>;
};

export class BuildSetter<T extends object> extends ExpressionVisitor
{
    target: ParameterExpression<T>;
    value: ParameterExpression<unknown>;

    // private static getObservable<T extends object>(target: T & IWatchable<T>, member: keyof T)
    // {
    //     let obs: ObservableObject<any>;
    //     if (!(target instanceof ObservableObject))
    //         obs = new ObservableObject(target);
    //     else
    //         obs = target;

    //     if (!(member in obs.$$watchers))
    //     {
    //         const value = target[member];
    //         if (typeof value === 'object')
    //         {
    //             if (ObservableObject.isWatched(value))
    //                 obs.$$watchers[member] = value.$$watcher
    //             else
    //                 obs.$$watchers[member] = (value as IWatchable<typeof value>).$$watcher = new ObservableObject(value)
    //         }
    //     }
    // }

    public eval<TValue>(expression: Expressions): (target: T, value: TValue) => void
    {
        this.target = new ParameterExpression<T>('target');
        this.value = new ParameterExpression<TValue>('value');
        this.isFirstMember = true;
        this.getter = (target) => new ObservableObject(target);
        this.visit(expression);
        const member = this.property;
        let getter = this.getter;
        return (target, value) =>
        {
            getter(target).setValue(member(), value);
        }
    }

    isFirstMember = false;
    private property: () => PropertyKey;
    private getter: (target: object) => ObservableObject<any>;

    public visitMember<T1, TMember extends keyof T1>(arg0: MemberExpression<T1, TMember, T1[TMember]>): StrictExpressions
    {
        const member = new EvaluatorAsFunction().eval<PropertyKey>(this.visit(arg0.member));
        if (this.isFirstMember)
        {
            this.isFirstMember = false;
            this.property = member;
            if (arg0.source)
                return this.visit(arg0.source);
            return undefined;
        }

        if (!arg0.source)
            return new MemberExpression(this.target, arg0.member as TypedExpression<keyof T>, arg0.optional) as unknown as TypedExpression<T1[TMember]>;

        const getter = this.getter;

        if (arg0.optional)
            this.getter = (target) => { const x = getter(target); return x && new ObservableObject<any>(x).get(member(target)) }
        else
            this.getter = (target) => new ObservableObject<any>(getter(target)).get(member())
    }
}

export class BuildGetter<T extends object> extends ExpressionVisitor
{
    target: ParameterExpression<T>;
    value: ParameterExpression<unknown>;

    public eval<TValue extends object = object>(expression: Expressions): (target: T) => ObservableObject<TValue>
    {
        this.getter = (target) => new ObservableObject(target);
        this.visit(expression);
        return this.getter;
    }

    private getter: (target: object) => ObservableObject<any>;

    public visitMember<T1, TMember extends keyof T1>(arg0: MemberExpression<T1, TMember, T1[TMember]>): StrictExpressions
    {
        const member = new EvaluatorAsFunction().eval<PropertyKey>(this.visit(arg0.member));

        if (!arg0.source)
            return arg0;

        const getter = this.getter;

        if (arg0.optional)
            this.getter = (target) => { const x = getter(target); return x && new ObservableObject<any>(x).get(member(target)) }
        else
            this.getter = (target) => new ObservableObject<any>(getter(target)).get(member())
    }
}

type Watcher = EventEmitter<{ change: Event<[ObjectEvent<any>]> }>;

export class BuildWatcher<T extends object> extends ExpressionVisitor
{
    public eval(expression: Expressions): (target: T, watcher: Watcher) => void
    {
        this.getter = (target, watcher) => { return new ObservableObject(target); }
        this.visit(expression);
        return this.getter;
    }

    private getter: (target: object, watcher: Watcher) => ObservableObject<any>;

    public visitMember<T1, TMember extends keyof T1>(arg0: MemberExpression<T1, TMember, T1[TMember]>): StrictExpressions
    {
        const member = new EvaluatorAsFunction().eval<PropertyKey>(this.visit(arg0.member));

        if (!arg0.source)
            return arg0;

        const getter = this.getter;


        if (arg0.optional)
            this.getter = (target, watcher) =>
            {
                const x = getter(target, watcher);
                if (!x)
                    return x;
                const prop = member(target);
                const result = new ObservableObject<any>(getter(target, watcher));
                result.watch(watcher, prop);
                return result.get(prop);
            }
        else
            this.getter = (target, watcher) =>
            {
                const prop = member(target);
                const result = new ObservableObject<any>(getter(target, watcher));
                result.watch(watcher, prop);
                return result.get(prop);
            }
    }
}

type ObservableType<T extends object> = Record<keyof T, IEvent<[ObjectEvent<T>], void>>;

export class ObservableObject<T extends object> extends EventEmitter<ObservableType<T>>
{
    // public static wrap<T extends object>(target: T): T & { [ObservableObject.wrappingObservable]: ObservableObject<T> } & IWatched<T>
    // {
    //     return new Proxy(new ObservableObject(target), {
    //         get(observableTarget, property)
    //         {
    //             if (property === ObservableObject.wrappingObservable)
    //                 return target;
    //             return observableTarget.get(property as keyof T);
    //         },
    //         set(observableTarget, property, value)
    //         {
    //             if(typeof value=='object')
    //             return observableTarget.set(property as keyof T, value);
    //         }
    //     }) as any;
    // }
    public readonly target: T & { $$watcher?: ObservableObject<T> };

    constructor(target: T & { $$watcher?: ObservableObject<T> } | ObservableObject<T>)
    {
        super();
        if (target instanceof ObservableObject)
            return target;
        if (ObservableObject.isWatched<T>(target))
            return target[watcher];
        this.target = target;
        target.$$watcher = this;
    }

    public watch<const TKey extends EventKeys<ObservableType<T>>>(watcher: Watcher, property: TKey)
    {
        const sub = this.on(property, (ev =>
        {
            watcher.emit('change', ev);
        }) as EventListener<ObservableObject<T>['events'][TKey]>);
        // watcher.once(disposeEvent, sub);
    }

    // private setters: { [key in keyof T]?: (target: T, value: T[key]) => void } = {};

    public static isWatched<T extends object>(x: T): x is IWatched<T> 
    {
        return typeof x == 'object' && watcher in x && x[watcher] instanceof ObservableObject;
    }

    public static setValue<T extends object>(target: T, expression: Expressions, value: any)
    {
        const evaluator = new BuildSetter();
        evaluator.eval(expression)(target, value);
    }

    public setValue<const TKey extends keyof T>(property: TKey, value: T[TKey])
    {
        const oldValue: T[TKey] = this.target[property];
        this.target[property] = value;
        this.emit(property, ...[{
            property: property,
            value: value,
            oldValue: oldValue,
        }] as unknown[] as EventArgs<ObservableType<T>[TKey]>);
        return true;
    }

    public get(property: keyof T)
    {
        if (typeof this.target[property] == 'object')
            return new ObservableObject(this.target[property] as object).target;
        return this.target[property];
    }

    public static get<T>(target: T, property: keyof T)
    {
        return target[property];
    }
}