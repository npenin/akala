import { map } from "../each.js";
import { EventEmitter } from "../events/event-emitter.js";
import { Event, type EventListener, type IEvent } from "../events/shared.js";
import { type Formatter, formatters, isReversible, type ReversibleFormatter } from "../formatters/index.js";
import { type AllEventKeys, ErrorWithStatus, FormatExpression, HttpStatusCode, isPromiseLike, ObservableArray, Parser } from "../index.js";
import { EvaluatorAsFunction, type ParsedFunction } from "../parser/evaluator-as-function.js";
import { BinaryExpression } from "../parser/expressions/binary-expression.js";
import { BinaryOperator } from "../parser/expressions/binary-operator.js";
import { CallExpression } from "../parser/expressions/call-expression.js";
import { ConstantExpression } from "../parser/expressions/constant-expression.js";
import { ExpressionVisitor } from "../parser/expressions/visitors/expression-visitor.js";
import type { Expressions, StrictExpressions } from "../parser/expressions/expression.js";
import { MemberExpression } from "../parser/expressions/member-expression.js";
import { NewExpression } from "../parser/expressions/new-expression.js";
import { ParameterExpression } from "../parser/expressions/parameter-expression.js";
import { TernaryExpression } from "../parser/expressions/ternary-expression.js";
import { TernaryOperator } from "../parser/expressions/ternary-operator.js";
import { ExpressionSimplifyer } from "../parser/expressions/visitors/expression-simplifyer.js";
import { combineSubscriptions, type Subscription } from "../teardown-manager.js";
import { watcher, type Watcher, WatcherFormatter } from './shared.js'
import { AssignmentExpression } from "../parser/expressions/assignment-expression.js";
import { AssignmentOperator } from "../parser/expressions/assignment-operator.js";
import { ExpressionType } from "../parser/expressions/expression-type.js";

export interface ObjectEvent<T, TKey extends keyof T>
{
    readonly property: TKey;
    readonly value: T[TKey];
    readonly oldValue: T[TKey];
}

export class AsyncFormatter extends WatcherFormatter
{
    private promise: PromiseLike<unknown>;
    private value: unknown;

    /**
     * Formats the value.
     * @param {unknown} value - The value to format.
     * @returns {unknown} The formatted value.
     */
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

    /**
     * Creates an instance of AsyncFormatter.
     * @param {Watcher} [watcher] - The watcher instance.
     */
    constructor(watcher?: Watcher)
    {
        super(watcher);
    }
}

formatters.register('async', AsyncFormatter);

export class EventFormatter<T extends unknown[]> extends WatcherFormatter
{
    private event: Event<T>;
    private value: T;
    private sub?: Subscription;

    /**
     * Formats the value.
     * @param {unknown} value - The value to format.
     * @returns {T} The formatted value.
     */
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

    /**
     * Creates an instance of EventFormatter.
     * @param {Watcher} watcher - The watcher instance.
     */
    constructor(watcher: Watcher)
    {
        super(watcher);
    }
}

formatters.register('event', EventFormatter);


export default class Watch<T extends object> extends WatcherFormatter
{
    private value: T;

    /**
     * Formats the value.
     * @param {T} value - The value to format.
     * @returns {T} The formatted value.
     */
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

formatters.register('watch', Watch);

export class BindingFormatter extends WatcherFormatter
{
    private binding: Binding<unknown> = new EmptyBinding();
    private sub: Subscription;
    private value: unknown;

    /**
     * Formats the value.
     * @param {unknown} value - The value to format.
     * @returns {unknown} The formatted value.
     */
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

    /**
     * Creates an instance of BindingFormatter.
     * @param {Watcher} watcher - The watcher instance.
     */
    constructor(watcher: Watcher)
    {
        super(watcher);
    }
}

formatters.register('unbind', BindingFormatter);

// export interface IWatched<T>
// {
//     $$watchers?: { [key in keyof T]?: T[key] & ObservableObject<T[key]> };
// }

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
                change.pipe(watcher.getOrCreate('change'));
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

