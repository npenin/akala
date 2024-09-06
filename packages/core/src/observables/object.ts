import { map } from "../each.js";
import EventEmitter, { Event, EventArgs, EventKeys, EventListener, IEvent, Subscription } from "../event-emitter.js";
import { Formatter, formatters } from "../formatters/index.js";
import { ErrorWithStatus, FormatExpression, HttpStatusCode, isPromiseLike, Parser } from "../index.js";
import { EvaluatorAsFunction } from "../parser/evaluator-as-function.js";
import { BinaryExpression } from "../parser/expressions/binary-expression.js";
import { BinaryOperator } from "../parser/expressions/binary-operator.js";
import { CallExpression } from "../parser/expressions/call-expression.js";
import { ConstantExpression } from "../parser/expressions/constant-expression.js";
import { ExpressionVisitor } from "../parser/expressions/visitors/expression-visitor.js";
import { Expressions, StrictExpressions } from "../parser/expressions/expression.js";
import { MemberExpression } from "../parser/expressions/member-expression.js";
import { NewExpression } from "../parser/expressions/new-expression.js";
import { ParameterExpression } from "../parser/expressions/parameter-expression.js";
import { TernaryExpression } from "../parser/expressions/ternary-expression.js";
import { TernaryOperator } from "../parser/expressions/ternary-operator.js";
import { ExpressionSimplifyer } from "../parser/expressions/visitors/expression-simplifyer.js";

export interface ObjectEvent<T>
{
    readonly property: keyof T;
    readonly value: T[keyof T];
    readonly oldValue: T[keyof T];
}

export abstract class WatcherFormatter implements Formatter<void>
{
    constructor(protected readonly watcher: Watcher) { }

    abstract format(value: unknown): void;
}

export class AsyncFormatter extends WatcherFormatter
{
    private promise: PromiseLike<unknown>;
    private value: unknown;

    format(value: unknown)
    {
        if (!isPromiseLike(value))
            throw new Error("Cannot wait for a non-promise value");

        if (this.promise !== value)
        {
            this.promise = value;
            this.value = null;
        }
        value.then(v =>
        {
            this.value = v;
            this.watcher.emit('change');
        }, err => console.debug('a watched promise failed with err %O', err));

        return this.value;
    }

    constructor(watcher: Watcher)
    {
        super(watcher);
    }
}

formatters.register('#async', AsyncFormatter);


export class EventFormatter extends WatcherFormatter
{
    private event: Event;
    private value: unknown[];

    format(value: unknown)
    {
        if (!(value instanceof Event))
            throw new Error("Cannot wathc a non-event");

        if (this.event !== value)
        {
            this.event = value;
            this.value = null;
        }

        this.watcher.on(Symbol.dispose, value.addListener((...v) =>
        {
            this.value = v;
            this.watcher.emit('change');
        }));


        return this.value;
    }

    constructor(watcher: Watcher)
    {
        super(watcher);
    }
}

