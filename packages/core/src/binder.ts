import { Parser } from './parser';
import { EventEmitter } from 'events';
import { Deferred, Promisify as promisify, isPromiseLike } from './promiseHelpers';
import * as formatters from './formatters';

function eachAsync<T>(array: T[], body: (key: number, value: T, next: () => void) => void, complete: () => void)
{
    (function loop(i: number)
    {
        function next()
        {
            if (array.length - 1 == i)
                complete();
            else
                setTimeout(loop, 0, i + 1);
        }

        body(i, array[i], next);
    })(0);
}

export interface IWatched
{
    $$watchers?: { [key: string]: Binding };
}

export interface EventArgs
{
    source: Binding;
    target: any;
    eventArgs: { fieldName: string, value: any };
}

export class Binding extends EventEmitter
{
    public static readonly ChangingFieldEventName = "fieldChanging";
    public static readonly ChangedFieldEventName = "fieldChanged";
    public static readonly ErrorEventName = "bindingError";

    constructor(protected _expression: string, private _target: any, register: boolean = true)
    {
        super();
        this.formatter = formatters.identity;
        if (register)
            this.register();
        else
            this.setMaxListeners(0);
    }

    public formatter: Function;

    public get expression() { return this._expression; }
    public get target() { return this._target; }
    public set target(value) { this._target = value; this.register() }

    private evaluator = Parser.evalAsFunction(this.expression)

    public onChanging(handler: (ev: EventArgs) => void)
    {
        this.on(Binding.ChangingFieldEventName, handler);
    }

    public onChanged(handler: (ev: EventArgs) => void)
    {
        this.on(Binding.ChangedFieldEventName, handler);
        handler({
            target: this.target,
            eventArgs: {
                fieldName: this.expression,
                value: this.formatter(this.getValue())
            },
            source: null
        });
    }

    public onError(handler: (ev: EventArgs) => void)
    {
        this.on(Binding.ErrorEventName, handler);
    }

    private registeredBindings: Binding[] = [];

    public pipe(binding: Binding)
    {
        if (this.registeredBindings.indexOf(binding) > -1)
            return;
        this.registeredBindings.push(binding);
        var watcher = this;
        watcher.onChanging(function (a: EventArgs)
        {
            if (a.source == binding || a.source === null)
                return;
            var args = (<any[]>[Binding.ChangingFieldEventName, a]);

            binding.emit.apply(binding, args);
        });
        watcher.onChanged(function (a: EventArgs)
        {
            if (a.source == binding || a.source === null)
                return;
            var args = (<any[]>[Binding.ChangedFieldEventName, { source: a.source, target: a.target, eventArgs: { fieldName: a.eventArgs.fieldName, value: binding.getValue() } }]);
            binding.emit.apply(binding, args);
        });
        watcher.onError(function (a)
        {
            if (a.source == binding || a.source === null)
                return;
            var args = (<any[]>[Binding.ChangedFieldEventName, a]);
            binding.emit.apply(binding, args);
        });

    }

    //defined in constructor
    public getValue(): any
    {
        return this.formatter(this.evaluator(this.target, false));
    }

