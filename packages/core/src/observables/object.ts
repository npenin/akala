import { map } from "../each.js";
import EventEmitter, { Event, EventArgs, EventKeys, EventListener, IEvent } from "../event-emitter.js";
import { Formatter, formatters, isReversible, ReversibleFormatter } from "../formatters/index.js";
import { ErrorWithStatus, FormatExpression, HttpStatusCode, isPromiseLike, ObservableArray, Parser } from "../index.js";
import { EvaluatorAsFunction, ParsedFunction } from "../parser/evaluator-as-function.js";
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
import { Subscription } from "../teardown-manager.js";

export interface ObjectEvent<T>
{
    readonly property: keyof T;
    readonly value: T[keyof T];
    readonly oldValue: T[keyof T];
}

export abstract class WatcherFormatter implements Formatter<void>
{
    constructor(protected readonly watcher?: Watcher) { }

    abstract format(value: unknown): void;
}

export class AsyncFormatter extends WatcherFormatter
{
    private promise: PromiseLike<unknown>;
    private value: unknown;

    format(value: unknown)
    {
        if (!isPromiseLike(value))
            this.value = value;
        else
        {
            if (this.promise !== value)
            {
                this.promise = value;
                this.value = null;
                value.then(v =>
                {
                    this.value = v;
                    this.watcher?.emit('change');
                }, err => console.debug('a watched promise failed with err %O', err));
            }
        }
        return this.value;
    }

    constructor(watcher?: Watcher)
    {
        super(watcher);
    }
}

formatters.register('#async', AsyncFormatter);


export class EventFormatter<T extends unknown[]> extends WatcherFormatter
{
    private event: Event<T>;
    private value: T;
    private sub?: Subscription;

    format(value: unknown)
    {
        if (!(value instanceof Event))
            throw new Error("Cannot watch a non-event");

        if (this.event !== value)
        {
            this.event = value;
            this.sub?.();
            this.value = null;
        }

        this.watcher.on(Symbol.dispose, this.sub = value.addListener((...v) =>
        {
            this.value = v as T;
            this.watcher?.emit('change');
        }));


        return this.value;
    }

    constructor(watcher: Watcher)
    {
        super(watcher);
    }
}

formatters.register('#event', EventFormatter);


export default class Watch<T extends object> extends WatcherFormatter
{
    private value: T;

    format(value: T)
    {
        if (value != this.value)
        {
            this.value = value;
            ObservableObject.watchAll(value, this.watcher);
            this.watcher.emit('change');
        }
        return this.value;
    }

};

formatters.register('#watch', Watch);

export class BindingFormatter extends WatcherFormatter
{
    private binding: Binding<unknown> = new EmptyBinding();
    private sub: Subscription;
    private value: unknown;

    format(value: unknown)
    {
        if (this.value != value)
        {
            if (value)
            {
                this.sub?.();
                if (value instanceof Binding)
                    this.sub = value.onChanged(ev => this.binding.setValue(ev.value), true);
                else
                    this.binding.setValue(value);
            }
            else
                this.binding.setValue(value);

            this.value = value;
            this.watcher.on(Symbol.dispose, this.binding.onChanged((ev) =>
            {
                this.watcher?.emit('change');
            }));

            this.watcher.on(Symbol.dispose, () => this.sub?.());
        }

        return this.binding.getValue();
    }

    constructor(watcher: Watcher)
    {
        super(watcher);
    }
}

formatters.register('#unbind', BindingFormatter);

// export interface IWatched<T>
// {
//     $$watchers?: { [key in keyof T]?: T[key] & ObservableObject<T[key]> };
// }
export const watcher = Symbol.for("akala/watcher");

export type IWatched<T extends object> = T &
{
    [watcher]: ObservableObject<T> | ObservableArray<T>;
};

export type Getter<TSource, TResult> = (target: TSource) => TResult;
export type WatchGetter<TSource, TResult> = (target: TSource, watcher: Watcher) => TResult;
export type Setter<TSource, TValue> = (target: TSource, value: TValue) => void;

export type IWatchable<T extends object> = {
    [watcher]?: ObservableObject<T>;
};

