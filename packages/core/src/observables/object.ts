import { map } from "../each.js";
import EventEmitter, { Event, EventArgs, EventKeys, EventListener, IEvent, Subscription, disposeEvent } from "../event-emitter.js";
import { Parser } from "../index.js";
import { EvaluatorAsFunction } from "../parser/evaluator-as-function.js";
import { ConstantExpression } from "../parser/expressions/constant-expression.js";
import { ExpressionVisitor } from "../parser/expressions/expression-visitor.js";
import { Expressions, StrictExpressions } from "../parser/expressions/expression.js";
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

    public eval<TValue>(expression: Expressions): (target: T, value: TValue) => void
    {
        this.target = new ParameterExpression<T>('target');
        this.value = new ParameterExpression<TValue>('value');
        this.isFirstMember = true;
        this.getter = (target) => target;
        this.visit(expression);
        const member = this.property;
        let getter = this.getter;
        return (target, value) =>
        {
            const x = getter(target);
            if (x)
                if (ObservableObject.isWatched(x))
                    (x[watcher] as ObservableObject<any>).setValue(member(), value);
                else
                    x[member()] = value;
        }
    }

    isFirstMember = false;
    private property: () => PropertyKey;
    private getter: (target: object) => object;

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

        // if (!arg0.source)
        // return new MemberExpression(this.target, arg0.member as TypedExpression<keyof T>, arg0.optional) as unknown as TypedExpression<T1[TMember]>;

        const getter = this.getter;

        if (arg0.optional)
            this.getter = (target) => { const x = getter(target); return x && x[member(target)] }
        else
            this.getter = (target) => ObservableObject.get(target as any, member())
    }
}

export class BuildGetter<T extends object> extends ExpressionVisitor
{
    target: ParameterExpression<T>;
    value: ParameterExpression<unknown>;

    public eval<TValue = object>(expression: Expressions): (target: T) => TValue extends object ? ObservableObject<TValue> : TValue
    {
        this.getter = (target) =>
        {
            if (target instanceof Binding)
            {
                const subTarget = target.getValue();
                if (!subTarget)
                    return null;
                return new ObservableObject(subTarget)
            }
            return new ObservableObject(target);
        }
        this.visit(expression);
        return this.getter;
    }

    private getter: (target: object) => any;

    public visitMember<T1, TMember extends keyof T1>(arg0: MemberExpression<T1, TMember, T1[TMember]>): StrictExpressions
    {
        const member = new EvaluatorAsFunction().eval<PropertyKey>(this.visit(arg0.member));

        if (arg0.source)
            this.visit(arg0.source);

        const getter = this.getter;

        // if (arg0.optional)
        this.getter = (target) => { const x = getter(target); return x && new ObservableObject<any>(x).getValue(member(target)) }
        // else
        //     this.getter = (target) => new ObservableObject<any>(getter(target)).getValue(member())

        return arg0;
    }
}

type Watcher = EventEmitter<{ 'change': Event<[source?: object]> }>;

export class BuildWatcher<T extends object> extends ExpressionVisitor
{
    public eval(expression: Expressions): (target: T, watcher: Watcher) => void
    {
        this.getter = (target, watcher) =>
        {
            if (target instanceof Binding)
            {
                target.onChanged(ev => watcher.emit('change', ev.value));
                const subTarget = target.getValue();
                if (subTarget)
                    return new ObservableObject(subTarget);
                return null;
            }
            return new ObservableObject(target);
        }
        this.visit(expression);
        return this.getter;
    }

    private getter: (target: object, watcher: Watcher) => ObservableObject<any>;

    public visitMember<T1, TMember extends keyof T1>(arg0: MemberExpression<T1, TMember, T1[TMember]>): StrictExpressions
    {
        const member = new EvaluatorAsFunction().eval<PropertyKey>(this.visit(arg0.member));

        if (arg0.source)
            this.visit(arg0.source);


        const getter = this.getter;


        let sub: Subscription;
        let change = new Event<[]>();
        let myWatcher: Watcher = new EventEmitter({ change });
        let result: ObservableObject<any>

        this.getter = (target, watcher) =>
        {
            if (!sub)//&& watcher)
                change.pipe('change', watcher);
            let x = getter(target, myWatcher);
            if (!x)
            {
                // if (sub)
                // {
                //     change.emit();
                //     sub();
                // }

                return x;
            }
            const prop = member(target);
            let newResult = new ObservableObject<any>(x);
            if (result && result === newResult)
                return result.getValue(prop);
            else
                result = newResult;

            sub = result.on(prop, ev =>
            {
                watcher.emit('change', x);
            })
            // result.watch(watcher, prop);
            return result.getValue(prop);
        }

        return arg0;
    }
}

