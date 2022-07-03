import { Parser } from './parser';
import { EventEmitter } from 'events';
import { isPromiseLike } from './promiseHelpers';
import * as formatters from './formatters/index';
import { map } from './each'
import { Formatter } from './formatters/common';
import { ExtendableEvent } from './module'
import { Arguments } from './type-helper';
import { ParsedFunction } from '.';
export interface IWatched extends Object
{
    $$watchers?: { [key: string]: Binding<unknown> };
}

export interface EventArgs<T = unknown>
{
    source: Binding<T>;
    error?: unknown;
    fieldName: string;
    value: T;
}

export class BindingExtendableEvent<T> extends ExtendableEvent<EventArgs<T>>
{
    constructor(public target: unknown)
    {
        super(false);
    }
}

interface BindingEventArgs<T = unknown>
{
    target: IWatched;
    eventArgs: EventArgs<T>
}

export type Bound<T> = { [key in keyof T]: Binding<T[key]> }
export type PossiblyBound<T> = { [key in keyof T]: T[key] | Binding<T[key]> }

export class Binding<T>
{
    public static defineProperty(target: unknown, property: string | symbol, value?: unknown)
    {
        const binding = new Binding(property.toString(), target);
        Object.defineProperty(target, property, {
            get()
            {
                return value;
            }, set(newValue: unknown)
            {
                value = newValue;
                binding.setValue(newValue, binding);
            }
        });

        return binding;
    }

    public static readonly ChangingFieldEventName = "fieldChanging";
    public static readonly ChangedFieldEventName = "fieldChanged";
    public static readonly ErrorEventName = "bindingError";

