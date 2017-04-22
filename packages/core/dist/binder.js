"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("./parser");
const events_1 = require("events");
const promiseHelpers_1 = require("./promiseHelpers");
const formatters = require("./formatters");
function eachAsync(array, body, complete) {
    (function loop(i) {
        function next() {
            if (array.length - 1 == i)
                complete();
            else
                setTimeout(loop, 0, i + 1);
        }
        body(i, array[i], next);
    })(0);
}
class Binding extends events_1.EventEmitter {
    constructor(_expression, _target, register = true) {
        super();
        this._expression = _expression;
        this._target = _target;
        this.evaluator = parser_1.Parser.evalAsFunction(this.expression);
        this.registeredBindings = [];
        this.formatter = formatters.identity;
        if (register)
            this.register();
        else
            this.setMaxListeners(0);
    }
    get expression() { return this._expression; }
    get target() { return this._target; }
    set target(value) { this._target = value; this.register(); }
    onChanging(handler) {
        this.on(Binding.ChangingFieldEventName, handler);
    }
    onChanged(handler) {
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
    onError(handler) {
        this.on(Binding.ErrorEventName, handler);
    }
    pipe(binding) {
        if (this.registeredBindings.indexOf(binding) > -1)
            return;
        this.registeredBindings.push(binding);
        var watcher = this;
        watcher.onChanging(function (a) {
            if (a.source == binding || a.source === null)
                return;
            var args = [Binding.ChangingFieldEventName, a];
            binding.emit.apply(binding, args);
        });
        watcher.onChanged(function (a) {
            if (a.source == binding || a.source === null)
                return;
            var args = [Binding.ChangedFieldEventName, { source: a.source, target: a.target, eventArgs: { fieldName: a.eventArgs.fieldName, value: binding.getValue() } }];
            binding.emit.apply(binding, args);
        });
        watcher.onError(function (a) {
            if (a.source == binding || a.source === null)
                return;
            var args = [Binding.ChangedFieldEventName, a];
            binding.emit.apply(binding, args);
        });
    }
    //defined in constructor
    getValue() {
        return this.formatter(this.evaluator(this.target, false));
    }
    register() {
        var target = this.target;
        var parts = parser_1.Parser.parseBindable(this.expression);
        var self = this;
        while (parts.length > 0) {
            var part = parts.shift();
            if (target !== null && target !== undefined && typeof (target) == 'object') {
                if (typeof (target.$$watchers) == 'undefined') {
                    try {
                        Object.defineProperty(target, '$$watchers', { enumerable: false, writable: false, value: {}, configurable: true });
                    }
                    catch (e) {
                        console.error('could not register watcher on ', target, 'this could lead to performance issues');
                    }
                }
                var watcher = target.$$watchers && target.$$watchers[part];
                if (!watcher) {
                    if (promiseHelpers_1.isPromiseLike(target)) {
                        var subParts = part;
                        if (parts.length > 0)
                            subParts += '.' + parts.join('.');
                        watcher = new PromiseBinding(subParts, target);
                    }
                    else if (target instanceof ObservableArray) {
                        let initHandled = false;
                        target.on('collectionChanged', function (args) {
                            if (args.action == 'init') {
                                if (initHandled)
                                    return;
                                initHandled = true;
                            }
                            var subParts = part;
                            if (parts.length > 0)
                                subParts += '.' + parts.join('.');
                            for (var i in args.newItems) {
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
    apply(elements, doNotRegisterEvents) { }
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
    static getSetter(target, expression) {
        var parts = parser_1.Parser.parseBindable(expression);
        return function (value, source, doNotTriggerEvents) {
            while (parts.length > 1) {
                if (!target && target !== '')
                    return;
                target = target[parts.shift()];
            }
            var watcher = target.$$watchers[parts[0]];
            var setter = parser_1.Parser.getSetter(parts[0], target);
            if (setter === null)
                return;
            try {
                var promise = new promiseHelpers_1.Deferred();
                promise.then(function resolve(value) {
                    setter.set(value);
                    if (watcher && !doNotTriggerEvents)
                        watcher.emit(Binding.ChangedFieldEventName, {
                            target: target,
                            eventArgs: {
                                fieldName: setter.expression,
                                value: value
                            },
                            source: source
                        });
                }, function (ex) {
                    if (watcher)
                        watcher.emit(Binding.ErrorEventName, {
                            target: target,
                            field: setter.expression,
                            Exception: ex,
                            source: source
                        });
                });
                if (doNotTriggerEvents)
                    return promise.resolve(value);
                if (watcher) {
                    var listeners = watcher.listeners(Binding.ChangingFieldEventName);
                    eachAsync(listeners, function (i, listener, next) {
                        promiseHelpers_1.Promisify(listener({
                            target: target,
                            fieldName: setter.expression,
                            source: source,
                        })).then(function () {
                            next();
                        }, promise.reject);
                    }, function () {
                        promise.resolve(value);
                    });
                }
                else
                    promise.resolve(value);
            }
            catch (ex) {
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
    setValue(value, source, doNotTriggerEvents) {
        var target = this.target;
        var setter = Binding.getSetter(this.target, this.expression);
        if (setter != null)
            setter(value, source || this, doNotTriggerEvents);
    }
    ;
}
Binding.ChangingFieldEventName = "fieldChanging";
Binding.ChangedFieldEventName = "fieldChanged";
Binding.ErrorEventName = "bindingError";
exports.Binding = Binding;
class PromiseBinding extends Binding {
    constructor(expression, target) {
        super(expression, null, false);
        var self = this;
        var binding = new Binding(expression, null);
        binding.pipe(self);
        var callback = function (value) {
            if (promiseHelpers_1.isPromiseLike(value)) {
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
exports.PromiseBinding = PromiseBinding;
if (typeof (Array.prototype['replace']) == 'undefined')
    Object.defineProperty(Array.prototype, 'replace', {
        value: function (index, item) {
            this[index] = item;
        }, configurable: true, writable: true, enumerable: false
    });
class ObservableArray extends events_1.EventEmitter {
    constructor(array) {
        super();
        this.array = array;
        this.unshift = function (item) {
            this.array.unshift(item);
            this.emit('collectionChanged', {
                action: 'unshift',
                newItems: [item]
            });
        };
    }
    get length() { return this.array.length; }
    push(...items) {
        this.array.push.apply(this.array, items);
        this.emit('collectionChanged', {
            action: 'push',
            newItems: items
        });
    }
    ;
    shift() {
        var item = this.array.shift();
        this.emit('collectionChanged', {
            action: 'shift',
            oldItems: [item]
        });
    }
    ;
    pop() {
        var item = this.array.pop();
        this.emit('collectionChanged', {
            action: 'pop',
            oldItems: [item]
        });
    }
    ;
    replace(index, item) {
        var oldItem = this.array[index];
        this.array['replace'](index, item);
        this.emit('collectionChanged', {
            action: 'replace',
            newItems: [item],
            oldItems: [oldItem]
        });
    }
    ;
    init() {
        this.emit('collectionChanged', {
            action: 'init',
            newItems: this.array.slice(0)
        });
    }
    indexOf() {
        return this.array.indexOf.apply(this.array, arguments);
    }
    toString() {
        return this.array.toString();
    }
    ;
}
exports.ObservableArray = ObservableArray;
;
class WatchBinding extends Binding {
    constructor(expression, target, interval) {
        super(expression, target, true);
        setInterval(this.check.bind(this), interval);
    }
    check() {
        var newValue = this.getValue();
        if (this.lastValue !== newValue) {
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
exports.WatchBinding = WatchBinding;
//# sourceMappingURL=binder.js.map