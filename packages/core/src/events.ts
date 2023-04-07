// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.


type F = (...args: unknown[]) => unknown;

export class EventEmitter
{

    constructor()
    {
    }

    private _events?: Record<string, F | (F[])>;
    private _eventsCount = 0;
    private _maxListeners?: number;

    static _defaultMaxListeners = 10;
    static get defaultMaxListeners()
    { return this._defaultMaxListeners; }
    static set(value: number)
    {
        if (typeof value !== 'number' || value < 0 || NumberIsNaN(value))
        {
            throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received ' + value + '.');
        }
        this._defaultMaxListeners = value;
    }

    public setMaxListeners(n: number)
    {
        if (typeof n !== 'number' || n < 0 || NumberIsNaN(n))
        {
            throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received ' + n + '.');
        }
        this._maxListeners = n;
        return this;
    }


    public getMaxListeners()
    {
        if (this._maxListeners === undefined)
            return EventEmitter.defaultMaxListeners;
        return this._maxListeners;
    }

    public emit(type: string, ...args: unknown[])
    {
        var doError = (type === 'error');

        var events = this._events;
        if (events !== undefined)
            doError = (doError && events.error === undefined);
        else if (!doError)
            return false;

        // If there is no 'error' event listener then throw.
        if (doError)
        {
            var er;
            if (args.length > 0)
                er = args[0];
            if (er instanceof Error)
            {
                // Note: The comments on the `throw` lines are intentional, they show
                // up in Node's output if this results in an unhandled exception.
                throw er; // Unhandled 'error' event
            }
            // At least give some kind of context to the user
            var err = new Error('Unhandled error.' + (er ? ' (' + er.message + ')' : ''));
            err['context'] = er;
            throw err; // Unhandled 'error' event
        }

        var handler = events[type];

        if (handler === undefined)
            return false;

        if (typeof handler === 'function')
        {
            Reflect.apply(handler, this, args);
        } else
        {
            const len = handler.length;
            const listeners = handler.slice(0);
            for (let i = 0; i < len; ++i)
                Reflect.apply(listeners[i], this, args);
        }

        return true;
    }


    public on(type: string, listener: F, prepend?: boolean): this
    {
        var events: typeof this._events;
        var existing: (F) | (F)[];

        checkListener(listener);

        events = this._events;
        if (events === undefined)
        {
            events = this._events = {}
            this._eventsCount = 0;
        }
        else
        {
            // To avoid recursion in the case that type === "newListener"! Before
            // adding it to the listeners, first emit "newListener".
            if (events.newListener !== undefined)
            {
                this.emit('newListener', type, listener);

                // Re-assign `events` because a newListener handler could have caused the
                // this._events to be assigned to a new object
                events = this._events;
            }
            existing = events[type];
        }

        if (existing === undefined)
        {
            // Optimize the case of one listener. Don't need the extra array object.
            existing = events[type] = listener;
            ++this._eventsCount;
        } else
        {
            if (typeof existing === 'function')
            {
                // Adding the second element, need to change to array.
                existing = events[type] =
                    prepend ? [listener, existing] : [existing, listener];
                // If we've already got an array, just append.
            } else if (prepend)
            {
                existing.unshift(listener);
            } else
            {
                existing.push(listener);
            }

            // Check for listener leak
            let m = this.getMaxListeners();
            if (m > 0 && existing.length > m && !existing['warned'])
            {
                existing['warned'] = true;
                // No error code for this since it is a Warning
                // eslint-disable-next-line no-restricted-syntax
                var w = new Error('Possible EventEmitter memory leak detected. ' +
                    existing.length + ' ' + String(type) + ' listeners ' +
                    'added. Use emitter.setMaxListeners() to ' +
                    'increase limit');
                w.name = 'MaxListenersExceededWarning';
                w['emitter'] = this;
                w['type'] = type;
                w['count'] = existing.length;
                ProcessEmitWarning(w);
            }
        }

        return this;
    }