    public register()
    {
        var target = this.target;
        var parts = Parser.parseBindable(this.expression);
        var self = this;
        while (parts.length > 0)
        {
            var part = parts.shift();
            if (target !== null && target !== undefined && typeof (target) == 'object')
            {
                if (typeof (target.$$watchers) == 'undefined')
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

                var watcher: Binding = target.$$watchers && target.$$watchers[part];

                if (!watcher)
                {
                    if (isPromiseLike(target))
                    {
                        var subParts = part;
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


                            var subParts = part;
                            if (parts.length > 0)
                                subParts += '.' + parts.join('.');

                            for (var i in args.newItems)
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

    public static getSetter(target: IWatched, expression: string)
    {
        var parts = Parser.parseBindable(expression);
        return function (value: any, source: any, doNotTriggerEvents?: boolean)
        {
            while (parts.length > 1)
            {
                if (!target && <any>target !== '')
                    return;
                target = target[parts.shift()];
            }
            var watcher = target.$$watchers[parts[0]];
            var setter = Parser.getSetter(parts[0], target);
            if (setter === null)
                return;
            try
            {
                var promise = new Deferred();

                promise.then(function resolve(value)
                {
                    setter.set(value);
                    if (!doNotTriggerEvents)
                        watcher.emit(Binding.ChangedFieldEventName, {
                            target: target,
                            eventArgs: {
                                fieldName: setter.expression,
                                value: value
                            },
                            source: source
                        });
                }, function (ex)
                    {
                        watcher.emit(Binding.ErrorEventName, {
                            target: target,
                            field: setter.expression,
                            Exception: ex,
                            source: source
                        });
                    });

                if (doNotTriggerEvents)
                    return promise.resolve(value);

                var listeners = watcher.listeners(Binding.ChangingFieldEventName);

                eachAsync(listeners, function (i, listener, next)
                {
                    promisify(listener({
                        target: target,
                        fieldName: setter.expression,
                        source: source,
                    })).then(function ()
                    {
                        next();
                    }, promise.reject);
                }, function ()
                    {
                        promise.resolve(value);
                    });
            }
            catch (ex)
            {
                watcher.emit(Binding.ErrorEventName, {
                    target: target,
                    field: setter.expression,
                    Exception: ex,
                    source: source
                });
                promise.reject(ex);
            }
        };
    }

    public setValue(value: any, source?: Binding, doNotTriggerEvents?: boolean)
    {
        var target = this.target;
        var setter = Binding.getSetter(this.target, this.expression);

        if (setter != null)
            setter(value, source || this, doNotTriggerEvents);

    };
}

export class PromiseBinding extends Binding
{
    constructor(expression: string, target: PromiseLike<any>)
    {
        super(expression, null, false);
        var self = this;
        var binding = new Binding(expression, null);
        binding.pipe(self);
        var callback = function (value)
        {
            if (isPromiseLike(value))
            {
                value.then(callback);
                return;
            }
            binding.formatter = self.formatter;
            binding.target = value;
            self.emit(Binding.ChangedFieldEventName, {
                target: value,
                eventArgs: {
                    fieldName: self.expression,
                    value: self.getValue()
                },
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


export class ObservableArray<T> extends EventEmitter
{
    constructor(public array: Array<T>)
    {
        super();
    }

    public get length() { return this.array.length; }

    public push(item)
    {
        this.array.push(item);
        this.emit('collectionChanged', {
            action: 'push',
            newItems: [item]
        });
    };
    public shift()
    {
        var item = this.array.shift();
        this.emit('collectionChanged', {
            action: 'shift',
            oldItems: [item]
        });
    };
    public pop()
    {
        var item = this.array.pop();
        this.emit('collectionChanged', {
            action: 'pop',
            oldItems: [item]
        });
    };
    public unshift = function (item)
    {
        this.array.unshift(item);
        this.emit('collectionChanged', {
            action: 'unshift',
            newItems: [item]
        });
    };
    public replace(index, item)
    {
        var oldItem = this.array[index];
        this.array['replace'](index, item);
        this.emit('collectionChanged', {
            action: 'replace',
            newItems: [item],
            oldItems: [oldItem]
        });
    };

    public init()
    {
        this.emit('collectionChanged', {
            action: 'init',
            newItems: this.array.slice(0)
        });
    }

    public indexOf(searchElement: T, fromIndex?: number): number;
    public indexOf()
    {
        return this.array.indexOf.apply(this.array, arguments);
    }

    public toString()
    {
        return this.array.toString();
    };
};

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
        var newValue = this.getValue();
        if (this.lastValue !== newValue)
        {
            this.lastValue = newValue;
            this.emit(Binding.ChangedFieldEventName, {
                target: this.target,
                eventArgs: {
                    fieldName: this.expression,
                    value: newValue
                },
                source: this
            });
        }
    }
}