    /**
     * Evaluates the expression.
     * @param {Expressions} expression - The expression to evaluate.
     * @returns {{ watcher: WatchGetter<T, TValue>, setter?: Setter<T, TValue> }} The watcher and setter.
     */
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
            case 'assign':
                if (expression.left.type == ExpressionType.MemberExpression)
                {
                    this.getter = getter;
                    setter = null;
                    if (expression.left.source)
                        this.visit(expression.left.source);
                    const upToBeforeLastGetter = this.getter;
                    this.getter = getter;
                    this.visit(expression.right);
                    const rhs = this.getter;
                    const internalSetter: WatchGetter<unknown, void> = function (target, watcher)
                    {
                        switch (expression.operator)
                        {
                            case AssignmentOperator.Equal:
                                ObservableObject.setValue(upToBeforeLastGetter(target, null) as object, expression.left.member, rhs(target, watcher));
                                break;
                            case AssignmentOperator.NullCoaleasce:
                            case AssignmentOperator.Unknown:
                                throw new ErrorWithStatus(HttpStatusCode.NotImplemented, 'Not implemented/supported ' + expression.operator);

                        }
                    }
                    this.getter = (target, watcher) =>
                    {
                        return internalSetter(target, watcher)
                    };
                }
                else if (expression.left.type == ExpressionType.ConstantExpression)
                {
                    if (expression.left.value instanceof Binding)
                    {
                        setter = null;
                        this.visit(expression.right);
                        const rhs = this.getter;
                        this.getter = function (target, watcher)
                        {
                            const value = rhs(target, watcher);
                            if (value instanceof Binding)
                                return function () { (expression.left.value as Binding<unknown>).setValue(value.getValue()) };

                            return function () { (expression.left.value as Binding<unknown>).setValue(value) };
                        }
                    }
                    else
                        throw new ErrorWithStatus(HttpStatusCode.BadRequest, 'Cannot set a constant value ' + expression.left.value);
                }
                break;
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

    /**
     * Visits a constant expression.
     * @param {ConstantExpression<unknown>} arg0 - The constant expression.
     * @returns {StrictExpressions} The visited expression.
     */
    visitConstant(arg0: ConstantExpression<unknown>): StrictExpressions
    {
        let sub;
        this.getter = (target, watcher) =>
        {
            if (arg0.value instanceof Binding)
            {
                if (!sub)
                {
                    sub = arg0.value.onChanged(ev => watcher.emit('change', arg0.value as object));
                    watcher.on(Symbol.dispose, sub);
                }
                return arg0.value.getValue();
            }
            return arg0.value;
        };
        return arg0;
    }

    /**
     * Visits a format expression.
     * @param {FormatExpression<TOutput>} expression - The format expression.
     * @returns {FormatExpression<TOutput>} The visited expression.
     */
    visitFormat<TOutput>(expression: FormatExpression<TOutput>): FormatExpression<TOutput>
    {
        const getter = this.getter;
        this.visit(expression.lhs);
        const source = this.getter;
        this.getter = getter;
        this.getter = BuildWatcherAndSetter.formatWatcher(source, this, expression).getter;
        return expression;
    }

    /**
     * Visits a member expression.
     * @param {MemberExpression<T1, TMember, T1[TMember]>} arg0 - The member expression.
     * @returns {StrictExpressions} The visited expression.
     */
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

    /**
     * Visits a ternary expression.
     * @param {TernaryExpression<T>} expression - The ternary expression.
     * @returns {TernaryExpression<Expressions>} The visited expression.
     */
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

    /**
     * Visits a call expression.
     * @param {CallExpression<T, TMethod>} arg0 - The call expression.
     * @returns {StrictExpressions} The visited expression.
     */
    visitCall<T, TMethod extends keyof T>(arg0: CallExpression<T, TMethod>): StrictExpressions
    {
        const getter = this.getter;
        if (arg0.source)
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

                if (arg0.optional)
                    return f?.[member(target)]?.apply(f, argGetters.map(g => g(target, watcher)));

                return f?.[member(target)].apply(f, argGetters.map(g => g(target, watcher)));
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

    /**
     * Visits a new expression.
     * @param {NewExpression<T>} expression - The new expression.
     * @returns {StrictExpressions} The visited expression.
     */
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




    /**
     * Visits a binary expression.
     * @param {BinaryExpression<T>} expression - The binary expression.
     * @returns {BinaryExpression<Expressions>} The visited expression.
     */
    visitAssign<T extends Expressions = StrictExpressions>(expression: AssignmentExpression<T>): AssignmentExpression<Expressions>
    {
        const source = this.getter;
        this.visit(expression.left);
        const left = this.getter;
        this.getter = source;
        this.visit(expression.right);
        const right = this.getter;
        switch (expression.operator)
        {
            case AssignmentOperator.Equal: this.getter = (target, watcher) => left(target, watcher) == right(target, watcher); break;
            case AssignmentOperator.NullCoaleasce: this.getter = (target, watcher) => left(target, watcher) == right(target, watcher); break;
            case AssignmentOperator.Unknown:
            default:
                throw new ErrorWithStatus(HttpStatusCode.NotImplemented, 'Not implemented/supported ' + expression.operator);
        }
        return expression;
    }




    /**
     * Visits a binary expression.
     * @param {BinaryExpression<T>} expression - The binary expression.
     * @returns {BinaryExpression<Expressions>} The visited expression.
     */
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
                throw new ErrorWithStatus(HttpStatusCode.NotImplemented, 'Not implemented/supported ' + expression.operator);
        }
        return expression;
    }
}