formatters.register('#event', EventFormatter);

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

    public visitConstant(arg0: ConstantExpression<unknown>): StrictExpressions
    {
        this.getter = () => arg0.value;
        return arg0;
    }

    visitFormat<TOutput>(expression: FormatExpression<TOutput>): FormatExpression<TOutput>
    {
        this.visit(expression.lhs);
        if (expression.formatter)
        {
            const formatter = formatters.resolve<Formatter<unknown>>('#' + expression.formatter);
            const source = this.getter;
            this.getter = target => formatter.format(source(target));
        }
        return expression;
    }

    visitCall<T, TMethod extends keyof T>(arg0: CallExpression<T, TMethod>): StrictExpressions
    {
        const getter = this.getter;
        this.visit(arg0.source);
        const sourceGetter = this.getter;

        const argGetters = arg0.arguments.map(a => { this.getter = getter; this.visit(a); return this.getter; })
        if (arg0.method)
        {
            this.getter = getter;
            const member = new EvaluatorAsFunction().eval<PropertyKey>(this.visit(arg0.method));
            this.getter = (target) =>
            {
                const f = sourceGetter(target) as Function;
                return f && f[member(target)].apply(f, argGetters.map(g => g(target)));
            };
        }
        else
            this.getter = (target) =>
            {
                const f = sourceGetter(target) as Function;
                return f && f(...argGetters.map(g => g(target)));
            };
        return arg0;
    }

    public visitNew<T>(expression: NewExpression<T>): StrictExpressions
    {
        const source = this.getter;
        const result: ((target) => [PropertyKey, any])[] = [];
        const evaluator = new EvaluatorAsFunction();
        this.visitEnumerable(expression.init, () => { }, (arg0) =>
        {
            const member = evaluator.eval<PropertyKey>(this.visit(arg0.member));
            this.getter = source;
            this.visit(arg0.source);
            const getter = this.getter;
            result.push((target) => [member(target), getter(target)])
            this.getter = source;

            return arg0;
        });

        this.getter = (target) =>
        {
            if (expression.newType == '[')
                return result.map(r => r(target)[1]);
            return Object.fromEntries(result.map(r => r(target)));
        };

        return expression;
    }

    public visitMember<T1, TMember extends keyof T1>(arg0: MemberExpression<T1, TMember, T1[TMember]>): MemberExpression<T1, TMember, T1[TMember]>
    {
        const source = this.getter;
        const member = new EvaluatorAsFunction().eval<PropertyKey>(this.visit(arg0.member));
        this.getter = source;

        if (arg0.source)
            this.visit(arg0.source);

        const getter = this.getter;

        // if (arg0.optional)
        this.getter = (target) =>
        {
            const x = getter(target);
            if (typeof x == 'object')
            {
                if (x)
                    return new ObservableObject<any>(x).getValue(member(target));
            }
            return x
        }
        // else
        //     this.getter = (target) => new ObservableObject<any>(getter(target)).getValue(member())

        return arg0;
    }

    visitTernary<T extends Expressions = StrictExpressions>(expression: TernaryExpression<T>): TernaryExpression<Expressions>
    {
        const source = this.getter;
        this.visit(expression.first);
        switch (expression.operator)
        {
            case TernaryOperator.Question:
                const condition = this.getter;
                this.getter = source;
                this.visit(expression.second);
                const second = this.getter;
                this.getter = source;
                this.visit(expression.third);
                const third = this.getter;
                this.getter = source;
                this.getter = (target) => condition(target) ? second(target) : third(target);
                break;
        }

        return expression;
    }

    visitBinary<T extends Expressions = StrictExpressions>(expression: BinaryExpression<T>): BinaryExpression<Expressions>
    {
        const source = this.getter;
        this.visit(expression.left);
        const left = this.getter;
        this.getter = source;
        this.visit(expression.right);
        const right = this.getter;
        switch (expression.operator)
        {
            case BinaryOperator.Equal:
                this.getter = (target) => left(target) == right(target); break;
            case BinaryOperator.StrictEqual:
                this.getter = (target) => left(target) === right(target); break;
            case BinaryOperator.NotEqual:
                this.getter = (target) => left(target) != right(target); break;
            case BinaryOperator.StrictNotEqual:
                this.getter = (target) => left(target) !== right(target); break;
            case BinaryOperator.LessThan:
                this.getter = (target) => left(target) < right(target); break;
            case BinaryOperator.LessThanOrEqual:
                this.getter = (target) => left(target) <= right(target); break;
            case BinaryOperator.GreaterThan:
                this.getter = (target) => left(target) > right(target); break;
            case BinaryOperator.GreaterThanOrEqual:
                this.getter = (target) => left(target) >= right(target); break;
            case BinaryOperator.And:
                this.getter = (target) => left(target) && right(target); break;
            case BinaryOperator.Or:
                this.getter = (target) => left(target) || right(target); break;
            case BinaryOperator.Minus:
                this.getter = (target) => left(target) - right(target); break;
            case BinaryOperator.Plus:
                this.getter = (target) => left(target) + right(target); break;
            case BinaryOperator.Modulo:
                this.getter = (target) => left(target) % right(target); break;
            case BinaryOperator.Div:
                this.getter = (target) => left(target) / right(target); break;
            case BinaryOperator.Times:
                this.getter = (target) => left(target) * right(target); break;
            case BinaryOperator.Pow:
                this.getter = (target) => Math.pow(left(target), right(target)); break;
            case BinaryOperator.Dot:
                this.getter = (target) => left(target)[right(target)]; break;
            case BinaryOperator.QuestionDot:
                this.getter = (target) => left(target)?.[right(target)]; break;
            case BinaryOperator.Format:
            case BinaryOperator.Unknown:
                throw new ErrorWithStatus(HttpStatusCode.NotImplemented, 'Not implemented/supported');
        }
        return expression;
    }
}

