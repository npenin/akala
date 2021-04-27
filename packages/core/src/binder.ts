import { Parser } from './parser.js';
import { EventEmitter } from 'events';
import { Promisify as promisify, isPromiseLike } from './promiseHelpers.js';
import * as formatters from './formatters/index.js';
import { array as eachAsync } from './eachAsync.js'
import { object as each, map } from './each.js'
import { Formatter } from './formatters/common.js';
import { ExtendableEvent } from './module.js'
import { Arguments } from './type-helper.js';
export interface IWatched extends Object
{
    $$watchers?: { [key: string]: Binding };
}

export interface EventArgs
{
    source: Binding;
    error?: any;
    fieldName: string;
    value: any;
}

export class BindingExtendableEvent extends ExtendableEvent<EventArgs>
{
    constructor(public target: any)
    {
        super(false);
    }
}

interface BindingEventArgs
{
    target: any;
    eventArgs: EventArgs
}

export class Binding 
{
    public static defineProperty(target: any, property: string | symbol, value?: any)
    {
        const binding = new Binding(property.toString(), target);
        Object.defineProperty(target, property, {
            get()
            {
                return value;
            }, set(newValue: any)
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
        return map(element, function (value, key)
        {
            if (typeof (value) == 'object')
            {
                if (value instanceof Binding)
                    return value.getValue();
                else
                    return Binding.unbindify(value) as any;
            }
            else
                return value;
        })
    }

    constructor(protected _expression: string, private _target: IWatched, register = true)
    {
        this.formatter = formatters.identity;
        this.onChangingEvent = new BindingExtendableEvent(this);
        this.onChangedEvent = new BindingExtendableEvent(this);
        this.onErrorEvent = new BindingExtendableEvent(this);
        this.onDisposeEvent = new ExtendableEvent(true);
        if (register)
            this.register();
    }

    protected onChangingEvent: BindingExtendableEvent;
    protected onChangedEvent: BindingExtendableEvent;
    protected onErrorEvent: BindingExtendableEvent;
    protected onDisposeEvent: ExtendableEvent;

    public formatter: Formatter<any>;

    public get expression() { return this._expression; }
    public get target() { return this._target; }
    public set target(value) { this._target = value; this.register() }

    private evaluator = Parser.evalAsFunction(this.expression)

    public onChanging(handler: (ev: BindingExtendableEvent) => void)
    {
        return this.onChangingEvent.addHandler(handler);
    }

    public onChanged(handler: (args: BindingExtendableEvent) => void, doNotTriggerHandler?: boolean)
    {
        const off = this.onChangedEvent.addHandler(handler);
        if (!doNotTriggerHandler)
            handler({
                target: this.target,
                eventArgs: {
                    fieldName: this.expression,
                    value: this.getValue(),
                    source: null
                }
            } as BindingEventArgs as any);
        return off;
    }

    public onError(handler: (ev: BindingExtendableEvent) => void)
    {
        return this.onErrorEvent.addHandler(handler);
    }

    private registeredBindings: Binding[] = [];

    public pipe(binding: Binding)
    {
        if (this.registeredBindings.indexOf(binding) > -1)
            return;
        this.registeredBindings.push(binding);
        const offChanging = this.onChanging(function (a: BindingExtendableEvent)
        {
            if (a.eventArgs.source == binding || a.eventArgs.source === null)
                return;

            return binding.onChangingEvent.trigger(Object.assign({}, a.eventArgs, { value: binding.getValue() }));
        });
        const offChanged = this.onChanged(function (a: BindingExtendableEvent)
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
        var offDispose = this.onDisposeEvent.addHandler(async function (a)
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
    public getValue(): any
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

                let watcher: Binding = target.$$watchers && target.$$watchers[part];

                if (!watcher)
                {
                    if (isPromiseLike(target))
                    {
                        let subParts = part;
                        if (parts.length > 0)
                            subParts += '.' + parts.join('.');

                        watcher = new PromiseBinding(subParts, target);
                    }
                    else if (target instanceof ObservableArray)
                    {
                        let initHandled = false;
                        target.on('collectionChanged', function (args: ObservableArrayEventArgs<any>)
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

    // eslint-disable-next-line @typescript-eslint/no-empty-function
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

    public static getSetter(target: IWatched, expression: string, source?: Binding)
    {
        const parts = Parser.parseBindable(expression);
        return async function (value: any, doNotTriggerEvents?: boolean)
        {
            while (parts.length > 1)
            {
                if (!target && <any>target !== '')
                    return;
                target = target[parts.shift()];
            }
            if (typeof target === 'undefined')
                return;
            if (typeof target.$$watchers == 'undefined')
                target.$$watchers = {};
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

    public setValue(value: any, source?: Binding, doNotTriggerEvents?: boolean)
    {
        const target = this.target;
        const setter = Binding.getSetter(this.target, this.expression, source || this);

        if (setter != null)
            setter(value, doNotTriggerEvents);

    }
}

export class PromiseBinding extends Binding
{
    constructor(expression: string, target: PromiseLike<any>)
    {
        super(expression, null, false);
        const binding = new Binding(expression, null);
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

export class WatchBinding extends Binding
{
    constructor(expression: string, target: any, interval: number)
    {
        super(expression, target, true);
        setInterval(this.check.bind(this), interval);
    }

    private lastValue;

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