type ObservableType<T extends object> =
    { [key in Exclude<keyof T, typeof allProperties>]: IEvent<[ObjectEvent<T, key>], void> } &
    { [allProperties]: IEvent<[ObjectEvent<T, keyof T>], void> };

export type BindingChangedEvent<T> = { value: T, oldValue: T };

export const BindingsProperty = Symbol('BindingsProperty');

type Bound<T> = T extends Binding<infer X> ? T : Binding<T>;
type Unbound<T> = T extends Binding<infer X> ? X : T;
type UnboundObject<T extends object> = { [K in keyof T]?: Unbound<T[K]> }

export class Binding<T> extends EventEmitter<{
    change: Event<[BindingChangedEvent<T>]>
}> 
{
    /**
     * Combines named bindings.
     * @param {T} obj - The object with named bindings.
     * @returns {Binding<UnboundObject<T>>} The combined binding.
     */
    public static combineNamed<T extends { [K in keyof T]?: T[K] | Binding<T[K]> }>(obj: T): Binding<UnboundObject<T>>
    {
        const entries = Object.entries(obj);
        return Binding.combine(...entries.map(e => e[1])).pipe(ev =>
        {
            return Object.fromEntries(entries.map((e, i) => [e[0], ev.value[i]])) as UnboundObject<T>;
        })
    }

    /**
     * Combines multiple bindings.
     * @param {...(T[K] | Binding<T[K]>)[]} bindings - The bindings to combine.
     * @returns {Binding<T>} The combined binding.
     */
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

        combinedBinding.on(Symbol.dispose, combineSubscriptions(...subs))

        return combinedBinding;
    }

    /**
     * Checks if a target has a bound property.
     * @param {T} target - The target object.
     * @param {PropertyKey} property - The property key.
     * @returns {boolean} True if the target has a bound property, false otherwise.
     */
    static hasBoundProperty<T extends {}>(target: T, property: PropertyKey)
    {
        if (typeof target !== 'object')
            return false;
        if (!(BindingsProperty in target))
            return false;
        return !!target[BindingsProperty][property];
    }

    /**
     * Defines a property on the target object.
     * @param {object} target - The target object.
     * @param {PropertyKey} property - The property key.
     * @param {T} [value] - The initial value.
     * @returns {Binding<T>} The defined binding.
     */
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
            Object.defineProperty(binding, 'canSet', { value: true });
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

        let bindingValueSubscription: Subscription;

        Object.defineProperty(target, property, {
            get()
            {
                return value;
            }, set(newValue: T)
            {
                if (newValue instanceof Binding)
                {
                    bindingValueSubscription?.();

                    bindingValueSubscription = newValue.onChanged(ev =>
                    {
                        binding.setValue(ev.value);
                    }, true);

                    binding.teardown(bindingValueSubscription);
                }
                else
                    binding.setValue(newValue);
            }
        });

        return binding;
    }

    /**
     * Pipes the binding to another expression.
     * @param {TKey | string | Expressions | ((ev: BindingChangedEvent<T>) => U)} expression - The expression to pipe to.
     * @returns {Binding<U>} The piped binding.
     */
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
        const binding = new Binding<U>(this, expression as Expressions);

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

    /**
     * Creates an instance of Binding.
     * @param {unknown} target - The target object.
     * @param {Expressions} expression - The expression.
     */
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
                const oldValue = value;
                if (x)
                {
                    // this.watcher[Symbol.dispose]();
                    // this.watcher = new EventEmitter();
                    value = watcherAndSetter.watcher(target, this.watcher);
                }
                else
                    value = watcherAndSetter.watcher(this.target, null);
                // value = this.getValue();
                if (isPromiseLike(value))
                    value.then(v =>
                    {
                        if (oldValue !== v)
                            this.emit('change', { value: v, oldValue })
                    })
                else if (value !== oldValue)
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

    /**
     * Simplifies the binding.
     * @param {Binding<any>} target - The target binding.
     * @param {Expressions} expression - The expression.
     * @returns {Binding<T> | null} The simplified binding.
     */
    static simplify<T>(target: Binding<any>, expression: Expressions): Binding<T> | null
    {
        return new Binding(target.target, target.expression === null ? expression : new ExpressionSimplifyer(target.expression).visit(expression))
    }

    private readonly attachWatcher: WatchGetter<unknown, T>;

    /**
     * Unwraps the element.
     * @param {T} element - The element to unwrap.
     * @returns {Partial<T>} The unwrapped element.
     */
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

    /**
     * Registers a handler for the change event.
     * @param {(ev: { value: T, oldValue: T }) => void} handler - The event handler.
     * @param {boolean} [triggerOnRegister] - Whether to trigger the handler on registration.
     * @returns {Subscription} The subscription.
     */
    public onChanged(handler: (ev: { value: T, oldValue: T }) => void, triggerOnRegister?: boolean)
    {
        const sub = this.on('change', handler);
        if (triggerOnRegister)
            handler({ value: this.getValue(), oldValue: null })
        return sub;
    }

    /**
     * Sets the value.
     * @param {T} value - The value to set.
     */
    public setValue(value: T)  
    {
        this._setter(this.target, value);
        // this.emit('change', { value, oldValue: this.getValue() });
    }

    public get canSet() { return !!this._setter; }

    /**
     * Gets the value.
     * @returns {T} The value.
     */
    public getValue(): T
    {
        if (!this.expression)
            return this.target as T;
        return this.attachWatcher(this.target, null);
    }
}