export class BuildWatcherAndSetter<T> extends ExpressionVisitor
{
    target: ParameterExpression<T>;
    value: ParameterExpression<unknown>;

    private static memberWatcher<T>(getter: WatchGetter<T, unknown>, member: ParsedFunction<PropertyKey>): WatchGetter<T, unknown>
    {
        let sub: Subscription;
        let change = new Event<[]>();
        // let myWatcher: Watcher = new EventEmitter({ change });
        let result: ObservableObject<any> | ObservableArray<any>

        return (target, watcher) =>
        {
            if (!sub && watcher)
                change.pipe('change', watcher);
            let x = getter(target, watcher);
            if (x instanceof Binding)
            {
                if (watcher)
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

            if (x instanceof ObservableArray)
            {
                if (result && result === x)
                    return result.array[prop];
                else
                    result = x;

                if (watcher)
                    watcher.on(Symbol.dispose, sub = result.addListener(() => watcher.emit('change', x as object)));
                // result.watch(watcher, prop);
                return result.array[prop];
            }
            else
            {
                const newResult = new ObservableObject<any>(x);
                if (result && result === newResult)
                    return result.getValue(prop);
                else
                    result = newResult;

                if (watcher)
                    watcher.on(Symbol.dispose, sub = result.on(prop, () => watcher.emit('change', x as object)));
                // result.watch(watcher, prop);
                return result.getValue(prop);
            }
        }
    }

    private static formatWatcher<T>(source: WatchGetter<T, unknown>, instance: BuildWatcherAndSetter<T>, expression: FormatExpression<unknown>)
    {
        const result: { getter: WatchGetter<T, unknown>, formatterInstance: Formatter<unknown>, settings?: WatchGetter<T, unknown> } = { getter: source, formatterInstance: null };
        if (expression.formatter)
        {
            if (expression.settings)
            {
                instance.visit(expression.settings);
                result.settings = instance.getter;
            }
            const formatter = expression.formatter;
            if (typeof formatter === 'function' && formatter.prototype instanceof WatcherFormatter)
                if (result.settings)
                    result.getter = (target, watcher) => { const value = source(target, watcher); return (result.formatterInstance || (result.formatterInstance = new formatter(result.settings(target, watcher), watcher))).format(value instanceof ObservableObject ? value.target : value) };
                else
                    result.getter = (target, watcher) => { const value = source(target, watcher); return (result.formatterInstance || (result.formatterInstance = new formatter(watcher))).format(value instanceof ObservableObject ? value.target : value) };
            else
                result.getter = (target, watcher) => { const value = source(target, watcher); return (result.formatterInstance || (result.formatterInstance = new formatter(result.settings?.(target, watcher)))).format(value instanceof ObservableObject ? value.target : value) };
        }
        return result;
    }

    public eval<TValue>(expression: Expressions): { watcher: WatchGetter<T, TValue>, setter?: Setter<T, TValue> }
    {
        this.target = new ParameterExpression<T>('target');
        this.value = new ParameterExpression<TValue>('value');
        this.getter = (target, watcher) =>
        {
            if (target instanceof Binding)
            {
                if (watcher)
                    if (!this.boundObservables.includes(target))
                    {
                        watcher.on(Symbol.dispose, target.onChanged(ev => watcher.emit('change', ev.value)))
                        this.boundObservables.push(target);
                    }
                const subTarget = target.getValue();
                if (subTarget)
                    return new ObservableObject(subTarget).target;
                return null;
            }
            if (typeof target == 'object')
                return new ObservableObject(target).target;
            return target;
        }
        const getter = this.getter;
        let setter: Setter<T, TValue>;
        switch (expression.type)
        {
            case 'member':
                this.visit(expression.member);
                const member = this.getter as WatchGetter<unknown, PropertyKey>;
                this.getter = getter;
                if (expression.source)
                    this.visit(expression.source);
                const upToBeforeLastGetter = this.getter;
                this.getter = BuildWatcherAndSetter.memberWatcher(upToBeforeLastGetter, (target) => member(target, null));
                if (setter !== null)
                    setter = (target: T, value: TValue) =>
                    {
                        let x = upToBeforeLastGetter(target, null);
                        if (x)
                        {
                            if (x instanceof Binding)
                                x = x.getValue();
                            if (typeof x == 'object')
                                new ObservableObject<any>(x).setValue(member(target, null), value);
                            else
                                x[member(target, null)] = value;
                        }
                    }
                break;
            case 'format':
                const formatter = expression.formatter;
                if (isReversible(formatter) && setter !== null)
                {
                    const previousSetter = this.eval(expression.lhs);
                    const formatterGetter = BuildWatcherAndSetter.formatWatcher(previousSetter.watcher, this, expression);
                    this.getter = formatterGetter.getter;
                    // let settingsGetter: WatchGetter<T, any>;
                    // if (expression.settings)
                    //     settingsGetter = new BuildWatcherAndSetter().eval(expression.settings).watcher

                    // let formatterInstance: ReversibleFormatter<unknown, unknown>;
                    if (previousSetter)
                        setter = (target: T, value: TValue) => previousSetter.setter(target, ((formatterGetter.formatterInstance || (formatterGetter.formatterInstance = new formatter(formatterGetter.settings?.(target, null)))) as ReversibleFormatter<unknown, unknown>).unformat(value));
                }
                else
                {
                    this.visit(expression);
                    setter = null;
                }
                break;
            default:
                this.visit(expression);
        }
        return { watcher: this.getter as WatchGetter<T, TValue>, setter };
    }

    private boundObservables: Binding<unknown>[] = [];

    private getter: WatchGetter<unknown, ObservableObject<any> | boolean | string | number | symbol | bigint | Function | undefined | unknown>;

    visitConstant(arg0: ConstantExpression<unknown>): StrictExpressions
    {
        this.getter = () => arg0.value;
        return arg0;
    }

    visitFormat<TOutput>(expression: FormatExpression<TOutput>): FormatExpression<TOutput>
    {
        const getter = this.getter;
        this.visit(expression.lhs);
        const source = this.getter;
        this.getter = getter;
        this.getter = BuildWatcherAndSetter.formatWatcher(source, this, expression).getter;
        return expression;
    }

    public visitMember<T1, TMember extends keyof T1>(arg0: MemberExpression<T1, TMember, T1[TMember]>): StrictExpressions
    {
        if (arg0.source)
            this.visit(arg0.source);

        const getter = this.getter;

        if (typeof arg0.member == 'undefined' || arg0.member === null)
            return arg0;

        const member = new EvaluatorAsFunction().eval<PropertyKey>(this.visit(arg0.member));
        this.getter = BuildWatcherAndSetter.memberWatcher(getter, member);

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
        const result: (WatchGetter<object, [PropertyKey, any]>)[] | (WatchGetter<object, any>)[] = [];
        const evaluator = new EvaluatorAsFunction();
        this.visitEnumerable(expression.init, () => { }, (arg0) =>
        {
            this.visit(arg0.source);
            const getter = this.getter;
            switch (expression.newType)
            {
                case '{':
                    const member = evaluator.eval<PropertyKey>(this.visit(arg0.member));
                    this.getter = source;
                    result.push((target, watcher) => [member(target), getter(target, watcher)] as const)
                    break;
                case '[':
                    result.push((target, watcher) => getter(target, watcher) as any)
                    break;
            }
            this.getter = source;

            return arg0;
        });

        switch (expression.newType)
        {
            case "{":
                this.getter = (target, watcher) =>
                {
                    return Object.fromEntries(result.map(r => r(target, watcher)));
                };
                break;
            case "[":
                this.getter = (target, watcher) =>
                {
                    return result.map(r => r(target, watcher));
                };
                break;
            default:
                throw new Error('Invalid new type');
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

export type Watcher = EventEmitter<{ 'change': Event<[source?: object]> }>;

type ObservableType<T extends object> = Record<keyof T, IEvent<[ObjectEvent<T>], void>>;

export type BindingChangedEvent<T> = { value: T, oldValue: T };

export const BindingsProperty = Symbol('BindingsProperty');

type Bound<T> = T extends Binding<infer X> ? T : Binding<T>;
type Unbound<T> = T extends Binding<infer X> ? X : T;
type UnboundObject<T extends object> = { [K in keyof T]?: Unbound<T[K]> }

export class Binding<T> extends EventEmitter<{
    change: Event<[BindingChangedEvent<T>]>
}> 
{
    public static combineNamed<T extends { [K in keyof T]?: T[K] | Binding<T[K]> }>(obj: T): Binding<UnboundObject<T>>
    {
        const entries = Object.entries(obj);
        return Binding.combine(...entries.map(e => e[1])).pipe(ev =>
        {
            return Object.fromEntries(entries.map((e, i) => [e[0], ev.value[i]])) as UnboundObject<T>;
        })
    }
    public static combine<T extends unknown[]>(...bindings: { [K in keyof T]?: T[K] | Binding<T[K]> }): Binding<T>
    {
        const combinedBinding = new EmptyBinding<T>();
        let values: T;

        bindings = bindings.map(b => b instanceof Binding ? b : new EmptyBinding(b));

        const subs: Subscription[] = []
        bindings.forEach((binding, index) =>
        {
            subs.push((binding as Bound<T[typeof index]>)?.onChanged(ev =>
            {
                if (!values)
                    values = [] as T;
                values[index] = ev.value;
                combinedBinding.emit('change', { value: values, oldValue: null });
            }));
        });

        combinedBinding.getValue = () => (values = bindings.map(b => (b as Binding<unknown>).getValue()) as T);
        combinedBinding.setValue = (newValues: T) =>
        {
            newValues.forEach((value, index) =>
            {
                values[index] = value;
                (bindings[index] as Bound<T[typeof index]>)?.setValue(value);
            });
        };
        combinedBinding.onChanged = (handler, triggerOnRegister) =>
        {
            if (triggerOnRegister)
            {
                if (!values)
                    values = bindings.map(b => (b as Binding<unknown>).getValue()) as T;

            }
            return Binding.prototype.onChanged.call(combinedBinding, handler, triggerOnRegister);
        }

        combinedBinding.on(Symbol.dispose, () =>
        {
            subs.forEach(sub => sub?.());
        })

        return combinedBinding;
    }

    static hasBoundProperty<T extends {}>(target: T, property: PropertyKey)
    {
        if (typeof target !== 'object')
            return false;
        if (!(BindingsProperty in target))
            return false;
        return !!target[BindingsProperty][property];
    }

    public static defineProperty<T = unknown>(target: object, property: PropertyKey, value?: T): Binding<T>
    {
        if (!(BindingsProperty in target))
            target[BindingsProperty] = {};
        if (target[BindingsProperty][property])
            return target[BindingsProperty][property];



        // const binding = new Binding<T>(target, typeof property == 'symbol' ? new MemberExpression(null, new ConstantExpression(property), false) : new Parser().parse(property));
        const binding = value instanceof Binding ? value : new EmptyBinding<T>();

        target[BindingsProperty][property] = binding;

        if (value === binding)
        {
            let settingValue = false;
            binding.setValue = function (newValue: T)
            {
                if (settingValue)
                    return;
                const oldValue = value;
                value = newValue;
                settingValue = true;
                // binding.setValue(newValue)//, binding);
                binding.emit('change', { value: newValue, oldValue });
                settingValue = false;
            }
        }

        Object.defineProperty(target, property, {
            get()
            {
                return value;
            }, set(newValue: T)
            {
                binding.setValue(newValue);
            }
        });

        return binding;
    }



    public pipe<const TKey extends keyof T>(expression: TKey): Binding<T[TKey]>
    public pipe<U>(expression: string | keyof T | Expressions | ((ev: BindingChangedEvent<T>) => U)): Binding<U>
    public pipe<U>(expression: string | keyof T | Expressions | ((ev: BindingChangedEvent<T>) => U)): Binding<U>
    {
        if (typeof expression == 'function')
        {
            const formatter = expression;
            const binding = new EmptyBinding(undefined);
            let initialized = false;
            binding.getValue = () =>
            {
                if (!initialized)
                {
                    initialized = true;
                    binding.setValue(formatter({ value: this.getValue(), oldValue: undefined }))
                }
                return EmptyBinding.prototype.getValue.call(binding);
            }
            binding.onChanged = (handler, triggerOnRegister) =>
            {
                const sub = Binding.prototype.onChanged.call(binding, handler, false);
                if (triggerOnRegister)
                    handler({ value: binding.getValue(), oldValue: undefined });

                return sub;
            }
            const sub = this.onChanged(ev => binding.setValue(formatter({ value: ev.value, oldValue: undefined })));
            binding.on(Symbol.dispose, () => sub());

            return binding;
        }
        if (typeof expression == 'string')
            expression = Parser.parameterLess.parse(expression);
        else if (typeof expression != 'object')
            expression = new MemberExpression(null, new ConstantExpression(expression), true);
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

    watcher: Watcher = new EventEmitter<{ change: Event<[source?: object]> }>(Number.POSITIVE_INFINITY);

    [Symbol.dispose]()
    {
        super[Symbol.dispose]();
        this.watcher[Symbol.dispose]();
    }

    constructor(public target: unknown, public readonly expression: Expressions)
    {
        super();
        if (target instanceof Binding)
            if (!expression)
                return target;
            else if (target instanceof EmptyBinding)
            { }
            else return Binding.simplify(target, expression)
        this.set('change', new Event(Number.POSITIVE_INFINITY));
        if (expression)
        {
            let value: T;
            this.watcher.on('change', (x) =>
            {
                if (x)
                {
                    // this.watcher[Symbol.dispose]();
                    // this.watcher = new EventEmitter();
                    value = watcherAndSetter.watcher(target, this.watcher);
                }
                const oldValue = value;
                value = watcherAndSetter.watcher(this.target, null);
                // value = this.getValue();
                if (isPromiseLike(value))
                    value.then(v => this.emit('change', { value: v, oldValue }))
                else
                    this.emit('change', { value, oldValue });
            })
            const watcherAndSetter = new BuildWatcherAndSetter().eval<T>(expression);
            this.attachWatcher = watcherAndSetter.watcher;
            value = watcherAndSetter.watcher(target, this.watcher);
            if (watcherAndSetter.setter)
                this._setter = watcherAndSetter.setter;
            this.getValue = () => value;
        }
        else
        {
            this.getValue = () => this.target as T;
            this._setter = () => { throw new ErrorWithStatus(HttpStatusCode.MethodNotAllowed, 'There is no expression, thus you cannot set the value') }
        }
    }
    static simplify<T>(target: Binding<any>, expression: Expressions): Binding<T> | null
    {
        return new Binding(target.target, target.expression === null ? expression : new ExpressionSimplifyer(target.expression).visit(expression))
    }

    private readonly attachWatcher: WatchGetter<unknown, T>;

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

    private _setter?: (target: unknown, value: T) => void

    public onChanged(handler: (ev: { value: T, oldValue: T }) => void, triggerOnRegister?: boolean)
    {
        const sub = this.on('change', handler);
        if (triggerOnRegister)
            handler({ value: this.getValue(), oldValue: null })
        return sub;
    }

    public setValue(value: T)
    {
        this._setter(this.target, value);
        // this.emit('change', { value, oldValue: this.getValue() });
    }

    public getValue(): T
    {
        if (!this.expression)
            return this.target as T;
        return this.attachWatcher(this.target, null);
    }
}

export class EmptyBinding<T> extends Binding<T>
{
    constructor(initialValue?: T)
    {
        super(initialValue, null);
        this.getValue = EmptyBinding.prototype.getValue;
        this.setValue = EmptyBinding.prototype.setValue;
    }

    public getValue(): T
    {
        return this.target as T;
    }

    public setValue(newValue: T): void
    {
        const oldValue = this.target as T;
        this.target = newValue;
        // if (value !== oldValue)
        this.emit('change', { oldValue, value: newValue });
    }
}


export class ObservableObject<T extends object> extends EventEmitter<ObservableType<T>>
{
    static unwrap<T>(arg0: T): T extends ObservableObject<infer X> ? X : T
    {
        if (arg0 instanceof ObservableObject)
            return arg0.target;
        return arg0 as any;
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

    public static watchAll<T extends object>(obj: T, watcher: Watcher): Subscription
    {
        if (Array.isArray(obj))
        {
            const oa = new ObservableArray(obj)
            const sub = ObservableObject.watchAll(oa, watcher);
            return sub;
        }

        let sub: Subscription;
        if (obj instanceof ObservableArray)
        {
            const subs: Subscription[] = []
            watcher.on(Symbol.dispose, sub = obj.addListener(ev =>
            {
                watcher.emit('change', obj);
                switch (ev.action)
                {
                    case "pop":
                        ev.oldItems.forEach(x => { subs.pop()(); });
                        break;
                    case "init":
                    case "push":
                        subs.push(...ev.newItems.map(x => ObservableObject.watchAll(x, watcher)))
                        break;
                    case "shift":
                        ev.oldItems.forEach(x => { subs.shift()(); });
                        break;
                    case "unshift":
                        subs.unshift(...ev.newItems.map(x => ObservableObject.watchAll(x, watcher)))
                        break;
                    case "replace":
                        ev.replacedItems.forEach(x =>
                        {
                            subs.splice(x.index, 1, ObservableObject.watchAll(x.newItem, watcher))[0]?.();
                        })
                        break;
                }
            }, { triggerAtRegistration: true }));
            return () =>
            {
                const result = sub();
                subs.forEach(s => s());
                return result;
            };
        }
        if (obj instanceof Binding)
        {
            watcher.on(Symbol.dispose, sub = obj.onChanged(ev => watcher.emit('change', obj)));
            return sub;
        }

        const oo = new ObservableObject(obj);
        Object.entries(obj).forEach(e =>
        {
            oo.watch(watcher, e[0] as keyof T);
            if (typeof e[1] == 'object')
                ObservableObject.watchAll(e[1], watcher);
        });
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

    public static isWatched<T>(x: T): x is IWatched<T & object> 
    {
        return typeof x == 'object' && (watcher in x);
    }

    public static setValue<T extends object, const TKey extends keyof T>(target: Binding<T>, expression: TKey, value: T[TKey])
    public static setValue<T extends object>(target: Binding<T>, expression: string, value: any)
    public static setValue<T extends object>(target: Binding<T>, expression: Expressions, value: any)
    public static setValue<T extends object, const TKey extends keyof T>(target: T, expression: TKey, value: T[TKey])
    public static setValue<T extends object>(target: T, expression: string, value: any)
    public static setValue<T extends object>(target: T, expression: Expressions, value: any)
    public static setValue<T extends object>(target: T, expression: Expressions | PropertyKey, value: any)
    {
        if (typeof expression != 'object')
            if (typeof expression == 'string')
                expression = Parser.parameterLess.parse(expression, true);
            else
                expression = new MemberExpression<T, keyof T, T[keyof T]>(null, new ConstantExpression(expression as keyof T), true);

        const evaluator = new BuildWatcherAndSetter().eval(expression);
        if (evaluator.setter)
            evaluator.setter(target, value);
        else
            throw new ErrorWithStatus(HttpStatusCode.MethodNotAllowed, 'This expression is not supported to apply reverse binding')
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

    public static getValue<T, const TKey extends keyof T>(target: Binding<T>, property: TKey): T[TKey]
    public static getValue<T, const TKey extends keyof T>(target: T, property: TKey): T[TKey]
    public static getValue<T, const TKey extends keyof T>(target: T, property: TKey): T[TKey]
    {
        let result: T[TKey];
        if (target instanceof Binding)
            result = target.getValue()?.[property];
        else if (Binding.hasBoundProperty(target, property))
            result = target[BindingsProperty][property].getValue();
        else
            result = target[property];

        if (typeof result == 'object')
            if (Array.isArray(result))
                return new ObservableArray(result) as T[TKey];
            else
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