    public static unbindify<T>(element: T): Partial<T>
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
                    return Binding.unbindify(value);
            }
            else
                return value;
        })
    }

    constructor(protected _expression: string, private _target: IWatched, register = true)
    {
        this.formatter = formatters.identity as Formatter<T>;
        this.evaluator = Parser.evalAsFunction(_expression) as ParsedFunction;
        this.onChangingEvent = new BindingExtendableEvent(this);
        this.onChangedEvent = new BindingExtendableEvent(this);
        this.onErrorEvent = new BindingExtendableEvent(this);
        this.onDisposeEvent = new ExtendableEvent(true);
        if (register)
            this.register();
    }

    protected onChangingEvent: BindingExtendableEvent<T>;
    protected onChangedEvent: BindingExtendableEvent<T>;
    protected onErrorEvent: BindingExtendableEvent<T>;
    protected onDisposeEvent: ExtendableEvent;

    public formatter: Formatter<T>;

    public get expression() { return this._expression; }
    public get target() { return this._target; }
    public set target(value) { this._target = value; this.register() }

    private evaluator: ParsedFunction;

    public onChanging(handler: (ev: BindingExtendableEvent<T>) => void)
    {
        return this.onChangingEvent.addHandler(handler);
    }

    public onChanged(handler: (args: BindingEventArgs<T>) => void, doNotTriggerHandler?: boolean)
    {
        const off = this.onChangedEvent.addHandler(handler);
        if (!doNotTriggerHandler)
        {
            handler({
                target: this.target,
                eventArgs: { fieldName: this.expression, value: this.getValue(), source: null }
            });
        }
        return off;
    }

    public onError(handler: (ev: BindingExtendableEvent<T>) => void)
    {
        return this.onErrorEvent.addHandler(handler);
    }

    private registeredBindings: Binding<T>[] = [];

    public pipe(binding: Binding<T>)
    {
        if (this.registeredBindings.indexOf(binding) > -1)
            return;
        this.registeredBindings.push(binding);
        const offChanging = this.onChanging(function (a: BindingExtendableEvent<T>)
        {
            if (a.eventArgs.source == binding || a.eventArgs.source === null)
                return;

            return binding.onChangingEvent.trigger(Object.assign({}, a.eventArgs, { value: binding.getValue() }));
        });
        const offChanged = this.onChanged(function (a: BindingExtendableEvent<T>)
        {
            if (a.eventArgs.source == binding || a.eventArgs.source === null)
                return;

            return binding.onChangedEvent.trigger(Object.assign({}, a.eventArgs, { value: binding.getValue() }));
        });
        const offError = this.onError(function (a)
        {
            if (a.eventArgs.source == binding || a.eventArgs.source === null)
                return;

            return binding.onErrorEvent.trigger(Object.assign({}, a.eventArgs, { value: binding.getValue() }));
        });
        var offDispose = this.onDisposeEvent.addHandler(async function ()
        {
            await binding.onDisposeEvent.trigger();
            if (offChanged)
                offChanged();
            if (offChanging)
                offChanging();
            if (offError)
                offError();

            if (offDispose)
                offDispose();
        });

    }

    //defined in constructor
    public getValue(): T
    {
        return this.formatter(this.evaluator(this.target, false));
    }

    public register()
    {
        let target = this.target;
        const parts = Parser.parseBindable(this.expression);
        while (parts.length > 0)
        {
            var part = parts.shift();
            if (target !== null && target !== undefined && typeof (target) == 'object')
            {
                if (!Object.getOwnPropertyDescriptor(target, '$$watchers'))
                {
                    try
                    {
                        Object.defineProperty(target, '$$watchers', { enumerable: false, writable: false, value: {}, configurable: true });
                    }
                    catch (e)
                    {
                        console.error('could not register watcher on ', target, 'this could lead to performance issues');
                    }
                }

                let watcher: Binding<T> = target.$$watchers && target.$$watchers[part] as Binding<T>;

                if (!watcher)
                {
                    if (isPromiseLike(target))
                    {
                        let subParts = part;
                        if (parts.length > 0)
                            subParts += '.' + parts.join('.');

                        watcher = new PromiseBinding<T>(subParts, target);
                    }
                    else if (target instanceof ObservableArray)
                    {
                        let initHandled = false;
                        target.on('collectionChanged', function (args: ObservableArrayEventArgs<unknown>)
                        {
                            if (args.action == 'init')
                            {
                                if (initHandled)
                                    return;
                                initHandled = true;
                            }


                            let subParts = part;
                            if (parts.length > 0)
                                subParts += '.' + parts.join('.');

                            for (const i in args.newItems)
                            {
                                new Binding(subParts, args.newItems[i]).pipe(this);
                            }
                        });

                        target.init();
                        return;
                    }
                    else
                        watcher = new Binding(part, target, false);

                    if (target.$$watchers)
                        target.$$watchers[part] = watcher;
                }

                watcher.pipe(this);

                if (watcher instanceof PromiseBinding)
                    return;
                target = watcher.getValue();

            }

        }
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function,@typescript-eslint/no-unused-vars
    public apply(elements, doNotRegisterEvents?: boolean) { }
    /*apply(elements, doNotRegisterEvents)
    {
        var val = this.getValue();
        var inputs = elements.filter(':input').val(val)
        var binding = this;
        if (!doNotRegisterEvents)
            inputs.change(function ()
            {
                binding.setValue($(this).val(), this);
            });
        elements.filter(':not(:input))').text(val);
    }*/

    public static getSetter<T>(target: IWatched, expression: string, source?: Binding<T>)
    {
        const parts = Parser.parseBindable(expression);
        return async function (value: T, doNotTriggerEvents?: boolean)
        {
            while (parts.length > 1)
            {
                if (!target && target !== '')
                    return;
                target = target[parts.shift()];
            }
            if (typeof target === 'undefined')
                return;
            if (typeof target.$$watchers == 'undefined')
                Object.defineProperty(target, '$$watchers', { enumerable: false, writable: false, value: {}, configurable: true });
            const watcher = target.$$watchers[parts[0]];
            const setter = Parser.getSetter(parts[0], target);
            if (setter === null)
                return;

            if (!doNotTriggerEvents)
            {
                try
                {
                    if (watcher)
                        await watcher.onChangingEvent.trigger({ fieldName: setter.expression, value, source });
                }
                catch (e)
                {
                    await watcher.onErrorEvent.trigger({ error: e, fieldName: setter.expression, value, source });
                    throw e;
                }
            }

            setter.set(value);

            if (watcher && !doNotTriggerEvents)
                try
                {
                    await watcher.onChangedEvent.trigger({
                        fieldName: setter.expression,
                        value: value,
                        source
                    });
                }
                catch (e)
                {
                    await watcher.onErrorEvent.trigger({ error: e, fieldName: setter.expression, value, source });
                    throw e;
                }
        };
    }

    public setValue(value: T, source?: Binding<T>, doNotTriggerEvents?: boolean)
    {
        const setter = Binding.getSetter<T>(this.target, this.expression, source || this);

        if (setter != null)
            setter(value, doNotTriggerEvents);

    }
}