export class EmptyBinding<T> extends Binding<T>
{
    /**
     * Creates an instance of EmptyBinding.
     * @param {T} [initialValue] - The initial value.
     */
    constructor(initialValue?: T)
    {
        super(initialValue, null);
        this.getValue = EmptyBinding.prototype.getValue;
        this.setValue = EmptyBinding.prototype.setValue;
    }

    override get canSet(): boolean
    {
        return true;
    }

    /**
     * Gets the value.
     * @returns {T} The value.
     */
    public getValue(): T
    {
        return this.target as T;
    }

    /**
     * Sets the value.
     * @param {T} newValue - The value to set.
     */
    public setValue(newValue: T): void
    {
        const oldValue = this.target as T;
        this.target = newValue;
        // if (value !== oldValue)
        this.emit('change', { oldValue, value: newValue });
    }
}

export const allProperties = Symbol('*');

/**
 * Observable object implementation.
 * @param {Object} initialObject - The initial object.
 */
export class ObservableObject<T extends object> extends EventEmitter<ObservableType<T>>
{
    /**
     * Unwraps the target object.
     * @param {T} arg0 - The target object.
     * @returns {T extends ObservableObject<infer X> ? X : T} The unwrapped object.
     */
    static unwrap<T>(arg0: T): T extends ObservableObject<infer X> ? X : T
    {
        if (arg0 instanceof ObservableObject)
            return arg0.target;
        return arg0 as any;
    }

    /**
     * Generates a dynamic proxy that gets and sets values from target, but triggers notifications on set. 
     */
    public static wrap<T extends object>(target: T): IWatched<T>
    {
        return new Proxy(new ObservableObject(target), {
            get(observableTarget, property)
            {
                if (property === watcher)
                    return observableTarget;
                return observableTarget.getValue(property as keyof T);
            },
            set(observableTarget, property, value)
            {
                return observableTarget.setValue(property as keyof T, value);
            }
        }) as any;
    }

    public readonly target: T & IWatchable<T>;