    public prependListener(type: string, listener: F)
    {
        return this.on(type, listener, true)
    }

    public once(type: string, listener: F)
    {
        checkListener(listener);
        function X(...args: unknown[])
        {
            this.removeListener(type, X)
            listener.apply(this, args);
        }
        this.on(type, X);
        return this;
    };

    public prependOnceListener(type: string, listener: F)
    {
        checkListener(listener);
        function X(...args: unknown[])
        {
            this.removeListener(type, X)
            listener.apply(this, args);
        }
        this.prependListener(type, X);
        return this;
    };

    public off(type: string, listener: F)
    {
        var list, events, position: number, originalListener;

        checkListener(listener);

        events = this._events;
        if (events === undefined)
            return this;

        list = events[type];
        if (list === undefined)
            return this;

        if (list === listener)
        {
            if (--this._eventsCount === 0)
                this._events = Object.create(null);
            else
            {
                delete events[type];
                if (events.removeListener)
                    this.emit('removeListener', type, list.listener || listener);
            }
        } else if (typeof list !== 'function')
        {
            position = -1;

            for (let i = list.length - 1; i >= 0; i--)
            {
                if (list[i] === listener)
                {
                    originalListener = list[i];
                    position = i;
                    break;
                }
            }

            if (position < 0)
                return this;

            if (position === 0)
                list.shift();
            else
            {
                list.splice(position, 1);
            }

            if (list.length === 1)
                events[type] = list[0];

            if (events.removeListener !== undefined)
                this.emit('removeListener', type, originalListener || listener);
        }

        return this;
    };

    public removeAllListeners(type: string)
    {
        var listeners: F | F[], events: typeof this._events;

        events = this._events;
        if (events === undefined)
            return this;

        // not listening for removeListener, no need to emit
        if (events.removeListener === undefined)
        {
            if (arguments.length === 0)
            {
                this._events = Object.create(null);
                this._eventsCount = 0;
            } else if (events[type] !== undefined)
            {
                if (--this._eventsCount === 0)
                    this._events = Object.create(null);
                else
                    delete events[type];
            }
            return this;
        }

        // emit removeListener for all listeners on all events
        if (typeof type == 'undefined')
        {
            const keys = Object.keys(events);
            for (let i = 0; i < keys.length; ++i)
            {
                const key = keys[i];
                if (key === 'removeListener') continue;
                this.removeAllListeners(key);
            }
            this.removeAllListeners('removeListener');
            this._events = Object.create(null);
            this._eventsCount = 0;
            return this;
        }

        listeners = events[type];

        if (typeof listeners === 'function')
        {
            this.off(type, listeners);
        } else if (listeners !== undefined)
        {
            // LIFO order
            for (let i = listeners.length - 1; i >= 0; i--)
            {
                this.off(type, listeners[i]);
            }
        }

        return this;
    };


    public listeners(type: string)
    {
        var events = this._events;

        if (events === undefined)
            return [];

        var evlistener = events[type];
        if (evlistener === undefined)
            return [];

        if (typeof evlistener === 'function')
            return [evlistener];

        return evlistener.slice(0);
    }

    public listenerCount(type: string)
    {
        var events = this._events;

        if (events !== undefined)
        {
            var evlistener = events[type];

            if (typeof evlistener === 'function')
                return 1;
            else if (evlistener !== undefined)
                return evlistener.length;
        }

        return 0;
    }

    public eventNames()
    {
        return this._eventsCount > 0 ? Object.getOwnPropertyNames(this._events) : [];
    };

}


function checkListener(listener)
{
    if (typeof listener !== 'function')
    {
        throw new TypeError('The "listener" argument must be of type (...args:unknown[])=>unknown. Received type ' + typeof listener);
    }
}

const NumberIsNaN = Number.isNaN || function NumberIsNaN(value)
{
    return value !== value;
}


function ProcessEmitWarning(warning)
{
    if (console && console.warn)
        console.warn(warning);
}