export class PromiseBinding<T> extends Binding<T>
{
    constructor(expression: string, target: PromiseLike<IWatched>)
    {
        super(expression, null, false);
        const binding = new Binding<T>(expression, null);
        binding.pipe(this);
        var callback = (value) =>
        {
            if (isPromiseLike(value))
            {
                value.then(callback);
                return;
            }
            binding.formatter = this.formatter;
            binding.target = value;

            this.onChangedEvent.trigger({
                fieldName: this.expression,
                value: this.getValue(),
                source: binding
            });
        };
        target.then(callback);
    }
}

if (typeof (Array.prototype['replace']) == 'undefined')
    Object.defineProperty(Array.prototype, 'replace', {
        value: function (index, item)
        {
            this[index] = item;
        }, configurable: true, writable: true, enumerable: false
    });


export type ObservableArrayPopEvent<T> =
    {
        action: 'pop'
        oldItems: T[]
    }

export type ObservableArrayPushEvent<T> =
    {
        action: 'push'
        newItems: T[]
    }

export type ObservableArrayShiftEvent<T> =
    {
        action: 'shift'
        oldItems: T[]
    }

export type ObservableArrayUnshiftEvent<T> =
    {
        action: 'unshift'
        newItems: T[]
    }
export type ObservableArrayReplaceEvent<T> =
    {
        action: 'replace'
        oldItems: T[]
        newItems: T[]
    };

export type ObservableArrayInitEvent<T> =
    {
        action: 'init';
        oldItems: T[];
        newItems: T[];
    }

export type ObservableArrayEventMap<T> = ObservableArrayPopEvent<T> | ObservableArrayPushEvent<T> | ObservableArrayShiftEvent<T> | ObservableArrayUnshiftEvent<T> | ObservableArrayReplaceEvent<T> | ObservableArrayInitEvent<T>;


export class ObservableArray<T> extends EventEmitter
{
    constructor(public array: Array<T>)
    {
        super();
    }

    public on(event: 'collectionChanged', handler: (args: ObservableArrayEventMap<T>) => void)
    {
        return super.on(event, handler);
    }

    public get length() { return this.array.length; }
    public set length(value: number)
    {
        const oldItems = this.array.slice(value);
        this.emit('collectionChanged', {
            action: 'pop',
            newItems: oldItems
        });
        this.array.length = value;
    }

    public push(...items: T[])
    {
        this.array.push(...items);
        this.emit('collectionChanged', {
            action: 'push',
            newItems: items
        });
    }


    public shift()
    {
        const item = this.array.shift();
        this.emit('collectionChanged', {
            action: 'shift',
            oldItems: [item]
        });
    }
    public pop()
    {
        const item = this.array.pop();
        this.emit('collectionChanged', {
            action: 'pop',
            oldItems: [item]
        });
    }
    public unshift = function (...items)
    {
        this.array.unshift(...items);
        this.emit('collectionChanged', {
            action: 'unshift',
            newItems: items
        });
    };
    public replace(index, item)
    {
        const oldItem = this.array[index];
        this.array['replace'](index, item);
        this.emit('collectionChanged', {
            action: 'replace',
            newItems: [item],
            oldItems: [oldItem]
        });
    }

    public init(): void
    {
        this.emit('collectionChanged', {
            action: 'init',
            newItems: this.array.slice(0)
        });
    }

    public indexOf(searchElement: T, fromIndex?: number): number
    public indexOf(...args: Arguments<typeof Array.prototype.indexOf>): ReturnType<typeof Array.prototype.indexOf>
    {
        return this.array.indexOf(...args);
    }

    public toString(): string
    {
        return this.array.toString();
    }
}

export interface ObservableArrayEventArgs<T>
{
    action: 'init' | 'push' | 'shift' | 'pop' | 'unshift' | 'replace';
    newItems?: T[];
    oldItems?: T[];
}

export class WatchBinding<T> extends Binding<T>
{
    constructor(expression: string, target: unknown, interval: number)
    {
        super(expression, target, true);
        setInterval(this.check.bind(this), interval);
    }

    private lastValue: T;

    private check()
    {
        const newValue = this.getValue();
        if (this.lastValue !== newValue)
        {
            this.lastValue = newValue;
            this.onChangedEvent.trigger({
                fieldName: this.expression,
                value: newValue,
                source: this
            });
        }
    }
}