    /**
     * Creates an instance of ObservableObject.
     * @param {T & { [watcher]?: ObservableObject<T> } | ObservableObject<T>} target - The target object.
     */
    constructor(target: (T & IWatchable<T>) | ObservableObject<T>)
    {
        super(Number.POSITIVE_INFINITY);
        if (target instanceof ObservableObject)
            return target;
        if (ObservableObject.isWatched<T>(target))
            return target[watcher];
        this.target = target;
        Object.defineProperty(target, watcher, { value: this, enumerable: false, configurable: false })
    }

    /**
     * Watches all properties of the object.
     * @param {T} obj - The object to watch.
     * @param {Watcher} watcher - The watcher instance.
     * @returns {Subscription} The subscription.
     */
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
        watcher.on(Symbol.dispose, sub = oo.on(allProperties as AllEventKeys<ObservableType<T>>, (() =>
        {
            watcher.emit('change', obj);
        }) as any));
        Object.entries(obj).forEach(e =>
        {
            if (typeof e[1] == 'object')
                ObservableObject.watchAll(e[1], watcher);
        });
    }

    /**
     * Watches a property of the object.
     * @param {Watcher} watcher - The watcher instance.
     * @param {TKey} property - The property to watch.
     * @returns {Subscription} The subscription.
     */
    public watch<const TKey extends AllEventKeys<ObservableType<T>>>(watcher: Watcher, property: TKey)
    {
        const sub = this.on(property, (ev =>
        {
            watcher.emit('change');
        }) as EventListener<ObservableObject<T>['events'][TKey]>);
        watcher.once(Symbol.dispose, sub);
        return sub;
    }

    // private setters: { [key in keyof T]?: (target: T, value: T[key]) => void } = {};

    /**
     * Checks if an object is watched.
     * @param {T} x - The object to check.
     * @returns {boolean} True if the object is watched, false otherwise.
     */
    public static isWatched<T>(x: T): x is IWatched<T & object> 
    {
        return typeof x == 'object' && x && (watcher in x);
    }

    /**
     * Sets the value of a property.
     * @param {Binding<T> | T} target - The target object or binding.
     * @param {Expressions | PropertyKey} expression - The expression or property key.
     * @param {any} value - The value to set.
     */
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

    /**
     * Sets the value of a property.
     * @param {TKey} property - The property key.
     * @param {T[TKey]} value - The value to set.
     * @returns {boolean} True if the value was set, false otherwise.
     */
    public setValue<const TKey extends keyof T>(property: TKey, value: T[TKey])
    {
        const oldValue = this.target[property];
        this.target[property] = value;

        // This one is specific to the property
        this.emit(property as AllEventKeys<ObservableType<T>>, ...[{
            property,
            value,
            oldValue
        }] as any); // or a tighter type if desired

        // This one is for the `*` symbol (allProperties)
        this.emit(allProperties as AllEventKeys<ObservableType<T>>, ...[{
            property,
            value,
            oldValue
        } as ObjectEvent<T, TKey>] as any); // it's the same shape

        return true;
    }


    /**
     * Gets the value of a property.
     * @param {TKey} property - The property key.
     * @returns {T[TKey]} The value of the property.
     */
    public getValue<const TKey extends keyof T>(property: TKey): T[TKey]
    {
        return ObservableObject.getValue(this.target, property);
    }

    /**
     * Gets the value of a property.
     * @param {Binding<T> | T} target - The target object or binding.
     * @param {TKey} property - The property key.
     * @returns {T[TKey]} The value of the property.
     */
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
            if (Array.isArray(result) || result instanceof ObservableArray)
                return new ObservableArray(result) as T[TKey];
            else if (result !== null)
                return new ObservableObject(result).target as T[TKey];
        return result;
    }

    /**
     * Gets the observable object for a property.
     * @param {TKey} property - The property key.
     * @returns {ObservableObject<T[TKey]> | null} The observable object or null.
     */
    public getObservable<const TKey extends keyof T>(property: TKey): T[TKey] extends object ? ObservableObject<T[TKey]> : null
    {
        if (typeof this.target[property] == 'object')
            return new ObservableObject(this.target[property] as object) as unknown as T[TKey] extends object ? ObservableObject<T[TKey]> : null;
        return null;
    }

    /**
     * Gets the value of a property.
     * @param {T} target - The target object.
     * @param {keyof T} property - The property key.
     * @returns {T[keyof T]} The value of the property.
     */
    public static get<T>(target: T, property: keyof T)
    {
        return target[property];
    }
}