type ObservableType<T extends object> = Record<keyof T, IEvent<[ObjectEvent<T>], void>>;

export class Binding<T> extends EventEmitter<{
    change: Event<[{ value: T, oldValue: T }]>
}>
{
    public static defineProperty(target: object, property: string | symbol, value?: unknown)
    {
        const binding = new Binding(target, typeof property == 'symbol' ? new MemberExpression(null, new ConstantExpression(property), false) : new Parser().parse(property));
        Object.defineProperty(target, property, {
            get()
            {
                return value;
            }, set(newValue: unknown)
            {
                value = newValue;
                binding.setValue(newValue)//, binding);
            }
        });

        return binding;
    }

    public pipe<U>(expression: Expressions): Binding<U>
    {
        const sub = new Binding<U>(this, expression);

        this.onChanged(ev =>
        {
            if (ev.value !== ev.oldValue)
                sub.attachWatcher(ev.value as object, sub.watcher);
        })


        // this.watcher.on('change', () =>
        // {
        //     sub.watcher.emit('change');
        // })

        return sub;
    }

    watcher: Watcher = new EventEmitter();

    constructor(public readonly target: object, public readonly expression: Expressions)
    {
        super();
        if (expression)
        {
            let value: T;
            this.watcher.on('change', (x) =>
            {
                if (x)
                    this.attachWatcher(target, this.watcher);

                const oldValue = value;
                value = this.getValue();
                this.emit('change', { value: this.getValue(), oldValue: oldValue });
            })
            this.attachWatcher = new BuildWatcher().eval(expression);
            this.attachWatcher(target, this.watcher);
        }
    }

    private readonly attachWatcher: ReturnType<BuildWatcher<object>['eval']>;

    public static unwrap<T>(element: T): Partial<T>
    {
        if (element instanceof Binding)
            return element.getValue();
        return map(element, function (value)
        {
            if (typeof (value) == 'object')
            {
                if (value instanceof Binding)
                    return value.getValue();
                else
                    return Binding.unwrap(value);
            }
            else
                return value;
        })
    }

    private _getter?: (target: object) => T extends object ? ObservableObject<T> : T
    private _setter?: (target: object, value: T) => void

    public onChanged(handler: (ev: { value: T, oldValue: T }) => void)
    {
        return this.on('change', handler);
    }

    public setValue(value: T)
    {
        if (!this._setter)
            this._setter = new BuildSetter().eval(this.expression);
        this._setter(this.target, value);
        // this.emit('change', { value, oldValue: this.getValue() });
    }

    public getValue(): T
    {
        if (!this.expression)
            return this.target as T;
        if (!this._getter)
            this._getter = new BuildGetter().eval<T>(this.expression);
        return ObservableObject.unwrap(this._getter(this.target));
    }
}

export class ObservableObject<T extends object> extends EventEmitter<ObservableType<T>>
{
    static unwrap<T>(arg0: T extends object ? ObservableObject<T> : T): T
    {
        if (arg0 instanceof ObservableObject)
            return arg0.target;
        return arg0 as T;
    }
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
    public readonly target: T & { [watcher]?: ObservableObject<T> };

    constructor(target: T & { [watcher]?: ObservableObject<T> } | ObservableObject<T>)
    {
        super();
        if (target instanceof ObservableObject)
            return target;
        if (ObservableObject.isWatched<T>(target))
            return target[watcher];
        this.target = target;
        Object.defineProperty(target, watcher, { value: this, enumerable: false, configurable: false })
    }

    public watch<const TKey extends EventKeys<ObservableType<T>>>(watcher: Watcher, property: TKey)
    {
        const sub = this.on(property, (ev =>
        {
            watcher.emit('change');
        }) as EventListener<ObservableObject<T>['events'][TKey]>);
        watcher.once(disposeEvent, sub);
        return sub;
    }

    // private setters: { [key in keyof T]?: (target: T, value: T[key]) => void } = {};

    public static isWatched<T extends object>(x: T): x is IWatched<T> 
    {
        return typeof x == 'object' && x[watcher] instanceof ObservableObject;
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

    public getValue<const TKey extends keyof T>(property: TKey): T[TKey]
    {
        if (typeof this.target[property] == 'object')
            return new ObservableObject(this.target[property] as object).target as T[TKey];
        return this.target[property];
    }

    public get<const TKey extends keyof T>(property: TKey): T[TKey] extends object ? ObservableObject<T[TKey]> : null
    {
        if (typeof this.target[property] == 'object')
            return new ObservableObject(this.target[property] as object) as T[TKey] extends object ? ObservableObject<T[TKey]> : null;
        return null;
    }

    public static get<T>(target: T, property: keyof T)
    {
        return target[property];
    }
}