type Watcher = EventEmitter<{ 'change': Event<[source?: object]> }>;

export class BuildWatcher<T extends object> extends ExpressionVisitor
{
    private boundObservables: unknown[];

    public eval(expression: Expressions): (target: T, watcher: Watcher) => void
    {
        this.boundObservables = [];
        this.getter = (target, watcher) =>
        {
            if (target instanceof Binding)
            {
                if (!this.boundObservables.includes(target))
                {
                    watcher.on(Symbol.dispose, target.onChanged(ev => watcher.emit('change', ev.value)))
                    this.boundObservables.push(target);
                }
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

    private getter: (target: object, watcher: Watcher) => ObservableObject<any> | boolean | string | number | symbol | bigint | Function | undefined | unknown;

    visitConstant(arg0: ConstantExpression<unknown>): StrictExpressions
    {
        this.getter = () => typeof arg0.value == 'object' ? new ObservableObject(arg0.value) : arg0.value;
        return arg0;
    }

    visitFormat<TOutput>(expression: FormatExpression<TOutput>): FormatExpression<TOutput>
    {
        const getter = this.getter;
        this.visit(expression.lhs);
        const source = this.getter;
        if (expression.formatter)
        {
            let settingsGetter: typeof this.getter;
            if (expression.settings)
            {
                this.getter = getter;
                this.visit(expression.settings);
                settingsGetter = this.getter;
            }
            const formatter = formatters.resolve<(new (...args: unknown[]) => Formatter<T>)>(`#{expression.formatter}`);
            if (typeof formatter === 'function' && formatter.prototype instanceof WatcherFormatter)
                if (settingsGetter)
                    this.getter = (target, watcher) => new formatter(settingsGetter(target, watcher), watcher).format(source(target, watcher));
                else
                    this.getter = (target, watcher) => new formatter(watcher).format(source(target, watcher));
            else
                this.getter = (target, watcher) => new formatter(settingsGetter?.(target, watcher)).format(source(target, watcher));
        }
        return expression;
    }

    public visitMember<T1, TMember extends keyof T1>(arg0: MemberExpression<T1, TMember, T1[TMember]>): StrictExpressions
    {
        if (arg0.source)
            this.visit(arg0.source);

        const getter = this.getter;

        const member = new EvaluatorAsFunction().eval<PropertyKey>(this.visit(arg0.member));




        let sub: Subscription;
        let change = new Event<[]>();
        // let myWatcher: Watcher = new EventEmitter({ change });
        let result: ObservableObject<any>

        this.getter = (target, watcher) =>
        {
            if (!sub)//&& watcher)
                change.pipe('change', watcher);
            let x = getter(target, watcher);
            if (x instanceof Binding)
            {
                x.onChanged(ev => watcher.emit('change', ev.value));
                x = x.getValue();
            }
            if (!x || typeof x != 'object')
            {
                // if (sub)
                // {
                //     change.emit();
                //     sub();
                // }

                return x;
            }
            const prop = member(target);
            const newResult = new ObservableObject<any>(x);
            if (result && result === newResult)
                return result.getValue(prop);
            else
                result = newResult;

            watcher.on(Symbol.dispose, sub = result.on(prop, () => watcher.emit('change', x as object)));
            // result.watch(watcher, prop);
            return result.getValue(prop);
        }

        return arg0;
    }

    visitTernary<T extends Expressions = StrictExpressions>(expression: TernaryExpression<T>): TernaryExpression<Expressions>
    {
        const source = this.getter;
        this.visit(expression.first);
        switch (expression.operator)
        {
            case TernaryOperator.Question:
                const condition = this.getter;
                this.getter = source;
                this.visit(expression.second);
                const second = this.getter;
                this.getter = source;
                this.visit(expression.third);
                const third = this.getter;
                this.getter = source;
                this.getter = (target, watcher) => condition(target, watcher) ? second(target, watcher) : third(target, watcher);
                break;
        }

        return expression;
    }

    visitCall<T, TMethod extends keyof T>(arg0: CallExpression<T, TMethod>): StrictExpressions
    {
        const getter = this.getter;
        this.visit(arg0.source);
        const sourceGetter = this.getter;

        const argGetters = arg0.arguments.map(a => { this.getter = getter; this.visit(a); return this.getter; })
        if (arg0.method)
        {
            this.getter = getter;
            const member = new EvaluatorAsFunction().eval<PropertyKey>(this.visit(arg0.method));
            this.getter = (target, watcher) =>
            {
                const f = sourceGetter(target, watcher) as Function;
                return f && f[member(target)].apply(f, argGetters.map(g => g(target, watcher)));
            };
        }
        else
            this.getter = (target, watcher) =>
            {
                const f = sourceGetter(target, watcher) as Function;
                return f && f(...argGetters.map(g => g(target, watcher)));
            };
        return arg0;
    }

    public visitNew<T>(expression: NewExpression<T>): StrictExpressions
    {
        const source = this.getter;
        const result: ((target, watcher) => [PropertyKey, any])[] = [];
        const evaluator = new EvaluatorAsFunction();
        this.visitEnumerable(expression.init, () => { }, (arg0) =>
        {
            const member = evaluator.eval<PropertyKey>(this.visit(arg0.member));
            this.getter = source;
            this.visit(arg0.source);
            const getter = this.getter;
            result.push((target, watcher) => [member(target), getter(target, watcher)])
            this.getter = source;

            return arg0;
        });

        this.getter = (target, watcher) =>
        {
            return Object.fromEntries(result.map(r => r(target, watcher)));
        };

        return expression;
    }


    visitBinary<T extends Expressions = StrictExpressions>(expression: BinaryExpression<T>): BinaryExpression<Expressions>
    {
        const source = this.getter;
        this.visit(expression.left);
        const left = this.getter;
        this.getter = source;
        this.visit(expression.right);
        const right = this.getter;
        switch (expression.operator)
        {
            case BinaryOperator.Equal: this.getter = (target, watcher) => left(target, watcher) == right(target, watcher); break;
            case BinaryOperator.StrictEqual: this.getter = (target, watcher) => left(target, watcher) === right(target, watcher); break;
            case BinaryOperator.NotEqual: this.getter = (target, watcher) => left(target, watcher) != right(target, watcher); break;
            case BinaryOperator.StrictNotEqual: this.getter = (target, watcher) => left(target, watcher) !== right(target, watcher); break;
            case BinaryOperator.LessThan: this.getter = (target, watcher) => left(target, watcher) < right(target, watcher); break;
            case BinaryOperator.LessThanOrEqual: this.getter = (target, watcher) => left(target, watcher) <= right(target, watcher); break;
            case BinaryOperator.GreaterThan: this.getter = (target, watcher) => left(target, watcher) > right(target, watcher); break;
            case BinaryOperator.GreaterThanOrEqual: this.getter = (target, watcher) => left(target, watcher) >= right(target, watcher); break;
            case BinaryOperator.And: this.getter = (target, watcher) => left(target, watcher) && right(target, watcher); break;
            case BinaryOperator.Or: this.getter = (target, watcher) => left(target, watcher) || right(target, watcher); break;
            case BinaryOperator.Minus: this.getter = (target, watcher) => left(target, watcher) as number - (right(target, watcher) as number); break;
            case BinaryOperator.Plus: this.getter = (target, watcher) => left(target, watcher) as number + (right(target, watcher) as number); break;
            case BinaryOperator.Modulo: this.getter = (target, watcher) => left(target, watcher) as number % (right(target, watcher) as number); break;
            case BinaryOperator.Div: this.getter = (target, watcher) => left(target, watcher) as number / (right(target, watcher) as number); break;
            case BinaryOperator.Times: this.getter = (target, watcher) => left(target, watcher) as number * (right(target, watcher) as number); break;
            case BinaryOperator.Pow: this.getter = (target, watcher) => Math.pow(left(target, watcher) as number, right(target, watcher) as number); break;
            case BinaryOperator.Dot: this.getter = (target, watcher) => left(target, watcher)[right(target, watcher) as PropertyKey]; break;
            case BinaryOperator.QuestionDot: this.getter = (target, watcher) => left(target, watcher)?.[right(target, watcher) as PropertyKey]; break;
            case BinaryOperator.Format:
            case BinaryOperator.Unknown:
                throw new ErrorWithStatus(HttpStatusCode.NotImplemented, 'Not implemented/supported');
        }
        return expression;
    }
}

type ObservableType<T extends object> = Record<keyof T, IEvent<[ObjectEvent<T>], void>>;

export type BindingChangedEvent<T> = { value: T, oldValue: T };

export class Binding<T> extends EventEmitter<{
    change: Event<[BindingChangedEvent<T>]>
}>
{
    public static defineProperty<T = unknown>(target: object, property: string | symbol, value?: T): Binding<T>
    {
        const binding = new Binding<T>(target, typeof property == 'symbol' ? new MemberExpression(null, new ConstantExpression(property), false) : new Parser().parse(property));
        let settingValue = false;
        Object.defineProperty(target, property, {
            get()
            {
                return value;
            }, set(newValue: T)
            {
                if (settingValue)
                    return;
                value = newValue;
                settingValue = true;
                binding.setValue(newValue)//, binding);
                settingValue = false;
            }
        });

        return binding;
    }

    public pipe<U>(expression: Expressions): Binding<U>
    {
        const binding = new Binding<U>(this, expression);

        const sub = this.onChanged(ev =>
        {
            if (ev.value !== ev.oldValue)
                binding.attachWatcher(ev.value as object, binding.watcher);
        })

        binding.on(Symbol.dispose, () => sub());


        // this.watcher.on('change', () =>
        // {
        //     sub.watcher.emit('change');
        // })

        return binding;
    }

    watcher: Watcher = new EventEmitter();

    [Symbol.dispose]()
    {
        super[Symbol.dispose]();
        this.watcher[Symbol.dispose]();
    }

    constructor(public readonly target: object, public readonly expression: Expressions)
    {
        super();
        if (target instanceof Binding)
            if (!expression)
                return target;
            else return Binding.simplify(target, expression)
        this.set('change', new Event(Number.POSITIVE_INFINITY));
        if (expression)
        {
            let value: T;
            this.watcher.on('change', (x) =>
            {
                if (x)
                    this.attachWatcher(target, this.watcher);

                const oldValue = value;
                value = this.getValue();
                if (isPromiseLike(value))
                    value.then(v => this.emit('change', { value: v, oldValue }))
                else
                    this.emit('change', { value, oldValue });
            })
            this.attachWatcher = new BuildWatcher().eval(expression);
            this.attachWatcher(target, this.watcher);
        }
    }
    static simplify<T>(target: Binding<any>, expression: Expressions): Binding<T> | null
    {
        return new Binding(target.target, target.expression === null ? expression : new ExpressionSimplifyer(target.expression).visit(expression))
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

    public onChanged(handler: (ev: { value: T, oldValue: T }) => void, triggerOnRegister?: boolean)
    {
        const sub = this.on('change', handler);
        if (triggerOnRegister)
            handler({ value: this.getValue(), oldValue: null })
        return sub;
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
        super(Number.POSITIVE_INFINITY);
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
        watcher.once(Symbol.dispose, sub);
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
        return ObservableObject.getValue(this.target, property);
    }

    public static getValue<T, const TKey extends keyof T>(target: T, property: TKey): T[TKey]
    {
        let result: T[TKey];
        if (target instanceof Binding)
            result = target.getValue()?.[property];
        else
            result = target[property];

        if (typeof result == 'object')
            return new ObservableObject(result).target as T[TKey];
        return result;
    }

    public getObservable<const TKey extends keyof T>(property: TKey): T[TKey] extends object ? ObservableObject<T[TKey]> : null
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