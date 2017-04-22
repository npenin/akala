(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        // At least give some kind of context to the user
        var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
        err.context = er;
        throw err;
      }
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    args = Array.prototype.slice.call(arguments, 1);
    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else if (listeners) {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.prototype.listenerCount = function(type) {
  if (this._events) {
    var evlistener = this._events[type];

    if (isFunction(evlistener))
      return 1;
    else if (evlistener)
      return evlistener.length;
  }
  return 0;
};

EventEmitter.listenerCount = function(emitter, type) {
  return emitter.listenerCount(type);
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],2:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],3:[function(require,module,exports){
(function (global){
/*! https://mths.be/punycode v1.4.1 by @mathias */
;(function(root) {

	/** Detect free variables */
	var freeExports = typeof exports == 'object' && exports &&
		!exports.nodeType && exports;
	var freeModule = typeof module == 'object' && module &&
		!module.nodeType && module;
	var freeGlobal = typeof global == 'object' && global;
	if (
		freeGlobal.global === freeGlobal ||
		freeGlobal.window === freeGlobal ||
		freeGlobal.self === freeGlobal
	) {
		root = freeGlobal;
	}

	/**
	 * The `punycode` object.
	 * @name punycode
	 * @type Object
	 */
	var punycode,

	/** Highest positive signed 32-bit float value */
	maxInt = 2147483647, // aka. 0x7FFFFFFF or 2^31-1

	/** Bootstring parameters */
	base = 36,
	tMin = 1,
	tMax = 26,
	skew = 38,
	damp = 700,
	initialBias = 72,
	initialN = 128, // 0x80
	delimiter = '-', // '\x2D'

	/** Regular expressions */
	regexPunycode = /^xn--/,
	regexNonASCII = /[^\x20-\x7E]/, // unprintable ASCII chars + non-ASCII chars
	regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g, // RFC 3490 separators

	/** Error messages */
	errors = {
		'overflow': 'Overflow: input needs wider integers to process',
		'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
		'invalid-input': 'Invalid input'
	},

	/** Convenience shortcuts */
	baseMinusTMin = base - tMin,
	floor = Math.floor,
	stringFromCharCode = String.fromCharCode,

	/** Temporary variable */
	key;

	/*--------------------------------------------------------------------------*/

	/**
	 * A generic error utility function.
	 * @private
	 * @param {String} type The error type.
	 * @returns {Error} Throws a `RangeError` with the applicable error message.
	 */
	function error(type) {
		throw new RangeError(errors[type]);
	}

	/**
	 * A generic `Array#map` utility function.
	 * @private
	 * @param {Array} array The array to iterate over.
	 * @param {Function} callback The function that gets called for every array
	 * item.
	 * @returns {Array} A new array of values returned by the callback function.
	 */
	function map(array, fn) {
		var length = array.length;
		var result = [];
		while (length--) {
			result[length] = fn(array[length]);
		}
		return result;
	}

	/**
	 * A simple `Array#map`-like wrapper to work with domain name strings or email
	 * addresses.
	 * @private
	 * @param {String} domain The domain name or email address.
	 * @param {Function} callback The function that gets called for every
	 * character.
	 * @returns {Array} A new string of characters returned by the callback
	 * function.
	 */
	function mapDomain(string, fn) {
		var parts = string.split('@');
		var result = '';
		if (parts.length > 1) {
			// In email addresses, only the domain name should be punycoded. Leave
			// the local part (i.e. everything up to `@`) intact.
			result = parts[0] + '@';
			string = parts[1];
		}
		// Avoid `split(regex)` for IE8 compatibility. See #17.
		string = string.replace(regexSeparators, '\x2E');
		var labels = string.split('.');
		var encoded = map(labels, fn).join('.');
		return result + encoded;
	}

	/**
	 * Creates an array containing the numeric code points of each Unicode
	 * character in the string. While JavaScript uses UCS-2 internally,
	 * this function will convert a pair of surrogate halves (each of which
	 * UCS-2 exposes as separate characters) into a single code point,
	 * matching UTF-16.
	 * @see `punycode.ucs2.encode`
	 * @see <https://mathiasbynens.be/notes/javascript-encoding>
	 * @memberOf punycode.ucs2
	 * @name decode
	 * @param {String} string The Unicode input string (UCS-2).
	 * @returns {Array} The new array of code points.
	 */
	function ucs2decode(string) {
		var output = [],
		    counter = 0,
		    length = string.length,
		    value,
		    extra;
		while (counter < length) {
			value = string.charCodeAt(counter++);
			if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
				// high surrogate, and there is a next character
				extra = string.charCodeAt(counter++);
				if ((extra & 0xFC00) == 0xDC00) { // low surrogate
					output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
				} else {
					// unmatched surrogate; only append this code unit, in case the next
					// code unit is the high surrogate of a surrogate pair
					output.push(value);
					counter--;
				}
			} else {
				output.push(value);
			}
		}
		return output;
	}

	/**
	 * Creates a string based on an array of numeric code points.
	 * @see `punycode.ucs2.decode`
	 * @memberOf punycode.ucs2
	 * @name encode
	 * @param {Array} codePoints The array of numeric code points.
	 * @returns {String} The new Unicode string (UCS-2).
	 */
	function ucs2encode(array) {
		return map(array, function(value) {
			var output = '';
			if (value > 0xFFFF) {
				value -= 0x10000;
				output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
				value = 0xDC00 | value & 0x3FF;
			}
			output += stringFromCharCode(value);
			return output;
		}).join('');
	}

	/**
	 * Converts a basic code point into a digit/integer.
	 * @see `digitToBasic()`
	 * @private
	 * @param {Number} codePoint The basic numeric code point value.
	 * @returns {Number} The numeric value of a basic code point (for use in
	 * representing integers) in the range `0` to `base - 1`, or `base` if
	 * the code point does not represent a value.
	 */
	function basicToDigit(codePoint) {
		if (codePoint - 48 < 10) {
			return codePoint - 22;
		}
		if (codePoint - 65 < 26) {
			return codePoint - 65;
		}
		if (codePoint - 97 < 26) {
			return codePoint - 97;
		}
		return base;
	}

	/**
	 * Converts a digit/integer into a basic code point.
	 * @see `basicToDigit()`
	 * @private
	 * @param {Number} digit The numeric value of a basic code point.
	 * @returns {Number} The basic code point whose value (when used for
	 * representing integers) is `digit`, which needs to be in the range
	 * `0` to `base - 1`. If `flag` is non-zero, the uppercase form is
	 * used; else, the lowercase form is used. The behavior is undefined
	 * if `flag` is non-zero and `digit` has no uppercase form.
	 */
	function digitToBasic(digit, flag) {
		//  0..25 map to ASCII a..z or A..Z
		// 26..35 map to ASCII 0..9
		return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
	}

	/**
	 * Bias adaptation function as per section 3.4 of RFC 3492.
	 * https://tools.ietf.org/html/rfc3492#section-3.4
	 * @private
	 */
	function adapt(delta, numPoints, firstTime) {
		var k = 0;
		delta = firstTime ? floor(delta / damp) : delta >> 1;
		delta += floor(delta / numPoints);
		for (/* no initialization */; delta > baseMinusTMin * tMax >> 1; k += base) {
			delta = floor(delta / baseMinusTMin);
		}
		return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
	}

	/**
	 * Converts a Punycode string of ASCII-only symbols to a string of Unicode
	 * symbols.
	 * @memberOf punycode
	 * @param {String} input The Punycode string of ASCII-only symbols.
	 * @returns {String} The resulting string of Unicode symbols.
	 */
	function decode(input) {
		// Don't use UCS-2
		var output = [],
		    inputLength = input.length,
		    out,
		    i = 0,
		    n = initialN,
		    bias = initialBias,
		    basic,
		    j,
		    index,
		    oldi,
		    w,
		    k,
		    digit,
		    t,
		    /** Cached calculation results */
		    baseMinusT;

		// Handle the basic code points: let `basic` be the number of input code
		// points before the last delimiter, or `0` if there is none, then copy
		// the first basic code points to the output.

		basic = input.lastIndexOf(delimiter);
		if (basic < 0) {
			basic = 0;
		}

		for (j = 0; j < basic; ++j) {
			// if it's not a basic code point
			if (input.charCodeAt(j) >= 0x80) {
				error('not-basic');
			}
			output.push(input.charCodeAt(j));
		}

		// Main decoding loop: start just after the last delimiter if any basic code
		// points were copied; start at the beginning otherwise.

		for (index = basic > 0 ? basic + 1 : 0; index < inputLength; /* no final expression */) {

			// `index` is the index of the next character to be consumed.
			// Decode a generalized variable-length integer into `delta`,
			// which gets added to `i`. The overflow checking is easier
			// if we increase `i` as we go, then subtract off its starting
			// value at the end to obtain `delta`.
			for (oldi = i, w = 1, k = base; /* no condition */; k += base) {

				if (index >= inputLength) {
					error('invalid-input');
				}

				digit = basicToDigit(input.charCodeAt(index++));

				if (digit >= base || digit > floor((maxInt - i) / w)) {
					error('overflow');
				}

				i += digit * w;
				t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);

				if (digit < t) {
					break;
				}

				baseMinusT = base - t;
				if (w > floor(maxInt / baseMinusT)) {
					error('overflow');
				}

				w *= baseMinusT;

			}

			out = output.length + 1;
			bias = adapt(i - oldi, out, oldi == 0);

			// `i` was supposed to wrap around from `out` to `0`,
			// incrementing `n` each time, so we'll fix that now:
			if (floor(i / out) > maxInt - n) {
				error('overflow');
			}

			n += floor(i / out);
			i %= out;

			// Insert `n` at position `i` of the output
			output.splice(i++, 0, n);

		}

		return ucs2encode(output);
	}

	/**
	 * Converts a string of Unicode symbols (e.g. a domain name label) to a
	 * Punycode string of ASCII-only symbols.
	 * @memberOf punycode
	 * @param {String} input The string of Unicode symbols.
	 * @returns {String} The resulting Punycode string of ASCII-only symbols.
	 */
	function encode(input) {
		var n,
		    delta,
		    handledCPCount,
		    basicLength,
		    bias,
		    j,
		    m,
		    q,
		    k,
		    t,
		    currentValue,
		    output = [],
		    /** `inputLength` will hold the number of code points in `input`. */
		    inputLength,
		    /** Cached calculation results */
		    handledCPCountPlusOne,
		    baseMinusT,
		    qMinusT;

		// Convert the input in UCS-2 to Unicode
		input = ucs2decode(input);

		// Cache the length
		inputLength = input.length;

		// Initialize the state
		n = initialN;
		delta = 0;
		bias = initialBias;

		// Handle the basic code points
		for (j = 0; j < inputLength; ++j) {
			currentValue = input[j];
			if (currentValue < 0x80) {
				output.push(stringFromCharCode(currentValue));
			}
		}

		handledCPCount = basicLength = output.length;

		// `handledCPCount` is the number of code points that have been handled;
		// `basicLength` is the number of basic code points.

		// Finish the basic string - if it is not empty - with a delimiter
		if (basicLength) {
			output.push(delimiter);
		}

		// Main encoding loop:
		while (handledCPCount < inputLength) {

			// All non-basic code points < n have been handled already. Find the next
			// larger one:
			for (m = maxInt, j = 0; j < inputLength; ++j) {
				currentValue = input[j];
				if (currentValue >= n && currentValue < m) {
					m = currentValue;
				}
			}

			// Increase `delta` enough to advance the decoder's <n,i> state to <m,0>,
			// but guard against overflow
			handledCPCountPlusOne = handledCPCount + 1;
			if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
				error('overflow');
			}

			delta += (m - n) * handledCPCountPlusOne;
			n = m;

			for (j = 0; j < inputLength; ++j) {
				currentValue = input[j];

				if (currentValue < n && ++delta > maxInt) {
					error('overflow');
				}

				if (currentValue == n) {
					// Represent delta as a generalized variable-length integer
					for (q = delta, k = base; /* no condition */; k += base) {
						t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);
						if (q < t) {
							break;
						}
						qMinusT = q - t;
						baseMinusT = base - t;
						output.push(
							stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0))
						);
						q = floor(qMinusT / baseMinusT);
					}

					output.push(stringFromCharCode(digitToBasic(q, 0)));
					bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
					delta = 0;
					++handledCPCount;
				}
			}

			++delta;
			++n;

		}
		return output.join('');
	}

	/**
	 * Converts a Punycode string representing a domain name or an email address
	 * to Unicode. Only the Punycoded parts of the input will be converted, i.e.
	 * it doesn't matter if you call it on a string that has already been
	 * converted to Unicode.
	 * @memberOf punycode
	 * @param {String} input The Punycoded domain name or email address to
	 * convert to Unicode.
	 * @returns {String} The Unicode representation of the given Punycode
	 * string.
	 */
	function toUnicode(input) {
		return mapDomain(input, function(string) {
			return regexPunycode.test(string)
				? decode(string.slice(4).toLowerCase())
				: string;
		});
	}

	/**
	 * Converts a Unicode string representing a domain name or an email address to
	 * Punycode. Only the non-ASCII parts of the domain name will be converted,
	 * i.e. it doesn't matter if you call it with a domain that's already in
	 * ASCII.
	 * @memberOf punycode
	 * @param {String} input The domain name or email address to convert, as a
	 * Unicode string.
	 * @returns {String} The Punycode representation of the given domain name or
	 * email address.
	 */
	function toASCII(input) {
		return mapDomain(input, function(string) {
			return regexNonASCII.test(string)
				? 'xn--' + encode(string)
				: string;
		});
	}

	/*--------------------------------------------------------------------------*/

	/** Define the public API */
	punycode = {
		/**
		 * A string representing the current Punycode.js version number.
		 * @memberOf punycode
		 * @type String
		 */
		'version': '1.4.1',
		/**
		 * An object of methods to convert from JavaScript's internal character
		 * representation (UCS-2) to Unicode code points, and back.
		 * @see <https://mathiasbynens.be/notes/javascript-encoding>
		 * @memberOf punycode
		 * @type Object
		 */
		'ucs2': {
			'decode': ucs2decode,
			'encode': ucs2encode
		},
		'decode': decode,
		'encode': encode,
		'toASCII': toASCII,
		'toUnicode': toUnicode
	};

	/** Expose `punycode` */
	// Some AMD build optimizers, like r.js, check for specific condition patterns
	// like the following:
	if (
		typeof define == 'function' &&
		typeof define.amd == 'object' &&
		define.amd
	) {
		define('punycode', function() {
			return punycode;
		});
	} else if (freeExports && freeModule) {
		if (module.exports == freeExports) {
			// in Node.js, io.js, or RingoJS v0.8.0+
			freeModule.exports = punycode;
		} else {
			// in Narwhal or RingoJS v0.7.0-
			for (key in punycode) {
				punycode.hasOwnProperty(key) && (freeExports[key] = punycode[key]);
			}
		}
	} else {
		// in Rhino or a web browser
		root.punycode = punycode;
	}

}(this));

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],4:[function(require,module,exports){
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

'use strict';

// If obj.hasOwnProperty has been overridden, then calling
// obj.hasOwnProperty(prop) will break.
// See: https://github.com/joyent/node/issues/1707
function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

module.exports = function(qs, sep, eq, options) {
  sep = sep || '&';
  eq = eq || '=';
  var obj = {};

  if (typeof qs !== 'string' || qs.length === 0) {
    return obj;
  }

  var regexp = /\+/g;
  qs = qs.split(sep);

  var maxKeys = 1000;
  if (options && typeof options.maxKeys === 'number') {
    maxKeys = options.maxKeys;
  }

  var len = qs.length;
  // maxKeys <= 0 means that we should not limit keys count
  if (maxKeys > 0 && len > maxKeys) {
    len = maxKeys;
  }

  for (var i = 0; i < len; ++i) {
    var x = qs[i].replace(regexp, '%20'),
        idx = x.indexOf(eq),
        kstr, vstr, k, v;

    if (idx >= 0) {
      kstr = x.substr(0, idx);
      vstr = x.substr(idx + 1);
    } else {
      kstr = x;
      vstr = '';
    }

    k = decodeURIComponent(kstr);
    v = decodeURIComponent(vstr);

    if (!hasOwnProperty(obj, k)) {
      obj[k] = v;
    } else if (isArray(obj[k])) {
      obj[k].push(v);
    } else {
      obj[k] = [obj[k], v];
    }
  }

  return obj;
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

},{}],5:[function(require,module,exports){
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

'use strict';

var stringifyPrimitive = function(v) {
  switch (typeof v) {
    case 'string':
      return v;

    case 'boolean':
      return v ? 'true' : 'false';

    case 'number':
      return isFinite(v) ? v : '';

    default:
      return '';
  }
};

module.exports = function(obj, sep, eq, name) {
  sep = sep || '&';
  eq = eq || '=';
  if (obj === null) {
    obj = undefined;
  }

  if (typeof obj === 'object') {
    return map(objectKeys(obj), function(k) {
      var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
      if (isArray(obj[k])) {
        return map(obj[k], function(v) {
          return ks + encodeURIComponent(stringifyPrimitive(v));
        }).join(sep);
      } else {
        return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
      }
    }).join(sep);

  }

  if (!name) return '';
  return encodeURIComponent(stringifyPrimitive(name)) + eq +
         encodeURIComponent(stringifyPrimitive(obj));
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

function map (xs, f) {
  if (xs.map) return xs.map(f);
  var res = [];
  for (var i = 0; i < xs.length; i++) {
    res.push(f(xs[i], i));
  }
  return res;
}

var objectKeys = Object.keys || function (obj) {
  var res = [];
  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) res.push(key);
  }
  return res;
};

},{}],6:[function(require,module,exports){
'use strict';

exports.decode = exports.parse = require('./decode');
exports.encode = exports.stringify = require('./encode');

},{"./decode":4,"./encode":5}],7:[function(require,module,exports){
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

'use strict';

var punycode = require('punycode');
var util = require('./util');

exports.parse = urlParse;
exports.resolve = urlResolve;
exports.resolveObject = urlResolveObject;
exports.format = urlFormat;

exports.Url = Url;

function Url() {
  this.protocol = null;
  this.slashes = null;
  this.auth = null;
  this.host = null;
  this.port = null;
  this.hostname = null;
  this.hash = null;
  this.search = null;
  this.query = null;
  this.pathname = null;
  this.path = null;
  this.href = null;
}

// Reference: RFC 3986, RFC 1808, RFC 2396

// define these here so at least they only have to be
// compiled once on the first module load.
var protocolPattern = /^([a-z0-9.+-]+:)/i,
    portPattern = /:[0-9]*$/,

    // Special case for a simple path URL
    simplePathPattern = /^(\/\/?(?!\/)[^\?\s]*)(\?[^\s]*)?$/,

    // RFC 2396: characters reserved for delimiting URLs.
    // We actually just auto-escape these.
    delims = ['<', '>', '"', '`', ' ', '\r', '\n', '\t'],

    // RFC 2396: characters not allowed for various reasons.
    unwise = ['{', '}', '|', '\\', '^', '`'].concat(delims),

    // Allowed by RFCs, but cause of XSS attacks.  Always escape these.
    autoEscape = ['\''].concat(unwise),
    // Characters that are never ever allowed in a hostname.
    // Note that any invalid chars are also handled, but these
    // are the ones that are *expected* to be seen, so we fast-path
    // them.
    nonHostChars = ['%', '/', '?', ';', '#'].concat(autoEscape),
    hostEndingChars = ['/', '?', '#'],
    hostnameMaxLen = 255,
    hostnamePartPattern = /^[+a-z0-9A-Z_-]{0,63}$/,
    hostnamePartStart = /^([+a-z0-9A-Z_-]{0,63})(.*)$/,
    // protocols that can allow "unsafe" and "unwise" chars.
    unsafeProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that never have a hostname.
    hostlessProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that always contain a // bit.
    slashedProtocol = {
      'http': true,
      'https': true,
      'ftp': true,
      'gopher': true,
      'file': true,
      'http:': true,
      'https:': true,
      'ftp:': true,
      'gopher:': true,
      'file:': true
    },
    querystring = require('querystring');

function urlParse(url, parseQueryString, slashesDenoteHost) {
  if (url && util.isObject(url) && url instanceof Url) return url;

  var u = new Url;
  u.parse(url, parseQueryString, slashesDenoteHost);
  return u;
}

Url.prototype.parse = function(url, parseQueryString, slashesDenoteHost) {
  if (!util.isString(url)) {
    throw new TypeError("Parameter 'url' must be a string, not " + typeof url);
  }

  // Copy chrome, IE, opera backslash-handling behavior.
  // Back slashes before the query string get converted to forward slashes
  // See: https://code.google.com/p/chromium/issues/detail?id=25916
  var queryIndex = url.indexOf('?'),
      splitter =
          (queryIndex !== -1 && queryIndex < url.indexOf('#')) ? '?' : '#',
      uSplit = url.split(splitter),
      slashRegex = /\\/g;
  uSplit[0] = uSplit[0].replace(slashRegex, '/');
  url = uSplit.join(splitter);

  var rest = url;

  // trim before proceeding.
  // This is to support parse stuff like "  http://foo.com  \n"
  rest = rest.trim();

  if (!slashesDenoteHost && url.split('#').length === 1) {
    // Try fast path regexp
    var simplePath = simplePathPattern.exec(rest);
    if (simplePath) {
      this.path = rest;
      this.href = rest;
      this.pathname = simplePath[1];
      if (simplePath[2]) {
        this.search = simplePath[2];
        if (parseQueryString) {
          this.query = querystring.parse(this.search.substr(1));
        } else {
          this.query = this.search.substr(1);
        }
      } else if (parseQueryString) {
        this.search = '';
        this.query = {};
      }
      return this;
    }
  }

  var proto = protocolPattern.exec(rest);
  if (proto) {
    proto = proto[0];
    var lowerProto = proto.toLowerCase();
    this.protocol = lowerProto;
    rest = rest.substr(proto.length);
  }

  // figure out if it's got a host
  // user@server is *always* interpreted as a hostname, and url
  // resolution will treat //foo/bar as host=foo,path=bar because that's
  // how the browser resolves relative URLs.
  if (slashesDenoteHost || proto || rest.match(/^\/\/[^@\/]+@[^@\/]+/)) {
    var slashes = rest.substr(0, 2) === '//';
    if (slashes && !(proto && hostlessProtocol[proto])) {
      rest = rest.substr(2);
      this.slashes = true;
    }
  }

  if (!hostlessProtocol[proto] &&
      (slashes || (proto && !slashedProtocol[proto]))) {

    // there's a hostname.
    // the first instance of /, ?, ;, or # ends the host.
    //
    // If there is an @ in the hostname, then non-host chars *are* allowed
    // to the left of the last @ sign, unless some host-ending character
    // comes *before* the @-sign.
    // URLs are obnoxious.
    //
    // ex:
    // http://a@b@c/ => user:a@b host:c
    // http://a@b?@c => user:a host:c path:/?@c

    // v0.12 TODO(isaacs): This is not quite how Chrome does things.
    // Review our test case against browsers more comprehensively.

    // find the first instance of any hostEndingChars
    var hostEnd = -1;
    for (var i = 0; i < hostEndingChars.length; i++) {
      var hec = rest.indexOf(hostEndingChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }

    // at this point, either we have an explicit point where the
    // auth portion cannot go past, or the last @ char is the decider.
    var auth, atSign;
    if (hostEnd === -1) {
      // atSign can be anywhere.
      atSign = rest.lastIndexOf('@');
    } else {
      // atSign must be in auth portion.
      // http://a@b/c@d => host:b auth:a path:/c@d
      atSign = rest.lastIndexOf('@', hostEnd);
    }

    // Now we have a portion which is definitely the auth.
    // Pull that off.
    if (atSign !== -1) {
      auth = rest.slice(0, atSign);
      rest = rest.slice(atSign + 1);
      this.auth = decodeURIComponent(auth);
    }

    // the host is the remaining to the left of the first non-host char
    hostEnd = -1;
    for (var i = 0; i < nonHostChars.length; i++) {
      var hec = rest.indexOf(nonHostChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }
    // if we still have not hit it, then the entire thing is a host.
    if (hostEnd === -1)
      hostEnd = rest.length;

    this.host = rest.slice(0, hostEnd);
    rest = rest.slice(hostEnd);

    // pull out port.
    this.parseHost();

    // we've indicated that there is a hostname,
    // so even if it's empty, it has to be present.
    this.hostname = this.hostname || '';

    // if hostname begins with [ and ends with ]
    // assume that it's an IPv6 address.
    var ipv6Hostname = this.hostname[0] === '[' &&
        this.hostname[this.hostname.length - 1] === ']';

    // validate a little.
    if (!ipv6Hostname) {
      var hostparts = this.hostname.split(/\./);
      for (var i = 0, l = hostparts.length; i < l; i++) {
        var part = hostparts[i];
        if (!part) continue;
        if (!part.match(hostnamePartPattern)) {
          var newpart = '';
          for (var j = 0, k = part.length; j < k; j++) {
            if (part.charCodeAt(j) > 127) {
              // we replace non-ASCII char with a temporary placeholder
              // we need this to make sure size of hostname is not
              // broken by replacing non-ASCII by nothing
              newpart += 'x';
            } else {
              newpart += part[j];
            }
          }
          // we test again with ASCII char only
          if (!newpart.match(hostnamePartPattern)) {
            var validParts = hostparts.slice(0, i);
            var notHost = hostparts.slice(i + 1);
            var bit = part.match(hostnamePartStart);
            if (bit) {
              validParts.push(bit[1]);
              notHost.unshift(bit[2]);
            }
            if (notHost.length) {
              rest = '/' + notHost.join('.') + rest;
            }
            this.hostname = validParts.join('.');
            break;
          }
        }
      }
    }

    if (this.hostname.length > hostnameMaxLen) {
      this.hostname = '';
    } else {
      // hostnames are always lower case.
      this.hostname = this.hostname.toLowerCase();
    }

    if (!ipv6Hostname) {
      // IDNA Support: Returns a punycoded representation of "domain".
      // It only converts parts of the domain name that
      // have non-ASCII characters, i.e. it doesn't matter if
      // you call it with a domain that already is ASCII-only.
      this.hostname = punycode.toASCII(this.hostname);
    }

    var p = this.port ? ':' + this.port : '';
    var h = this.hostname || '';
    this.host = h + p;
    this.href += this.host;

    // strip [ and ] from the hostname
    // the host field still retains them, though
    if (ipv6Hostname) {
      this.hostname = this.hostname.substr(1, this.hostname.length - 2);
      if (rest[0] !== '/') {
        rest = '/' + rest;
      }
    }
  }

  // now rest is set to the post-host stuff.
  // chop off any delim chars.
  if (!unsafeProtocol[lowerProto]) {

    // First, make 100% sure that any "autoEscape" chars get
    // escaped, even if encodeURIComponent doesn't think they
    // need to be.
    for (var i = 0, l = autoEscape.length; i < l; i++) {
      var ae = autoEscape[i];
      if (rest.indexOf(ae) === -1)
        continue;
      var esc = encodeURIComponent(ae);
      if (esc === ae) {
        esc = escape(ae);
      }
      rest = rest.split(ae).join(esc);
    }
  }


  // chop off from the tail first.
  var hash = rest.indexOf('#');
  if (hash !== -1) {
    // got a fragment string.
    this.hash = rest.substr(hash);
    rest = rest.slice(0, hash);
  }
  var qm = rest.indexOf('?');
  if (qm !== -1) {
    this.search = rest.substr(qm);
    this.query = rest.substr(qm + 1);
    if (parseQueryString) {
      this.query = querystring.parse(this.query);
    }
    rest = rest.slice(0, qm);
  } else if (parseQueryString) {
    // no query string, but parseQueryString still requested
    this.search = '';
    this.query = {};
  }
  if (rest) this.pathname = rest;
  if (slashedProtocol[lowerProto] &&
      this.hostname && !this.pathname) {
    this.pathname = '/';
  }

  //to support http.request
  if (this.pathname || this.search) {
    var p = this.pathname || '';
    var s = this.search || '';
    this.path = p + s;
  }

  // finally, reconstruct the href based on what has been validated.
  this.href = this.format();
  return this;
};

// format a parsed object into a url string
function urlFormat(obj) {
  // ensure it's an object, and not a string url.
  // If it's an obj, this is a no-op.
  // this way, you can call url_format() on strings
  // to clean up potentially wonky urls.
  if (util.isString(obj)) obj = urlParse(obj);
  if (!(obj instanceof Url)) return Url.prototype.format.call(obj);
  return obj.format();
}

Url.prototype.format = function() {
  var auth = this.auth || '';
  if (auth) {
    auth = encodeURIComponent(auth);
    auth = auth.replace(/%3A/i, ':');
    auth += '@';
  }

  var protocol = this.protocol || '',
      pathname = this.pathname || '',
      hash = this.hash || '',
      host = false,
      query = '';

  if (this.host) {
    host = auth + this.host;
  } else if (this.hostname) {
    host = auth + (this.hostname.indexOf(':') === -1 ?
        this.hostname :
        '[' + this.hostname + ']');
    if (this.port) {
      host += ':' + this.port;
    }
  }

  if (this.query &&
      util.isObject(this.query) &&
      Object.keys(this.query).length) {
    query = querystring.stringify(this.query);
  }

  var search = this.search || (query && ('?' + query)) || '';

  if (protocol && protocol.substr(-1) !== ':') protocol += ':';

  // only the slashedProtocols get the //.  Not mailto:, xmpp:, etc.
  // unless they had them to begin with.
  if (this.slashes ||
      (!protocol || slashedProtocol[protocol]) && host !== false) {
    host = '//' + (host || '');
    if (pathname && pathname.charAt(0) !== '/') pathname = '/' + pathname;
  } else if (!host) {
    host = '';
  }

  if (hash && hash.charAt(0) !== '#') hash = '#' + hash;
  if (search && search.charAt(0) !== '?') search = '?' + search;

  pathname = pathname.replace(/[?#]/g, function(match) {
    return encodeURIComponent(match);
  });
  search = search.replace('#', '%23');

  return protocol + host + pathname + search + hash;
};

function urlResolve(source, relative) {
  return urlParse(source, false, true).resolve(relative);
}

Url.prototype.resolve = function(relative) {
  return this.resolveObject(urlParse(relative, false, true)).format();
};

function urlResolveObject(source, relative) {
  if (!source) return relative;
  return urlParse(source, false, true).resolveObject(relative);
}

Url.prototype.resolveObject = function(relative) {
  if (util.isString(relative)) {
    var rel = new Url();
    rel.parse(relative, false, true);
    relative = rel;
  }

  var result = new Url();
  var tkeys = Object.keys(this);
  for (var tk = 0; tk < tkeys.length; tk++) {
    var tkey = tkeys[tk];
    result[tkey] = this[tkey];
  }

  // hash is always overridden, no matter what.
  // even href="" will remove it.
  result.hash = relative.hash;

  // if the relative url is empty, then there's nothing left to do here.
  if (relative.href === '') {
    result.href = result.format();
    return result;
  }

  // hrefs like //foo/bar always cut to the protocol.
  if (relative.slashes && !relative.protocol) {
    // take everything except the protocol from relative
    var rkeys = Object.keys(relative);
    for (var rk = 0; rk < rkeys.length; rk++) {
      var rkey = rkeys[rk];
      if (rkey !== 'protocol')
        result[rkey] = relative[rkey];
    }

    //urlParse appends trailing / to urls like http://www.example.com
    if (slashedProtocol[result.protocol] &&
        result.hostname && !result.pathname) {
      result.path = result.pathname = '/';
    }

    result.href = result.format();
    return result;
  }

  if (relative.protocol && relative.protocol !== result.protocol) {
    // if it's a known url protocol, then changing
    // the protocol does weird things
    // first, if it's not file:, then we MUST have a host,
    // and if there was a path
    // to begin with, then we MUST have a path.
    // if it is file:, then the host is dropped,
    // because that's known to be hostless.
    // anything else is assumed to be absolute.
    if (!slashedProtocol[relative.protocol]) {
      var keys = Object.keys(relative);
      for (var v = 0; v < keys.length; v++) {
        var k = keys[v];
        result[k] = relative[k];
      }
      result.href = result.format();
      return result;
    }

    result.protocol = relative.protocol;
    if (!relative.host && !hostlessProtocol[relative.protocol]) {
      var relPath = (relative.pathname || '').split('/');
      while (relPath.length && !(relative.host = relPath.shift()));
      if (!relative.host) relative.host = '';
      if (!relative.hostname) relative.hostname = '';
      if (relPath[0] !== '') relPath.unshift('');
      if (relPath.length < 2) relPath.unshift('');
      result.pathname = relPath.join('/');
    } else {
      result.pathname = relative.pathname;
    }
    result.search = relative.search;
    result.query = relative.query;
    result.host = relative.host || '';
    result.auth = relative.auth;
    result.hostname = relative.hostname || relative.host;
    result.port = relative.port;
    // to support http.request
    if (result.pathname || result.search) {
      var p = result.pathname || '';
      var s = result.search || '';
      result.path = p + s;
    }
    result.slashes = result.slashes || relative.slashes;
    result.href = result.format();
    return result;
  }

  var isSourceAbs = (result.pathname && result.pathname.charAt(0) === '/'),
      isRelAbs = (
          relative.host ||
          relative.pathname && relative.pathname.charAt(0) === '/'
      ),
      mustEndAbs = (isRelAbs || isSourceAbs ||
                    (result.host && relative.pathname)),
      removeAllDots = mustEndAbs,
      srcPath = result.pathname && result.pathname.split('/') || [],
      relPath = relative.pathname && relative.pathname.split('/') || [],
      psychotic = result.protocol && !slashedProtocol[result.protocol];

  // if the url is a non-slashed url, then relative
  // links like ../.. should be able
  // to crawl up to the hostname, as well.  This is strange.
  // result.protocol has already been set by now.
  // Later on, put the first path part into the host field.
  if (psychotic) {
    result.hostname = '';
    result.port = null;
    if (result.host) {
      if (srcPath[0] === '') srcPath[0] = result.host;
      else srcPath.unshift(result.host);
    }
    result.host = '';
    if (relative.protocol) {
      relative.hostname = null;
      relative.port = null;
      if (relative.host) {
        if (relPath[0] === '') relPath[0] = relative.host;
        else relPath.unshift(relative.host);
      }
      relative.host = null;
    }
    mustEndAbs = mustEndAbs && (relPath[0] === '' || srcPath[0] === '');
  }

  if (isRelAbs) {
    // it's absolute.
    result.host = (relative.host || relative.host === '') ?
                  relative.host : result.host;
    result.hostname = (relative.hostname || relative.hostname === '') ?
                      relative.hostname : result.hostname;
    result.search = relative.search;
    result.query = relative.query;
    srcPath = relPath;
    // fall through to the dot-handling below.
  } else if (relPath.length) {
    // it's relative
    // throw away the existing file, and take the new path instead.
    if (!srcPath) srcPath = [];
    srcPath.pop();
    srcPath = srcPath.concat(relPath);
    result.search = relative.search;
    result.query = relative.query;
  } else if (!util.isNullOrUndefined(relative.search)) {
    // just pull out the search.
    // like href='?foo'.
    // Put this after the other two cases because it simplifies the booleans
    if (psychotic) {
      result.hostname = result.host = srcPath.shift();
      //occationaly the auth can get stuck only in host
      //this especially happens in cases like
      //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
      var authInHost = result.host && result.host.indexOf('@') > 0 ?
                       result.host.split('@') : false;
      if (authInHost) {
        result.auth = authInHost.shift();
        result.host = result.hostname = authInHost.shift();
      }
    }
    result.search = relative.search;
    result.query = relative.query;
    //to support http.request
    if (!util.isNull(result.pathname) || !util.isNull(result.search)) {
      result.path = (result.pathname ? result.pathname : '') +
                    (result.search ? result.search : '');
    }
    result.href = result.format();
    return result;
  }

  if (!srcPath.length) {
    // no path at all.  easy.
    // we've already handled the other stuff above.
    result.pathname = null;
    //to support http.request
    if (result.search) {
      result.path = '/' + result.search;
    } else {
      result.path = null;
    }
    result.href = result.format();
    return result;
  }

  // if a url ENDs in . or .., then it must get a trailing slash.
  // however, if it ends in anything else non-slashy,
  // then it must NOT get a trailing slash.
  var last = srcPath.slice(-1)[0];
  var hasTrailingSlash = (
      (result.host || relative.host || srcPath.length > 1) &&
      (last === '.' || last === '..') || last === '');

  // strip single dots, resolve double dots to parent dir
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = srcPath.length; i >= 0; i--) {
    last = srcPath[i];
    if (last === '.') {
      srcPath.splice(i, 1);
    } else if (last === '..') {
      srcPath.splice(i, 1);
      up++;
    } else if (up) {
      srcPath.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (!mustEndAbs && !removeAllDots) {
    for (; up--; up) {
      srcPath.unshift('..');
    }
  }

  if (mustEndAbs && srcPath[0] !== '' &&
      (!srcPath[0] || srcPath[0].charAt(0) !== '/')) {
    srcPath.unshift('');
  }

  if (hasTrailingSlash && (srcPath.join('/').substr(-1) !== '/')) {
    srcPath.push('');
  }

  var isAbsolute = srcPath[0] === '' ||
      (srcPath[0] && srcPath[0].charAt(0) === '/');

  // put the host back
  if (psychotic) {
    result.hostname = result.host = isAbsolute ? '' :
                                    srcPath.length ? srcPath.shift() : '';
    //occationaly the auth can get stuck only in host
    //this especially happens in cases like
    //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
    var authInHost = result.host && result.host.indexOf('@') > 0 ?
                     result.host.split('@') : false;
    if (authInHost) {
      result.auth = authInHost.shift();
      result.host = result.hostname = authInHost.shift();
    }
  }

  mustEndAbs = mustEndAbs || (result.host && srcPath.length);

  if (mustEndAbs && !isAbsolute) {
    srcPath.unshift('');
  }

  if (!srcPath.length) {
    result.pathname = null;
    result.path = null;
  } else {
    result.pathname = srcPath.join('/');
  }

  //to support request.http
  if (!util.isNull(result.pathname) || !util.isNull(result.search)) {
    result.path = (result.pathname ? result.pathname : '') +
                  (result.search ? result.search : '');
  }
  result.auth = relative.auth || result.auth;
  result.slashes = result.slashes || relative.slashes;
  result.href = result.format();
  return result;
};

Url.prototype.parseHost = function() {
  var host = this.host;
  var port = portPattern.exec(host);
  if (port) {
    port = port[0];
    if (port !== ':') {
      this.port = port.substr(1);
    }
    host = host.substr(0, host.length - port.length);
  }
  if (host) this.hostname = host;
};

},{"./util":8,"punycode":3,"querystring":6}],8:[function(require,module,exports){
'use strict';

module.exports = {
  isString: function(arg) {
    return typeof(arg) === 'string';
  },
  isObject: function(arg) {
    return typeof(arg) === 'object' && arg !== null;
  },
  isNull: function(arg) {
    return arg === null;
  },
  isNullOrUndefined: function(arg) {
    return arg == null;
  }
};

},{}],9:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],10:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],11:[function(require,module,exports){
(function (process,global){
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

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./support/isBuffer":10,"_process":2,"inherits":9}],12:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("./common");
exports.serviceModule = common_1.serviceModule;
const router_1 = require("./router");
exports.Router = router_1.Router;
const locationService_1 = require("./locationService");
exports.LocationService = locationService_1.LocationService;
const core_1 = require("@akala/core");
exports.ObservableArray = core_1.ObservableArray;
const http_1 = require("./http");
const template_1 = require("./template");
exports.Template = template_1.Template;
const part_1 = require("./part");
exports.Part = part_1.Part;
const scope_1 = require("./scope");
const controls_1 = require("./controls/controls");
exports.BaseControl = controls_1.BaseControl;
exports.Control = controls_1.Control;
exports.control = controls_1.control;
common_1.$$injector['router'] = router_1.router;
common_1.$$injector['BaseControl'] = controls_1.BaseControl;
common_1.$$injector['Control'] = controls_1.Control;
common_1.$$injector['control'] = controls_1.control;
var mainRouter = router_1.router();
mainRouter.use(common_1.serviceModule.register('$preRouter', router_1.router()).router);
mainRouter.use(common_1.serviceModule.register('$router', router_1.router()).router);
mainRouter.use(function (error) {
    console.error(error);
});
common_1.serviceModule.register('$http', new http_1.Http());
common_1.serviceModule.register('$location', new locationService_1.LocationService());
common_1.serviceModule.register('promisify', core_1.Promisify);
common_1.serviceModule.register('$defer', core_1.Deferred);
// export { Promisify, Deferred };
exports.run = common_1.$$injector.run.bind(common_1.$$injector);
common_1.$$injector.init([], function () {
    var rootScope = common_1.$$injector.register('$rootScope', new scope_1.Scope());
    $(document).applyTemplate(rootScope);
});
common_1.$$injector.start(['$location'], function ($location) {
    var started = false;
    $location.on('change', function () {
        if (started)
            mainRouter.handle(new router_1.Request(location), function (err) {
                if (err)
                    console.error(err);
                else
                    console.warn('deadend');
            });
    });
    $location.start({ hashbang: true });
    started = true;
});
$(function () {
    common_1.$$injector.start();
});

},{"./common":13,"./controls/controls":16,"./http":27,"./locationService":28,"./part":29,"./router":30,"./scope":31,"./template":32,"@akala/core":39}],13:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@akala/core");
require("@akala/core");
exports.$$injector = window['akala'] = core_1.module('akala', 'akala-services', 'controls');
exports.$$injector['promisify'] = core_1.Promisify;
exports.$$injector['defer'] = core_1.Deferred;
exports.$$injector['Binding'] = core_1.Binding;
exports.$$injector['ObservableArray'] = core_1.ObservableArray;
exports.serviceModule = core_1.module('akala-services');
function service(name, ...toInject) {
    return function (target) {
        var instance = null;
        if (toInject == null || toInject.length == 0 && target.length > 0)
            throw new Error('missing inject names');
        else
            exports.serviceModule.registerFactory(name, function () {
                return instance || exports.serviceModule.injectWithName(toInject, function () {
                    var args = [null];
                    for (var i = 0; i < arguments.length; i++)
                        args[i + 1] = arguments[i];
                    return instance = new (Function.prototype.bind.apply(target, args));
                })();
            });
    };
}
exports.service = service;

},{"@akala/core":39}],14:[function(require,module,exports){
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const control_1 = require("./control");
const core_1 = require("@akala/core");
let Click = class Click extends control_1.BaseControl {
    constructor() {
        super('click', 400);
    }
    link(scope, element, parameter) {
        element.click(function () {
            if (parameter instanceof core_1.Binding) {
                return scope.$inject(parameter.getValue());
            }
            else
                return scope.$inject(parameter);
        });
    }
};
Click = __decorate([
    control_1.control()
], Click);
exports.Click = Click;

},{"./control":15,"@akala/core":39}],15:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const di = require("@akala/core");
var registeredControls = [];
function control(...toInject) {
    return function (ctrl) {
        if (registeredControls.length == 0)
            Control.injector.init([], function () {
                registeredControls.forEach(function (ctrl) {
                    di.injectNewWithName(ctrl[0], ctrl[1])();
                });
            });
        registeredControls.push([toInject, ctrl]);
    };
}
exports.control = control;
class Control {
    constructor($$name, priority = 500) {
        this.$$name = $$name;
        this.priority = priority;
        Control.injector.register($$name, this);
    }
    static apply(controls, element, scope) {
        var applicableControls = [];
        var requiresNewScope = false;
        Object.keys(controls).forEach(function (key) {
            var control;
            applicableControls.push(control = Control.injector.resolve(key));
            if (control.scope)
                requiresNewScope = true;
        });
        applicableControls.sort(function (a, b) { return a.priority - b.priority; });
        if (!scope)
            scope = element.data('$scope');
        if (requiresNewScope) {
            scope = scope.$new();
            element.data('$scope', scope);
        }
        for (var control of applicableControls) {
            var controlSettings = controls[control.$$name];
            if (controlSettings instanceof Function)
                controlSettings = controlSettings(scope, true);
            var newElem = control.instanciate(scope, element, controlSettings, controls);
            if (newElem) {
                return newElem;
            }
        }
        ;
        element.find('[data-bind]').each(function () {
            if ($(this).parent().closest('[data-bind]')[0] == element[0])
                $(this).applyTemplate(scope, element);
        });
        return element;
    }
    wrap(element, scope, newControls) {
        if (newControls) {
            var controls = di.Parser.parse(element.attr('data-bind'), true);
            var applicableControls = [];
            Object.keys(controls).forEach(function (key) {
                applicableControls.push(Control.injector.resolve(key));
            });
            applicableControls.sort(function (a, b) { return a.priority - b.priority; });
            applicableControls = applicableControls.slice(applicableControls.indexOf(this) + 1);
            newControls = {};
            applicableControls.forEach(function (control) {
                newControls[control.$$name] = controls[control.$$name];
            });
        }
        return Control.apply(newControls, element, scope);
    }
    clone(element, scope, newControls) {
        var clone = element.clone();
        clone.data('$scope', scope);
        this.wrap(clone, scope, newControls);
        return clone;
    }
}
Control.injector = di.module('controls', 'akala-services');
exports.Control = Control;
class BaseControl extends Control {
    constructor(name, priority) {
        super(name, priority);
    }
    instanciate(scope, element, parameter) {
        var self = this;
        di.Promisify(scope).then(function (scope) {
            di.Promisify(parameter).then(function (parameter) {
                self.link(scope, element, parameter);
            });
        });
    }
}
exports.BaseControl = BaseControl;

},{"@akala/core":39}],16:[function(require,module,exports){
"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
__export(require("./control"));
__export(require("./foreach"));
__export(require("./text"));
__export(require("./value"));
__export(require("./cssClass"));
__export(require("./part"));
__export(require("./click"));
__export(require("./options"));
__export(require("./hide"));
__export(require("./spinner"));
__export(require("./translate"));
__export(require("./json"));

},{"./click":14,"./control":15,"./cssClass":17,"./foreach":18,"./hide":19,"./json":20,"./options":21,"./part":22,"./spinner":23,"./text":24,"./translate":25,"./value":26}],17:[function(require,module,exports){
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const control_1 = require("./control");
const core_1 = require("@akala/core");
let CssClass = class CssClass extends control_1.BaseControl {
    constructor() {
        super('class', 400);
    }
    link(target, element, parameter) {
        if (parameter instanceof Array) {
            new core_1.ObservableArray(parameter).on('collectionChanged', function (arg) {
                for (var i in arg.newItems) {
                    if (typeof (arg.newItems[i]) == 'string')
                        element.addClass(arg.newItems[i]);
                    else {
                        if (arg.newItems[i] instanceof core_1.Binding) {
                            arg.newItems[i].onChanged(function (target, eventArgs) {
                                element.addClass(arg.newItems[i].getValue());
                            });
                            // element.text(parameter.getValue());
                        }
                        else
                            element.addClass(arg.newItems[i]);
                    }
                }
            }).init();
        }
        else {
            Object.keys(parameter).forEach(function (key) {
                parameter[key].onChanged(function (ev) {
                    element.toggleClass(key, ev.eventArgs.value);
                });
                element.toggleClass(key, parameter[key].getValue());
            });
        }
    }
};
CssClass = __decorate([
    control_1.control()
], CssClass);
exports.CssClass = CssClass;

},{"./control":15,"@akala/core":39}],18:[function(require,module,exports){
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const di = require("@akala/core");
const control_1 = require("./control");
let ForEach = ForEach_1 = class ForEach extends control_1.Control {
    constructor() {
        super('each', 100);
    }
    instanciate(target, element, parameter) {
        if (typeof (parameter) == 'string') {
            parameter = this.parse(parameter);
        }
        var source = di.Parser.eval(parameter.in, target);
        var self = this;
        var parent = element.parent();
        element.detach();
        // var newControls;
        return di.Promisify(source).then(function (source) {
            var result = $();
            if (source instanceof di.ObservableArray) {
                source.on('collectionChanged', function (args) {
                    var key = -1;
                    var isAdded = false;
                    switch (args.action) {
                        case 'init':
                            break;
                        case 'shift':
                            parent.eq(0).remove();
                            break;
                        case 'pop':
                            parent.eq(source.length).remove();
                            break;
                        case 'push':
                            var scope = target.$new();
                            if (parameter.key)
                                scope[parameter.key] = source.length - 1;
                            if (parameter.value)
                                scope[parameter.value] = args.newItems[0];
                            parent.append(self.clone(element, scope, true));
                            break;
                        case 'unshift':
                            var scope = target.$new();
                            if (parameter.key)
                                scope[parameter.key] = 0;
                            if (parameter.value)
                                scope[parameter.value] = args.newItems[0];
                            parent.prepend(self.clone(element, scope, true));
                            break;
                        case 'replace':
                            var scope = target.$new();
                            if (parameter.key)
                                scope[parameter.key] = source.indexOf(args.newItems[0]);
                            if (parameter.value)
                                scope[parameter.value] = args.newItems[0];
                            parent.eq(source.indexOf(args.newItems[0])).replaceWith(self.clone(element, scope, true));
                            break;
                    }
                });
                source = source.array;
            }
            $.each(source, function (key, value) {
                var scope = target.$new();
                if (parameter.key)
                    scope[parameter.key] = key;
                if (parameter.value)
                    scope[parameter.value] = value;
                parent.append(self.clone(element, scope, true));
            });
            return result;
        });
    }
    parse(exp) {
        var result = ForEach_1.expRegex.exec(exp).slice(1);
        return { in: result[2], key: result[1] && result[0], value: result[1] || result[0] };
    }
};
ForEach.expRegex = /^\s*\(?(\w+)(?:, (\w+))?\)?\s+in\s+(\w+)\s*/;
ForEach = ForEach_1 = __decorate([
    control_1.control()
], ForEach);
exports.ForEach = ForEach;
var ForEach_1;

},{"./control":15,"@akala/core":39}],19:[function(require,module,exports){
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const control_1 = require("./control");
let Hide = class Hide extends control_1.BaseControl {
    constructor() {
        super('hide', 400);
    }
    link(target, element, parameter) {
        parameter.onChanged(function (ev) {
            element.toggle(ev.eventArgs.value);
        });
    }
};
Hide = __decorate([
    control_1.control()
], Hide);
exports.Hide = Hide;

},{"./control":15}],20:[function(require,module,exports){
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const control_1 = require("./control");
const core_1 = require("@akala/core");
let Json = class Json extends control_1.BaseControl {
    constructor() {
        super('json', 400);
    }
    link(target, element, parameter) {
        if (parameter instanceof core_1.Binding) {
            parameter.onChanged(function (ev) {
                element.text(JSON.stringify(ev.eventArgs.value));
            });
        }
        else
            element.text(JSON.stringify(parameter));
    }
};
Json = __decorate([
    control_1.control()
], Json);
exports.Json = Json;

},{"./control":15,"@akala/core":39}],21:[function(require,module,exports){
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const di = require("@akala/core");
const control_1 = require("./control");
let Options = class Options extends control_1.Control {
    constructor() {
        super('options', 350);
    }
    instanciate(target, element, parameter, controls) {
        var self = this;
        var value = controls.value;
        if (controls.value instanceof Function)
            value = controls.value(target, true);
        delete controls.value;
        // var newControls;
        di.Promisify(parameter.in).then(function (source) {
            var array;
            if (source instanceof di.Binding)
                array = source = source.getValue();
            if (parameter.text instanceof di.Binding)
                parameter.text = parameter.text.expression;
            if (parameter.value instanceof di.Binding)
                parameter.value = parameter.value.expression;
            if (parameter.text[0] != '$')
                parameter.text = '$item.' + parameter.text;
            if (parameter.value[0] != '$')
                parameter.value = '$item.' + parameter.value;
            if (source instanceof di.ObservableArray) {
                var offset = element.children().length;
                source.on('collectionChanged', function (args) {
                    var key = -1;
                    var isAdded = false;
                    switch (args.action) {
                        case 'init':
                            break;
                        case 'shift':
                            element.children().eq(offset).remove();
                            break;
                        case 'pop':
                            element.children().eq(this.length).remove();
                            break;
                        case 'push':
                            var scope = target.$new();
                            scope['$key'] = this.length - 1;
                            scope['$value'] = args.newItems[0];
                            element.append(self.clone($('<option data-bind="{value: ' + parameter.value + ', text:' + parameter.text + '}" />'), scope, true));
                            break;
                        case 'unshift':
                            var scope = target.$new();
                            scope['$key'] = 0;
                            scope['$value'] = args.newItems[0];
                            element.prepend(self.clone($('<option data-bind="{value: ' + parameter.value + ', text:' + parameter.text + '}" />'), scope, true));
                            break;
                        case 'replace':
                            var scope = target.$new();
                            scope['$key'] = this.indexOf(args.newItems[0]);
                            scope['$value'] = args.newItems[0];
                            element.eq(offset + this.indexOf(args.newItems[0])).replaceWith(self.clone($('<option data-bind="{value: ' + parameter.value + ', text:' + parameter.text + '}" />'), scope, true));
                            break;
                    }
                });
                array = source.array;
            }
            if (typeof (array) == 'undefined')
                throw new Error('invalid array type');
            $.each(array, function (key, value) {
                var scope = target.$new();
                scope['$key'] = key;
                scope['$item'] = value;
                element.append(self.clone($('<option data-bind="{value: ' + parameter.value + ', text:' + parameter.text + '}" />'), scope, true));
            });
            element.change(function () {
                var val = element.val();
                var model = $.grep(array, function (it, i) {
                    return val == di.Parser.eval(parameter.value, { $item: it, $key: i });
                });
                if (model.length == 0)
                    value.setValue(val, value);
                else
                    value.setValue(model[0], value);
            });
            value.onChanged(function (ev) {
                if (value !== ev.source)
                    element.val(di.Parser.eval(parameter.value, ev.eventArgs.value));
            });
        });
    }
};
Options = __decorate([
    control_1.control()
], Options);
exports.Options = Options;

},{"./control":15,"@akala/core":39}],22:[function(require,module,exports){
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const control_1 = require("./control");
let Part = class Part extends control_1.BaseControl {
    constructor(partService) {
        super('part', 100);
        this.partService = partService;
    }
    link(target, element, parameter) {
        var partService = this.partService;
        if (typeof parameter != 'string') {
            parameter['template'].onChanged(function (ev) {
                partService.apply(function () { return { scope: parameter, element: element }; }, { controller: parameter.controller, template: ev.eventArgs.value }, {}, $.noop);
            });
        }
        else
            partService.register(parameter, { scope: target, element: element });
    }
};
Part = __decorate([
    control_1.control("$part")
], Part);
exports.Part = Part;

},{"./control":15}],23:[function(require,module,exports){
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const di = require("@akala/core");
const control_1 = require("./control");
let Spinner = class Spinner extends control_1.Control {
    constructor() {
        super('spinner', 50);
    }
    instanciate(target, element, parameter) {
        var parent = element.parent();
        var wrapped = this.wrap(element, target, true);
        var settings = {};
        if (Array.isArray(parameter))
            settings.classes = parameter;
        else
            settings.classes = parameter.classes || 'fa fa-spin fa-3x fa-circle-o-notch';
        if (wrapped != element && di.isPromiseLike(wrapped)) {
            var spinner;
            if (element[0].tagName.toLowerCase() == 'tr') {
                spinner = $('<tr class="spinner"><td colspan="99"></td></tr>').appendTo(parent);
                parent = spinner.find('td');
            }
            spinner = $('<span class="spinner"></span>');
            spinner.addClass(settings.classes);
            spinner.appendTo(parent);
            wrapped.then(function () {
                spinner.remove();
            });
        }
        return wrapped;
    }
};
Spinner = __decorate([
    control_1.control()
], Spinner);
exports.Spinner = Spinner;

},{"./control":15,"@akala/core":39}],24:[function(require,module,exports){
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const control_1 = require("./control");
const core_1 = require("@akala/core");
let Text = class Text extends control_1.BaseControl {
    constructor() {
        super('text', 400);
    }
    link(target, element, parameter) {
        if (parameter instanceof core_1.Binding) {
            parameter.onChanged(function (ev) {
                element.text(ev.eventArgs.value);
            });
        }
        else
            element.text(parameter);
    }
};
Text = __decorate([
    control_1.control()
], Text);
exports.Text = Text;

},{"./control":15,"@akala/core":39}],25:[function(require,module,exports){
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const di = require("@akala/core");
const control_1 = require("./control");
const core_1 = require("@akala/core");
di.registerFactory('$translator', di.injectWithName(['$translations'], function (translations) {
    return function (key, ...parameters) {
        if (!parameters)
            return translations && translations[key] || key;
        return (translations && translations[key] || key).replace(/\{\d+\}/g, function (m) {
            return parameters[m];
        });
    };
}));
let Translate = class Translate extends control_1.BaseControl {
    constructor(translator) {
        super('translate', 400);
        this.translator = translator;
    }
    link(target, element, parameter) {
        var translator = this.translator;
        if (parameter instanceof core_1.Binding) {
            parameter.onChanged(function (ev) {
                element.text(translator(ev.eventArgs.value));
            });
        }
        else
            element.text(translator(parameter));
    }
};
Translate = __decorate([
    control_1.control('$translator')
], Translate);
exports.Translate = Translate;

},{"./control":15,"@akala/core":39}],26:[function(require,module,exports){
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const di = require("@akala/core");
const control_1 = require("./control");
let Value = class Value extends control_1.BaseControl {
    constructor() {
        super('value', 400);
    }
    link(target, element, parameter) {
        if (typeof (parameter) == 'undefined')
            return;
        if (parameter instanceof di.Binding) {
            element.change(function () {
                parameter.setValue(element.val(), parameter);
            });
            parameter.onChanged(function (ev) {
                if (parameter !== ev.source)
                    element.val(ev.eventArgs.value);
            });
        }
        else
            element.val(parameter);
    }
};
Value = __decorate([
    control_1.control()
], Value);
exports.Value = Value;

},{"./control":15,"@akala/core":39}],27:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const url_1 = require("url");
const di = require("@akala/core");
// @service('$http')
class Http {
    constructor() { }
    get(url, params) {
        return this.call('GET', url, params);
    }
    getJSON(url, params) {
        return this.get(url, params).then(function (data) {
            return JSON.parse(data);
        });
    }
    call(method, url, params) {
        var uri = url_1.parse(url);
        uri.query = $.extend({}, uri.query, params);
        var req = new XMLHttpRequest();
        req.open(method, url_1.format(uri), true);
        var deferred = new di.Deferred();
        req.onreadystatechange = function (aEvt) {
            if (req.readyState == 4) {
                if (req.status == 200)
                    deferred.resolve(req.responseText);
                else
                    deferred.reject(req.responseText);
            }
        };
        req.send(null);
        return deferred;
    }
}
exports.Http = Http;

},{"@akala/core":39,"url":7}],28:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const core_1 = require("@akala/core");
/**
 * Previous context, for capturing
 * page exit events.
 */
var prevContext;
/**
 * Perform initial dispatch.
 */
var dispatch = true;
/**
 * Decode URL components (query string, pathname, hash).
 * Accommodates both regular percent encoding and x-www-form-urlencoded format.
 */
var decodeURLComponents = true;
/**
 * Base path.
 */
var base = '';
/**
 * Running flag.
 */
var running;
/**
 * HashBang option
 */
var hashbang = false;
/**
 * Detect click event
 */
var clickEvent = ('undefined' !== typeof document) && document.ontouchstart ? 'touchstart' : 'click';
class LocationService extends events_1.EventEmitter {
    constructor() {
        super();
        /**
         * Current path being processed
         * @type {string}
         */
        this.current = '';
        /**
         * Number of pages navigated to.
         * @type {number}
         *
         *     page.len == 0;
         *     page('/login');
         *     page.len == 1;
         */
        this.len = 0;
    }
    start(options) {
        options = options || {};
        if (running)
            return;
        running = true;
        if (false === options.dispatch)
            dispatch = false;
        if (false === options.decodeURLComponents)
            decodeURLComponents = false;
        if (false !== options.popstate)
            window.addEventListener('popstate', onpopstate, false);
        if (false !== options.click) {
            document.addEventListener(clickEvent, onclick, false);
        }
        if (true === options.hashbang)
            hashbang = true;
        if (!dispatch)
            return;
        var url = (hashbang && ~location.hash.indexOf('#/')) ? location.hash.substr(2) + location.search : location.pathname + location.search + location.hash;
        this.replace(url, null, true, dispatch);
        new core_1.WatchBinding('href', location, 100).onChanged(this.show.bind(this));
    }
    ;
    /**
 * Replace `path` with optional `state` object.
 *
 * @param {string} path
 * @param {Object=} state
 * @param {boolean=} init
 * @param {boolean=} dispatch
 * @return {!Context}
 * @api public
 */
    set(path) {
        if (hashbang && path[0] != '#')
            location.assign('#' + path);
        else
            location.assign(path);
    }
    replace(path, state, init, dispatch) {
        // var ctx = new Context(path, state);
        this.current = path;
        // ctx.init = init;
        // ctx.save(); // save before dispatching, which may redirect
        if (false !== dispatch)
            this.dispatch(path);
        return path;
    }
    ;
    /**
     * Unbind click and popstate event handlers.
     *
     * @api public
     */
    stop() {
        if (!running)
            return;
        this.current = '';
        this.len = 0;
        running = false;
        document.removeEventListener(clickEvent, onclick, false);
        window.removeEventListener('popstate', onpopstate, false);
    }
    ;
    /**
     * Show `path` with optional `state` object.
     *
     * @param {string} path
     * @param {Object=} state
     * @param {boolean=} dispatch
     * @param {boolean=} push
     * @return {!Context}
     * @api public
     */
    show(path, state, dispatch) {
        this.current = path;
        if (!dispatch)
            this.dispatch(path);
        // if (false !== ctx.handled && false !== push) ctx.pushState();
        return state;
    }
    ;
    /**
     * Goes back in the history
     * Back should always let the current route push state and then go back.
     *
     * @param {string} path - fallback path to go back if no more history exists, if undefined defaults to page.base
     * @param {Object=} state
     * @api public
     */
    back(path, state) {
        if (this.len > 0) {
            // this may need more testing to see if all browsers
            // wait for the next tick to go back in history
            history.back();
            this.len--;
        }
        else if (path) {
            setTimeout(function () {
                this.show(path, state);
            });
        }
        else {
            setTimeout(function () {
                this.show(base, state);
            });
        }
    }
    ;
    dispatch(path) {
        this.emit('changing', path);
        this.emit('change', path);
    }
}
exports.LocationService = LocationService;

},{"@akala/core":39,"events":1}],29:[function(require,module,exports){
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const akala = require("@akala/core");
const events_1 = require("events");
const common_1 = require("./common");
let Part = class Part extends events_1.EventEmitter {
    constructor(template, router, location) {
        super();
        this.template = template;
        this.router = router;
        this.parts = new akala.Injector();
        location.on('changing', () => {
            var parts = this.parts;
            parts.keys().forEach(function (partName) {
                if (partName == '$injector')
                    return;
                parts.resolve(partName).element.empty();
            });
        });
    }
    register(partName, control) {
        this.parts.register(partName, control);
    }
    apply(partInstance, part, params, next) {
        var parts = this.parts;
        var template = this.template;
        if (part.template)
            template.get(part.template).then(function (template) {
                var p = partInstance();
                if (!p)
                    return;
                if (part.controller)
                    part.controller(p.scope, p.element, params, next);
                if (template)
                    template(p.scope, p.element.empty());
            });
        else {
            var p = partInstance();
            if (!p)
                return;
            if (part.controller)
                part.controller(p.scope, p.element, params, next);
            else
                next();
        }
    }
    use(url, partName = 'body', part) {
        var self = this;
        this.router.use(url, function (req, next) {
            self.apply(() => self.parts.resolve(partName), part, req.params, next);
        });
    }
};
Part = __decorate([
    common_1.service('$part', '$template', '$router', '$location')
], Part);
exports.Part = Part;

},{"./common":13,"@akala/core":39,"events":1}],30:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const url = require("url");
const akala = require("@akala/core");
var debug = require('debug')('akala:router');
class Request {
    constructor(loc) {
        if (loc.hash)
            this.url = loc.hash.substr(1);
        else
            this.url = '/';
        this.uri = url.parse(this.url, true);
    }
}
exports.Request = Request;
;
if (!window.setImmediate)
    window['setImmediate'] = function (fn) {
        var args = arguments.length && Array.prototype.slice.call(arguments, 1) || [];
        return setTimeout(function () {
            fn.apply(this, args);
        }, 0);
    };
class BrowserLayer extends akala.Layer {
    constructor(path, options, handler) {
        super(path, options, handler);
    }
}
exports.BrowserLayer = BrowserLayer;
class BrowserRoute extends akala.Route {
    constructor(path) {
        super(path);
    }
    buildLayer(path, options, callback) {
        return new BrowserLayer('/', options, callback);
    }
}
exports.BrowserRoute = BrowserRoute;
class Router extends akala.Router {
    constructor(options) {
        super(options);
    }
    buildLayer(path, options, handler) {
        return new BrowserLayer(path, options, handler);
    }
    buildRoute(path) {
        return new BrowserRoute(path);
    }
}
exports.Router = Router;
function router() {
    var proto = new Router();
    return proto;
}
exports.router = router;

},{"@akala/core":39,"debug":64,"url":7}],31:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const di = require("@akala/core");
class Scope {
    constructor() {
        this.$$watchers = {};
    }
    $new() {
        var newScope = function () { };
        newScope.prototype = this;
        return new newScope();
    }
    $inject(f) {
        var scope = this;
        if (!this.resolver) {
            this.resolver = new di.Injector();
            this.resolver.setInjectables(this);
        }
        return this.resolver.inject(f)(this);
    }
    $set(expression, value) {
        di.Binding.getSetter(this, expression)(value, 'scope');
    }
    $watch(expression, handler) {
        var binding = this.$$watchers[expression];
        if (!binding) {
            binding = new di.Binding(expression, this);
            this.$$watchers[expression] = binding;
        }
        if (!binding['handlers'])
            binding['handlers'] = [];
        if (binding['handlers'].indexOf(handler) > -1)
            return;
        binding['handlers'].push(handler);
        binding.onChanged(function (ev) {
            handler(ev.eventArgs.value);
        });
    }
}
exports.Scope = Scope;

},{"@akala/core":39}],32:[function(require,module,exports){
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
require("@akala/core");
const di = require("@akala/core");
const controls_1 = require("./controls/controls");
const scope_1 = require("./scope");
const common_1 = require("./common");
if (MutationObserver) {
    var domObserver = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            switch (mutation.type) {
                case 'characterData':
                    return;
                case 'attributes':
                case 'childList':
            }
        });
    });
}
let Interpolate = Interpolate_1 = class Interpolate {
    get startSymbol() { return Interpolate_1._startSymbol; }
    ;
    set startSymbol(value) { Interpolate_1._startSymbol = value; }
    ;
    get endSymbol() { return Interpolate_1._endSymbol; }
    ;
    set endSymbol(value) { Interpolate_1._endSymbol = value; }
    ;
    static unescapeText(text) {
        return text.replace(this.escapedStartRegexp, Interpolate_1._startSymbol).
            replace(this.escapedEndRegexp, Interpolate_1._endSymbol);
    }
    static escape(ch) {
        return '\\\\\\' + ch;
    }
    static build(text, mustHaveExpression, trustedContext, allOrNothing) {
        var startSymbolLength = Interpolate_1._startSymbol.length, endSymbolLength = Interpolate_1._endSymbol.length;
        if (!text.length || text.indexOf(Interpolate_1._startSymbol) === -1) {
            var constantInterp;
            if (!mustHaveExpression) {
                return function (target) {
                    return text;
                };
            }
            return constantInterp;
        }
        allOrNothing = !!allOrNothing;
        var startIndex, endIndex, index = 0, expressions = [], parseFns = [], textLength = text.length, exp, concat = [], expressionPositions = [];
        while (index < textLength) {
            if (((startIndex = text.indexOf(Interpolate_1._startSymbol, index)) !== -1) &&
                ((endIndex = text.indexOf(Interpolate_1._endSymbol, startIndex + startSymbolLength)) !== -1)) {
                if (index !== startIndex) {
                    concat.push(this.unescapeText(text.substring(index, startIndex)));
                }
                exp = text.substring(startIndex + startSymbolLength, endIndex);
                expressions.push(exp);
                parseFns.push(function (target) {
                    return new di.Binding(exp, target);
                });
                index = endIndex + endSymbolLength;
                expressionPositions.push(concat.length);
                concat.push('');
            }
            else {
                // we did not find an interpolation, so we have to add the remainder to the separators array
                if (index !== textLength) {
                    concat.push(this.unescapeText(text.substring(index)));
                }
                break;
            }
        }
        var compute = function (values) {
            for (var i = 0, ii = expressions.length; i < ii; i++) {
                if (allOrNothing && typeof (values[i]))
                    return;
                concat[expressionPositions[i]] = values[i].getValue();
            }
            return concat.join('');
        };
        return function interpolationFn(target) {
            var bindings = [];
            for (var i = 0; i < expressions.length; i++) {
                bindings[i] = parseFns[i](target);
            }
            return compute(bindings);
        };
    }
};
Interpolate._startSymbol = '{{';
Interpolate._endSymbol = '}}';
Interpolate.escapedStartRegexp = new RegExp(Interpolate_1._startSymbol.replace(/./g, Interpolate_1.escape), 'g');
Interpolate.escapedEndRegexp = new RegExp(Interpolate_1._endSymbol.replace(/./g, Interpolate_1.escape), 'g');
Interpolate = Interpolate_1 = __decorate([
    common_1.service('$interpolate')
], Interpolate);
exports.Interpolate = Interpolate;
var cache = new di.Injector();
let Template = Template_1 = class Template {
    constructor(interpolator, http) {
        this.interpolator = interpolator;
        this.http = http;
    }
    get(t, registerTemplate = true) {
        var http = this.http;
        var self = this;
        var p = new di.Deferred();
        if (!t)
            setImmediate(p.resolve, t);
        else {
            var template = cache.resolve(t);
            if (template) {
                if (di.isPromiseLike(template))
                    return template.then(function (data) {
                        p.resolve(data);
                        return data;
                    });
                else
                    setImmediate(p.resolve.bind(p), template);
            }
            else if (/</.test(t)) {
                var template = Template_1.build(t);
                setImmediate(p.resolve.bind(p), template);
            }
            else {
                cache.register(t, p);
                http.get(t).then(function (data) {
                    var template = Template_1.build(data);
                    if (registerTemplate)
                        cache.register(t, template, true);
                    p.resolve(template);
                }, p.reject.bind(p));
            }
        }
        return p;
    }
    static build(markup) {
        var template = Interpolate.build(markup);
        return function (data, parent) {
            var templateInstance = $(template(data));
            if (parent)
                templateInstance.appendTo(parent);
            return templateInstance.applyTemplate(data, parent);
        };
    }
};
Template = Template_1 = __decorate([
    common_1.service('$template', '$interpolate', '$http')
], Template);
exports.Template = Template;
var databindRegex = /(\w+):([^;]+);?/g;
$.extend($.fn, {
    applyTemplate: function applyTemplate(data, root) {
        data.$new = scope_1.Scope.prototype.$new;
        if (this.filter('[data-bind]').length == 0) {
            this.find('[data-bind]').each(function () {
                var closest = $(this).parent().closest('[data-bind]');
                var applyInnerTemplate = closest.length == 0;
                if (!applyInnerTemplate && root)
                    root.each(function (i, it) { applyInnerTemplate = applyInnerTemplate || it == closest[0]; });
                if (applyInnerTemplate) {
                    $(this).applyTemplate(data, this);
                }
            });
            return this;
        }
        else {
            var element = $();
            var promises = [];
            this.filter('[data-bind]').each(function (index, item) {
                var $item = $(item);
                var subElem = controls_1.Control.apply(di.Parser.evalAsFunction($item.attr("data-bind"), true), $item, data);
                if (di.isPromiseLike(subElem)) {
                    promises.push(subElem.then(function (subElem) {
                        element = element.add(subElem);
                    }));
                }
                else
                    element = element.add(subElem);
            });
            if (promises.length)
                return di.when(promises).then(function () {
                    return element;
                });
            return element;
        }
    },
    tmpl: function (data, options) {
        if (this.length > 1)
            throw 'A template can only be a single item';
        if (this.length == 0)
            return null;
        return Template.build(this[0]);
    }
});
var Interpolate_1, Template_1;

},{"./common":13,"./controls/controls":16,"./scope":31,"@akala/core":39}],33:[function(require,module,exports){
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

},{"./formatters":37,"./parser":42,"./promiseHelpers":43,"events":1}],34:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function array(array, body, complete) {
    var loop = function (i) {
        if (i == array.length)
            complete();
        else
            try {
                body(array[i], i, function (error) {
                    if (error)
                        complete(error);
                    else
                        setImmediate(loop, i + 1);
                });
            }
            catch (e) {
                complete(e);
            }
    };
    loop(0);
}
exports.array = array;
function object(o, body, complete) {
    array(Object.keys(o), function (key, i, next) {
        body(o[key], key, next);
    }, complete);
}
exports.object = object;
function any(it, body, complete) {
    if (Array.isArray(it) || typeof (it['length']) != 'undefined')
        return array(it, body, complete);
    return object(it, body, complete);
}
exports.any = any;

},{}],35:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const injector_1 = require("./injector");
function factory(name, ...toInject) {
    return function (target) {
        var instance = null;
        var factory = function () {
            if (!instance) {
                var args = [null];
                for (var arg in arguments)
                    args.push(arguments[arg]);
                instance = new (target.bind.apply(target, args))();
            }
            return instance.build();
        };
        if (toInject == null || toInject.length == 0)
            injector_1.registerFactory(name, injector_1.inject(factory));
        else
            injector_1.registerFactory(name, injector_1.injectWithName(toInject, factory));
    };
}
exports.factory = factory;

},{"./injector":40}],36:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function identity(a) {
    return a;
}
exports.identity = identity;

},{}],37:[function(require,module,exports){
"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
__export(require("./identity"));
__export(require("./negate"));

},{"./identity":36,"./negate":38}],38:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function negate(a) {
    return !a;
}
exports.negate = negate;

},{}],39:[function(require,module,exports){
"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
__export(require("./injector"));
__export(require("./factory"));
__export(require("./service"));
__export(require("./binder"));
__export(require("./parser"));
const module_1 = require("./module");
__export(require("./promiseHelpers"));
var eachAsync_1 = require("./eachAsync");
exports.eachAsync = eachAsync_1.any;
__export(require("./router"));
function module(name, ...dependencies) {
    return new module_1.Module(name, dependencies);
}
exports.module = module;

},{"./binder":33,"./eachAsync":34,"./factory":35,"./injector":40,"./module":41,"./parser":42,"./promiseHelpers":43,"./router":45,"./service":48}],40:[function(require,module,exports){
(function (global){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const reflect_1 = require("./reflect");
function ctorToFunction() {
    var args = [null];
    for (var i = 0; i < arguments.length; i++)
        args[i + 1] = arguments[i];
    return new (Function.prototype.bind.apply(this, args));
}
class Injector {
    constructor(parent) {
        this.parent = parent;
        this.injectables = {};
        if (this.parent == null)
            this.parent = defaultInjector;
        this.register('$injector', this);
    }
    setInjectables(value) {
        this.injectables = value;
    }
    keys() {
        return Object.keys(this.injectables);
    }
    merge(i) {
        var self = this;
        Object.getOwnPropertyNames(i.injectables).forEach(function (property) {
            if (property != '$injector')
                self.registerDescriptor(property, Object.getOwnPropertyDescriptor(i.injectables, property));
        });
    }
    inject(a) {
        return this.injectWithName(a['$inject'] || reflect_1.getParamNames(a), a);
    }
    resolve(param) {
        if (typeof (this.injectables[param]) != 'undefined')
            return this.injectables[param];
        if (this.parent)
            return this.parent.resolve(param);
        return null;
    }
    inspect() {
        console.log(this.injectables);
    }
    injectNewWithName(toInject, ctor) {
        return injectWithName(toInject, ctorToFunction.bind(ctor));
    }
    injectWithName(toInject, a) {
        var paramNames = reflect_1.getParamNames(a);
        var self = this;
        if (paramNames.length == toInject.length || paramNames.length == 0) {
            if (toInject.length == paramNames.length && paramNames.length == 0)
                return a;
            return function (instance) {
                var args = [];
                for (var param of toInject) {
                    args[args.length] = self.resolve(param);
                }
                return a.apply(instance, args);
            };
        }
        else
            return function (instance) {
                var args = [];
                var unknownArgIndex = 0;
                for (var param of paramNames) {
                    if (param in toInject)
                        args[args.length] = self.resolve(param);
                    else if (typeof (arguments[unknownArgIndex]) != 'undefined')
                        args[args.length] = arguments[unknownArgIndex++];
                    else
                        args[args.length] = null;
                }
                return a.apply(instance, args);
            };
    }
    unregister(name) {
        var registration = Object.getOwnPropertyDescriptor(this.injectables, name);
        if (registration)
            delete this.injectables[name];
    }
    register(name, value, override) {
        if (typeof (value) != 'undefined' && value !== null)
            this.registerDescriptor(name, { value: value, enumerable: true, configurable: true }, override);
        return value;
    }
    registerFactory(name, value, override) {
        this.register(name + 'Factory', value, override);
        this.registerDescriptor(name, {
            get: function () {
                return value();
            }, enumerable: true, configurable: true
        }, override);
        return value;
    }
    registerDescriptor(name, value, override) {
        if (!override && typeof (this.injectables[name]) != 'undefined')
            throw new Error('There is already a registered item for ' + name);
        if (typeof (this.injectables[name]) !== 'undefined')
            this.unregister(name);
        Object.defineProperty(this.injectables, name, value);
    }
}
exports.Injector = Injector;
if (!global['$$defaultInjector'])
    global['$$defaultInjector'] = new Injector();
var defaultInjector = global['$$defaultInjector'];
function resolve(name) {
    return defaultInjector.resolve(name);
}
exports.resolve = resolve;
function unregister(name) {
    return defaultInjector.unregister(name);
}
exports.unregister = unregister;
function merge(i) {
    return defaultInjector.merge(i);
}
exports.merge = merge;
function inspect() {
    return defaultInjector.inspect();
}
exports.inspect = inspect;
function inject(a) {
    return defaultInjector.inject(a);
}
exports.inject = inject;
function injectWithName(toInject, a) {
    return defaultInjector.injectWithName(toInject, a);
}
exports.injectWithName = injectWithName;
function injectNewWithName(toInject, a) {
    return defaultInjector.injectNewWithName(toInject, a);
}
exports.injectNewWithName = injectNewWithName;
function register(name, value, override) {
    return defaultInjector.register(name, value, override);
}
exports.register = register;
function registerFactory(name, value, override) {
    return defaultInjector.registerFactory(name, value, override);
}
exports.registerFactory = registerFactory;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./reflect":44}],41:[function(require,module,exports){
(function (process){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const di = require("./injector");
const orchestrator = require("orchestrator");
const events_1 = require("events");
process.hrtime = process.hrtime || require('browser-process-hrtime');
class Module extends di.Injector {
    constructor(name, dep) {
        super();
        this.name = name;
        this.dep = dep;
        this.emitter = new events_1.EventEmitter();
        Module.registerModule(this);
    }
    static registerModule(m) {
        var emitter = m.emitter;
        Module.o.add(m.name, m.dep, function () {
            di.merge(m);
            emitter.emit('init');
            emitter.emit('run');
        });
    }
    run(toInject, f) {
        this.emitter.on('run', di.injectWithName(toInject, f));
    }
    init(toInject, f) {
        if (!toInject || toInject.length == 0)
            this.emitter.on('init', f);
        else
            this.emitter.on('init', di.injectWithName(toInject, f));
    }
    start(toInject, f) {
        if (arguments.length == 0)
            Module.o.start(this.name);
        else
            Module.o.on('stop', di.injectWithName(toInject, f));
    }
    internalStart(callback) {
        if (this.starting)
            return;
        this.starting = true;
    }
}
Module.o = new orchestrator();
exports.Module = Module;

}).call(this,require('_process'))

},{"./injector":40,"_process":2,"browser-process-hrtime":50,"events":1,"orchestrator":55}],42:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const promiseHelpers_1 = require("./promiseHelpers");
const binder_1 = require("./binder");
const formatters = require("./formatters");
var jsonKeyRegex = /^ *"([^"]+)"|([^\: ]+) *: */;
class ParsedBinary {
    constructor(operator, left, right) {
        this.operator = operator;
        this.left = left;
        this.right = right;
        this.$$length = this.left.$$length + this.operator.length + this.right.$$length;
    }
    evaluate(value, asBinding) {
        var operation = this;
        if (asBinding) {
            var left, right;
            if (operation.left instanceof Function)
                left = operation.left(value, asBinding);
            else if (operation.left instanceof ParsedBinary)
                left = operation.left.evaluate(value, asBinding);
            else if (operation.left instanceof ParsedString)
                left = operation.left.value;
            else if (operation.left instanceof ParsedNumber)
                left = operation.left.value;
            else if (operation.left instanceof Array)
                left = operation.left;
            else if (operation.left instanceof Object)
                left = operation.left;
            if (operation.right instanceof Function)
                right = operation.right(value, asBinding);
            else if (operation.right instanceof ParsedBinary)
                right = operation.right.evaluate(value, asBinding);
            else if (operation.right instanceof ParsedString)
                right = operation.right.value;
            else if (operation.right instanceof ParsedNumber)
                right = operation.right.value;
            else if (operation.right instanceof Array)
                right = operation.right;
            else if (operation.right instanceof Object)
                right = operation.right;
            var binding = new binder_1.Binding(null, null, false);
            if (left instanceof binder_1.Binding)
                left.pipe(binding);
            if (right instanceof binder_1.Binding)
                right.pipe(binding);
            binding['$$length'] = operation.$$length;
            binding.getValue = function () {
                var fleft, fright;
                if (left instanceof binder_1.Binding)
                    fleft = left.getValue();
                else
                    fleft = left;
                if (right instanceof binder_1.Binding)
                    fright = right.getValue();
                else
                    fright = right;
                return Parser.operate(operation.operator, fleft, fright);
            };
            return binding;
        }
        else {
            var left, right;
            if (operation.left instanceof Function)
                left = operation.left(value, false);
            else if (operation.left instanceof ParsedBinary)
                left = operation.left.evaluate(value, asBinding);
            else if (operation.left instanceof ParsedString)
                left = operation.left.value;
            else if (operation.left instanceof ParsedNumber)
                left = operation.left.value;
            else if (operation.left instanceof Array)
                left = operation.left;
            else if (operation.left instanceof Object)
                left = operation.left;
            if (operation.right instanceof Function)
                right = operation.right(value, false);
            else if (operation.right instanceof ParsedBinary)
                right = operation.right.evaluate(value, asBinding);
            else if (operation.right instanceof ParsedString)
                right = operation.right.value;
            else if (operation.right instanceof ParsedNumber)
                right = operation.right.value;
            else if (operation.right instanceof Array)
                right = operation.right;
            else if (operation.right instanceof Object)
                right = operation.right;
            return Parser.operate(operation.operator, left, right);
        }
    }
    static applyPrecedence(operation) {
        if (operation.operator != '+' && operation.operator != '-') {
            if (operation.right instanceof Function) {
                var right = ParsedBinary.applyPrecedence(operation.right.$$ast);
                switch (right.operator) {
                    case '+':
                    case '-':
                        break;
                    case '*': // b*(c+d) ==> (b*c)+d
                    case '/':
                    case '&&':
                    case '||':
                        var left = operation.left;
                        operation.right = right.right;
                        operation.left = new ParsedBinary(operation.operator, left, right.left);
                        operation.operator = right.operator;
                        break;
                }
            }
        }
        return operation;
    }
    toString() {
        return '(' + this.left.toString() + this.operator + this.right.toString() + ')';
    }
}
exports.ParsedBinary = ParsedBinary;
class ParsedString {
    constructor(value) {
        this.value = value;
        this.$$length = value.length + 2;
    }
    toString() {
        return this.value;
    }
}
exports.ParsedString = ParsedString;
class ParsedNumber {
    constructor(value) {
        this.value = Number(value);
        this.$$length = value.length;
    }
}
exports.ParsedNumber = ParsedNumber;
class ParsedBoolean {
    constructor(value) {
        this.value = Boolean(value);
        if (typeof value != 'undefined')
            this.$$length = value.toString().length;
    }
}
exports.ParsedBoolean = ParsedBoolean;
class Parser {
    static parse(expression, excludeFirstLevelFunction) {
        expression = expression.trim();
        var result = Parser.parseAny(expression, excludeFirstLevelFunction);
        if (!excludeFirstLevelFunction && result instanceof ParsedBinary)
            return result.evaluate.bind(result);
        return result;
    }
    static parseAny(expression, excludeFirstLevelFunction) {
        switch (expression[0]) {
            case '{':
                return Parser.parseObject(expression, excludeFirstLevelFunction);
            case '[':
                return Parser.parseArray(expression, excludeFirstLevelFunction);
            case '"':
            case "'":
                return Parser.parseString(expression, expression[0]);
            case '0':
            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
            case '7':
            case '8':
            case '9':
            case '.':
                return Parser.parseNumber(expression);
            default:
                return Parser.parseEval(expression);
        }
    }
    static parseNumber(expression) {
        var result = new ParsedNumber(/^[0-9.]/.exec(expression)[0]);
        return Parser.tryParseOperator(expression.substring(result.$$length), result);
    }
    static parseBoolean(expression) {
        var formatter = formatters.identity;
        if (expression[0] == '!') {
            formatter = formatters.negate;
            expression = expression.substring(1);
        }
        if (/^true|false|undefined/.exec(expression)) {
            var result = new ParsedBoolean(/^true|false|undefined/.exec(expression)[0]);
            if (formatter !== formatters.identity)
                result.value = formatter(result.value);
            return result;
        }
        return null;
    }
    static parseEval(expression) {
        var b = Parser.parseBoolean(expression);
        if (b)
            return b;
        return Parser.parseFunction(expression);
    }
    static parseFunction(expression) {
        var formatter = formatters.identity;
        if (expression[0] == '!') {
            formatter = formatters.negate;
            expression = expression.substring(1);
        }
        var item = /^[\w0-9\.\$]+/.exec(expression)[0];
        var parts = Parser.parseBindable(item);
        var f = function (value, asBinding) {
            if (asBinding) {
                if (promiseHelpers_1.isPromiseLike(value)) {
                    var binding = new binder_1.PromiseBinding(item, value);
                    binding['$$length'] = item.length;
                    binding.formatter = formatter;
                    return binding;
                }
                var binding = new binder_1.Binding(item, value);
                binding['$$length'] = item.length;
                binding.formatter = formatter;
                return binding;
            }
            for (var i = 0; i < parts.length && value; i++) {
                value = value[parts[i]];
                if (promiseHelpers_1.isPromiseLike(value)) {
                    if (value instanceof promiseHelpers_1.Deferred && value.$$status == promiseHelpers_1.PromiseStatus.Resolved) {
                        value = value.$$value;
                    }
                    else {
                        var promise;
                        if (i == parts.length - 1)
                            promise = value;
                        else
                            promise = value.then(Parser.parseFunction(parts.slice(i + 1).join('.'))).then(formatter);
                        promise['$$length'] = item.length;
                        return promise;
                    }
                }
            }
            return value;
        };
        f.$$length = item.length;
        f = Parser.tryParseOperator(expression.substr(item.length), f);
        return f;
    }
    static tryParseOperator(expression, lhs) {
        var operator = /^ *([<>=!\+\-\/\*&\|]+) */.exec(expression);
        if (operator) {
            expression = expression.substring(operator[0].length);
            var rhs = Parser.parseAny(expression, false);
            return ParsedBinary.applyPrecedence(new ParsedBinary(operator[1], lhs, rhs));
        }
        else
            return lhs;
    }
    static parseArray(expression, excludeFirstLevelFunction) {
        var results = [];
        Object.defineProperty(results, '$$length', { value: 0, enumerable: false, configurable: true, writable: true });
        var isFunction = false;
        return Parser.parseCSV(expression, function (result) {
            var item = Parser.parseAny(result, false);
            item = Parser.tryParseOperator(result.substring(item.$$length), item);
            if (item instanceof ParsedBoolean || item instanceof ParsedString || item instanceof ParsedNumber)
                results.push(item.value);
            else if (item instanceof ParsedBinary)
                results.push(item.evaluate.bind(item));
            else
                results.push(item);
            // results.$$length += item.$$length;
            return item;
        }, ']', results, excludeFirstLevelFunction);
    }
    static parseString(expression, start) {
        var evaluatedRegex = new RegExp("^" + start + "((?:[^\\" + start + "]|\\.)+)" + start).exec(expression);
        // console.log(arguments);
        var result = evaluatedRegex[1];
        var parsedString = new ParsedString(result);
        return Parser.tryParseOperator(expression.substring(evaluatedRegex[0].length), parsedString);
    }
    static operate(operator, left, right) {
        // if (arguments.length == 1)
        //     return function (left: any, right: any)
        //     {
        //         return Parser.operate(operator, left, right);
        //     }
        switch (operator) {
            case '==':
                return left == right;
            case '===':
                return left === right;
            case '<':
                return left < right;
            case '<=':
                return left <= right;
            case '>':
                return left > right;
            case '>=':
                return left >= right;
            case '!=':
                return left != right;
            case '!==':
                return left !== right;
            case '+':
                return left + right;
            case '-':
                return left - right;
            case '/':
                return left / right;
            case '*':
                return left * right;
            case '||':
                return left || right;
            case '&&':
                return left && right;
            default:
                throw new Error('invalid operator' + operator);
        }
    }
    static parseCSV(expression, parseItem, end, output, excludeFirstLevelFunction) {
        expression = expression.substring(1);
        output.$$length++;
        var isFunction = false;
        do {
            var item = parseItem(expression);
            if (item instanceof Function || item instanceof ParsedBinary)
                isFunction = true;
            expression = expression.substring(item.$$length);
            var next = /^ *, */.exec(expression);
            // console.log(expression)
            if (!next)
                break;
            expression = expression.substring(next[0].length);
            // console.log(expression);
            output.$$length += next[0].length;
        } while (expression[0] != end);
        output.$$length += end.length;
        // console.log(output.$$length);
        var result;
        if (output instanceof Array)
            result = [];
        else
            result = {};
        if (isFunction && !excludeFirstLevelFunction) {
            var f = function (value, asBinding) {
                for (var i in output) {
                    if (output[i] instanceof Function)
                        result[i] = output[i](value, asBinding);
                    else
                        result[i] = output[i];
                }
                return result;
            };
            f.$$length = output.$$length;
            return f;
        }
        else
            return output;
    }
    static parseObject(expression, excludeFirstLevelFunction) {
        var keyMatch;
        var result = {};
        Object.defineProperty(result, '$$length', { value: 0, enumerable: false, writable: true, configurable: true });
        return Parser.parseCSV(expression, function (expression) {
            // var length = 0;
            var keyMatch = jsonKeyRegex.exec(expression);
            var key = keyMatch[1] || keyMatch[2];
            //console.log(keyMatch);
            var length = keyMatch[0].length + keyMatch.index;
            expression = expression.substring(length);
            var item = Parser.parseAny(expression, false);
            length += item.$$length;
            if (item instanceof ParsedBoolean || item instanceof ParsedString || item instanceof ParsedNumber)
                result[key] = item.value;
            else if (item instanceof ParsedBinary)
                result[key] = item.evaluate.bind(item);
            else
                result[key] = item;
            // expression = expression.substring(result[key].$$length);
            item.$$length = length;
            result.$$length += length;
            // console.log(expression);
            //console.log(length);
            return item;
        }, '}', result, excludeFirstLevelFunction);
    }
    static parseBindable(expression) {
        return expression.split('.');
    }
    static getSetter(expression, root) {
        var target = root;
        var parts = Parser.parseBindable(expression);
        while (parts.length > 1 && typeof (target) != 'undefined') {
            target = Parser.eval(parts[0], target);
            parts.shift();
        }
        if (typeof (target) == 'undefined')
            return null;
        return { expression: parts[0], target: target, set: function (value) { target[parts[0]] = value; } };
    }
    static evalAsFunction(expression, excludeFirstLevelFunction) {
        if (!expression)
            return null;
        var parts = Parser.parse(expression, excludeFirstLevelFunction);
        if (parts instanceof Array)
            return Parser.parseFunction(expression);
        return parts;
    }
    static eval(expression, value) {
        return Parser.evalAsFunction(expression, false)(value, false);
    }
}
exports.Parser = Parser;

},{"./binder":33,"./formatters":37,"./promiseHelpers":43}],43:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
function Promisify(o) {
    if (o && o instanceof Promise)
        return o;
    if (o && o['then'])
        return o;
    var deferred = new Deferred();
    var e = new Error();
    setTimeout(function () {
        // console.debug(e.stack);
        deferred.resolve(o);
    });
    return deferred;
}
exports.Promisify = Promisify;
function isPromiseLike(o) {
    return o && o['then'] && typeof (o['then']) == 'function';
}
exports.isPromiseLike = isPromiseLike;
function when(promises) {
    if (promises && !promises.length)
        return Promisify(null);
    if (promises && promises.length == 1)
        return promises[0];
    var results = new Array(promises.length);
    var deferred = new Deferred();
    var completed = 0;
    promises.forEach(function (promise, idx) {
        promise.then(function (result) {
            results[idx] = result;
            if (++completed == promises.length)
                deferred.resolve(results);
        }, function (rejection) {
            deferred.reject(rejection);
        });
    });
}
exports.when = when;
var PromiseStatus;
(function (PromiseStatus) {
    PromiseStatus[PromiseStatus["Pending"] = 0] = "Pending";
    PromiseStatus[PromiseStatus["Resolved"] = 1] = "Resolved";
    PromiseStatus[PromiseStatus["Rejected"] = 2] = "Rejected";
})(PromiseStatus = exports.PromiseStatus || (exports.PromiseStatus = {}));
class Deferred extends events_1.EventEmitter {
    constructor() {
        super();
        this.$$status = PromiseStatus.Pending;
    }
    resolve(val) {
        if (isPromiseLike(val))
            val.then(this.resolve.bind(this), this.reject.bind(this));
        else {
            this.$$status = PromiseStatus.Resolved;
            this.$$value = val;
            this.emit('resolve', val);
        }
    }
    reject(reason) {
        this.$$value = reason;
        this.$$status = PromiseStatus.Rejected;
        this.emit('reject', reason);
    }
    then(onfulfilled, onrejected) {
        switch (this.$$status) {
            case PromiseStatus.Resolved:
                var deferred = new Deferred();
                var result = onfulfilled(this.$$value);
                if (typeof (result) == 'undefined')
                    result = this.$$value;
                setImmediate(deferred.resolve.bind(deferred), Promisify(result));
                return deferred;
            case PromiseStatus.Rejected:
                var deferred = new Deferred();
                var rejection = onrejected(this.$$value);
                if (typeof (rejection) == 'undefined')
                    rejection = this.$$value;
                setImmediate(deferred.reject.bind(deferred), Promisify(rejection));
                return deferred;
            case PromiseStatus.Pending:
                var next = new Deferred();
                this.once('resolve', function (value) {
                    var result = onfulfilled(value);
                    if (typeof (result) == 'undefined')
                        next.resolve(value);
                    else
                        next.resolve(result);
                });
                this.once('reject', function (value) {
                    if (onrejected)
                        next.reject(onrejected(value));
                });
                return next;
        }
    }
}
exports.Deferred = Deferred;

},{"events":1}],44:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
function getParamNames(func) {
    var fnStr = func.toString().replace(STRIP_COMMENTS, '');
    var result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(/([^\s,]+)/g);
    if (result === null)
        result = [];
    return result;
}
exports.getParamNames = getParamNames;
function escapeRegExp(str) {
    return str.replace(/[\-\[\]\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}
exports.escapeRegExp = escapeRegExp;

},{}],45:[function(require,module,exports){
(function (process){
/*!
 * router
 * Copyright(c) 2013 Roman Shtylman
 * Copyright(c) 2014 Douglas Christopher Wilson
 * MIT Licensed
 */
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Module dependencies.
 * @private
 */
var debug = require('debug')('router');
const flatten = require("array-flatten");
const layer_1 = require("./layer");
exports.Layer = layer_1.Layer;
// import * as methods from 'methods';
const mixin = require("utils-merge");
const parseUrl = require("parseurl");
const route_1 = require("./route");
exports.Route = route_1.Route;
var slice = Array.prototype.slice;
/* istanbul ignore next */
var defer = typeof setImmediate === 'function'
    ? setImmediate
    : function (fn, ...args) { process.nextTick(fn.bind.apply(fn, arguments)); };
class Router {
    constructor(options) {
        this.params = {};
        this.stack = [];
        this.router = this.handle.bind(this);
        var opts = options || {};
        this.caseSensitive = opts.caseSensitive;
        this.mergeParams = opts.mergeParams;
        this.strict = opts.strict;
        this.length = opts.length || 2;
    }
    /**
     * Map the given param placeholder `name`(s) to the given callback.
     *
     * Parameter mapping is used to provide pre-conditions to routes
     * which use normalized placeholders. For example a _:user_id_ parameter
     * could automatically load a user's information from the database without
     * any additional code.
     *
     * The callback uses the same signature as middleware, the only difference
     * being that the value of the placeholder is passed, in this case the _id_
     * of the user. Once the `next()` function is invoked, just like middleware
     * it will continue on to execute the route, or subsequent parameter functions.
     *
     * Just like in middleware, you must either respond to the request or call next
     * to avoid stalling the request.
     *
     *  router.param('user_id', function(req, res, next, id){
     *    User.find(id, function(err, user){
     *      if (err) {
     *        return next(err)
     *      } else if (!user) {
     *        return next(new Error('failed to load user'))
     *      }
     *      req.user = user
     *      next()
     *    })
     *  })
     *
     * @param {string} name
     * @param {function} fn
     * @public
     */
    param(name, fn) {
        if (!name) {
            throw new TypeError('argument name is required');
        }
        if (typeof name !== 'string') {
            throw new TypeError('argument name must be a string');
        }
        if (!fn) {
            throw new TypeError('argument fn is required');
        }
        if (typeof fn !== 'function') {
            throw new TypeError('argument fn must be a function');
        }
        var params = this.params[name];
        if (!params) {
            params = this.params[name] = [];
        }
        params.push(fn);
        return this;
    }
    /**
     * Dispatch a req, res into the router.
     *
     * @private
     */
    handle(req, ...rest) {
        return this.internalHandle.apply(this, [{}, req].concat(rest));
    }
    internalHandle(options, req, ...rest) {
        var callback = rest[rest.length - 1];
        if (!callback) {
            throw new TypeError('argument callback is required');
        }
        debug('dispatching %s %s', req['method'] || '', req.url);
        var idx = 0;
        var removed = '';
        var self = this;
        var slashAdded = false;
        var paramcalled = {};
        // middleware and routes
        var stack = this.stack;
        // manage inter-router variables
        var parentParams = req.params;
        var parentUrl = req.baseUrl || '';
        var done = Router.restore(callback, req, 'baseUrl', 'next', 'params');
        // setup next layer
        req.next = next;
        if (options && options.preHandle) {
            done = options.preHandle(done);
        }
        // setup basic req values
        req.baseUrl = parentUrl;
        req.originalUrl = req.originalUrl || req.url;
        next();
        function next(err) {
            var layerError = err === 'route'
                ? null
                : err;
            // remove added slash
            if (slashAdded) {
                req.url = req.url.substr(1);
                slashAdded = false;
            }
            // restore altered req.url
            if (removed.length !== 0) {
                req.baseUrl = parentUrl;
                req.url = removed + req.url;
                removed = '';
            }
            // signal to exit router
            if (layerError === 'router') {
                defer(done, null);
                return;
            }
            // no more matching layers
            if (idx >= stack.length) {
                defer(done, layerError);
                return;
            }
            // get pathname of request
            var path = Router.getPathname(req);
            if (path == null) {
                return done(layerError);
            }
            // find next matching layer
            var layer;
            var match;
            var route;
            while (match !== true && idx < stack.length) {
                layer = stack[idx++];
                match = Router.matchLayer(layer, path);
                route = layer.route;
                if (typeof match !== 'boolean') {
                    // hold on to layerError
                    layerError = layerError || match;
                }
                if (match !== true) {
                    continue;
                }
                if (!route) {
                    // process non-route handlers normally
                    continue;
                }
                if (layerError) {
                    // routes do not match with a pending error
                    match = false;
                    continue;
                }
                var isApplicable = route.isApplicable(req);
                // build up automatic options response
                if (!isApplicable) {
                    if (options && options.notApplicableRoute) {
                        if (options.notApplicableRoute(route) === false) {
                            match = false;
                            continue;
                        }
                    }
                }
            }
            // no match
            if (match !== true) {
                return done(layerError);
            }
            // store route for dispatch on change
            if (route) {
                req.route = route;
            }
            // Capture one-time layer values
            req.params = self.mergeParams
                ? Router.mergeParams(layer.params, parentParams)
                : layer.params;
            var layerPath = layer.path;
            var args = [req];
            args = args.concat(rest.slice(0, rest.length - 1));
            ;
            // this should be done for the layer
            self.process_params.apply(self, [layer, paramcalled].concat(args).concat(function (err) {
                if (err) {
                    return next(layerError || err);
                }
                if (route) {
                    return layer.handle_request.apply(layer, args.concat(next));
                }
                trim_prefix(layer, layerError, layerPath, path);
            }));
        }
        function trim_prefix(layer, layerError, layerPath, path) {
            if (layerPath.length !== 0) {
                // Validate path breaks on a path separator
                var c = path[layerPath.length];
                if (c && c !== '/') {
                    next(layerError);
                    return;
                }
                // Trim off the part of the url that matches the route
                // middleware (.use stuff) needs to have the path stripped
                debug('trim prefix (%s) from url %s', layerPath, req.url);
                removed = layerPath;
                req.url = req.url.substr(removed.length);
                // Ensure leading slash
                if (req.url[0] !== '/') {
                    req.url = '/' + req.url;
                    slashAdded = true;
                }
                // Setup base URL (no trailing slash)
                req.baseUrl = parentUrl + (removed[removed.length - 1] === '/'
                    ? removed.substring(0, removed.length - 1)
                    : removed);
            }
            debug('%s %s : %s', layer.name, layerPath, req.originalUrl);
            var args = [req].concat(rest.slice(0, rest.length - 1));
            args.push(next);
            if (layerError) {
                layer.handle_error.apply(layer, [layerError].concat(args));
            }
            else {
                layer.handle_request.apply(layer, args);
            }
        }
    }
    process_params(layer, called, req, ...rest) {
        var done = rest[rest.length - 1];
        var params = this.params;
        // captured parameters from the layer, keys and values
        var keys = layer.keys;
        // fast track
        if (!keys || keys.length === 0) {
            return done();
        }
        var i = 0;
        var name;
        var paramIndex = 0;
        var key;
        var paramVal;
        var paramCallbacks;
        var paramCalled;
        // process params in order
        // param callbacks can be async
        function param(err) {
            if (err) {
                return done(err);
            }
            if (i >= keys.length) {
                return done();
            }
            paramIndex = 0;
            key = keys[i++];
            name = key.name;
            paramVal = req.params[name];
            paramCallbacks = params[name];
            paramCalled = called[name];
            if (paramVal === undefined || !paramCallbacks) {
                return param();
            }
            // param previously called with same value or error occurred
            if (paramCalled && (paramCalled.match === paramVal
                || (paramCalled.error && paramCalled.error !== 'route'))) {
                // restore value
                req.params[name] = paramCalled.value;
                // next param
                return param(paramCalled.error);
            }
            called[name] = paramCalled = {
                error: null,
                match: paramVal,
                value: paramVal
            };
            paramCallback();
        }
        // single param callbacks
        function paramCallback(err) {
            var fn = paramCallbacks[paramIndex++];
            // store updated value
            paramCalled.value = req.params[key.name];
            if (err) {
                // store error
                paramCalled.error = err;
                param(err);
                return;
            }
            if (!fn)
                return param();
            try {
                fn(req, paramCallback, paramVal, key.name, rest.slice(0, rest.length - 1));
            }
            catch (e) {
                paramCallback(e);
            }
        }
        param();
    }
    use(arg, ...handlers) {
        var offset = 0;
        var path = '/';
        // default path to '/'
        // disambiguate router.use([handler])
        if (typeof arg !== 'function') {
            while (Array.isArray(arg) && arg.length !== 0) {
                arg = arg[0];
            }
            // first arg is the path
            if (typeof arg !== 'function') {
                offset = 1;
                path = arg;
            }
        }
        var callbacks = flatten(slice.call(arguments, offset));
        if (callbacks.length === 0) {
            throw new TypeError('argument handler is required');
        }
        for (var i = 0; i < callbacks.length; i++) {
            var fn = callbacks[i];
            if (typeof fn !== 'function') {
                throw new TypeError('argument handler must be a function');
            }
            // add the middleware
            debug('use %o %s', path, fn.name || '<anonymous>');
            var layer = this.buildLayer(path, {
                sensitive: this.caseSensitive,
                strict: false,
                end: false,
                length: this.length
            }, fn);
            layer.route = undefined;
            this.stack.push(layer);
        }
        return this;
    }
    /**
     * Create a new Route for the given path.
     *
     * Each route contains a separate middleware stack and VERB handlers.
     *
     * See the Route api documentation for details on adding handlers
     * and middleware to routes.
     *
     * @param {string} path
     * @return {Route}
     * @public
     */
    route(path) {
        var route = this.buildRoute(path);
        var layer = this.buildLayer(path, {
            sensitive: this.caseSensitive,
            strict: this.strict,
            end: true,
            length: this.length
        }, route.dispatch.bind(route));
        layer.route = route;
        this.stack.push(layer);
        return route;
    }
    /**
     * Get pathname of request.
     *
     * @param {IncomingMessage} req
     * @private
     */
    static getPathname(req) {
        try {
            return parseUrl(req).pathname;
        }
        catch (err) {
            return undefined;
        }
    }
    /**
     * Match path to a layer.
     *
     * @param {Layer} layer
     * @param {string} path
     * @private
     */
    static matchLayer(layer, path) {
        try {
            return layer.match(path);
        }
        catch (err) {
            return err;
        }
    }
    /**
     * Merge params with parent params
     *
     * @private
     */
    static mergeParams(params, parent) {
        if (typeof parent !== 'object' || !parent) {
            return params;
        }
        // make copy of parent for base
        var obj = mixin({}, parent);
        // simple non-numeric merging
        if (!(0 in params) || !(0 in parent)) {
            return mixin(obj, params);
        }
        var i = 0;
        var o = 0;
        // determine numeric gap in params
        while (i in params) {
            i++;
        }
        // determine numeric gap in parent
        while (o in parent) {
            o++;
        }
        // offset numeric indices in params before merge
        for (i--; i >= 0; i--) {
            params[i + o] = params[i];
            // create holes for the merge when necessary
            if (i < o) {
                delete params[i];
            }
        }
        return mixin(obj, params);
    }
    static restore(fn, obj, ...props) {
        var vals = new Array(arguments.length - 2);
        for (var i = 0; i < props.length; i++) {
            vals[i] = obj[props[i]];
        }
        return function (...args) {
            // restore vals
            for (var i = 0; i < props.length; i++) {
                obj[props[i]] = vals[i];
            }
            return fn.apply(this, arguments);
        };
    }
    static wrap(old, fn) {
        return function proxy() {
            var args = new Array(arguments.length + 1);
            args[0] = old;
            for (var i = 0, len = arguments.length; i < len; i++) {
                args[i + 1] = arguments[i];
            }
            fn.apply(this, args);
        };
    }
}
exports.Router = Router;
// // create Router#VERB functions
// methods.concat('all').forEach(function (method)
// {
//     Router.prototype[method] = function (path)
//     {
//         var route = this.route(path)
//         route[method].apply(route, slice.call(arguments, 1))
//         return this
//     }
// }) 

}).call(this,require('_process'))

},{"./layer":46,"./route":47,"_process":2,"array-flatten":49,"debug":51,"parseurl":58,"utils-merge":62}],46:[function(require,module,exports){
/*!
 * router
 * Copyright(c) 2013 Roman Shtylman
 * Copyright(c) 2014 Douglas Christopher Wilson
 * MIT Licensed
 */
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Module dependencies.
 * @private
 */
const pathRegexp = require("path-to-regexp");
const log = require("debug");
var debug = log('router:layer');
/**
 * Module variables.
 * @private
 */
var hasOwnProperty = Object.prototype.hasOwnProperty;
/**
 * Expose `Layer`.
 */
class Layer {
    constructor(path, options, fn) {
        if (!(this instanceof Layer)) {
            return new Layer(path, options, fn);
        }
        debug('new %o', path);
        var opts = options || { length: 2 };
        this.handler = fn;
        this.name = fn.name || '<anonymous>';
        this.params = undefined;
        this.path = undefined;
        this.regexp = pathRegexp(path, this.keys = [], opts);
        // set fast path flags
        this.regexp.fast_star = path === '*';
        this.regexp.fast_slash = path === '/' && opts.end === false;
        this.isErrorHandler = fn.length == 0 || fn.length >= (opts.length || 2) + 2;
        this.isRequestHandler = fn.length == 0 || fn.length < (opts.length || 2) + 2;
    }
    isApplicable(req, route) {
        return true;
    }
    handle_error(error, ...args) {
        var fn = this.handler;
        var next = args[args.length - 1];
        if (!this.isErrorHandler) {
            debug('skipping non error handler');
            // not a standard error handler
            return next(error);
        }
        try {
            fn.apply(null, [error].concat(args));
        }
        catch (err) {
            next(err);
        }
    }
    handle_request(...args) {
        var fn = this.handler;
        var next = args[args.length - 1];
        if (!this.isRequestHandler) {
            debug('skipping non request handler');
            // not a standard request handler
            return next();
        }
        try {
            fn.apply(null, args);
        }
        catch (err) {
            next(err);
        }
    }
    /**
     * Check if this route matches `path`, if so
     * populate `.params`.
     *
     * @param {String} path
     * @return {Boolean}
     * @api private
     */
    match(path) {
        var match;
        log(this.regexp);
        if (path != null) {
            // fast path non-ending match for / (any path matches)
            if (this.regexp.fast_slash) {
                this.params = {};
                this.path = '';
                return true;
            }
            // fast path for * (everything matched in a param)
            if (this.regexp.fast_star) {
                this.params = { '0': decode_param(path) };
                this.path = path;
                return true;
            }
            // match the path
            match = this.regexp.exec(path);
        }
        if (!match) {
            log(this.regexp);
            this.params = undefined;
            this.path = undefined;
            return false;
        }
        // store values
        this.params = {};
        this.path = match[0];
        // iterate matches
        var keys = this.keys;
        var params = this.params;
        for (var i = 1; i < match.length; i++) {
            var key = keys[i - 1];
            var prop = key.name;
            var val = decode_param(match[i]);
            if (val !== undefined || !(hasOwnProperty.call(params, prop))) {
                params[prop] = val;
            }
        }
        return true;
    }
}
exports.Layer = Layer;
/**
 * Decode param value.
 *
 * @param {string} val
 * @return {string}
 * @private
 */
function decode_param(val) {
    if (typeof val !== 'string' || val.length === 0) {
        return val;
    }
    try {
        return decodeURIComponent(val);
    }
    catch (err) {
        if (err instanceof URIError) {
            err.message = 'Failed to decode param \'' + val + '\'';
            err['status'] = 400;
        }
        throw err;
    }
}

},{"debug":51,"path-to-regexp":59}],47:[function(require,module,exports){
/*!
 * router
 * Copyright(c) 2013 Roman Shtylman
 * Copyright(c) 2014 Douglas Christopher Wilson
 * MIT Licensed
 */
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Module dependencies.
 * @private
 */
var debug = require('debug')('router:route');
var flatten = require('array-flatten');
const layer_1 = require("./layer");
/**
 * Module variables.
 * @private
 */
var slice = Array.prototype.slice;
/**
 * Expose `Route`.
 */
class Route {
    constructor(path) {
        this.path = path;
        this.stack = [];
        debug('new %o', path);
    }
    dispatch(req, ...rest) {
        var done = arguments[arguments.length - 1];
        var idx = 0;
        var stack = this.stack;
        if (stack.length === 0) {
            return done();
        }
        req.route = this;
        var args = slice.call(arguments, 0);
        args[args.length - 1] = next;
        next();
        function next(err) {
            // signal to exit route
            if (err && err === 'route')
                return done();
            // signal to exit router
            if (err && err === 'router')
                return done(err);
            // no more matching layers
            if (idx >= stack.length)
                return done(err);
            var layer;
            var match;
            // find next matching layer
            while (match !== true && idx < stack.length) {
                layer = stack[idx++];
                match = layer.isApplicable(req, this);
            }
            // no match
            if (match !== true)
                return done(err);
            if (err)
                layer.handle_error.apply(layer, [err].concat(args));
            else
                layer.handle_request.apply(layer, args);
        }
    }
    buildLayer(path, options, callback) {
        return new layer_1.Layer('/', options, callback);
    }
    isApplicable(req) {
        return true;
    }
    addHandler(postBuildLayer, ...handlers) {
        var callbacks = flatten(handlers);
        if (callbacks.length === 0) {
            throw new TypeError('argument handler is required');
        }
        for (var i = 0; i < callbacks.length; i++) {
            var fn = callbacks[i];
            if (typeof fn !== 'function') {
                throw new TypeError('argument handler must be a function');
            }
            var layer = postBuildLayer(this.buildLayer('/', { length: fn.length - 1 }, fn));
            this.stack.push(layer);
        }
        return this;
    }
}
exports.Route = Route;

},{"./layer":46,"array-flatten":49,"debug":51}],48:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const injector_1 = require("./injector");
function service(name, ...toInject) {
    return function (target) {
        var instance = null;
        if (toInject == null || toInject.length == 0 && target.length > 0)
            throw new Error('missing inject names');
        else
            injector_1.registerFactory(name, function () {
                return instance || injector_1.injectWithName(toInject, function () {
                    var args = [null];
                    for (var i = 0; i < arguments.length; i++)
                        args[i + 1] = arguments[i];
                    return instance = new (Function.prototype.bind.apply(target, args));
                })();
            });
    };
}
exports.service = service;

},{"./injector":40}],49:[function(require,module,exports){
'use strict'

/**
 * Expose `arrayFlatten`.
 */
module.exports = arrayFlatten

/**
 * Recursive flatten function with depth.
 *
 * @param  {Array}  array
 * @param  {Array}  result
 * @param  {Number} depth
 * @return {Array}
 */
function flattenWithDepth (array, result, depth) {
  for (var i = 0; i < array.length; i++) {
    var value = array[i]

    if (depth > 0 && Array.isArray(value)) {
      flattenWithDepth(value, result, depth - 1)
    } else {
      result.push(value)
    }
  }

  return result
}

/**
 * Recursive flatten function. Omitting depth is slightly faster.
 *
 * @param  {Array} array
 * @param  {Array} result
 * @return {Array}
 */
function flattenForever (array, result) {
  for (var i = 0; i < array.length; i++) {
    var value = array[i]

    if (Array.isArray(value)) {
      flattenForever(value, result)
    } else {
      result.push(value)
    }
  }

  return result
}

/**
 * Flatten an array, with the ability to define a depth.
 *
 * @param  {Array}  array
 * @param  {Number} depth
 * @return {Array}
 */
function arrayFlatten (array, depth) {
  if (depth == null) {
    return flattenForever(array, [])
  }

  return flattenWithDepth(array, [], depth)
}

},{}],50:[function(require,module,exports){
(function (process,global){
module.exports = process.hrtime || hrtime

// polyfil for window.performance.now
var performance = global.performance || {}
var performanceNow =
  performance.now        ||
  performance.mozNow     ||
  performance.msNow      ||
  performance.oNow       ||
  performance.webkitNow  ||
  function(){ return (new Date()).getTime() }

// generate timestamp or delta
// see http://nodejs.org/api/process.html#process_process_hrtime
function hrtime(previousTimestamp){
  var clocktime = performanceNow.call(performance)*1e-3
  var seconds = Math.floor(clocktime)
  var nanoseconds = Math.floor((clocktime%1)*1e9)
  if (previousTimestamp) {
    seconds = seconds - previousTimestamp[0]
    nanoseconds = nanoseconds - previousTimestamp[1]
    if (nanoseconds<0) {
      seconds--
      nanoseconds += 1e9
    }
  }
  return [seconds,nanoseconds]
}
}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"_process":2}],51:[function(require,module,exports){

/**
 * This is the web browser implementation of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = require('./debug');
exports.log = log;
exports.formatArgs = formatArgs;
exports.save = save;
exports.load = load;
exports.useColors = useColors;
exports.storage = 'undefined' != typeof chrome
               && 'undefined' != typeof chrome.storage
                  ? chrome.storage.local
                  : localstorage();

/**
 * Colors.
 */

exports.colors = [
  'lightseagreen',
  'forestgreen',
  'goldenrod',
  'dodgerblue',
  'darkorchid',
  'crimson'
];

/**
 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
 * and the Firebug extension (any Firefox version) are known
 * to support "%c" CSS customizations.
 *
 * TODO: add a `localStorage` variable to explicitly enable/disable colors
 */

function useColors() {
  // is webkit? http://stackoverflow.com/a/16459606/376773
  return ('WebkitAppearance' in document.documentElement.style) ||
    // is firebug? http://stackoverflow.com/a/398120/376773
    (window.console && (console.firebug || (console.exception && console.table))) ||
    // is firefox >= v31?
    // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
    (navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31);
}

/**
 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
 */

exports.formatters.j = function(v) {
  return JSON.stringify(v);
};


/**
 * Colorize log arguments if enabled.
 *
 * @api public
 */

function formatArgs() {
  var args = arguments;
  var useColors = this.useColors;

  args[0] = (useColors ? '%c' : '')
    + this.namespace
    + (useColors ? ' %c' : ' ')
    + args[0]
    + (useColors ? '%c ' : ' ')
    + '+' + exports.humanize(this.diff);

  if (!useColors) return args;

  var c = 'color: ' + this.color;
  args = [args[0], c, 'color: inherit'].concat(Array.prototype.slice.call(args, 1));

  // the final "%c" is somewhat tricky, because there could be other
  // arguments passed either before or after the %c, so we need to
  // figure out the correct index to insert the CSS into
  var index = 0;
  var lastC = 0;
  args[0].replace(/%[a-z%]/g, function(match) {
    if ('%%' === match) return;
    index++;
    if ('%c' === match) {
      // we only are interested in the *last* %c
      // (the user may have provided their own)
      lastC = index;
    }
  });

  args.splice(lastC, 0, c);
  return args;
}

/**
 * Invokes `console.log()` when available.
 * No-op when `console.log` is not a "function".
 *
 * @api public
 */

function log() {
  // this hackery is required for IE8/9, where
  // the `console.log` function doesn't have 'apply'
  return 'object' === typeof console
    && console.log
    && Function.prototype.apply.call(console.log, console, arguments);
}

/**
 * Save `namespaces`.
 *
 * @param {String} namespaces
 * @api private
 */

function save(namespaces) {
  try {
    if (null == namespaces) {
      exports.storage.removeItem('debug');
    } else {
      exports.storage.debug = namespaces;
    }
  } catch(e) {}
}

/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */

function load() {
  var r;
  try {
    r = exports.storage.debug;
  } catch(e) {}
  return r;
}

/**
 * Enable namespaces listed in `localStorage.debug` initially.
 */

exports.enable(load());

/**
 * Localstorage attempts to return the localstorage.
 *
 * This is necessary because safari throws
 * when a user disables cookies/localstorage
 * and you attempt to access it.
 *
 * @return {LocalStorage}
 * @api private
 */

function localstorage(){
  try {
    return window.localStorage;
  } catch (e) {}
}

},{"./debug":52}],52:[function(require,module,exports){

/**
 * This is the common logic for both the Node.js and web browser
 * implementations of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = debug;
exports.coerce = coerce;
exports.disable = disable;
exports.enable = enable;
exports.enabled = enabled;
exports.humanize = require('ms');

/**
 * The currently active debug mode names, and names to skip.
 */

exports.names = [];
exports.skips = [];

/**
 * Map of special "%n" handling functions, for the debug "format" argument.
 *
 * Valid key names are a single, lowercased letter, i.e. "n".
 */

exports.formatters = {};

/**
 * Previously assigned color.
 */

var prevColor = 0;

/**
 * Previous log timestamp.
 */

var prevTime;

/**
 * Select a color.
 *
 * @return {Number}
 * @api private
 */

function selectColor() {
  return exports.colors[prevColor++ % exports.colors.length];
}

/**
 * Create a debugger with the given `namespace`.
 *
 * @param {String} namespace
 * @return {Function}
 * @api public
 */

function debug(namespace) {

  // define the `disabled` version
  function disabled() {
  }
  disabled.enabled = false;

  // define the `enabled` version
  function enabled() {

    var self = enabled;

    // set `diff` timestamp
    var curr = +new Date();
    var ms = curr - (prevTime || curr);
    self.diff = ms;
    self.prev = prevTime;
    self.curr = curr;
    prevTime = curr;

    // add the `color` if not set
    if (null == self.useColors) self.useColors = exports.useColors();
    if (null == self.color && self.useColors) self.color = selectColor();

    var args = Array.prototype.slice.call(arguments);

    args[0] = exports.coerce(args[0]);

    if ('string' !== typeof args[0]) {
      // anything else let's inspect with %o
      args = ['%o'].concat(args);
    }

    // apply any `formatters` transformations
    var index = 0;
    args[0] = args[0].replace(/%([a-z%])/g, function(match, format) {
      // if we encounter an escaped % then don't increase the array index
      if (match === '%%') return match;
      index++;
      var formatter = exports.formatters[format];
      if ('function' === typeof formatter) {
        var val = args[index];
        match = formatter.call(self, val);

        // now we need to remove `args[index]` since it's inlined in the `format`
        args.splice(index, 1);
        index--;
      }
      return match;
    });

    if ('function' === typeof exports.formatArgs) {
      args = exports.formatArgs.apply(self, args);
    }
    var logFn = enabled.log || exports.log || console.log.bind(console);
    logFn.apply(self, args);
  }
  enabled.enabled = true;

  var fn = exports.enabled(namespace) ? enabled : disabled;

  fn.namespace = namespace;

  return fn;
}

/**
 * Enables a debug mode by namespaces. This can include modes
 * separated by a colon and wildcards.
 *
 * @param {String} namespaces
 * @api public
 */

function enable(namespaces) {
  exports.save(namespaces);

  var split = (namespaces || '').split(/[\s,]+/);
  var len = split.length;

  for (var i = 0; i < len; i++) {
    if (!split[i]) continue; // ignore empty strings
    namespaces = split[i].replace(/\*/g, '.*?');
    if (namespaces[0] === '-') {
      exports.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
    } else {
      exports.names.push(new RegExp('^' + namespaces + '$'));
    }
  }
}

/**
 * Disable debug output.
 *
 * @api public
 */

function disable() {
  exports.enable('');
}

/**
 * Returns true if the given mode name is enabled, false otherwise.
 *
 * @param {String} name
 * @return {Boolean}
 * @api public
 */

function enabled(name) {
  var i, len;
  for (i = 0, len = exports.skips.length; i < len; i++) {
    if (exports.skips[i].test(name)) {
      return false;
    }
  }
  for (i = 0, len = exports.names.length; i < len; i++) {
    if (exports.names[i].test(name)) {
      return true;
    }
  }
  return false;
}

/**
 * Coerce `val`.
 *
 * @param {Mixed} val
 * @return {Mixed}
 * @api private
 */

function coerce(val) {
  if (val instanceof Error) return val.stack || val.message;
  return val;
}

},{"ms":53}],53:[function(require,module,exports){
/**
 * Helpers.
 */

var s = 1000;
var m = s * 60;
var h = m * 60;
var d = h * 24;
var y = d * 365.25;

/**
 * Parse or format the given `val`.
 *
 * Options:
 *
 *  - `long` verbose formatting [false]
 *
 * @param {String|Number} val
 * @param {Object} options
 * @return {String|Number}
 * @api public
 */

module.exports = function(val, options){
  options = options || {};
  if ('string' == typeof val) return parse(val);
  return options.long
    ? long(val)
    : short(val);
};

/**
 * Parse the given `str` and return milliseconds.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function parse(str) {
  str = '' + str;
  if (str.length > 10000) return;
  var match = /^((?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|years?|yrs?|y)?$/i.exec(str);
  if (!match) return;
  var n = parseFloat(match[1]);
  var type = (match[2] || 'ms').toLowerCase();
  switch (type) {
    case 'years':
    case 'year':
    case 'yrs':
    case 'yr':
    case 'y':
      return n * y;
    case 'days':
    case 'day':
    case 'd':
      return n * d;
    case 'hours':
    case 'hour':
    case 'hrs':
    case 'hr':
    case 'h':
      return n * h;
    case 'minutes':
    case 'minute':
    case 'mins':
    case 'min':
    case 'm':
      return n * m;
    case 'seconds':
    case 'second':
    case 'secs':
    case 'sec':
    case 's':
      return n * s;
    case 'milliseconds':
    case 'millisecond':
    case 'msecs':
    case 'msec':
    case 'ms':
      return n;
  }
}

/**
 * Short format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function short(ms) {
  if (ms >= d) return Math.round(ms / d) + 'd';
  if (ms >= h) return Math.round(ms / h) + 'h';
  if (ms >= m) return Math.round(ms / m) + 'm';
  if (ms >= s) return Math.round(ms / s) + 's';
  return ms + 'ms';
}

/**
 * Long format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function long(ms) {
  return plural(ms, d, 'day')
    || plural(ms, h, 'hour')
    || plural(ms, m, 'minute')
    || plural(ms, s, 'second')
    || ms + ' ms';
}

/**
 * Pluralization helper.
 */

function plural(ms, n, name) {
  if (ms < n) return;
  if (ms < n * 1.5) return Math.floor(ms / n) + ' ' + name;
  return Math.ceil(ms / n) + ' ' + name + 's';
}

},{}],54:[function(require,module,exports){
var wrappy = require('wrappy')
module.exports = wrappy(once)

once.proto = once(function () {
  Object.defineProperty(Function.prototype, 'once', {
    value: function () {
      return once(this)
    },
    configurable: true
  })
})

function once (fn) {
  var f = function () {
    if (f.called) return f.value
    f.called = true
    return f.value = fn.apply(this, arguments)
  }
  f.called = false
  return f
}

},{"wrappy":63}],55:[function(require,module,exports){
/*jshint node:true */

"use strict";

var util = require('util');
var events = require('events');
var EventEmitter = events.EventEmitter;
var runTask = require('./lib/runTask');

var Orchestrator = function () {
	EventEmitter.call(this);
	this.doneCallback = undefined; // call this when all tasks in the queue are done
	this.seq = []; // the order to run the tasks
	this.tasks = {}; // task objects: name, dep (list of names of dependencies), fn (the task to run)
	this.isRunning = false; // is the orchestrator running tasks? .start() to start, .stop() to stop
};
util.inherits(Orchestrator, EventEmitter);

	Orchestrator.prototype.reset = function () {
		if (this.isRunning) {
			this.stop(null);
		}
		this.tasks = {};
		this.seq = [];
		this.isRunning = false;
		this.doneCallback = undefined;
		return this;
	};
	Orchestrator.prototype.add = function (name, dep, fn) {
		if (!fn && typeof dep === 'function') {
			fn = dep;
			dep = undefined;
		}
		dep = dep || [];
		fn = fn || function () {}; // no-op
		if (!name) {
			throw new Error('Task requires a name');
		}
		// validate name is a string, dep is an array of strings, and fn is a function
		if (typeof name !== 'string') {
			throw new Error('Task requires a name that is a string');
		}
		if (typeof fn !== 'function') {
			throw new Error('Task '+name+' requires a function that is a function');
		}
		if (!Array.isArray(dep)) {
			throw new Error('Task '+name+' can\'t support dependencies that is not an array of strings');
		}
		dep.forEach(function (item) {
			if (typeof item !== 'string') {
				throw new Error('Task '+name+' dependency '+item+' is not a string');
			}
		});
		this.tasks[name] = {
			fn: fn,
			dep: dep,
			name: name
		};
		return this;
	};
	Orchestrator.prototype.task = function (name, dep, fn) {
		if (dep || fn) {
			// alias for add, return nothing rather than this
			this.add(name, dep, fn);
		} else {
			return this.tasks[name];
		}
	};
	Orchestrator.prototype.hasTask = function (name) {
		return !!this.tasks[name];
	};
	// tasks and optionally a callback
	Orchestrator.prototype.start = function() {
		var args, arg, names = [], lastTask, i, seq = [];
		args = Array.prototype.slice.call(arguments, 0);
		if (args.length) {
			lastTask = args[args.length-1];
			if (typeof lastTask === 'function') {
				this.doneCallback = lastTask;
				args.pop();
			}
			for (i = 0; i < args.length; i++) {
				arg = args[i];
				if (typeof arg === 'string') {
					names.push(arg);
				} else if (Array.isArray(arg)) {
					names = names.concat(arg); // FRAGILE: ASSUME: it's an array of strings
				} else {
					throw new Error('pass strings or arrays of strings');
				}
			}
		}
		if (this.isRunning) {
			// reset specified tasks (and dependencies) as not run
			this._resetSpecificTasks(names);
		} else {
			// reset all tasks as not run
			this._resetAllTasks();
		}
		if (this.isRunning) {
			// if you call start() again while a previous run is still in play
			// prepend the new tasks to the existing task queue
			names = names.concat(this.seq);
		}
		if (names.length < 1) {
			// run all tasks
			for (i in this.tasks) {
				if (this.tasks.hasOwnProperty(i)) {
					names.push(this.tasks[i].name);
				}
			}
		}
		seq = [];
		try {
			this.sequence(this.tasks, names, seq, []);
		} catch (err) {
			// Is this a known error?
			if (err) {
				if (err.missingTask) {
					this.emit('task_not_found', {message: err.message, task:err.missingTask, err: err});
				}
				if (err.recursiveTasks) {
					this.emit('task_recursion', {message: err.message, recursiveTasks:err.recursiveTasks, err: err});
				}
			}
			this.stop(err);
			return this;
		}
		this.seq = seq;
		this.emit('start', {message:'seq: '+this.seq.join(',')});
		if (!this.isRunning) {
			this.isRunning = true;
		}
		this._runStep();
		return this;
	};
	Orchestrator.prototype.stop = function (err, successfulFinish) {
		this.isRunning = false;
		if (err) {
			this.emit('err', {message:'orchestration failed', err:err});
		} else if (successfulFinish) {
			this.emit('stop', {message:'orchestration succeeded'});
		} else {
			// ASSUME
			err = 'orchestration aborted';
			this.emit('err', {message:'orchestration aborted', err: err});
		}
		if (this.doneCallback) {
			// Avoid calling it multiple times
			this.doneCallback(err);
		} else if (err && !this.listeners('err').length) {
			// No one is listening for the error so speak louder
			throw err;
		}
	};
	Orchestrator.prototype.sequence = require('sequencify');
	Orchestrator.prototype.allDone = function () {
		var i, task, allDone = true; // nothing disputed it yet
		for (i = 0; i < this.seq.length; i++) {
			task = this.tasks[this.seq[i]];
			if (!task.done) {
				allDone = false;
				break;
			}
		}
		return allDone;
	};
	Orchestrator.prototype._resetTask = function(task) {
		if (task) {
			if (task.done) {
				task.done = false;
			}
			delete task.start;
			delete task.stop;
			delete task.duration;
			delete task.hrDuration;
			delete task.args;
		}
	};
	Orchestrator.prototype._resetAllTasks = function() {
		var task;
		for (task in this.tasks) {
			if (this.tasks.hasOwnProperty(task)) {
				this._resetTask(this.tasks[task]);
			}
		}
	};
	Orchestrator.prototype._resetSpecificTasks = function (names) {
		var i, name, t;

		if (names && names.length) {
			for (i = 0; i < names.length; i++) {
				name = names[i];
				t = this.tasks[name];
				if (t) {
					this._resetTask(t);
					if (t.dep && t.dep.length) {
						this._resetSpecificTasks(t.dep); // recurse
					}
				//} else {
					// FRAGILE: ignore that the task doesn't exist
				}
			}
		}
	};
	Orchestrator.prototype._runStep = function () {
		var i, task;
		if (!this.isRunning) {
			return; // user aborted, ASSUME: stop called previously
		}
		for (i = 0; i < this.seq.length; i++) {
			task = this.tasks[this.seq[i]];
			if (!task.done && !task.running && this._readyToRunTask(task)) {
				this._runTask(task);
			}
			if (!this.isRunning) {
				return; // task failed or user aborted, ASSUME: stop called previously
			}
		}
		if (this.allDone()) {
			this.stop(null, true);
		}
	};
	Orchestrator.prototype._readyToRunTask = function (task) {
		var ready = true, // no one disproved it yet
			i, name, t;
		if (task.dep.length) {
			for (i = 0; i < task.dep.length; i++) {
				name = task.dep[i];
				t = this.tasks[name];
				if (!t) {
					// FRAGILE: this should never happen
					this.stop("can't run "+task.name+" because it depends on "+name+" which doesn't exist");
					ready = false;
					break;
				}
				if (!t.done) {
					ready = false;
					break;
				}
			}
		}
		return ready;
	};
	Orchestrator.prototype._stopTask = function (task, meta) {
		task.duration = meta.duration;
		task.hrDuration = meta.hrDuration;
		task.running = false;
		task.done = true;
	};
	Orchestrator.prototype._emitTaskDone = function (task, message, err) {
		if (!task.args) {
			task.args = {task:task.name};
		}
		task.args.duration = task.duration;
		task.args.hrDuration = task.hrDuration;
		task.args.message = task.name+' '+message;
		var evt = 'stop';
		if (err) {
			task.args.err = err;
			evt = 'err';
		}
		// 'task_stop' or 'task_err'
		this.emit('task_'+evt, task.args);
	};
	Orchestrator.prototype._runTask = function (task) {
		var that = this;

		task.args = {task:task.name, message:task.name+' started'};
		this.emit('task_start', task.args);
		task.running = true;

		runTask(task.fn.bind(this), function (err, meta) {
			that._stopTask.call(that, task, meta);
			that._emitTaskDone.call(that, task, meta.runMethod, err);
			if (err) {
				return that.stop.call(that, err);
			}
			that._runStep.call(that);
		});
	};

// FRAGILE: ASSUME: this list is an exhaustive list of events emitted
var events = ['start','stop','err','task_start','task_stop','task_err','task_not_found','task_recursion'];

var listenToEvent = function (target, event, callback) {
	target.on(event, function (e) {
		e.src = event;
		callback(e);
	});
};

	Orchestrator.prototype.onAll = function (callback) {
		var i;
		if (typeof callback !== 'function') {
			throw new Error('No callback specified');
		}

		for (i = 0; i < events.length; i++) {
			listenToEvent(this, events[i], callback);
		}
	};

module.exports = Orchestrator;

},{"./lib/runTask":56,"events":1,"sequencify":60,"util":11}],56:[function(require,module,exports){
(function (process){
/*jshint node:true */

"use strict";

var eos = require('end-of-stream');
var consume = require('stream-consume');

module.exports = function (task, done) {
	var that = this, finish, cb, isDone = false, start, r;

	finish = function (err, runMethod) {
		var hrDuration = process.hrtime(start);

		if (isDone && !err) {
			err = new Error('task completion callback called too many times');
		}
		isDone = true;

		var duration = hrDuration[0] + (hrDuration[1] / 1e9); // seconds

		done.call(that, err, {
			duration: duration, // seconds
			hrDuration: hrDuration, // [seconds,nanoseconds]
			runMethod: runMethod
		});
	};

	cb = function (err) {
		finish(err, 'callback');
	};

	try {
		start = process.hrtime();
		r = task(cb);
	} catch (err) {
		return finish(err, 'catch');
	}

	if (r && typeof r.then === 'function') {
		// wait for promise to resolve
		// FRAGILE: ASSUME: Promises/A+, see http://promises-aplus.github.io/promises-spec/
		r.then(function () {
			finish(null, 'promise');
		}, function(err) {
			finish(err, 'promise');
		});

	} else if (r && typeof r.pipe === 'function') {
		// wait for stream to end

		eos(r, { error: true, readable: r.readable, writable: r.writable && !r.readable }, function(err){
			finish(err, 'stream');
		});

		// Ensure that the stream completes
        consume(r);

	} else if (task.length === 0) {
		// synchronous, function took in args.length parameters, and the callback was extra
		finish(null, 'sync');

	//} else {
		// FRAGILE: ASSUME: callback

	}
};

}).call(this,require('_process'))

},{"_process":2,"end-of-stream":57,"stream-consume":61}],57:[function(require,module,exports){
var once = require('once');

var noop = function() {};

var isRequest = function(stream) {
	return stream.setHeader && typeof stream.abort === 'function';
};

var eos = function(stream, opts, callback) {
	if (typeof opts === 'function') return eos(stream, null, opts);
	if (!opts) opts = {};

	callback = once(callback || noop);

	var ws = stream._writableState;
	var rs = stream._readableState;
	var readable = opts.readable || (opts.readable !== false && stream.readable);
	var writable = opts.writable || (opts.writable !== false && stream.writable);

	var onlegacyfinish = function() {
		if (!stream.writable) onfinish();
	};

	var onfinish = function() {
		writable = false;
		if (!readable) callback();
	};

	var onend = function() {
		readable = false;
		if (!writable) callback();
	};

	var onclose = function() {
		if (readable && !(rs && rs.ended)) return callback(new Error('premature close'));
		if (writable && !(ws && ws.ended)) return callback(new Error('premature close'));
	};

	var onrequest = function() {
		stream.req.on('finish', onfinish);
	};

	if (isRequest(stream)) {
		stream.on('complete', onfinish);
		stream.on('abort', onclose);
		if (stream.req) onrequest();
		else stream.on('request', onrequest);
	} else if (writable && !ws) { // legacy streams
		stream.on('end', onlegacyfinish);
		stream.on('close', onlegacyfinish);
	}

	stream.on('end', onend);
	stream.on('finish', onfinish);
	if (opts.error !== false) stream.on('error', callback);
	stream.on('close', onclose);

	return stream;
};

module.exports = eos;
},{"once":54}],58:[function(require,module,exports){
/*!
 * parseurl
 * Copyright(c) 2014 Jonathan Ong
 * Copyright(c) 2014 Douglas Christopher Wilson
 * MIT Licensed
 */

'use strict'

/**
 * Module dependencies.
 */

var url = require('url')
var parse = url.parse
var Url = url.Url

/**
 * Pattern for a simple path case.
 * See: https://github.com/joyent/node/pull/7878
 */

var simplePathRegExp = /^(\/\/?(?!\/)[^\?#\s]*)(\?[^#\s]*)?$/

/**
 * Exports.
 */

module.exports = parseurl
module.exports.original = originalurl

/**
 * Parse the `req` url with memoization.
 *
 * @param {ServerRequest} req
 * @return {Object}
 * @api public
 */

function parseurl(req) {
  var url = req.url

  if (url === undefined) {
    // URL is undefined
    return undefined
  }

  var parsed = req._parsedUrl

  if (fresh(url, parsed)) {
    // Return cached URL parse
    return parsed
  }

  // Parse the URL
  parsed = fastparse(url)
  parsed._raw = url

  return req._parsedUrl = parsed
};

/**
 * Parse the `req` original url with fallback and memoization.
 *
 * @param {ServerRequest} req
 * @return {Object}
 * @api public
 */

function originalurl(req) {
  var url = req.originalUrl

  if (typeof url !== 'string') {
    // Fallback
    return parseurl(req)
  }

  var parsed = req._parsedOriginalUrl

  if (fresh(url, parsed)) {
    // Return cached URL parse
    return parsed
  }

  // Parse the URL
  parsed = fastparse(url)
  parsed._raw = url

  return req._parsedOriginalUrl = parsed
};

/**
 * Parse the `str` url with fast-path short-cut.
 *
 * @param {string} str
 * @return {Object}
 * @api private
 */

function fastparse(str) {
  // Try fast path regexp
  // See: https://github.com/joyent/node/pull/7878
  var simplePath = typeof str === 'string' && simplePathRegExp.exec(str)

  // Construct simple URL
  if (simplePath) {
    var pathname = simplePath[1]
    var search = simplePath[2] || null
    var url = Url !== undefined
      ? new Url()
      : {}
    url.path = str
    url.href = str
    url.pathname = pathname
    url.search = search
    url.query = search && search.substr(1)

    return url
  }

  return parse(str)
}

/**
 * Determine if parsed is still fresh for url.
 *
 * @param {string} url
 * @param {object} parsedUrl
 * @return {boolean}
 * @api private
 */

function fresh(url, parsedUrl) {
  return typeof parsedUrl === 'object'
    && parsedUrl !== null
    && (Url === undefined || parsedUrl instanceof Url)
    && parsedUrl._raw === url
}

},{"url":7}],59:[function(require,module,exports){
/**
 * Expose `pathtoRegexp`.
 */

module.exports = pathtoRegexp;

/**
 * Match matching groups in a regular expression.
 */
var MATCHING_GROUP_REGEXP = /\((?!\?)/g;

/**
 * Normalize the given path string,
 * returning a regular expression.
 *
 * An empty array should be passed,
 * which will contain the placeholder
 * key names. For example "/user/:id" will
 * then contain ["id"].
 *
 * @param  {String|RegExp|Array} path
 * @param  {Array} keys
 * @param  {Object} options
 * @return {RegExp}
 * @api private
 */

function pathtoRegexp(path, keys, options) {
  options = options || {};
  keys = keys || [];
  var strict = options.strict;
  var end = options.end !== false;
  var flags = options.sensitive ? '' : 'i';
  var extraOffset = 0;
  var keysOffset = keys.length;
  var i = 0;
  var name = 0;
  var m;

  if (path instanceof RegExp) {
    while (m = MATCHING_GROUP_REGEXP.exec(path.source)) {
      keys.push({
        name: name++,
        optional: false,
        offset: m.index
      });
    }

    return path;
  }

  if (Array.isArray(path)) {
    // Map array parts into regexps and return their source. We also pass
    // the same keys and options instance into every generation to get
    // consistent matching groups before we join the sources together.
    path = path.map(function (value) {
      return pathtoRegexp(value, keys, options).source;
    });

    return new RegExp('(?:' + path.join('|') + ')', flags);
  }

  path = ('^' + path + (strict ? '' : path[path.length - 1] === '/' ? '?' : '/?'))
    .replace(/\/\(/g, '/(?:')
    .replace(/([\/\.])/g, '\\$1')
    .replace(/(\\\/)?(\\\.)?:(\w+)(\(.*?\))?(\*)?(\?)?/g, function (match, slash, format, key, capture, star, optional, offset) {
      slash = slash || '';
      format = format || '';
      capture = capture || '([^\\/' + format + ']+?)';
      optional = optional || '';

      keys.push({
        name: key,
        optional: !!optional,
        offset: offset + extraOffset
      });

      var result = ''
        + (optional ? '' : slash)
        + '(?:'
        + format + (optional ? slash : '') + capture
        + (star ? '((?:[\\/' + format + '].+?)?)' : '')
        + ')'
        + optional;

      extraOffset += result.length - match.length;

      return result;
    })
    .replace(/\*/g, function (star, index) {
      var len = keys.length

      while (len-- > keysOffset && keys[len].offset > index) {
        keys[len].offset += 3; // Replacement length minus asterisk length.
      }

      return '(.*)';
    });

  // This is a workaround for handling unnamed matching groups.
  while (m = MATCHING_GROUP_REGEXP.exec(path)) {
    var escapeCount = 0;
    var index = m.index;

    while (path.charAt(--index) === '\\') {
      escapeCount++;
    }

    // It's possible to escape the bracket.
    if (escapeCount % 2 === 1) {
      continue;
    }

    if (keysOffset + i === keys.length || keys[keysOffset + i].offset > m.index) {
      keys.splice(keysOffset + i, 0, {
        name: name++, // Unnamed matching groups must be consistently linear.
        optional: false,
        offset: m.index
      });
    }

    i++;
  }

  // If the path is non-ending, match until the end or a slash.
  path += (end ? '$' : (path[path.length - 1] === '/' ? '' : '(?=\\/|$)'));

  return new RegExp(path, flags);
};

},{}],60:[function(require,module,exports){
/*jshint node:true */

"use strict";

var sequence = function (tasks, names, results, nest) {
	var i, name, node, e, j;
	nest = nest || [];
	for (i = 0; i < names.length; i++) {
		name = names[i];
		// de-dup results
		if (results.indexOf(name) === -1) {
			node = tasks[name];
			if (!node) {
				e = new Error('task "'+name+'" is not defined');
				e.missingTask = name;
				e.taskList = [];
				for (j in tasks) {
					if (tasks.hasOwnProperty(j)) {
						e.taskList.push(tasks[j].name);
					}
				}
				throw e;
			}
			if (nest.indexOf(name) > -1) {
				nest.push(name);
				e = new Error('Recursive dependencies detected: '+nest.join(' -> '));
				e.recursiveTasks = nest;
				e.taskList = [];
				for (j in tasks) {
					if (tasks.hasOwnProperty(j)) {
						e.taskList.push(tasks[j].name);
					}
				}
				throw e;
			}
			if (node.dep.length) {
				nest.push(name);
				sequence(tasks, node.dep, results, nest); // recurse
				nest.pop(name);
			}
			results.push(name);
		}
	}
};

module.exports = sequence;

},{}],61:[function(require,module,exports){
module.exports = function(stream) {
    if (stream.readable && typeof stream.resume === 'function') {
        var state = stream._readableState;
        if (!state || state.pipesCount === 0) {
            // Either a classic stream or streams2 that's not piped to another destination
            try {
                stream.resume();
            } catch (err) {
                console.error("Got error: " + err);
                // If we can't, it's not worth dying over
            }
        }
    }
};

},{}],62:[function(require,module,exports){
/**
 * Merge object b with object a.
 *
 *     var a = { foo: 'bar' }
 *       , b = { bar: 'baz' };
 *
 *     merge(a, b);
 *     // => { foo: 'bar', bar: 'baz' }
 *
 * @param {Object} a
 * @param {Object} b
 * @return {Object}
 * @api public
 */

exports = module.exports = function(a, b){
  if (a && b) {
    for (var key in b) {
      a[key] = b[key];
    }
  }
  return a;
};

},{}],63:[function(require,module,exports){
// Returns a wrapper function that returns a wrapped callback
// The wrapper function should do some stuff, and return a
// presumably different callback function.
// This makes sure that own properties are retained, so that
// decorations and such are not lost along the way.
module.exports = wrappy
function wrappy (fn, cb) {
  if (fn && cb) return wrappy(fn)(cb)

  if (typeof fn !== 'function')
    throw new TypeError('need wrapper function')

  Object.keys(fn).forEach(function (k) {
    wrapper[k] = fn[k]
  })

  return wrapper

  function wrapper() {
    var args = new Array(arguments.length)
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i]
    }
    var ret = fn.apply(this, args)
    var cb = args[args.length-1]
    if (typeof ret === 'function' && ret !== cb) {
      Object.keys(cb).forEach(function (k) {
        ret[k] = cb[k]
      })
    }
    return ret
  }
}

},{}],64:[function(require,module,exports){
arguments[4][51][0].apply(exports,arguments)
},{"./debug":65,"dup":51}],65:[function(require,module,exports){
arguments[4][52][0].apply(exports,arguments)
},{"dup":52,"ms":66}],66:[function(require,module,exports){
arguments[4][53][0].apply(exports,arguments)
},{"dup":53}]},{},[12])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL2MvVXNlcnMvTmljb2xhcy9BcHBEYXRhL1JvYW1pbmcvbnBtL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi8uLi8uLi8uLi8uLi8uLi9jL1VzZXJzL05pY29sYXMvQXBwRGF0YS9Sb2FtaW5nL25wbS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvZXZlbnRzL2V2ZW50cy5qcyIsIi4uLy4uLy4uLy4uLy4uLy4uL2MvVXNlcnMvTmljb2xhcy9BcHBEYXRhL1JvYW1pbmcvbnBtL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCIuLi8uLi8uLi8uLi8uLi8uLi9jL1VzZXJzL05pY29sYXMvQXBwRGF0YS9Sb2FtaW5nL25wbS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcHVueWNvZGUvcHVueWNvZGUuanMiLCIuLi8uLi8uLi8uLi8uLi8uLi9jL1VzZXJzL05pY29sYXMvQXBwRGF0YS9Sb2FtaW5nL25wbS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcXVlcnlzdHJpbmctZXMzL2RlY29kZS5qcyIsIi4uLy4uLy4uLy4uLy4uLy4uL2MvVXNlcnMvTmljb2xhcy9BcHBEYXRhL1JvYW1pbmcvbnBtL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9xdWVyeXN0cmluZy1lczMvZW5jb2RlLmpzIiwiLi4vLi4vLi4vLi4vLi4vLi4vYy9Vc2Vycy9OaWNvbGFzL0FwcERhdGEvUm9hbWluZy9ucG0vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3F1ZXJ5c3RyaW5nLWVzMy9pbmRleC5qcyIsIi4uLy4uLy4uLy4uLy4uLy4uL2MvVXNlcnMvTmljb2xhcy9BcHBEYXRhL1JvYW1pbmcvbnBtL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy91cmwvdXJsLmpzIiwiLi4vLi4vLi4vLi4vLi4vLi4vYy9Vc2Vycy9OaWNvbGFzL0FwcERhdGEvUm9hbWluZy9ucG0vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3VybC91dGlsLmpzIiwiLi4vLi4vLi4vLi4vLi4vLi4vYy9Vc2Vycy9OaWNvbGFzL0FwcERhdGEvUm9hbWluZy9ucG0vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3V0aWwvbm9kZV9tb2R1bGVzL2luaGVyaXRzL2luaGVyaXRzX2Jyb3dzZXIuanMiLCIuLi8uLi8uLi8uLi8uLi8uLi9jL1VzZXJzL05pY29sYXMvQXBwRGF0YS9Sb2FtaW5nL25wbS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvdXRpbC9zdXBwb3J0L2lzQnVmZmVyQnJvd3Nlci5qcyIsIi4uLy4uLy4uLy4uLy4uLy4uL2MvVXNlcnMvTmljb2xhcy9BcHBEYXRhL1JvYW1pbmcvbnBtL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy91dGlsL3V0aWwuanMiLCJkaXN0L2NsaWVudGlmeS5qcyIsImRpc3QvY29tbW9uLmpzIiwiZGlzdC9jb250cm9scy9jbGljay5qcyIsImRpc3QvY29udHJvbHMvY29udHJvbC5qcyIsImRpc3QvY29udHJvbHMvY29udHJvbHMuanMiLCJkaXN0L2NvbnRyb2xzL2Nzc0NsYXNzLmpzIiwiZGlzdC9jb250cm9scy9mb3JlYWNoLmpzIiwiZGlzdC9jb250cm9scy9oaWRlLmpzIiwiZGlzdC9jb250cm9scy9qc29uLmpzIiwiZGlzdC9jb250cm9scy9vcHRpb25zLmpzIiwiZGlzdC9jb250cm9scy9wYXJ0LmpzIiwiZGlzdC9jb250cm9scy9zcGlubmVyLmpzIiwiZGlzdC9jb250cm9scy90ZXh0LmpzIiwiZGlzdC9jb250cm9scy90cmFuc2xhdGUuanMiLCJkaXN0L2NvbnRyb2xzL3ZhbHVlLmpzIiwiZGlzdC9odHRwLmpzIiwiZGlzdC9sb2NhdGlvblNlcnZpY2UuanMiLCJkaXN0L3BhcnQuanMiLCJkaXN0L3JvdXRlci5qcyIsImRpc3Qvc2NvcGUuanMiLCJkaXN0L3RlbXBsYXRlLmpzIiwibm9kZV9tb2R1bGVzL0Bha2FsYS9jb3JlL2Rpc3QvYmluZGVyLmpzIiwibm9kZV9tb2R1bGVzL0Bha2FsYS9jb3JlL2Rpc3QvZWFjaEFzeW5jLmpzIiwibm9kZV9tb2R1bGVzL0Bha2FsYS9jb3JlL2Rpc3QvZmFjdG9yeS5qcyIsIm5vZGVfbW9kdWxlcy9AYWthbGEvY29yZS9kaXN0L2Zvcm1hdHRlcnMvaWRlbnRpdHkuanMiLCJub2RlX21vZHVsZXMvQGFrYWxhL2NvcmUvZGlzdC9mb3JtYXR0ZXJzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL0Bha2FsYS9jb3JlL2Rpc3QvZm9ybWF0dGVycy9uZWdhdGUuanMiLCJub2RlX21vZHVsZXMvQGFrYWxhL2NvcmUvZGlzdC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9AYWthbGEvY29yZS9kaXN0L2luamVjdG9yLmpzIiwibm9kZV9tb2R1bGVzL0Bha2FsYS9jb3JlL2Rpc3QvbW9kdWxlLmpzIiwibm9kZV9tb2R1bGVzL0Bha2FsYS9jb3JlL2Rpc3QvcGFyc2VyLmpzIiwibm9kZV9tb2R1bGVzL0Bha2FsYS9jb3JlL2Rpc3QvcHJvbWlzZUhlbHBlcnMuanMiLCJub2RlX21vZHVsZXMvQGFrYWxhL2NvcmUvZGlzdC9yZWZsZWN0LmpzIiwibm9kZV9tb2R1bGVzL0Bha2FsYS9jb3JlL2Rpc3Qvcm91dGVyL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL0Bha2FsYS9jb3JlL2Rpc3Qvcm91dGVyL2xheWVyLmpzIiwibm9kZV9tb2R1bGVzL0Bha2FsYS9jb3JlL2Rpc3Qvcm91dGVyL3JvdXRlLmpzIiwibm9kZV9tb2R1bGVzL0Bha2FsYS9jb3JlL2Rpc3Qvc2VydmljZS5qcyIsIm5vZGVfbW9kdWxlcy9AYWthbGEvY29yZS9ub2RlX21vZHVsZXMvYXJyYXktZmxhdHRlbi9hcnJheS1mbGF0dGVuLmpzIiwibm9kZV9tb2R1bGVzL0Bha2FsYS9jb3JlL25vZGVfbW9kdWxlcy9icm93c2VyLXByb2Nlc3MtaHJ0aW1lL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL0Bha2FsYS9jb3JlL25vZGVfbW9kdWxlcy9kZWJ1Zy9icm93c2VyLmpzIiwibm9kZV9tb2R1bGVzL0Bha2FsYS9jb3JlL25vZGVfbW9kdWxlcy9kZWJ1Zy9kZWJ1Zy5qcyIsIm5vZGVfbW9kdWxlcy9AYWthbGEvY29yZS9ub2RlX21vZHVsZXMvbXMvaW5kZXguanMiLCJub2RlX21vZHVsZXMvQGFrYWxhL2NvcmUvbm9kZV9tb2R1bGVzL29uY2Uvb25jZS5qcyIsIm5vZGVfbW9kdWxlcy9AYWthbGEvY29yZS9ub2RlX21vZHVsZXMvb3JjaGVzdHJhdG9yL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL0Bha2FsYS9jb3JlL25vZGVfbW9kdWxlcy9vcmNoZXN0cmF0b3IvbGliL3J1blRhc2suanMiLCJub2RlX21vZHVsZXMvQGFrYWxhL2NvcmUvbm9kZV9tb2R1bGVzL29yY2hlc3RyYXRvci9ub2RlX21vZHVsZXMvZW5kLW9mLXN0cmVhbS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9AYWthbGEvY29yZS9ub2RlX21vZHVsZXMvcGFyc2V1cmwvaW5kZXguanMiLCJub2RlX21vZHVsZXMvQGFrYWxhL2NvcmUvbm9kZV9tb2R1bGVzL3BhdGgtdG8tcmVnZXhwL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL0Bha2FsYS9jb3JlL25vZGVfbW9kdWxlcy9zZXF1ZW5jaWZ5L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL0Bha2FsYS9jb3JlL25vZGVfbW9kdWxlcy9zdHJlYW0tY29uc3VtZS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9AYWthbGEvY29yZS9ub2RlX21vZHVsZXMvdXRpbHMtbWVyZ2UvaW5kZXguanMiLCJub2RlX21vZHVsZXMvQGFrYWxhL2NvcmUvbm9kZV9tb2R1bGVzL3dyYXBweS93cmFwcHkuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOVNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNwTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDcmhCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1dEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDMWtCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUM5SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUM3Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDaGVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25KQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDaEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDck1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ2hUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ2xFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuZnVuY3Rpb24gRXZlbnRFbWl0dGVyKCkge1xuICB0aGlzLl9ldmVudHMgPSB0aGlzLl9ldmVudHMgfHwge307XG4gIHRoaXMuX21heExpc3RlbmVycyA9IHRoaXMuX21heExpc3RlbmVycyB8fCB1bmRlZmluZWQ7XG59XG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcblxuLy8gQmFja3dhcmRzLWNvbXBhdCB3aXRoIG5vZGUgMC4xMC54XG5FdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyID0gRXZlbnRFbWl0dGVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9ldmVudHMgPSB1bmRlZmluZWQ7XG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9tYXhMaXN0ZW5lcnMgPSB1bmRlZmluZWQ7XG5cbi8vIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW4gMTAgbGlzdGVuZXJzIGFyZVxuLy8gYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaCBoZWxwcyBmaW5kaW5nIG1lbW9yeSBsZWFrcy5cbkV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5cbi8vIE9idmlvdXNseSBub3QgYWxsIEVtaXR0ZXJzIHNob3VsZCBiZSBsaW1pdGVkIHRvIDEwLiBUaGlzIGZ1bmN0aW9uIGFsbG93c1xuLy8gdGhhdCB0byBiZSBpbmNyZWFzZWQuIFNldCB0byB6ZXJvIGZvciB1bmxpbWl0ZWQuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uKG4pIHtcbiAgaWYgKCFpc051bWJlcihuKSB8fCBuIDwgMCB8fCBpc05hTihuKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ24gbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlcicpO1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSBuO1xuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGVyLCBoYW5kbGVyLCBsZW4sIGFyZ3MsIGksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBJZiB0aGVyZSBpcyBubyAnZXJyb3InIGV2ZW50IGxpc3RlbmVyIHRoZW4gdGhyb3cuXG4gIGlmICh0eXBlID09PSAnZXJyb3InKSB7XG4gICAgaWYgKCF0aGlzLl9ldmVudHMuZXJyb3IgfHxcbiAgICAgICAgKGlzT2JqZWN0KHRoaXMuX2V2ZW50cy5lcnJvcikgJiYgIXRoaXMuX2V2ZW50cy5lcnJvci5sZW5ndGgpKSB7XG4gICAgICBlciA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIGlmIChlciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIHRocm93IGVyOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gQXQgbGVhc3QgZ2l2ZSBzb21lIGtpbmQgb2YgY29udGV4dCB0byB0aGUgdXNlclxuICAgICAgICB2YXIgZXJyID0gbmV3IEVycm9yKCdVbmNhdWdodCwgdW5zcGVjaWZpZWQgXCJlcnJvclwiIGV2ZW50LiAoJyArIGVyICsgJyknKTtcbiAgICAgICAgZXJyLmNvbnRleHQgPSBlcjtcbiAgICAgICAgdGhyb3cgZXJyO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzVW5kZWZpbmVkKGhhbmRsZXIpKVxuICAgIHJldHVybiBmYWxzZTtcblxuICBpZiAoaXNGdW5jdGlvbihoYW5kbGVyKSkge1xuICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgLy8gZmFzdCBjYXNlc1xuICAgICAgY2FzZSAxOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgLy8gc2xvd2VyXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgaGFuZGxlci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoaXNPYmplY3QoaGFuZGxlcikpIHtcbiAgICBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICBsaXN0ZW5lcnMgPSBoYW5kbGVyLnNsaWNlKCk7XG4gICAgbGVuID0gbGlzdGVuZXJzLmxlbmd0aDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspXG4gICAgICBsaXN0ZW5lcnNbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gVG8gYXZvaWQgcmVjdXJzaW9uIGluIHRoZSBjYXNlIHRoYXQgdHlwZSA9PT0gXCJuZXdMaXN0ZW5lclwiISBCZWZvcmVcbiAgLy8gYWRkaW5nIGl0IHRvIHRoZSBsaXN0ZW5lcnMsIGZpcnN0IGVtaXQgXCJuZXdMaXN0ZW5lclwiLlxuICBpZiAodGhpcy5fZXZlbnRzLm5ld0xpc3RlbmVyKVxuICAgIHRoaXMuZW1pdCgnbmV3TGlzdGVuZXInLCB0eXBlLFxuICAgICAgICAgICAgICBpc0Z1bmN0aW9uKGxpc3RlbmVyLmxpc3RlbmVyKSA/XG4gICAgICAgICAgICAgIGxpc3RlbmVyLmxpc3RlbmVyIDogbGlzdGVuZXIpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIC8vIE9wdGltaXplIHRoZSBjYXNlIG9mIG9uZSBsaXN0ZW5lci4gRG9uJ3QgbmVlZCB0aGUgZXh0cmEgYXJyYXkgb2JqZWN0LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IGxpc3RlbmVyO1xuICBlbHNlIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIC8vIElmIHdlJ3ZlIGFscmVhZHkgZ290IGFuIGFycmF5LCBqdXN0IGFwcGVuZC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0ucHVzaChsaXN0ZW5lcik7XG4gIGVsc2VcbiAgICAvLyBBZGRpbmcgdGhlIHNlY29uZCBlbGVtZW50LCBuZWVkIHRvIGNoYW5nZSB0byBhcnJheS5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdLCBsaXN0ZW5lcl07XG5cbiAgLy8gQ2hlY2sgZm9yIGxpc3RlbmVyIGxlYWtcbiAgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkgJiYgIXRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQpIHtcbiAgICBpZiAoIWlzVW5kZWZpbmVkKHRoaXMuX21heExpc3RlbmVycykpIHtcbiAgICAgIG0gPSB0aGlzLl9tYXhMaXN0ZW5lcnM7XG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSBFdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycztcbiAgICB9XG5cbiAgICBpZiAobSAmJiBtID4gMCAmJiB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoID4gbSkge1xuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCA9IHRydWU7XG4gICAgICBjb25zb2xlLmVycm9yKCcobm9kZSkgd2FybmluZzogcG9zc2libGUgRXZlbnRFbWl0dGVyIG1lbW9yeSAnICtcbiAgICAgICAgICAgICAgICAgICAgJ2xlYWsgZGV0ZWN0ZWQuICVkIGxpc3RlbmVycyBhZGRlZC4gJyArXG4gICAgICAgICAgICAgICAgICAgICdVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byBpbmNyZWFzZSBsaW1pdC4nLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoKTtcbiAgICAgIGlmICh0eXBlb2YgY29uc29sZS50cmFjZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAvLyBub3Qgc3VwcG9ydGVkIGluIElFIDEwXG4gICAgICAgIGNvbnNvbGUudHJhY2UoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgdmFyIGZpcmVkID0gZmFsc2U7XG5cbiAgZnVuY3Rpb24gZygpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGcpO1xuXG4gICAgaWYgKCFmaXJlZCkge1xuICAgICAgZmlyZWQgPSB0cnVlO1xuICAgICAgbGlzdGVuZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gIH1cblxuICBnLmxpc3RlbmVyID0gbGlzdGVuZXI7XG4gIHRoaXMub24odHlwZSwgZyk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyBlbWl0cyBhICdyZW1vdmVMaXN0ZW5lcicgZXZlbnQgaWZmIHRoZSBsaXN0ZW5lciB3YXMgcmVtb3ZlZFxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBsaXN0LCBwb3NpdGlvbiwgbGVuZ3RoLCBpO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIGxpc3QgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gIGxlbmd0aCA9IGxpc3QubGVuZ3RoO1xuICBwb3NpdGlvbiA9IC0xO1xuXG4gIGlmIChsaXN0ID09PSBsaXN0ZW5lciB8fFxuICAgICAgKGlzRnVuY3Rpb24obGlzdC5saXN0ZW5lcikgJiYgbGlzdC5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcblxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGxpc3QpKSB7XG4gICAgZm9yIChpID0gbGVuZ3RoOyBpLS0gPiAwOykge1xuICAgICAgaWYgKGxpc3RbaV0gPT09IGxpc3RlbmVyIHx8XG4gICAgICAgICAgKGxpc3RbaV0ubGlzdGVuZXIgJiYgbGlzdFtpXS5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgICAgIHBvc2l0aW9uID0gaTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHBvc2l0aW9uIDwgMClcbiAgICAgIHJldHVybiB0aGlzO1xuXG4gICAgaWYgKGxpc3QubGVuZ3RoID09PSAxKSB7XG4gICAgICBsaXN0Lmxlbmd0aCA9IDA7XG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIH0gZWxzZSB7XG4gICAgICBsaXN0LnNwbGljZShwb3NpdGlvbiwgMSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIga2V5LCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgLy8gbm90IGxpc3RlbmluZyBmb3IgcmVtb3ZlTGlzdGVuZXIsIG5vIG5lZWQgdG8gZW1pdFxuICBpZiAoIXRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKVxuICAgICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgZWxzZSBpZiAodGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIGVtaXQgcmVtb3ZlTGlzdGVuZXIgZm9yIGFsbCBsaXN0ZW5lcnMgb24gYWxsIGV2ZW50c1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIGZvciAoa2V5IGluIHRoaXMuX2V2ZW50cykge1xuICAgICAgaWYgKGtleSA9PT0gJ3JlbW92ZUxpc3RlbmVyJykgY29udGludWU7XG4gICAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycyhrZXkpO1xuICAgIH1cbiAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycygncmVtb3ZlTGlzdGVuZXInKTtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGxpc3RlbmVycyA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNGdW5jdGlvbihsaXN0ZW5lcnMpKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnMpO1xuICB9IGVsc2UgaWYgKGxpc3RlbmVycykge1xuICAgIC8vIExJRk8gb3JkZXJcbiAgICB3aGlsZSAobGlzdGVuZXJzLmxlbmd0aClcbiAgICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzW2xpc3RlbmVycy5sZW5ndGggLSAxXSk7XG4gIH1cbiAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IFtdO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gW3RoaXMuX2V2ZW50c1t0eXBlXV07XG4gIGVsc2VcbiAgICByZXQgPSB0aGlzLl9ldmVudHNbdHlwZV0uc2xpY2UoKTtcbiAgcmV0dXJuIHJldDtcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgaWYgKHRoaXMuX2V2ZW50cykge1xuICAgIHZhciBldmxpc3RlbmVyID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gICAgaWYgKGlzRnVuY3Rpb24oZXZsaXN0ZW5lcikpXG4gICAgICByZXR1cm4gMTtcbiAgICBlbHNlIGlmIChldmxpc3RlbmVyKVxuICAgICAgcmV0dXJuIGV2bGlzdGVuZXIubGVuZ3RoO1xuICB9XG4gIHJldHVybiAwO1xufTtcblxuRXZlbnRFbWl0dGVyLmxpc3RlbmVyQ291bnQgPSBmdW5jdGlvbihlbWl0dGVyLCB0eXBlKSB7XG4gIHJldHVybiBlbWl0dGVyLmxpc3RlbmVyQ291bnQodHlwZSk7XG59O1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG4iLCIvLyBzaGltIGZvciB1c2luZyBwcm9jZXNzIGluIGJyb3dzZXJcbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcblxuLy8gY2FjaGVkIGZyb20gd2hhdGV2ZXIgZ2xvYmFsIGlzIHByZXNlbnQgc28gdGhhdCB0ZXN0IHJ1bm5lcnMgdGhhdCBzdHViIGl0XG4vLyBkb24ndCBicmVhayB0aGluZ3MuICBCdXQgd2UgbmVlZCB0byB3cmFwIGl0IGluIGEgdHJ5IGNhdGNoIGluIGNhc2UgaXQgaXNcbi8vIHdyYXBwZWQgaW4gc3RyaWN0IG1vZGUgY29kZSB3aGljaCBkb2Vzbid0IGRlZmluZSBhbnkgZ2xvYmFscy4gIEl0J3MgaW5zaWRlIGFcbi8vIGZ1bmN0aW9uIGJlY2F1c2UgdHJ5L2NhdGNoZXMgZGVvcHRpbWl6ZSBpbiBjZXJ0YWluIGVuZ2luZXMuXG5cbnZhciBjYWNoZWRTZXRUaW1lb3V0O1xudmFyIGNhY2hlZENsZWFyVGltZW91dDtcblxuZnVuY3Rpb24gZGVmYXVsdFNldFRpbW91dCgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3NldFRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbmZ1bmN0aW9uIGRlZmF1bHRDbGVhclRpbWVvdXQgKCkge1xuICAgIHRocm93IG5ldyBFcnJvcignY2xlYXJUaW1lb3V0IGhhcyBub3QgYmVlbiBkZWZpbmVkJyk7XG59XG4oZnVuY3Rpb24gKCkge1xuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2Ygc2V0VGltZW91dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IHNldFRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY2FjaGVkU2V0VGltZW91dCA9IGRlZmF1bHRTZXRUaW1vdXQ7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIGlmICh0eXBlb2YgY2xlYXJUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBjbGVhclRpbWVvdXQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRDbGVhclRpbWVvdXQgPSBkZWZhdWx0Q2xlYXJUaW1lb3V0O1xuICAgIH1cbn0gKCkpXG5mdW5jdGlvbiBydW5UaW1lb3V0KGZ1bikge1xuICAgIGlmIChjYWNoZWRTZXRUaW1lb3V0ID09PSBzZXRUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICAvLyBpZiBzZXRUaW1lb3V0IHdhc24ndCBhdmFpbGFibGUgYnV0IHdhcyBsYXR0ZXIgZGVmaW5lZFxuICAgIGlmICgoY2FjaGVkU2V0VGltZW91dCA9PT0gZGVmYXVsdFNldFRpbW91dCB8fCAhY2FjaGVkU2V0VGltZW91dCkgJiYgc2V0VGltZW91dCkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuLCAwKTtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gd2hlbiB3aGVuIHNvbWVib2R5IGhhcyBzY3Jld2VkIHdpdGggc2V0VGltZW91dCBidXQgbm8gSS5FLiBtYWRkbmVzc1xuICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dChmdW4sIDApO1xuICAgIH0gY2F0Y2goZSl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBXaGVuIHdlIGFyZSBpbiBJLkUuIGJ1dCB0aGUgc2NyaXB0IGhhcyBiZWVuIGV2YWxlZCBzbyBJLkUuIGRvZXNuJ3QgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwobnVsbCwgZnVuLCAwKTtcbiAgICAgICAgfSBjYXRjaChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yXG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkU2V0VGltZW91dC5jYWxsKHRoaXMsIGZ1biwgMCk7XG4gICAgICAgIH1cbiAgICB9XG5cblxufVxuZnVuY3Rpb24gcnVuQ2xlYXJUaW1lb3V0KG1hcmtlcikge1xuICAgIGlmIChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGNsZWFyVGltZW91dCkge1xuICAgICAgICAvL25vcm1hbCBlbnZpcm9tZW50cyBpbiBzYW5lIHNpdHVhdGlvbnNcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICAvLyBpZiBjbGVhclRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRDbGVhclRpbWVvdXQgPT09IGRlZmF1bHRDbGVhclRpbWVvdXQgfHwgIWNhY2hlZENsZWFyVGltZW91dCkgJiYgY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgcmV0dXJuIGNsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQobWFya2VyKTtcbiAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCAgdHJ1c3QgdGhlIGdsb2JhbCBvYmplY3Qgd2hlbiBjYWxsZWQgbm9ybWFsbHlcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRDbGVhclRpbWVvdXQuY2FsbChudWxsLCBtYXJrZXIpO1xuICAgICAgICB9IGNhdGNoIChlKXtcbiAgICAgICAgICAgIC8vIHNhbWUgYXMgYWJvdmUgYnV0IHdoZW4gaXQncyBhIHZlcnNpb24gb2YgSS5FLiB0aGF0IG11c3QgaGF2ZSB0aGUgZ2xvYmFsIG9iamVjdCBmb3IgJ3RoaXMnLCBob3BmdWxseSBvdXIgY29udGV4dCBjb3JyZWN0IG90aGVyd2lzZSBpdCB3aWxsIHRocm93IGEgZ2xvYmFsIGVycm9yLlxuICAgICAgICAgICAgLy8gU29tZSB2ZXJzaW9ucyBvZiBJLkUuIGhhdmUgZGlmZmVyZW50IHJ1bGVzIGZvciBjbGVhclRpbWVvdXQgdnMgc2V0VGltZW91dFxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKHRoaXMsIG1hcmtlcik7XG4gICAgICAgIH1cbiAgICB9XG5cblxuXG59XG52YXIgcXVldWUgPSBbXTtcbnZhciBkcmFpbmluZyA9IGZhbHNlO1xudmFyIGN1cnJlbnRRdWV1ZTtcbnZhciBxdWV1ZUluZGV4ID0gLTE7XG5cbmZ1bmN0aW9uIGNsZWFuVXBOZXh0VGljaygpIHtcbiAgICBpZiAoIWRyYWluaW5nIHx8ICFjdXJyZW50UXVldWUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIGlmIChjdXJyZW50UXVldWUubGVuZ3RoKSB7XG4gICAgICAgIHF1ZXVlID0gY3VycmVudFF1ZXVlLmNvbmNhdChxdWV1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgIH1cbiAgICBpZiAocXVldWUubGVuZ3RoKSB7XG4gICAgICAgIGRyYWluUXVldWUoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGRyYWluUXVldWUoKSB7XG4gICAgaWYgKGRyYWluaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRpbWVvdXQgPSBydW5UaW1lb3V0KGNsZWFuVXBOZXh0VGljayk7XG4gICAgZHJhaW5pbmcgPSB0cnVlO1xuXG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZShsZW4pIHtcbiAgICAgICAgY3VycmVudFF1ZXVlID0gcXVldWU7XG4gICAgICAgIHF1ZXVlID0gW107XG4gICAgICAgIHdoaWxlICgrK3F1ZXVlSW5kZXggPCBsZW4pIHtcbiAgICAgICAgICAgIGlmIChjdXJyZW50UXVldWUpIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50UXVldWVbcXVldWVJbmRleF0ucnVuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgICAgICBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgfVxuICAgIGN1cnJlbnRRdWV1ZSA9IG51bGw7XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBydW5DbGVhclRpbWVvdXQodGltZW91dCk7XG59XG5cbnByb2Nlc3MubmV4dFRpY2sgPSBmdW5jdGlvbiAoZnVuKSB7XG4gICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCAtIDEpO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcXVldWUucHVzaChuZXcgSXRlbShmdW4sIGFyZ3MpKTtcbiAgICBpZiAocXVldWUubGVuZ3RoID09PSAxICYmICFkcmFpbmluZykge1xuICAgICAgICBydW5UaW1lb3V0KGRyYWluUXVldWUpO1xuICAgIH1cbn07XG5cbi8vIHY4IGxpa2VzIHByZWRpY3RpYmxlIG9iamVjdHNcbmZ1bmN0aW9uIEl0ZW0oZnVuLCBhcnJheSkge1xuICAgIHRoaXMuZnVuID0gZnVuO1xuICAgIHRoaXMuYXJyYXkgPSBhcnJheTtcbn1cbkl0ZW0ucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmZ1bi5hcHBseShudWxsLCB0aGlzLmFycmF5KTtcbn07XG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcbnByb2Nlc3MudmVyc2lvbiA9ICcnOyAvLyBlbXB0eSBzdHJpbmcgdG8gYXZvaWQgcmVnZXhwIGlzc3Vlc1xucHJvY2Vzcy52ZXJzaW9ucyA9IHt9O1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIiwiLyohIGh0dHBzOi8vbXRocy5iZS9wdW55Y29kZSB2MS40LjEgYnkgQG1hdGhpYXMgKi9cbjsoZnVuY3Rpb24ocm9vdCkge1xuXG5cdC8qKiBEZXRlY3QgZnJlZSB2YXJpYWJsZXMgKi9cblx0dmFyIGZyZWVFeHBvcnRzID0gdHlwZW9mIGV4cG9ydHMgPT0gJ29iamVjdCcgJiYgZXhwb3J0cyAmJlxuXHRcdCFleHBvcnRzLm5vZGVUeXBlICYmIGV4cG9ydHM7XG5cdHZhciBmcmVlTW9kdWxlID0gdHlwZW9mIG1vZHVsZSA9PSAnb2JqZWN0JyAmJiBtb2R1bGUgJiZcblx0XHQhbW9kdWxlLm5vZGVUeXBlICYmIG1vZHVsZTtcblx0dmFyIGZyZWVHbG9iYWwgPSB0eXBlb2YgZ2xvYmFsID09ICdvYmplY3QnICYmIGdsb2JhbDtcblx0aWYgKFxuXHRcdGZyZWVHbG9iYWwuZ2xvYmFsID09PSBmcmVlR2xvYmFsIHx8XG5cdFx0ZnJlZUdsb2JhbC53aW5kb3cgPT09IGZyZWVHbG9iYWwgfHxcblx0XHRmcmVlR2xvYmFsLnNlbGYgPT09IGZyZWVHbG9iYWxcblx0KSB7XG5cdFx0cm9vdCA9IGZyZWVHbG9iYWw7XG5cdH1cblxuXHQvKipcblx0ICogVGhlIGBwdW55Y29kZWAgb2JqZWN0LlxuXHQgKiBAbmFtZSBwdW55Y29kZVxuXHQgKiBAdHlwZSBPYmplY3Rcblx0ICovXG5cdHZhciBwdW55Y29kZSxcblxuXHQvKiogSGlnaGVzdCBwb3NpdGl2ZSBzaWduZWQgMzItYml0IGZsb2F0IHZhbHVlICovXG5cdG1heEludCA9IDIxNDc0ODM2NDcsIC8vIGFrYS4gMHg3RkZGRkZGRiBvciAyXjMxLTFcblxuXHQvKiogQm9vdHN0cmluZyBwYXJhbWV0ZXJzICovXG5cdGJhc2UgPSAzNixcblx0dE1pbiA9IDEsXG5cdHRNYXggPSAyNixcblx0c2tldyA9IDM4LFxuXHRkYW1wID0gNzAwLFxuXHRpbml0aWFsQmlhcyA9IDcyLFxuXHRpbml0aWFsTiA9IDEyOCwgLy8gMHg4MFxuXHRkZWxpbWl0ZXIgPSAnLScsIC8vICdcXHgyRCdcblxuXHQvKiogUmVndWxhciBleHByZXNzaW9ucyAqL1xuXHRyZWdleFB1bnljb2RlID0gL154bi0tLyxcblx0cmVnZXhOb25BU0NJSSA9IC9bXlxceDIwLVxceDdFXS8sIC8vIHVucHJpbnRhYmxlIEFTQ0lJIGNoYXJzICsgbm9uLUFTQ0lJIGNoYXJzXG5cdHJlZ2V4U2VwYXJhdG9ycyA9IC9bXFx4MkVcXHUzMDAyXFx1RkYwRVxcdUZGNjFdL2csIC8vIFJGQyAzNDkwIHNlcGFyYXRvcnNcblxuXHQvKiogRXJyb3IgbWVzc2FnZXMgKi9cblx0ZXJyb3JzID0ge1xuXHRcdCdvdmVyZmxvdyc6ICdPdmVyZmxvdzogaW5wdXQgbmVlZHMgd2lkZXIgaW50ZWdlcnMgdG8gcHJvY2VzcycsXG5cdFx0J25vdC1iYXNpYyc6ICdJbGxlZ2FsIGlucHV0ID49IDB4ODAgKG5vdCBhIGJhc2ljIGNvZGUgcG9pbnQpJyxcblx0XHQnaW52YWxpZC1pbnB1dCc6ICdJbnZhbGlkIGlucHV0J1xuXHR9LFxuXG5cdC8qKiBDb252ZW5pZW5jZSBzaG9ydGN1dHMgKi9cblx0YmFzZU1pbnVzVE1pbiA9IGJhc2UgLSB0TWluLFxuXHRmbG9vciA9IE1hdGguZmxvb3IsXG5cdHN0cmluZ0Zyb21DaGFyQ29kZSA9IFN0cmluZy5mcm9tQ2hhckNvZGUsXG5cblx0LyoqIFRlbXBvcmFyeSB2YXJpYWJsZSAqL1xuXHRrZXk7XG5cblx0LyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5cblx0LyoqXG5cdCAqIEEgZ2VuZXJpYyBlcnJvciB1dGlsaXR5IGZ1bmN0aW9uLlxuXHQgKiBAcHJpdmF0ZVxuXHQgKiBAcGFyYW0ge1N0cmluZ30gdHlwZSBUaGUgZXJyb3IgdHlwZS5cblx0ICogQHJldHVybnMge0Vycm9yfSBUaHJvd3MgYSBgUmFuZ2VFcnJvcmAgd2l0aCB0aGUgYXBwbGljYWJsZSBlcnJvciBtZXNzYWdlLlxuXHQgKi9cblx0ZnVuY3Rpb24gZXJyb3IodHlwZSkge1xuXHRcdHRocm93IG5ldyBSYW5nZUVycm9yKGVycm9yc1t0eXBlXSk7XG5cdH1cblxuXHQvKipcblx0ICogQSBnZW5lcmljIGBBcnJheSNtYXBgIHV0aWxpdHkgZnVuY3Rpb24uXG5cdCAqIEBwcml2YXRlXG5cdCAqIEBwYXJhbSB7QXJyYXl9IGFycmF5IFRoZSBhcnJheSB0byBpdGVyYXRlIG92ZXIuXG5cdCAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIFRoZSBmdW5jdGlvbiB0aGF0IGdldHMgY2FsbGVkIGZvciBldmVyeSBhcnJheVxuXHQgKiBpdGVtLlxuXHQgKiBAcmV0dXJucyB7QXJyYXl9IEEgbmV3IGFycmF5IG9mIHZhbHVlcyByZXR1cm5lZCBieSB0aGUgY2FsbGJhY2sgZnVuY3Rpb24uXG5cdCAqL1xuXHRmdW5jdGlvbiBtYXAoYXJyYXksIGZuKSB7XG5cdFx0dmFyIGxlbmd0aCA9IGFycmF5Lmxlbmd0aDtcblx0XHR2YXIgcmVzdWx0ID0gW107XG5cdFx0d2hpbGUgKGxlbmd0aC0tKSB7XG5cdFx0XHRyZXN1bHRbbGVuZ3RoXSA9IGZuKGFycmF5W2xlbmd0aF0pO1xuXHRcdH1cblx0XHRyZXR1cm4gcmVzdWx0O1xuXHR9XG5cblx0LyoqXG5cdCAqIEEgc2ltcGxlIGBBcnJheSNtYXBgLWxpa2Ugd3JhcHBlciB0byB3b3JrIHdpdGggZG9tYWluIG5hbWUgc3RyaW5ncyBvciBlbWFpbFxuXHQgKiBhZGRyZXNzZXMuXG5cdCAqIEBwcml2YXRlXG5cdCAqIEBwYXJhbSB7U3RyaW5nfSBkb21haW4gVGhlIGRvbWFpbiBuYW1lIG9yIGVtYWlsIGFkZHJlc3MuXG5cdCAqIEBwYXJhbSB7RnVuY3Rpb259IGNhbGxiYWNrIFRoZSBmdW5jdGlvbiB0aGF0IGdldHMgY2FsbGVkIGZvciBldmVyeVxuXHQgKiBjaGFyYWN0ZXIuXG5cdCAqIEByZXR1cm5zIHtBcnJheX0gQSBuZXcgc3RyaW5nIG9mIGNoYXJhY3RlcnMgcmV0dXJuZWQgYnkgdGhlIGNhbGxiYWNrXG5cdCAqIGZ1bmN0aW9uLlxuXHQgKi9cblx0ZnVuY3Rpb24gbWFwRG9tYWluKHN0cmluZywgZm4pIHtcblx0XHR2YXIgcGFydHMgPSBzdHJpbmcuc3BsaXQoJ0AnKTtcblx0XHR2YXIgcmVzdWx0ID0gJyc7XG5cdFx0aWYgKHBhcnRzLmxlbmd0aCA+IDEpIHtcblx0XHRcdC8vIEluIGVtYWlsIGFkZHJlc3Nlcywgb25seSB0aGUgZG9tYWluIG5hbWUgc2hvdWxkIGJlIHB1bnljb2RlZC4gTGVhdmVcblx0XHRcdC8vIHRoZSBsb2NhbCBwYXJ0IChpLmUuIGV2ZXJ5dGhpbmcgdXAgdG8gYEBgKSBpbnRhY3QuXG5cdFx0XHRyZXN1bHQgPSBwYXJ0c1swXSArICdAJztcblx0XHRcdHN0cmluZyA9IHBhcnRzWzFdO1xuXHRcdH1cblx0XHQvLyBBdm9pZCBgc3BsaXQocmVnZXgpYCBmb3IgSUU4IGNvbXBhdGliaWxpdHkuIFNlZSAjMTcuXG5cdFx0c3RyaW5nID0gc3RyaW5nLnJlcGxhY2UocmVnZXhTZXBhcmF0b3JzLCAnXFx4MkUnKTtcblx0XHR2YXIgbGFiZWxzID0gc3RyaW5nLnNwbGl0KCcuJyk7XG5cdFx0dmFyIGVuY29kZWQgPSBtYXAobGFiZWxzLCBmbikuam9pbignLicpO1xuXHRcdHJldHVybiByZXN1bHQgKyBlbmNvZGVkO1xuXHR9XG5cblx0LyoqXG5cdCAqIENyZWF0ZXMgYW4gYXJyYXkgY29udGFpbmluZyB0aGUgbnVtZXJpYyBjb2RlIHBvaW50cyBvZiBlYWNoIFVuaWNvZGVcblx0ICogY2hhcmFjdGVyIGluIHRoZSBzdHJpbmcuIFdoaWxlIEphdmFTY3JpcHQgdXNlcyBVQ1MtMiBpbnRlcm5hbGx5LFxuXHQgKiB0aGlzIGZ1bmN0aW9uIHdpbGwgY29udmVydCBhIHBhaXIgb2Ygc3Vycm9nYXRlIGhhbHZlcyAoZWFjaCBvZiB3aGljaFxuXHQgKiBVQ1MtMiBleHBvc2VzIGFzIHNlcGFyYXRlIGNoYXJhY3RlcnMpIGludG8gYSBzaW5nbGUgY29kZSBwb2ludCxcblx0ICogbWF0Y2hpbmcgVVRGLTE2LlxuXHQgKiBAc2VlIGBwdW55Y29kZS51Y3MyLmVuY29kZWBcblx0ICogQHNlZSA8aHR0cHM6Ly9tYXRoaWFzYnluZW5zLmJlL25vdGVzL2phdmFzY3JpcHQtZW5jb2Rpbmc+XG5cdCAqIEBtZW1iZXJPZiBwdW55Y29kZS51Y3MyXG5cdCAqIEBuYW1lIGRlY29kZVxuXHQgKiBAcGFyYW0ge1N0cmluZ30gc3RyaW5nIFRoZSBVbmljb2RlIGlucHV0IHN0cmluZyAoVUNTLTIpLlxuXHQgKiBAcmV0dXJucyB7QXJyYXl9IFRoZSBuZXcgYXJyYXkgb2YgY29kZSBwb2ludHMuXG5cdCAqL1xuXHRmdW5jdGlvbiB1Y3MyZGVjb2RlKHN0cmluZykge1xuXHRcdHZhciBvdXRwdXQgPSBbXSxcblx0XHQgICAgY291bnRlciA9IDAsXG5cdFx0ICAgIGxlbmd0aCA9IHN0cmluZy5sZW5ndGgsXG5cdFx0ICAgIHZhbHVlLFxuXHRcdCAgICBleHRyYTtcblx0XHR3aGlsZSAoY291bnRlciA8IGxlbmd0aCkge1xuXHRcdFx0dmFsdWUgPSBzdHJpbmcuY2hhckNvZGVBdChjb3VudGVyKyspO1xuXHRcdFx0aWYgKHZhbHVlID49IDB4RDgwMCAmJiB2YWx1ZSA8PSAweERCRkYgJiYgY291bnRlciA8IGxlbmd0aCkge1xuXHRcdFx0XHQvLyBoaWdoIHN1cnJvZ2F0ZSwgYW5kIHRoZXJlIGlzIGEgbmV4dCBjaGFyYWN0ZXJcblx0XHRcdFx0ZXh0cmEgPSBzdHJpbmcuY2hhckNvZGVBdChjb3VudGVyKyspO1xuXHRcdFx0XHRpZiAoKGV4dHJhICYgMHhGQzAwKSA9PSAweERDMDApIHsgLy8gbG93IHN1cnJvZ2F0ZVxuXHRcdFx0XHRcdG91dHB1dC5wdXNoKCgodmFsdWUgJiAweDNGRikgPDwgMTApICsgKGV4dHJhICYgMHgzRkYpICsgMHgxMDAwMCk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0Ly8gdW5tYXRjaGVkIHN1cnJvZ2F0ZTsgb25seSBhcHBlbmQgdGhpcyBjb2RlIHVuaXQsIGluIGNhc2UgdGhlIG5leHRcblx0XHRcdFx0XHQvLyBjb2RlIHVuaXQgaXMgdGhlIGhpZ2ggc3Vycm9nYXRlIG9mIGEgc3Vycm9nYXRlIHBhaXJcblx0XHRcdFx0XHRvdXRwdXQucHVzaCh2YWx1ZSk7XG5cdFx0XHRcdFx0Y291bnRlci0tO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRvdXRwdXQucHVzaCh2YWx1ZSk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiBvdXRwdXQ7XG5cdH1cblxuXHQvKipcblx0ICogQ3JlYXRlcyBhIHN0cmluZyBiYXNlZCBvbiBhbiBhcnJheSBvZiBudW1lcmljIGNvZGUgcG9pbnRzLlxuXHQgKiBAc2VlIGBwdW55Y29kZS51Y3MyLmRlY29kZWBcblx0ICogQG1lbWJlck9mIHB1bnljb2RlLnVjczJcblx0ICogQG5hbWUgZW5jb2RlXG5cdCAqIEBwYXJhbSB7QXJyYXl9IGNvZGVQb2ludHMgVGhlIGFycmF5IG9mIG51bWVyaWMgY29kZSBwb2ludHMuXG5cdCAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSBuZXcgVW5pY29kZSBzdHJpbmcgKFVDUy0yKS5cblx0ICovXG5cdGZ1bmN0aW9uIHVjczJlbmNvZGUoYXJyYXkpIHtcblx0XHRyZXR1cm4gbWFwKGFycmF5LCBmdW5jdGlvbih2YWx1ZSkge1xuXHRcdFx0dmFyIG91dHB1dCA9ICcnO1xuXHRcdFx0aWYgKHZhbHVlID4gMHhGRkZGKSB7XG5cdFx0XHRcdHZhbHVlIC09IDB4MTAwMDA7XG5cdFx0XHRcdG91dHB1dCArPSBzdHJpbmdGcm9tQ2hhckNvZGUodmFsdWUgPj4+IDEwICYgMHgzRkYgfCAweEQ4MDApO1xuXHRcdFx0XHR2YWx1ZSA9IDB4REMwMCB8IHZhbHVlICYgMHgzRkY7XG5cdFx0XHR9XG5cdFx0XHRvdXRwdXQgKz0gc3RyaW5nRnJvbUNoYXJDb2RlKHZhbHVlKTtcblx0XHRcdHJldHVybiBvdXRwdXQ7XG5cdFx0fSkuam9pbignJyk7XG5cdH1cblxuXHQvKipcblx0ICogQ29udmVydHMgYSBiYXNpYyBjb2RlIHBvaW50IGludG8gYSBkaWdpdC9pbnRlZ2VyLlxuXHQgKiBAc2VlIGBkaWdpdFRvQmFzaWMoKWBcblx0ICogQHByaXZhdGVcblx0ICogQHBhcmFtIHtOdW1iZXJ9IGNvZGVQb2ludCBUaGUgYmFzaWMgbnVtZXJpYyBjb2RlIHBvaW50IHZhbHVlLlxuXHQgKiBAcmV0dXJucyB7TnVtYmVyfSBUaGUgbnVtZXJpYyB2YWx1ZSBvZiBhIGJhc2ljIGNvZGUgcG9pbnQgKGZvciB1c2UgaW5cblx0ICogcmVwcmVzZW50aW5nIGludGVnZXJzKSBpbiB0aGUgcmFuZ2UgYDBgIHRvIGBiYXNlIC0gMWAsIG9yIGBiYXNlYCBpZlxuXHQgKiB0aGUgY29kZSBwb2ludCBkb2VzIG5vdCByZXByZXNlbnQgYSB2YWx1ZS5cblx0ICovXG5cdGZ1bmN0aW9uIGJhc2ljVG9EaWdpdChjb2RlUG9pbnQpIHtcblx0XHRpZiAoY29kZVBvaW50IC0gNDggPCAxMCkge1xuXHRcdFx0cmV0dXJuIGNvZGVQb2ludCAtIDIyO1xuXHRcdH1cblx0XHRpZiAoY29kZVBvaW50IC0gNjUgPCAyNikge1xuXHRcdFx0cmV0dXJuIGNvZGVQb2ludCAtIDY1O1xuXHRcdH1cblx0XHRpZiAoY29kZVBvaW50IC0gOTcgPCAyNikge1xuXHRcdFx0cmV0dXJuIGNvZGVQb2ludCAtIDk3O1xuXHRcdH1cblx0XHRyZXR1cm4gYmFzZTtcblx0fVxuXG5cdC8qKlxuXHQgKiBDb252ZXJ0cyBhIGRpZ2l0L2ludGVnZXIgaW50byBhIGJhc2ljIGNvZGUgcG9pbnQuXG5cdCAqIEBzZWUgYGJhc2ljVG9EaWdpdCgpYFxuXHQgKiBAcHJpdmF0ZVxuXHQgKiBAcGFyYW0ge051bWJlcn0gZGlnaXQgVGhlIG51bWVyaWMgdmFsdWUgb2YgYSBiYXNpYyBjb2RlIHBvaW50LlxuXHQgKiBAcmV0dXJucyB7TnVtYmVyfSBUaGUgYmFzaWMgY29kZSBwb2ludCB3aG9zZSB2YWx1ZSAod2hlbiB1c2VkIGZvclxuXHQgKiByZXByZXNlbnRpbmcgaW50ZWdlcnMpIGlzIGBkaWdpdGAsIHdoaWNoIG5lZWRzIHRvIGJlIGluIHRoZSByYW5nZVxuXHQgKiBgMGAgdG8gYGJhc2UgLSAxYC4gSWYgYGZsYWdgIGlzIG5vbi16ZXJvLCB0aGUgdXBwZXJjYXNlIGZvcm0gaXNcblx0ICogdXNlZDsgZWxzZSwgdGhlIGxvd2VyY2FzZSBmb3JtIGlzIHVzZWQuIFRoZSBiZWhhdmlvciBpcyB1bmRlZmluZWRcblx0ICogaWYgYGZsYWdgIGlzIG5vbi16ZXJvIGFuZCBgZGlnaXRgIGhhcyBubyB1cHBlcmNhc2UgZm9ybS5cblx0ICovXG5cdGZ1bmN0aW9uIGRpZ2l0VG9CYXNpYyhkaWdpdCwgZmxhZykge1xuXHRcdC8vICAwLi4yNSBtYXAgdG8gQVNDSUkgYS4ueiBvciBBLi5aXG5cdFx0Ly8gMjYuLjM1IG1hcCB0byBBU0NJSSAwLi45XG5cdFx0cmV0dXJuIGRpZ2l0ICsgMjIgKyA3NSAqIChkaWdpdCA8IDI2KSAtICgoZmxhZyAhPSAwKSA8PCA1KTtcblx0fVxuXG5cdC8qKlxuXHQgKiBCaWFzIGFkYXB0YXRpb24gZnVuY3Rpb24gYXMgcGVyIHNlY3Rpb24gMy40IG9mIFJGQyAzNDkyLlxuXHQgKiBodHRwczovL3Rvb2xzLmlldGYub3JnL2h0bWwvcmZjMzQ5MiNzZWN0aW9uLTMuNFxuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0ZnVuY3Rpb24gYWRhcHQoZGVsdGEsIG51bVBvaW50cywgZmlyc3RUaW1lKSB7XG5cdFx0dmFyIGsgPSAwO1xuXHRcdGRlbHRhID0gZmlyc3RUaW1lID8gZmxvb3IoZGVsdGEgLyBkYW1wKSA6IGRlbHRhID4+IDE7XG5cdFx0ZGVsdGEgKz0gZmxvb3IoZGVsdGEgLyBudW1Qb2ludHMpO1xuXHRcdGZvciAoLyogbm8gaW5pdGlhbGl6YXRpb24gKi87IGRlbHRhID4gYmFzZU1pbnVzVE1pbiAqIHRNYXggPj4gMTsgayArPSBiYXNlKSB7XG5cdFx0XHRkZWx0YSA9IGZsb29yKGRlbHRhIC8gYmFzZU1pbnVzVE1pbik7XG5cdFx0fVxuXHRcdHJldHVybiBmbG9vcihrICsgKGJhc2VNaW51c1RNaW4gKyAxKSAqIGRlbHRhIC8gKGRlbHRhICsgc2tldykpO1xuXHR9XG5cblx0LyoqXG5cdCAqIENvbnZlcnRzIGEgUHVueWNvZGUgc3RyaW5nIG9mIEFTQ0lJLW9ubHkgc3ltYm9scyB0byBhIHN0cmluZyBvZiBVbmljb2RlXG5cdCAqIHN5bWJvbHMuXG5cdCAqIEBtZW1iZXJPZiBwdW55Y29kZVxuXHQgKiBAcGFyYW0ge1N0cmluZ30gaW5wdXQgVGhlIFB1bnljb2RlIHN0cmluZyBvZiBBU0NJSS1vbmx5IHN5bWJvbHMuXG5cdCAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSByZXN1bHRpbmcgc3RyaW5nIG9mIFVuaWNvZGUgc3ltYm9scy5cblx0ICovXG5cdGZ1bmN0aW9uIGRlY29kZShpbnB1dCkge1xuXHRcdC8vIERvbid0IHVzZSBVQ1MtMlxuXHRcdHZhciBvdXRwdXQgPSBbXSxcblx0XHQgICAgaW5wdXRMZW5ndGggPSBpbnB1dC5sZW5ndGgsXG5cdFx0ICAgIG91dCxcblx0XHQgICAgaSA9IDAsXG5cdFx0ICAgIG4gPSBpbml0aWFsTixcblx0XHQgICAgYmlhcyA9IGluaXRpYWxCaWFzLFxuXHRcdCAgICBiYXNpYyxcblx0XHQgICAgaixcblx0XHQgICAgaW5kZXgsXG5cdFx0ICAgIG9sZGksXG5cdFx0ICAgIHcsXG5cdFx0ICAgIGssXG5cdFx0ICAgIGRpZ2l0LFxuXHRcdCAgICB0LFxuXHRcdCAgICAvKiogQ2FjaGVkIGNhbGN1bGF0aW9uIHJlc3VsdHMgKi9cblx0XHQgICAgYmFzZU1pbnVzVDtcblxuXHRcdC8vIEhhbmRsZSB0aGUgYmFzaWMgY29kZSBwb2ludHM6IGxldCBgYmFzaWNgIGJlIHRoZSBudW1iZXIgb2YgaW5wdXQgY29kZVxuXHRcdC8vIHBvaW50cyBiZWZvcmUgdGhlIGxhc3QgZGVsaW1pdGVyLCBvciBgMGAgaWYgdGhlcmUgaXMgbm9uZSwgdGhlbiBjb3B5XG5cdFx0Ly8gdGhlIGZpcnN0IGJhc2ljIGNvZGUgcG9pbnRzIHRvIHRoZSBvdXRwdXQuXG5cblx0XHRiYXNpYyA9IGlucHV0Lmxhc3RJbmRleE9mKGRlbGltaXRlcik7XG5cdFx0aWYgKGJhc2ljIDwgMCkge1xuXHRcdFx0YmFzaWMgPSAwO1xuXHRcdH1cblxuXHRcdGZvciAoaiA9IDA7IGogPCBiYXNpYzsgKytqKSB7XG5cdFx0XHQvLyBpZiBpdCdzIG5vdCBhIGJhc2ljIGNvZGUgcG9pbnRcblx0XHRcdGlmIChpbnB1dC5jaGFyQ29kZUF0KGopID49IDB4ODApIHtcblx0XHRcdFx0ZXJyb3IoJ25vdC1iYXNpYycpO1xuXHRcdFx0fVxuXHRcdFx0b3V0cHV0LnB1c2goaW5wdXQuY2hhckNvZGVBdChqKSk7XG5cdFx0fVxuXG5cdFx0Ly8gTWFpbiBkZWNvZGluZyBsb29wOiBzdGFydCBqdXN0IGFmdGVyIHRoZSBsYXN0IGRlbGltaXRlciBpZiBhbnkgYmFzaWMgY29kZVxuXHRcdC8vIHBvaW50cyB3ZXJlIGNvcGllZDsgc3RhcnQgYXQgdGhlIGJlZ2lubmluZyBvdGhlcndpc2UuXG5cblx0XHRmb3IgKGluZGV4ID0gYmFzaWMgPiAwID8gYmFzaWMgKyAxIDogMDsgaW5kZXggPCBpbnB1dExlbmd0aDsgLyogbm8gZmluYWwgZXhwcmVzc2lvbiAqLykge1xuXG5cdFx0XHQvLyBgaW5kZXhgIGlzIHRoZSBpbmRleCBvZiB0aGUgbmV4dCBjaGFyYWN0ZXIgdG8gYmUgY29uc3VtZWQuXG5cdFx0XHQvLyBEZWNvZGUgYSBnZW5lcmFsaXplZCB2YXJpYWJsZS1sZW5ndGggaW50ZWdlciBpbnRvIGBkZWx0YWAsXG5cdFx0XHQvLyB3aGljaCBnZXRzIGFkZGVkIHRvIGBpYC4gVGhlIG92ZXJmbG93IGNoZWNraW5nIGlzIGVhc2llclxuXHRcdFx0Ly8gaWYgd2UgaW5jcmVhc2UgYGlgIGFzIHdlIGdvLCB0aGVuIHN1YnRyYWN0IG9mZiBpdHMgc3RhcnRpbmdcblx0XHRcdC8vIHZhbHVlIGF0IHRoZSBlbmQgdG8gb2J0YWluIGBkZWx0YWAuXG5cdFx0XHRmb3IgKG9sZGkgPSBpLCB3ID0gMSwgayA9IGJhc2U7IC8qIG5vIGNvbmRpdGlvbiAqLzsgayArPSBiYXNlKSB7XG5cblx0XHRcdFx0aWYgKGluZGV4ID49IGlucHV0TGVuZ3RoKSB7XG5cdFx0XHRcdFx0ZXJyb3IoJ2ludmFsaWQtaW5wdXQnKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGRpZ2l0ID0gYmFzaWNUb0RpZ2l0KGlucHV0LmNoYXJDb2RlQXQoaW5kZXgrKykpO1xuXG5cdFx0XHRcdGlmIChkaWdpdCA+PSBiYXNlIHx8IGRpZ2l0ID4gZmxvb3IoKG1heEludCAtIGkpIC8gdykpIHtcblx0XHRcdFx0XHRlcnJvcignb3ZlcmZsb3cnKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGkgKz0gZGlnaXQgKiB3O1xuXHRcdFx0XHR0ID0gayA8PSBiaWFzID8gdE1pbiA6IChrID49IGJpYXMgKyB0TWF4ID8gdE1heCA6IGsgLSBiaWFzKTtcblxuXHRcdFx0XHRpZiAoZGlnaXQgPCB0KSB7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRiYXNlTWludXNUID0gYmFzZSAtIHQ7XG5cdFx0XHRcdGlmICh3ID4gZmxvb3IobWF4SW50IC8gYmFzZU1pbnVzVCkpIHtcblx0XHRcdFx0XHRlcnJvcignb3ZlcmZsb3cnKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHcgKj0gYmFzZU1pbnVzVDtcblxuXHRcdFx0fVxuXG5cdFx0XHRvdXQgPSBvdXRwdXQubGVuZ3RoICsgMTtcblx0XHRcdGJpYXMgPSBhZGFwdChpIC0gb2xkaSwgb3V0LCBvbGRpID09IDApO1xuXG5cdFx0XHQvLyBgaWAgd2FzIHN1cHBvc2VkIHRvIHdyYXAgYXJvdW5kIGZyb20gYG91dGAgdG8gYDBgLFxuXHRcdFx0Ly8gaW5jcmVtZW50aW5nIGBuYCBlYWNoIHRpbWUsIHNvIHdlJ2xsIGZpeCB0aGF0IG5vdzpcblx0XHRcdGlmIChmbG9vcihpIC8gb3V0KSA+IG1heEludCAtIG4pIHtcblx0XHRcdFx0ZXJyb3IoJ292ZXJmbG93Jyk7XG5cdFx0XHR9XG5cblx0XHRcdG4gKz0gZmxvb3IoaSAvIG91dCk7XG5cdFx0XHRpICU9IG91dDtcblxuXHRcdFx0Ly8gSW5zZXJ0IGBuYCBhdCBwb3NpdGlvbiBgaWAgb2YgdGhlIG91dHB1dFxuXHRcdFx0b3V0cHV0LnNwbGljZShpKyssIDAsIG4pO1xuXG5cdFx0fVxuXG5cdFx0cmV0dXJuIHVjczJlbmNvZGUob3V0cHV0KTtcblx0fVxuXG5cdC8qKlxuXHQgKiBDb252ZXJ0cyBhIHN0cmluZyBvZiBVbmljb2RlIHN5bWJvbHMgKGUuZy4gYSBkb21haW4gbmFtZSBsYWJlbCkgdG8gYVxuXHQgKiBQdW55Y29kZSBzdHJpbmcgb2YgQVNDSUktb25seSBzeW1ib2xzLlxuXHQgKiBAbWVtYmVyT2YgcHVueWNvZGVcblx0ICogQHBhcmFtIHtTdHJpbmd9IGlucHV0IFRoZSBzdHJpbmcgb2YgVW5pY29kZSBzeW1ib2xzLlxuXHQgKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgcmVzdWx0aW5nIFB1bnljb2RlIHN0cmluZyBvZiBBU0NJSS1vbmx5IHN5bWJvbHMuXG5cdCAqL1xuXHRmdW5jdGlvbiBlbmNvZGUoaW5wdXQpIHtcblx0XHR2YXIgbixcblx0XHQgICAgZGVsdGEsXG5cdFx0ICAgIGhhbmRsZWRDUENvdW50LFxuXHRcdCAgICBiYXNpY0xlbmd0aCxcblx0XHQgICAgYmlhcyxcblx0XHQgICAgaixcblx0XHQgICAgbSxcblx0XHQgICAgcSxcblx0XHQgICAgayxcblx0XHQgICAgdCxcblx0XHQgICAgY3VycmVudFZhbHVlLFxuXHRcdCAgICBvdXRwdXQgPSBbXSxcblx0XHQgICAgLyoqIGBpbnB1dExlbmd0aGAgd2lsbCBob2xkIHRoZSBudW1iZXIgb2YgY29kZSBwb2ludHMgaW4gYGlucHV0YC4gKi9cblx0XHQgICAgaW5wdXRMZW5ndGgsXG5cdFx0ICAgIC8qKiBDYWNoZWQgY2FsY3VsYXRpb24gcmVzdWx0cyAqL1xuXHRcdCAgICBoYW5kbGVkQ1BDb3VudFBsdXNPbmUsXG5cdFx0ICAgIGJhc2VNaW51c1QsXG5cdFx0ICAgIHFNaW51c1Q7XG5cblx0XHQvLyBDb252ZXJ0IHRoZSBpbnB1dCBpbiBVQ1MtMiB0byBVbmljb2RlXG5cdFx0aW5wdXQgPSB1Y3MyZGVjb2RlKGlucHV0KTtcblxuXHRcdC8vIENhY2hlIHRoZSBsZW5ndGhcblx0XHRpbnB1dExlbmd0aCA9IGlucHV0Lmxlbmd0aDtcblxuXHRcdC8vIEluaXRpYWxpemUgdGhlIHN0YXRlXG5cdFx0biA9IGluaXRpYWxOO1xuXHRcdGRlbHRhID0gMDtcblx0XHRiaWFzID0gaW5pdGlhbEJpYXM7XG5cblx0XHQvLyBIYW5kbGUgdGhlIGJhc2ljIGNvZGUgcG9pbnRzXG5cdFx0Zm9yIChqID0gMDsgaiA8IGlucHV0TGVuZ3RoOyArK2opIHtcblx0XHRcdGN1cnJlbnRWYWx1ZSA9IGlucHV0W2pdO1xuXHRcdFx0aWYgKGN1cnJlbnRWYWx1ZSA8IDB4ODApIHtcblx0XHRcdFx0b3V0cHV0LnB1c2goc3RyaW5nRnJvbUNoYXJDb2RlKGN1cnJlbnRWYWx1ZSkpO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGhhbmRsZWRDUENvdW50ID0gYmFzaWNMZW5ndGggPSBvdXRwdXQubGVuZ3RoO1xuXG5cdFx0Ly8gYGhhbmRsZWRDUENvdW50YCBpcyB0aGUgbnVtYmVyIG9mIGNvZGUgcG9pbnRzIHRoYXQgaGF2ZSBiZWVuIGhhbmRsZWQ7XG5cdFx0Ly8gYGJhc2ljTGVuZ3RoYCBpcyB0aGUgbnVtYmVyIG9mIGJhc2ljIGNvZGUgcG9pbnRzLlxuXG5cdFx0Ly8gRmluaXNoIHRoZSBiYXNpYyBzdHJpbmcgLSBpZiBpdCBpcyBub3QgZW1wdHkgLSB3aXRoIGEgZGVsaW1pdGVyXG5cdFx0aWYgKGJhc2ljTGVuZ3RoKSB7XG5cdFx0XHRvdXRwdXQucHVzaChkZWxpbWl0ZXIpO1xuXHRcdH1cblxuXHRcdC8vIE1haW4gZW5jb2RpbmcgbG9vcDpcblx0XHR3aGlsZSAoaGFuZGxlZENQQ291bnQgPCBpbnB1dExlbmd0aCkge1xuXG5cdFx0XHQvLyBBbGwgbm9uLWJhc2ljIGNvZGUgcG9pbnRzIDwgbiBoYXZlIGJlZW4gaGFuZGxlZCBhbHJlYWR5LiBGaW5kIHRoZSBuZXh0XG5cdFx0XHQvLyBsYXJnZXIgb25lOlxuXHRcdFx0Zm9yIChtID0gbWF4SW50LCBqID0gMDsgaiA8IGlucHV0TGVuZ3RoOyArK2opIHtcblx0XHRcdFx0Y3VycmVudFZhbHVlID0gaW5wdXRbal07XG5cdFx0XHRcdGlmIChjdXJyZW50VmFsdWUgPj0gbiAmJiBjdXJyZW50VmFsdWUgPCBtKSB7XG5cdFx0XHRcdFx0bSA9IGN1cnJlbnRWYWx1ZTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHQvLyBJbmNyZWFzZSBgZGVsdGFgIGVub3VnaCB0byBhZHZhbmNlIHRoZSBkZWNvZGVyJ3MgPG4saT4gc3RhdGUgdG8gPG0sMD4sXG5cdFx0XHQvLyBidXQgZ3VhcmQgYWdhaW5zdCBvdmVyZmxvd1xuXHRcdFx0aGFuZGxlZENQQ291bnRQbHVzT25lID0gaGFuZGxlZENQQ291bnQgKyAxO1xuXHRcdFx0aWYgKG0gLSBuID4gZmxvb3IoKG1heEludCAtIGRlbHRhKSAvIGhhbmRsZWRDUENvdW50UGx1c09uZSkpIHtcblx0XHRcdFx0ZXJyb3IoJ292ZXJmbG93Jyk7XG5cdFx0XHR9XG5cblx0XHRcdGRlbHRhICs9IChtIC0gbikgKiBoYW5kbGVkQ1BDb3VudFBsdXNPbmU7XG5cdFx0XHRuID0gbTtcblxuXHRcdFx0Zm9yIChqID0gMDsgaiA8IGlucHV0TGVuZ3RoOyArK2opIHtcblx0XHRcdFx0Y3VycmVudFZhbHVlID0gaW5wdXRbal07XG5cblx0XHRcdFx0aWYgKGN1cnJlbnRWYWx1ZSA8IG4gJiYgKytkZWx0YSA+IG1heEludCkge1xuXHRcdFx0XHRcdGVycm9yKCdvdmVyZmxvdycpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKGN1cnJlbnRWYWx1ZSA9PSBuKSB7XG5cdFx0XHRcdFx0Ly8gUmVwcmVzZW50IGRlbHRhIGFzIGEgZ2VuZXJhbGl6ZWQgdmFyaWFibGUtbGVuZ3RoIGludGVnZXJcblx0XHRcdFx0XHRmb3IgKHEgPSBkZWx0YSwgayA9IGJhc2U7IC8qIG5vIGNvbmRpdGlvbiAqLzsgayArPSBiYXNlKSB7XG5cdFx0XHRcdFx0XHR0ID0gayA8PSBiaWFzID8gdE1pbiA6IChrID49IGJpYXMgKyB0TWF4ID8gdE1heCA6IGsgLSBiaWFzKTtcblx0XHRcdFx0XHRcdGlmIChxIDwgdCkge1xuXHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHFNaW51c1QgPSBxIC0gdDtcblx0XHRcdFx0XHRcdGJhc2VNaW51c1QgPSBiYXNlIC0gdDtcblx0XHRcdFx0XHRcdG91dHB1dC5wdXNoKFxuXHRcdFx0XHRcdFx0XHRzdHJpbmdGcm9tQ2hhckNvZGUoZGlnaXRUb0Jhc2ljKHQgKyBxTWludXNUICUgYmFzZU1pbnVzVCwgMCkpXG5cdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdFx0cSA9IGZsb29yKHFNaW51c1QgLyBiYXNlTWludXNUKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRvdXRwdXQucHVzaChzdHJpbmdGcm9tQ2hhckNvZGUoZGlnaXRUb0Jhc2ljKHEsIDApKSk7XG5cdFx0XHRcdFx0YmlhcyA9IGFkYXB0KGRlbHRhLCBoYW5kbGVkQ1BDb3VudFBsdXNPbmUsIGhhbmRsZWRDUENvdW50ID09IGJhc2ljTGVuZ3RoKTtcblx0XHRcdFx0XHRkZWx0YSA9IDA7XG5cdFx0XHRcdFx0KytoYW5kbGVkQ1BDb3VudDtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHQrK2RlbHRhO1xuXHRcdFx0KytuO1xuXG5cdFx0fVxuXHRcdHJldHVybiBvdXRwdXQuam9pbignJyk7XG5cdH1cblxuXHQvKipcblx0ICogQ29udmVydHMgYSBQdW55Y29kZSBzdHJpbmcgcmVwcmVzZW50aW5nIGEgZG9tYWluIG5hbWUgb3IgYW4gZW1haWwgYWRkcmVzc1xuXHQgKiB0byBVbmljb2RlLiBPbmx5IHRoZSBQdW55Y29kZWQgcGFydHMgb2YgdGhlIGlucHV0IHdpbGwgYmUgY29udmVydGVkLCBpLmUuXG5cdCAqIGl0IGRvZXNuJ3QgbWF0dGVyIGlmIHlvdSBjYWxsIGl0IG9uIGEgc3RyaW5nIHRoYXQgaGFzIGFscmVhZHkgYmVlblxuXHQgKiBjb252ZXJ0ZWQgdG8gVW5pY29kZS5cblx0ICogQG1lbWJlck9mIHB1bnljb2RlXG5cdCAqIEBwYXJhbSB7U3RyaW5nfSBpbnB1dCBUaGUgUHVueWNvZGVkIGRvbWFpbiBuYW1lIG9yIGVtYWlsIGFkZHJlc3MgdG9cblx0ICogY29udmVydCB0byBVbmljb2RlLlxuXHQgKiBAcmV0dXJucyB7U3RyaW5nfSBUaGUgVW5pY29kZSByZXByZXNlbnRhdGlvbiBvZiB0aGUgZ2l2ZW4gUHVueWNvZGVcblx0ICogc3RyaW5nLlxuXHQgKi9cblx0ZnVuY3Rpb24gdG9Vbmljb2RlKGlucHV0KSB7XG5cdFx0cmV0dXJuIG1hcERvbWFpbihpbnB1dCwgZnVuY3Rpb24oc3RyaW5nKSB7XG5cdFx0XHRyZXR1cm4gcmVnZXhQdW55Y29kZS50ZXN0KHN0cmluZylcblx0XHRcdFx0PyBkZWNvZGUoc3RyaW5nLnNsaWNlKDQpLnRvTG93ZXJDYXNlKCkpXG5cdFx0XHRcdDogc3RyaW5nO1xuXHRcdH0pO1xuXHR9XG5cblx0LyoqXG5cdCAqIENvbnZlcnRzIGEgVW5pY29kZSBzdHJpbmcgcmVwcmVzZW50aW5nIGEgZG9tYWluIG5hbWUgb3IgYW4gZW1haWwgYWRkcmVzcyB0b1xuXHQgKiBQdW55Y29kZS4gT25seSB0aGUgbm9uLUFTQ0lJIHBhcnRzIG9mIHRoZSBkb21haW4gbmFtZSB3aWxsIGJlIGNvbnZlcnRlZCxcblx0ICogaS5lLiBpdCBkb2Vzbid0IG1hdHRlciBpZiB5b3UgY2FsbCBpdCB3aXRoIGEgZG9tYWluIHRoYXQncyBhbHJlYWR5IGluXG5cdCAqIEFTQ0lJLlxuXHQgKiBAbWVtYmVyT2YgcHVueWNvZGVcblx0ICogQHBhcmFtIHtTdHJpbmd9IGlucHV0IFRoZSBkb21haW4gbmFtZSBvciBlbWFpbCBhZGRyZXNzIHRvIGNvbnZlcnQsIGFzIGFcblx0ICogVW5pY29kZSBzdHJpbmcuXG5cdCAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSBQdW55Y29kZSByZXByZXNlbnRhdGlvbiBvZiB0aGUgZ2l2ZW4gZG9tYWluIG5hbWUgb3Jcblx0ICogZW1haWwgYWRkcmVzcy5cblx0ICovXG5cdGZ1bmN0aW9uIHRvQVNDSUkoaW5wdXQpIHtcblx0XHRyZXR1cm4gbWFwRG9tYWluKGlucHV0LCBmdW5jdGlvbihzdHJpbmcpIHtcblx0XHRcdHJldHVybiByZWdleE5vbkFTQ0lJLnRlc3Qoc3RyaW5nKVxuXHRcdFx0XHQ/ICd4bi0tJyArIGVuY29kZShzdHJpbmcpXG5cdFx0XHRcdDogc3RyaW5nO1xuXHRcdH0pO1xuXHR9XG5cblx0LyotLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSovXG5cblx0LyoqIERlZmluZSB0aGUgcHVibGljIEFQSSAqL1xuXHRwdW55Y29kZSA9IHtcblx0XHQvKipcblx0XHQgKiBBIHN0cmluZyByZXByZXNlbnRpbmcgdGhlIGN1cnJlbnQgUHVueWNvZGUuanMgdmVyc2lvbiBudW1iZXIuXG5cdFx0ICogQG1lbWJlck9mIHB1bnljb2RlXG5cdFx0ICogQHR5cGUgU3RyaW5nXG5cdFx0ICovXG5cdFx0J3ZlcnNpb24nOiAnMS40LjEnLFxuXHRcdC8qKlxuXHRcdCAqIEFuIG9iamVjdCBvZiBtZXRob2RzIHRvIGNvbnZlcnQgZnJvbSBKYXZhU2NyaXB0J3MgaW50ZXJuYWwgY2hhcmFjdGVyXG5cdFx0ICogcmVwcmVzZW50YXRpb24gKFVDUy0yKSB0byBVbmljb2RlIGNvZGUgcG9pbnRzLCBhbmQgYmFjay5cblx0XHQgKiBAc2VlIDxodHRwczovL21hdGhpYXNieW5lbnMuYmUvbm90ZXMvamF2YXNjcmlwdC1lbmNvZGluZz5cblx0XHQgKiBAbWVtYmVyT2YgcHVueWNvZGVcblx0XHQgKiBAdHlwZSBPYmplY3Rcblx0XHQgKi9cblx0XHQndWNzMic6IHtcblx0XHRcdCdkZWNvZGUnOiB1Y3MyZGVjb2RlLFxuXHRcdFx0J2VuY29kZSc6IHVjczJlbmNvZGVcblx0XHR9LFxuXHRcdCdkZWNvZGUnOiBkZWNvZGUsXG5cdFx0J2VuY29kZSc6IGVuY29kZSxcblx0XHQndG9BU0NJSSc6IHRvQVNDSUksXG5cdFx0J3RvVW5pY29kZSc6IHRvVW5pY29kZVxuXHR9O1xuXG5cdC8qKiBFeHBvc2UgYHB1bnljb2RlYCAqL1xuXHQvLyBTb21lIEFNRCBidWlsZCBvcHRpbWl6ZXJzLCBsaWtlIHIuanMsIGNoZWNrIGZvciBzcGVjaWZpYyBjb25kaXRpb24gcGF0dGVybnNcblx0Ly8gbGlrZSB0aGUgZm9sbG93aW5nOlxuXHRpZiAoXG5cdFx0dHlwZW9mIGRlZmluZSA9PSAnZnVuY3Rpb24nICYmXG5cdFx0dHlwZW9mIGRlZmluZS5hbWQgPT0gJ29iamVjdCcgJiZcblx0XHRkZWZpbmUuYW1kXG5cdCkge1xuXHRcdGRlZmluZSgncHVueWNvZGUnLCBmdW5jdGlvbigpIHtcblx0XHRcdHJldHVybiBwdW55Y29kZTtcblx0XHR9KTtcblx0fSBlbHNlIGlmIChmcmVlRXhwb3J0cyAmJiBmcmVlTW9kdWxlKSB7XG5cdFx0aWYgKG1vZHVsZS5leHBvcnRzID09IGZyZWVFeHBvcnRzKSB7XG5cdFx0XHQvLyBpbiBOb2RlLmpzLCBpby5qcywgb3IgUmluZ29KUyB2MC44LjArXG5cdFx0XHRmcmVlTW9kdWxlLmV4cG9ydHMgPSBwdW55Y29kZTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0Ly8gaW4gTmFyd2hhbCBvciBSaW5nb0pTIHYwLjcuMC1cblx0XHRcdGZvciAoa2V5IGluIHB1bnljb2RlKSB7XG5cdFx0XHRcdHB1bnljb2RlLmhhc093blByb3BlcnR5KGtleSkgJiYgKGZyZWVFeHBvcnRzW2tleV0gPSBwdW55Y29kZVtrZXldKTtcblx0XHRcdH1cblx0XHR9XG5cdH0gZWxzZSB7XG5cdFx0Ly8gaW4gUmhpbm8gb3IgYSB3ZWIgYnJvd3NlclxuXHRcdHJvb3QucHVueWNvZGUgPSBwdW55Y29kZTtcblx0fVxuXG59KHRoaXMpKTtcbiIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG4ndXNlIHN0cmljdCc7XG5cbi8vIElmIG9iai5oYXNPd25Qcm9wZXJ0eSBoYXMgYmVlbiBvdmVycmlkZGVuLCB0aGVuIGNhbGxpbmdcbi8vIG9iai5oYXNPd25Qcm9wZXJ0eShwcm9wKSB3aWxsIGJyZWFrLlxuLy8gU2VlOiBodHRwczovL2dpdGh1Yi5jb20vam95ZW50L25vZGUvaXNzdWVzLzE3MDdcbmZ1bmN0aW9uIGhhc093blByb3BlcnR5KG9iaiwgcHJvcCkge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcHJvcCk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24ocXMsIHNlcCwgZXEsIG9wdGlvbnMpIHtcbiAgc2VwID0gc2VwIHx8ICcmJztcbiAgZXEgPSBlcSB8fCAnPSc7XG4gIHZhciBvYmogPSB7fTtcblxuICBpZiAodHlwZW9mIHFzICE9PSAnc3RyaW5nJyB8fCBxcy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gb2JqO1xuICB9XG5cbiAgdmFyIHJlZ2V4cCA9IC9cXCsvZztcbiAgcXMgPSBxcy5zcGxpdChzZXApO1xuXG4gIHZhciBtYXhLZXlzID0gMTAwMDtcbiAgaWYgKG9wdGlvbnMgJiYgdHlwZW9mIG9wdGlvbnMubWF4S2V5cyA9PT0gJ251bWJlcicpIHtcbiAgICBtYXhLZXlzID0gb3B0aW9ucy5tYXhLZXlzO1xuICB9XG5cbiAgdmFyIGxlbiA9IHFzLmxlbmd0aDtcbiAgLy8gbWF4S2V5cyA8PSAwIG1lYW5zIHRoYXQgd2Ugc2hvdWxkIG5vdCBsaW1pdCBrZXlzIGNvdW50XG4gIGlmIChtYXhLZXlzID4gMCAmJiBsZW4gPiBtYXhLZXlzKSB7XG4gICAgbGVuID0gbWF4S2V5cztcbiAgfVxuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuOyArK2kpIHtcbiAgICB2YXIgeCA9IHFzW2ldLnJlcGxhY2UocmVnZXhwLCAnJTIwJyksXG4gICAgICAgIGlkeCA9IHguaW5kZXhPZihlcSksXG4gICAgICAgIGtzdHIsIHZzdHIsIGssIHY7XG5cbiAgICBpZiAoaWR4ID49IDApIHtcbiAgICAgIGtzdHIgPSB4LnN1YnN0cigwLCBpZHgpO1xuICAgICAgdnN0ciA9IHguc3Vic3RyKGlkeCArIDEpO1xuICAgIH0gZWxzZSB7XG4gICAgICBrc3RyID0geDtcbiAgICAgIHZzdHIgPSAnJztcbiAgICB9XG5cbiAgICBrID0gZGVjb2RlVVJJQ29tcG9uZW50KGtzdHIpO1xuICAgIHYgPSBkZWNvZGVVUklDb21wb25lbnQodnN0cik7XG5cbiAgICBpZiAoIWhhc093blByb3BlcnR5KG9iaiwgaykpIHtcbiAgICAgIG9ialtrXSA9IHY7XG4gICAgfSBlbHNlIGlmIChpc0FycmF5KG9ialtrXSkpIHtcbiAgICAgIG9ialtrXS5wdXNoKHYpO1xuICAgIH0gZWxzZSB7XG4gICAgICBvYmpba10gPSBbb2JqW2tdLCB2XTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gb2JqO1xufTtcblxudmFyIGlzQXJyYXkgPSBBcnJheS5pc0FycmF5IHx8IGZ1bmN0aW9uICh4cykge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHhzKSA9PT0gJ1tvYmplY3QgQXJyYXldJztcbn07XG4iLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgc3RyaW5naWZ5UHJpbWl0aXZlID0gZnVuY3Rpb24odikge1xuICBzd2l0Y2ggKHR5cGVvZiB2KSB7XG4gICAgY2FzZSAnc3RyaW5nJzpcbiAgICAgIHJldHVybiB2O1xuXG4gICAgY2FzZSAnYm9vbGVhbic6XG4gICAgICByZXR1cm4gdiA/ICd0cnVlJyA6ICdmYWxzZSc7XG5cbiAgICBjYXNlICdudW1iZXInOlxuICAgICAgcmV0dXJuIGlzRmluaXRlKHYpID8gdiA6ICcnO1xuXG4gICAgZGVmYXVsdDpcbiAgICAgIHJldHVybiAnJztcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihvYmosIHNlcCwgZXEsIG5hbWUpIHtcbiAgc2VwID0gc2VwIHx8ICcmJztcbiAgZXEgPSBlcSB8fCAnPSc7XG4gIGlmIChvYmogPT09IG51bGwpIHtcbiAgICBvYmogPSB1bmRlZmluZWQ7XG4gIH1cblxuICBpZiAodHlwZW9mIG9iaiA9PT0gJ29iamVjdCcpIHtcbiAgICByZXR1cm4gbWFwKG9iamVjdEtleXMob2JqKSwgZnVuY3Rpb24oaykge1xuICAgICAgdmFyIGtzID0gZW5jb2RlVVJJQ29tcG9uZW50KHN0cmluZ2lmeVByaW1pdGl2ZShrKSkgKyBlcTtcbiAgICAgIGlmIChpc0FycmF5KG9ialtrXSkpIHtcbiAgICAgICAgcmV0dXJuIG1hcChvYmpba10sIGZ1bmN0aW9uKHYpIHtcbiAgICAgICAgICByZXR1cm4ga3MgKyBlbmNvZGVVUklDb21wb25lbnQoc3RyaW5naWZ5UHJpbWl0aXZlKHYpKTtcbiAgICAgICAgfSkuam9pbihzZXApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGtzICsgZW5jb2RlVVJJQ29tcG9uZW50KHN0cmluZ2lmeVByaW1pdGl2ZShvYmpba10pKTtcbiAgICAgIH1cbiAgICB9KS5qb2luKHNlcCk7XG5cbiAgfVxuXG4gIGlmICghbmFtZSkgcmV0dXJuICcnO1xuICByZXR1cm4gZW5jb2RlVVJJQ29tcG9uZW50KHN0cmluZ2lmeVByaW1pdGl2ZShuYW1lKSkgKyBlcSArXG4gICAgICAgICBlbmNvZGVVUklDb21wb25lbnQoc3RyaW5naWZ5UHJpbWl0aXZlKG9iaikpO1xufTtcblxudmFyIGlzQXJyYXkgPSBBcnJheS5pc0FycmF5IHx8IGZ1bmN0aW9uICh4cykge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHhzKSA9PT0gJ1tvYmplY3QgQXJyYXldJztcbn07XG5cbmZ1bmN0aW9uIG1hcCAoeHMsIGYpIHtcbiAgaWYgKHhzLm1hcCkgcmV0dXJuIHhzLm1hcChmKTtcbiAgdmFyIHJlcyA9IFtdO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IHhzLmxlbmd0aDsgaSsrKSB7XG4gICAgcmVzLnB1c2goZih4c1tpXSwgaSkpO1xuICB9XG4gIHJldHVybiByZXM7XG59XG5cbnZhciBvYmplY3RLZXlzID0gT2JqZWN0LmtleXMgfHwgZnVuY3Rpb24gKG9iaikge1xuICB2YXIgcmVzID0gW107XG4gIGZvciAodmFyIGtleSBpbiBvYmopIHtcbiAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwga2V5KSkgcmVzLnB1c2goa2V5KTtcbiAgfVxuICByZXR1cm4gcmVzO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuZXhwb3J0cy5kZWNvZGUgPSBleHBvcnRzLnBhcnNlID0gcmVxdWlyZSgnLi9kZWNvZGUnKTtcbmV4cG9ydHMuZW5jb2RlID0gZXhwb3J0cy5zdHJpbmdpZnkgPSByZXF1aXJlKCcuL2VuY29kZScpO1xuIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbid1c2Ugc3RyaWN0JztcblxudmFyIHB1bnljb2RlID0gcmVxdWlyZSgncHVueWNvZGUnKTtcbnZhciB1dGlsID0gcmVxdWlyZSgnLi91dGlsJyk7XG5cbmV4cG9ydHMucGFyc2UgPSB1cmxQYXJzZTtcbmV4cG9ydHMucmVzb2x2ZSA9IHVybFJlc29sdmU7XG5leHBvcnRzLnJlc29sdmVPYmplY3QgPSB1cmxSZXNvbHZlT2JqZWN0O1xuZXhwb3J0cy5mb3JtYXQgPSB1cmxGb3JtYXQ7XG5cbmV4cG9ydHMuVXJsID0gVXJsO1xuXG5mdW5jdGlvbiBVcmwoKSB7XG4gIHRoaXMucHJvdG9jb2wgPSBudWxsO1xuICB0aGlzLnNsYXNoZXMgPSBudWxsO1xuICB0aGlzLmF1dGggPSBudWxsO1xuICB0aGlzLmhvc3QgPSBudWxsO1xuICB0aGlzLnBvcnQgPSBudWxsO1xuICB0aGlzLmhvc3RuYW1lID0gbnVsbDtcbiAgdGhpcy5oYXNoID0gbnVsbDtcbiAgdGhpcy5zZWFyY2ggPSBudWxsO1xuICB0aGlzLnF1ZXJ5ID0gbnVsbDtcbiAgdGhpcy5wYXRobmFtZSA9IG51bGw7XG4gIHRoaXMucGF0aCA9IG51bGw7XG4gIHRoaXMuaHJlZiA9IG51bGw7XG59XG5cbi8vIFJlZmVyZW5jZTogUkZDIDM5ODYsIFJGQyAxODA4LCBSRkMgMjM5NlxuXG4vLyBkZWZpbmUgdGhlc2UgaGVyZSBzbyBhdCBsZWFzdCB0aGV5IG9ubHkgaGF2ZSB0byBiZVxuLy8gY29tcGlsZWQgb25jZSBvbiB0aGUgZmlyc3QgbW9kdWxlIGxvYWQuXG52YXIgcHJvdG9jb2xQYXR0ZXJuID0gL14oW2EtejAtOS4rLV0rOikvaSxcbiAgICBwb3J0UGF0dGVybiA9IC86WzAtOV0qJC8sXG5cbiAgICAvLyBTcGVjaWFsIGNhc2UgZm9yIGEgc2ltcGxlIHBhdGggVVJMXG4gICAgc2ltcGxlUGF0aFBhdHRlcm4gPSAvXihcXC9cXC8/KD8hXFwvKVteXFw/XFxzXSopKFxcP1teXFxzXSopPyQvLFxuXG4gICAgLy8gUkZDIDIzOTY6IGNoYXJhY3RlcnMgcmVzZXJ2ZWQgZm9yIGRlbGltaXRpbmcgVVJMcy5cbiAgICAvLyBXZSBhY3R1YWxseSBqdXN0IGF1dG8tZXNjYXBlIHRoZXNlLlxuICAgIGRlbGltcyA9IFsnPCcsICc+JywgJ1wiJywgJ2AnLCAnICcsICdcXHInLCAnXFxuJywgJ1xcdCddLFxuXG4gICAgLy8gUkZDIDIzOTY6IGNoYXJhY3RlcnMgbm90IGFsbG93ZWQgZm9yIHZhcmlvdXMgcmVhc29ucy5cbiAgICB1bndpc2UgPSBbJ3snLCAnfScsICd8JywgJ1xcXFwnLCAnXicsICdgJ10uY29uY2F0KGRlbGltcyksXG5cbiAgICAvLyBBbGxvd2VkIGJ5IFJGQ3MsIGJ1dCBjYXVzZSBvZiBYU1MgYXR0YWNrcy4gIEFsd2F5cyBlc2NhcGUgdGhlc2UuXG4gICAgYXV0b0VzY2FwZSA9IFsnXFwnJ10uY29uY2F0KHVud2lzZSksXG4gICAgLy8gQ2hhcmFjdGVycyB0aGF0IGFyZSBuZXZlciBldmVyIGFsbG93ZWQgaW4gYSBob3N0bmFtZS5cbiAgICAvLyBOb3RlIHRoYXQgYW55IGludmFsaWQgY2hhcnMgYXJlIGFsc28gaGFuZGxlZCwgYnV0IHRoZXNlXG4gICAgLy8gYXJlIHRoZSBvbmVzIHRoYXQgYXJlICpleHBlY3RlZCogdG8gYmUgc2Vlbiwgc28gd2UgZmFzdC1wYXRoXG4gICAgLy8gdGhlbS5cbiAgICBub25Ib3N0Q2hhcnMgPSBbJyUnLCAnLycsICc/JywgJzsnLCAnIyddLmNvbmNhdChhdXRvRXNjYXBlKSxcbiAgICBob3N0RW5kaW5nQ2hhcnMgPSBbJy8nLCAnPycsICcjJ10sXG4gICAgaG9zdG5hbWVNYXhMZW4gPSAyNTUsXG4gICAgaG9zdG5hbWVQYXJ0UGF0dGVybiA9IC9eWythLXowLTlBLVpfLV17MCw2M30kLyxcbiAgICBob3N0bmFtZVBhcnRTdGFydCA9IC9eKFsrYS16MC05QS1aXy1dezAsNjN9KSguKikkLyxcbiAgICAvLyBwcm90b2NvbHMgdGhhdCBjYW4gYWxsb3cgXCJ1bnNhZmVcIiBhbmQgXCJ1bndpc2VcIiBjaGFycy5cbiAgICB1bnNhZmVQcm90b2NvbCA9IHtcbiAgICAgICdqYXZhc2NyaXB0JzogdHJ1ZSxcbiAgICAgICdqYXZhc2NyaXB0Oic6IHRydWVcbiAgICB9LFxuICAgIC8vIHByb3RvY29scyB0aGF0IG5ldmVyIGhhdmUgYSBob3N0bmFtZS5cbiAgICBob3N0bGVzc1Byb3RvY29sID0ge1xuICAgICAgJ2phdmFzY3JpcHQnOiB0cnVlLFxuICAgICAgJ2phdmFzY3JpcHQ6JzogdHJ1ZVxuICAgIH0sXG4gICAgLy8gcHJvdG9jb2xzIHRoYXQgYWx3YXlzIGNvbnRhaW4gYSAvLyBiaXQuXG4gICAgc2xhc2hlZFByb3RvY29sID0ge1xuICAgICAgJ2h0dHAnOiB0cnVlLFxuICAgICAgJ2h0dHBzJzogdHJ1ZSxcbiAgICAgICdmdHAnOiB0cnVlLFxuICAgICAgJ2dvcGhlcic6IHRydWUsXG4gICAgICAnZmlsZSc6IHRydWUsXG4gICAgICAnaHR0cDonOiB0cnVlLFxuICAgICAgJ2h0dHBzOic6IHRydWUsXG4gICAgICAnZnRwOic6IHRydWUsXG4gICAgICAnZ29waGVyOic6IHRydWUsXG4gICAgICAnZmlsZTonOiB0cnVlXG4gICAgfSxcbiAgICBxdWVyeXN0cmluZyA9IHJlcXVpcmUoJ3F1ZXJ5c3RyaW5nJyk7XG5cbmZ1bmN0aW9uIHVybFBhcnNlKHVybCwgcGFyc2VRdWVyeVN0cmluZywgc2xhc2hlc0Rlbm90ZUhvc3QpIHtcbiAgaWYgKHVybCAmJiB1dGlsLmlzT2JqZWN0KHVybCkgJiYgdXJsIGluc3RhbmNlb2YgVXJsKSByZXR1cm4gdXJsO1xuXG4gIHZhciB1ID0gbmV3IFVybDtcbiAgdS5wYXJzZSh1cmwsIHBhcnNlUXVlcnlTdHJpbmcsIHNsYXNoZXNEZW5vdGVIb3N0KTtcbiAgcmV0dXJuIHU7XG59XG5cblVybC5wcm90b3R5cGUucGFyc2UgPSBmdW5jdGlvbih1cmwsIHBhcnNlUXVlcnlTdHJpbmcsIHNsYXNoZXNEZW5vdGVIb3N0KSB7XG4gIGlmICghdXRpbC5pc1N0cmluZyh1cmwpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlBhcmFtZXRlciAndXJsJyBtdXN0IGJlIGEgc3RyaW5nLCBub3QgXCIgKyB0eXBlb2YgdXJsKTtcbiAgfVxuXG4gIC8vIENvcHkgY2hyb21lLCBJRSwgb3BlcmEgYmFja3NsYXNoLWhhbmRsaW5nIGJlaGF2aW9yLlxuICAvLyBCYWNrIHNsYXNoZXMgYmVmb3JlIHRoZSBxdWVyeSBzdHJpbmcgZ2V0IGNvbnZlcnRlZCB0byBmb3J3YXJkIHNsYXNoZXNcbiAgLy8gU2VlOiBodHRwczovL2NvZGUuZ29vZ2xlLmNvbS9wL2Nocm9taXVtL2lzc3Vlcy9kZXRhaWw/aWQ9MjU5MTZcbiAgdmFyIHF1ZXJ5SW5kZXggPSB1cmwuaW5kZXhPZignPycpLFxuICAgICAgc3BsaXR0ZXIgPVxuICAgICAgICAgIChxdWVyeUluZGV4ICE9PSAtMSAmJiBxdWVyeUluZGV4IDwgdXJsLmluZGV4T2YoJyMnKSkgPyAnPycgOiAnIycsXG4gICAgICB1U3BsaXQgPSB1cmwuc3BsaXQoc3BsaXR0ZXIpLFxuICAgICAgc2xhc2hSZWdleCA9IC9cXFxcL2c7XG4gIHVTcGxpdFswXSA9IHVTcGxpdFswXS5yZXBsYWNlKHNsYXNoUmVnZXgsICcvJyk7XG4gIHVybCA9IHVTcGxpdC5qb2luKHNwbGl0dGVyKTtcblxuICB2YXIgcmVzdCA9IHVybDtcblxuICAvLyB0cmltIGJlZm9yZSBwcm9jZWVkaW5nLlxuICAvLyBUaGlzIGlzIHRvIHN1cHBvcnQgcGFyc2Ugc3R1ZmYgbGlrZSBcIiAgaHR0cDovL2Zvby5jb20gIFxcblwiXG4gIHJlc3QgPSByZXN0LnRyaW0oKTtcblxuICBpZiAoIXNsYXNoZXNEZW5vdGVIb3N0ICYmIHVybC5zcGxpdCgnIycpLmxlbmd0aCA9PT0gMSkge1xuICAgIC8vIFRyeSBmYXN0IHBhdGggcmVnZXhwXG4gICAgdmFyIHNpbXBsZVBhdGggPSBzaW1wbGVQYXRoUGF0dGVybi5leGVjKHJlc3QpO1xuICAgIGlmIChzaW1wbGVQYXRoKSB7XG4gICAgICB0aGlzLnBhdGggPSByZXN0O1xuICAgICAgdGhpcy5ocmVmID0gcmVzdDtcbiAgICAgIHRoaXMucGF0aG5hbWUgPSBzaW1wbGVQYXRoWzFdO1xuICAgICAgaWYgKHNpbXBsZVBhdGhbMl0pIHtcbiAgICAgICAgdGhpcy5zZWFyY2ggPSBzaW1wbGVQYXRoWzJdO1xuICAgICAgICBpZiAocGFyc2VRdWVyeVN0cmluZykge1xuICAgICAgICAgIHRoaXMucXVlcnkgPSBxdWVyeXN0cmluZy5wYXJzZSh0aGlzLnNlYXJjaC5zdWJzdHIoMSkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMucXVlcnkgPSB0aGlzLnNlYXJjaC5zdWJzdHIoMSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAocGFyc2VRdWVyeVN0cmluZykge1xuICAgICAgICB0aGlzLnNlYXJjaCA9ICcnO1xuICAgICAgICB0aGlzLnF1ZXJ5ID0ge307XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG4gIH1cblxuICB2YXIgcHJvdG8gPSBwcm90b2NvbFBhdHRlcm4uZXhlYyhyZXN0KTtcbiAgaWYgKHByb3RvKSB7XG4gICAgcHJvdG8gPSBwcm90b1swXTtcbiAgICB2YXIgbG93ZXJQcm90byA9IHByb3RvLnRvTG93ZXJDYXNlKCk7XG4gICAgdGhpcy5wcm90b2NvbCA9IGxvd2VyUHJvdG87XG4gICAgcmVzdCA9IHJlc3Quc3Vic3RyKHByb3RvLmxlbmd0aCk7XG4gIH1cblxuICAvLyBmaWd1cmUgb3V0IGlmIGl0J3MgZ290IGEgaG9zdFxuICAvLyB1c2VyQHNlcnZlciBpcyAqYWx3YXlzKiBpbnRlcnByZXRlZCBhcyBhIGhvc3RuYW1lLCBhbmQgdXJsXG4gIC8vIHJlc29sdXRpb24gd2lsbCB0cmVhdCAvL2Zvby9iYXIgYXMgaG9zdD1mb28scGF0aD1iYXIgYmVjYXVzZSB0aGF0J3NcbiAgLy8gaG93IHRoZSBicm93c2VyIHJlc29sdmVzIHJlbGF0aXZlIFVSTHMuXG4gIGlmIChzbGFzaGVzRGVub3RlSG9zdCB8fCBwcm90byB8fCByZXN0Lm1hdGNoKC9eXFwvXFwvW15AXFwvXStAW15AXFwvXSsvKSkge1xuICAgIHZhciBzbGFzaGVzID0gcmVzdC5zdWJzdHIoMCwgMikgPT09ICcvLyc7XG4gICAgaWYgKHNsYXNoZXMgJiYgIShwcm90byAmJiBob3N0bGVzc1Byb3RvY29sW3Byb3RvXSkpIHtcbiAgICAgIHJlc3QgPSByZXN0LnN1YnN0cigyKTtcbiAgICAgIHRoaXMuc2xhc2hlcyA9IHRydWU7XG4gICAgfVxuICB9XG5cbiAgaWYgKCFob3N0bGVzc1Byb3RvY29sW3Byb3RvXSAmJlxuICAgICAgKHNsYXNoZXMgfHwgKHByb3RvICYmICFzbGFzaGVkUHJvdG9jb2xbcHJvdG9dKSkpIHtcblxuICAgIC8vIHRoZXJlJ3MgYSBob3N0bmFtZS5cbiAgICAvLyB0aGUgZmlyc3QgaW5zdGFuY2Ugb2YgLywgPywgOywgb3IgIyBlbmRzIHRoZSBob3N0LlxuICAgIC8vXG4gICAgLy8gSWYgdGhlcmUgaXMgYW4gQCBpbiB0aGUgaG9zdG5hbWUsIHRoZW4gbm9uLWhvc3QgY2hhcnMgKmFyZSogYWxsb3dlZFxuICAgIC8vIHRvIHRoZSBsZWZ0IG9mIHRoZSBsYXN0IEAgc2lnbiwgdW5sZXNzIHNvbWUgaG9zdC1lbmRpbmcgY2hhcmFjdGVyXG4gICAgLy8gY29tZXMgKmJlZm9yZSogdGhlIEAtc2lnbi5cbiAgICAvLyBVUkxzIGFyZSBvYm5veGlvdXMuXG4gICAgLy9cbiAgICAvLyBleDpcbiAgICAvLyBodHRwOi8vYUBiQGMvID0+IHVzZXI6YUBiIGhvc3Q6Y1xuICAgIC8vIGh0dHA6Ly9hQGI/QGMgPT4gdXNlcjphIGhvc3Q6YyBwYXRoOi8/QGNcblxuICAgIC8vIHYwLjEyIFRPRE8oaXNhYWNzKTogVGhpcyBpcyBub3QgcXVpdGUgaG93IENocm9tZSBkb2VzIHRoaW5ncy5cbiAgICAvLyBSZXZpZXcgb3VyIHRlc3QgY2FzZSBhZ2FpbnN0IGJyb3dzZXJzIG1vcmUgY29tcHJlaGVuc2l2ZWx5LlxuXG4gICAgLy8gZmluZCB0aGUgZmlyc3QgaW5zdGFuY2Ugb2YgYW55IGhvc3RFbmRpbmdDaGFyc1xuICAgIHZhciBob3N0RW5kID0gLTE7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBob3N0RW5kaW5nQ2hhcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBoZWMgPSByZXN0LmluZGV4T2YoaG9zdEVuZGluZ0NoYXJzW2ldKTtcbiAgICAgIGlmIChoZWMgIT09IC0xICYmIChob3N0RW5kID09PSAtMSB8fCBoZWMgPCBob3N0RW5kKSlcbiAgICAgICAgaG9zdEVuZCA9IGhlYztcbiAgICB9XG5cbiAgICAvLyBhdCB0aGlzIHBvaW50LCBlaXRoZXIgd2UgaGF2ZSBhbiBleHBsaWNpdCBwb2ludCB3aGVyZSB0aGVcbiAgICAvLyBhdXRoIHBvcnRpb24gY2Fubm90IGdvIHBhc3QsIG9yIHRoZSBsYXN0IEAgY2hhciBpcyB0aGUgZGVjaWRlci5cbiAgICB2YXIgYXV0aCwgYXRTaWduO1xuICAgIGlmIChob3N0RW5kID09PSAtMSkge1xuICAgICAgLy8gYXRTaWduIGNhbiBiZSBhbnl3aGVyZS5cbiAgICAgIGF0U2lnbiA9IHJlc3QubGFzdEluZGV4T2YoJ0AnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gYXRTaWduIG11c3QgYmUgaW4gYXV0aCBwb3J0aW9uLlxuICAgICAgLy8gaHR0cDovL2FAYi9jQGQgPT4gaG9zdDpiIGF1dGg6YSBwYXRoOi9jQGRcbiAgICAgIGF0U2lnbiA9IHJlc3QubGFzdEluZGV4T2YoJ0AnLCBob3N0RW5kKTtcbiAgICB9XG5cbiAgICAvLyBOb3cgd2UgaGF2ZSBhIHBvcnRpb24gd2hpY2ggaXMgZGVmaW5pdGVseSB0aGUgYXV0aC5cbiAgICAvLyBQdWxsIHRoYXQgb2ZmLlxuICAgIGlmIChhdFNpZ24gIT09IC0xKSB7XG4gICAgICBhdXRoID0gcmVzdC5zbGljZSgwLCBhdFNpZ24pO1xuICAgICAgcmVzdCA9IHJlc3Quc2xpY2UoYXRTaWduICsgMSk7XG4gICAgICB0aGlzLmF1dGggPSBkZWNvZGVVUklDb21wb25lbnQoYXV0aCk7XG4gICAgfVxuXG4gICAgLy8gdGhlIGhvc3QgaXMgdGhlIHJlbWFpbmluZyB0byB0aGUgbGVmdCBvZiB0aGUgZmlyc3Qgbm9uLWhvc3QgY2hhclxuICAgIGhvc3RFbmQgPSAtMTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5vbkhvc3RDaGFycy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGhlYyA9IHJlc3QuaW5kZXhPZihub25Ib3N0Q2hhcnNbaV0pO1xuICAgICAgaWYgKGhlYyAhPT0gLTEgJiYgKGhvc3RFbmQgPT09IC0xIHx8IGhlYyA8IGhvc3RFbmQpKVxuICAgICAgICBob3N0RW5kID0gaGVjO1xuICAgIH1cbiAgICAvLyBpZiB3ZSBzdGlsbCBoYXZlIG5vdCBoaXQgaXQsIHRoZW4gdGhlIGVudGlyZSB0aGluZyBpcyBhIGhvc3QuXG4gICAgaWYgKGhvc3RFbmQgPT09IC0xKVxuICAgICAgaG9zdEVuZCA9IHJlc3QubGVuZ3RoO1xuXG4gICAgdGhpcy5ob3N0ID0gcmVzdC5zbGljZSgwLCBob3N0RW5kKTtcbiAgICByZXN0ID0gcmVzdC5zbGljZShob3N0RW5kKTtcblxuICAgIC8vIHB1bGwgb3V0IHBvcnQuXG4gICAgdGhpcy5wYXJzZUhvc3QoKTtcblxuICAgIC8vIHdlJ3ZlIGluZGljYXRlZCB0aGF0IHRoZXJlIGlzIGEgaG9zdG5hbWUsXG4gICAgLy8gc28gZXZlbiBpZiBpdCdzIGVtcHR5LCBpdCBoYXMgdG8gYmUgcHJlc2VudC5cbiAgICB0aGlzLmhvc3RuYW1lID0gdGhpcy5ob3N0bmFtZSB8fCAnJztcblxuICAgIC8vIGlmIGhvc3RuYW1lIGJlZ2lucyB3aXRoIFsgYW5kIGVuZHMgd2l0aCBdXG4gICAgLy8gYXNzdW1lIHRoYXQgaXQncyBhbiBJUHY2IGFkZHJlc3MuXG4gICAgdmFyIGlwdjZIb3N0bmFtZSA9IHRoaXMuaG9zdG5hbWVbMF0gPT09ICdbJyAmJlxuICAgICAgICB0aGlzLmhvc3RuYW1lW3RoaXMuaG9zdG5hbWUubGVuZ3RoIC0gMV0gPT09ICddJztcblxuICAgIC8vIHZhbGlkYXRlIGEgbGl0dGxlLlxuICAgIGlmICghaXB2Nkhvc3RuYW1lKSB7XG4gICAgICB2YXIgaG9zdHBhcnRzID0gdGhpcy5ob3N0bmFtZS5zcGxpdCgvXFwuLyk7XG4gICAgICBmb3IgKHZhciBpID0gMCwgbCA9IGhvc3RwYXJ0cy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgICAgdmFyIHBhcnQgPSBob3N0cGFydHNbaV07XG4gICAgICAgIGlmICghcGFydCkgY29udGludWU7XG4gICAgICAgIGlmICghcGFydC5tYXRjaChob3N0bmFtZVBhcnRQYXR0ZXJuKSkge1xuICAgICAgICAgIHZhciBuZXdwYXJ0ID0gJyc7XG4gICAgICAgICAgZm9yICh2YXIgaiA9IDAsIGsgPSBwYXJ0Lmxlbmd0aDsgaiA8IGs7IGorKykge1xuICAgICAgICAgICAgaWYgKHBhcnQuY2hhckNvZGVBdChqKSA+IDEyNykge1xuICAgICAgICAgICAgICAvLyB3ZSByZXBsYWNlIG5vbi1BU0NJSSBjaGFyIHdpdGggYSB0ZW1wb3JhcnkgcGxhY2Vob2xkZXJcbiAgICAgICAgICAgICAgLy8gd2UgbmVlZCB0aGlzIHRvIG1ha2Ugc3VyZSBzaXplIG9mIGhvc3RuYW1lIGlzIG5vdFxuICAgICAgICAgICAgICAvLyBicm9rZW4gYnkgcmVwbGFjaW5nIG5vbi1BU0NJSSBieSBub3RoaW5nXG4gICAgICAgICAgICAgIG5ld3BhcnQgKz0gJ3gnO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgbmV3cGFydCArPSBwYXJ0W2pdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICAvLyB3ZSB0ZXN0IGFnYWluIHdpdGggQVNDSUkgY2hhciBvbmx5XG4gICAgICAgICAgaWYgKCFuZXdwYXJ0Lm1hdGNoKGhvc3RuYW1lUGFydFBhdHRlcm4pKSB7XG4gICAgICAgICAgICB2YXIgdmFsaWRQYXJ0cyA9IGhvc3RwYXJ0cy5zbGljZSgwLCBpKTtcbiAgICAgICAgICAgIHZhciBub3RIb3N0ID0gaG9zdHBhcnRzLnNsaWNlKGkgKyAxKTtcbiAgICAgICAgICAgIHZhciBiaXQgPSBwYXJ0Lm1hdGNoKGhvc3RuYW1lUGFydFN0YXJ0KTtcbiAgICAgICAgICAgIGlmIChiaXQpIHtcbiAgICAgICAgICAgICAgdmFsaWRQYXJ0cy5wdXNoKGJpdFsxXSk7XG4gICAgICAgICAgICAgIG5vdEhvc3QudW5zaGlmdChiaXRbMl0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG5vdEhvc3QubGVuZ3RoKSB7XG4gICAgICAgICAgICAgIHJlc3QgPSAnLycgKyBub3RIb3N0LmpvaW4oJy4nKSArIHJlc3Q7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLmhvc3RuYW1lID0gdmFsaWRQYXJ0cy5qb2luKCcuJyk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAodGhpcy5ob3N0bmFtZS5sZW5ndGggPiBob3N0bmFtZU1heExlbikge1xuICAgICAgdGhpcy5ob3N0bmFtZSA9ICcnO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBob3N0bmFtZXMgYXJlIGFsd2F5cyBsb3dlciBjYXNlLlxuICAgICAgdGhpcy5ob3N0bmFtZSA9IHRoaXMuaG9zdG5hbWUudG9Mb3dlckNhc2UoKTtcbiAgICB9XG5cbiAgICBpZiAoIWlwdjZIb3N0bmFtZSkge1xuICAgICAgLy8gSUROQSBTdXBwb3J0OiBSZXR1cm5zIGEgcHVueWNvZGVkIHJlcHJlc2VudGF0aW9uIG9mIFwiZG9tYWluXCIuXG4gICAgICAvLyBJdCBvbmx5IGNvbnZlcnRzIHBhcnRzIG9mIHRoZSBkb21haW4gbmFtZSB0aGF0XG4gICAgICAvLyBoYXZlIG5vbi1BU0NJSSBjaGFyYWN0ZXJzLCBpLmUuIGl0IGRvZXNuJ3QgbWF0dGVyIGlmXG4gICAgICAvLyB5b3UgY2FsbCBpdCB3aXRoIGEgZG9tYWluIHRoYXQgYWxyZWFkeSBpcyBBU0NJSS1vbmx5LlxuICAgICAgdGhpcy5ob3N0bmFtZSA9IHB1bnljb2RlLnRvQVNDSUkodGhpcy5ob3N0bmFtZSk7XG4gICAgfVxuXG4gICAgdmFyIHAgPSB0aGlzLnBvcnQgPyAnOicgKyB0aGlzLnBvcnQgOiAnJztcbiAgICB2YXIgaCA9IHRoaXMuaG9zdG5hbWUgfHwgJyc7XG4gICAgdGhpcy5ob3N0ID0gaCArIHA7XG4gICAgdGhpcy5ocmVmICs9IHRoaXMuaG9zdDtcblxuICAgIC8vIHN0cmlwIFsgYW5kIF0gZnJvbSB0aGUgaG9zdG5hbWVcbiAgICAvLyB0aGUgaG9zdCBmaWVsZCBzdGlsbCByZXRhaW5zIHRoZW0sIHRob3VnaFxuICAgIGlmIChpcHY2SG9zdG5hbWUpIHtcbiAgICAgIHRoaXMuaG9zdG5hbWUgPSB0aGlzLmhvc3RuYW1lLnN1YnN0cigxLCB0aGlzLmhvc3RuYW1lLmxlbmd0aCAtIDIpO1xuICAgICAgaWYgKHJlc3RbMF0gIT09ICcvJykge1xuICAgICAgICByZXN0ID0gJy8nICsgcmVzdDtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBub3cgcmVzdCBpcyBzZXQgdG8gdGhlIHBvc3QtaG9zdCBzdHVmZi5cbiAgLy8gY2hvcCBvZmYgYW55IGRlbGltIGNoYXJzLlxuICBpZiAoIXVuc2FmZVByb3RvY29sW2xvd2VyUHJvdG9dKSB7XG5cbiAgICAvLyBGaXJzdCwgbWFrZSAxMDAlIHN1cmUgdGhhdCBhbnkgXCJhdXRvRXNjYXBlXCIgY2hhcnMgZ2V0XG4gICAgLy8gZXNjYXBlZCwgZXZlbiBpZiBlbmNvZGVVUklDb21wb25lbnQgZG9lc24ndCB0aGluayB0aGV5XG4gICAgLy8gbmVlZCB0byBiZS5cbiAgICBmb3IgKHZhciBpID0gMCwgbCA9IGF1dG9Fc2NhcGUubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgICB2YXIgYWUgPSBhdXRvRXNjYXBlW2ldO1xuICAgICAgaWYgKHJlc3QuaW5kZXhPZihhZSkgPT09IC0xKVxuICAgICAgICBjb250aW51ZTtcbiAgICAgIHZhciBlc2MgPSBlbmNvZGVVUklDb21wb25lbnQoYWUpO1xuICAgICAgaWYgKGVzYyA9PT0gYWUpIHtcbiAgICAgICAgZXNjID0gZXNjYXBlKGFlKTtcbiAgICAgIH1cbiAgICAgIHJlc3QgPSByZXN0LnNwbGl0KGFlKS5qb2luKGVzYyk7XG4gICAgfVxuICB9XG5cblxuICAvLyBjaG9wIG9mZiBmcm9tIHRoZSB0YWlsIGZpcnN0LlxuICB2YXIgaGFzaCA9IHJlc3QuaW5kZXhPZignIycpO1xuICBpZiAoaGFzaCAhPT0gLTEpIHtcbiAgICAvLyBnb3QgYSBmcmFnbWVudCBzdHJpbmcuXG4gICAgdGhpcy5oYXNoID0gcmVzdC5zdWJzdHIoaGFzaCk7XG4gICAgcmVzdCA9IHJlc3Quc2xpY2UoMCwgaGFzaCk7XG4gIH1cbiAgdmFyIHFtID0gcmVzdC5pbmRleE9mKCc/Jyk7XG4gIGlmIChxbSAhPT0gLTEpIHtcbiAgICB0aGlzLnNlYXJjaCA9IHJlc3Quc3Vic3RyKHFtKTtcbiAgICB0aGlzLnF1ZXJ5ID0gcmVzdC5zdWJzdHIocW0gKyAxKTtcbiAgICBpZiAocGFyc2VRdWVyeVN0cmluZykge1xuICAgICAgdGhpcy5xdWVyeSA9IHF1ZXJ5c3RyaW5nLnBhcnNlKHRoaXMucXVlcnkpO1xuICAgIH1cbiAgICByZXN0ID0gcmVzdC5zbGljZSgwLCBxbSk7XG4gIH0gZWxzZSBpZiAocGFyc2VRdWVyeVN0cmluZykge1xuICAgIC8vIG5vIHF1ZXJ5IHN0cmluZywgYnV0IHBhcnNlUXVlcnlTdHJpbmcgc3RpbGwgcmVxdWVzdGVkXG4gICAgdGhpcy5zZWFyY2ggPSAnJztcbiAgICB0aGlzLnF1ZXJ5ID0ge307XG4gIH1cbiAgaWYgKHJlc3QpIHRoaXMucGF0aG5hbWUgPSByZXN0O1xuICBpZiAoc2xhc2hlZFByb3RvY29sW2xvd2VyUHJvdG9dICYmXG4gICAgICB0aGlzLmhvc3RuYW1lICYmICF0aGlzLnBhdGhuYW1lKSB7XG4gICAgdGhpcy5wYXRobmFtZSA9ICcvJztcbiAgfVxuXG4gIC8vdG8gc3VwcG9ydCBodHRwLnJlcXVlc3RcbiAgaWYgKHRoaXMucGF0aG5hbWUgfHwgdGhpcy5zZWFyY2gpIHtcbiAgICB2YXIgcCA9IHRoaXMucGF0aG5hbWUgfHwgJyc7XG4gICAgdmFyIHMgPSB0aGlzLnNlYXJjaCB8fCAnJztcbiAgICB0aGlzLnBhdGggPSBwICsgcztcbiAgfVxuXG4gIC8vIGZpbmFsbHksIHJlY29uc3RydWN0IHRoZSBocmVmIGJhc2VkIG9uIHdoYXQgaGFzIGJlZW4gdmFsaWRhdGVkLlxuICB0aGlzLmhyZWYgPSB0aGlzLmZvcm1hdCgpO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8vIGZvcm1hdCBhIHBhcnNlZCBvYmplY3QgaW50byBhIHVybCBzdHJpbmdcbmZ1bmN0aW9uIHVybEZvcm1hdChvYmopIHtcbiAgLy8gZW5zdXJlIGl0J3MgYW4gb2JqZWN0LCBhbmQgbm90IGEgc3RyaW5nIHVybC5cbiAgLy8gSWYgaXQncyBhbiBvYmosIHRoaXMgaXMgYSBuby1vcC5cbiAgLy8gdGhpcyB3YXksIHlvdSBjYW4gY2FsbCB1cmxfZm9ybWF0KCkgb24gc3RyaW5nc1xuICAvLyB0byBjbGVhbiB1cCBwb3RlbnRpYWxseSB3b25reSB1cmxzLlxuICBpZiAodXRpbC5pc1N0cmluZyhvYmopKSBvYmogPSB1cmxQYXJzZShvYmopO1xuICBpZiAoIShvYmogaW5zdGFuY2VvZiBVcmwpKSByZXR1cm4gVXJsLnByb3RvdHlwZS5mb3JtYXQuY2FsbChvYmopO1xuICByZXR1cm4gb2JqLmZvcm1hdCgpO1xufVxuXG5VcmwucHJvdG90eXBlLmZvcm1hdCA9IGZ1bmN0aW9uKCkge1xuICB2YXIgYXV0aCA9IHRoaXMuYXV0aCB8fCAnJztcbiAgaWYgKGF1dGgpIHtcbiAgICBhdXRoID0gZW5jb2RlVVJJQ29tcG9uZW50KGF1dGgpO1xuICAgIGF1dGggPSBhdXRoLnJlcGxhY2UoLyUzQS9pLCAnOicpO1xuICAgIGF1dGggKz0gJ0AnO1xuICB9XG5cbiAgdmFyIHByb3RvY29sID0gdGhpcy5wcm90b2NvbCB8fCAnJyxcbiAgICAgIHBhdGhuYW1lID0gdGhpcy5wYXRobmFtZSB8fCAnJyxcbiAgICAgIGhhc2ggPSB0aGlzLmhhc2ggfHwgJycsXG4gICAgICBob3N0ID0gZmFsc2UsXG4gICAgICBxdWVyeSA9ICcnO1xuXG4gIGlmICh0aGlzLmhvc3QpIHtcbiAgICBob3N0ID0gYXV0aCArIHRoaXMuaG9zdDtcbiAgfSBlbHNlIGlmICh0aGlzLmhvc3RuYW1lKSB7XG4gICAgaG9zdCA9IGF1dGggKyAodGhpcy5ob3N0bmFtZS5pbmRleE9mKCc6JykgPT09IC0xID9cbiAgICAgICAgdGhpcy5ob3N0bmFtZSA6XG4gICAgICAgICdbJyArIHRoaXMuaG9zdG5hbWUgKyAnXScpO1xuICAgIGlmICh0aGlzLnBvcnQpIHtcbiAgICAgIGhvc3QgKz0gJzonICsgdGhpcy5wb3J0O1xuICAgIH1cbiAgfVxuXG4gIGlmICh0aGlzLnF1ZXJ5ICYmXG4gICAgICB1dGlsLmlzT2JqZWN0KHRoaXMucXVlcnkpICYmXG4gICAgICBPYmplY3Qua2V5cyh0aGlzLnF1ZXJ5KS5sZW5ndGgpIHtcbiAgICBxdWVyeSA9IHF1ZXJ5c3RyaW5nLnN0cmluZ2lmeSh0aGlzLnF1ZXJ5KTtcbiAgfVxuXG4gIHZhciBzZWFyY2ggPSB0aGlzLnNlYXJjaCB8fCAocXVlcnkgJiYgKCc/JyArIHF1ZXJ5KSkgfHwgJyc7XG5cbiAgaWYgKHByb3RvY29sICYmIHByb3RvY29sLnN1YnN0cigtMSkgIT09ICc6JykgcHJvdG9jb2wgKz0gJzonO1xuXG4gIC8vIG9ubHkgdGhlIHNsYXNoZWRQcm90b2NvbHMgZ2V0IHRoZSAvLy4gIE5vdCBtYWlsdG86LCB4bXBwOiwgZXRjLlxuICAvLyB1bmxlc3MgdGhleSBoYWQgdGhlbSB0byBiZWdpbiB3aXRoLlxuICBpZiAodGhpcy5zbGFzaGVzIHx8XG4gICAgICAoIXByb3RvY29sIHx8IHNsYXNoZWRQcm90b2NvbFtwcm90b2NvbF0pICYmIGhvc3QgIT09IGZhbHNlKSB7XG4gICAgaG9zdCA9ICcvLycgKyAoaG9zdCB8fCAnJyk7XG4gICAgaWYgKHBhdGhuYW1lICYmIHBhdGhuYW1lLmNoYXJBdCgwKSAhPT0gJy8nKSBwYXRobmFtZSA9ICcvJyArIHBhdGhuYW1lO1xuICB9IGVsc2UgaWYgKCFob3N0KSB7XG4gICAgaG9zdCA9ICcnO1xuICB9XG5cbiAgaWYgKGhhc2ggJiYgaGFzaC5jaGFyQXQoMCkgIT09ICcjJykgaGFzaCA9ICcjJyArIGhhc2g7XG4gIGlmIChzZWFyY2ggJiYgc2VhcmNoLmNoYXJBdCgwKSAhPT0gJz8nKSBzZWFyY2ggPSAnPycgKyBzZWFyY2g7XG5cbiAgcGF0aG5hbWUgPSBwYXRobmFtZS5yZXBsYWNlKC9bPyNdL2csIGZ1bmN0aW9uKG1hdGNoKSB7XG4gICAgcmV0dXJuIGVuY29kZVVSSUNvbXBvbmVudChtYXRjaCk7XG4gIH0pO1xuICBzZWFyY2ggPSBzZWFyY2gucmVwbGFjZSgnIycsICclMjMnKTtcblxuICByZXR1cm4gcHJvdG9jb2wgKyBob3N0ICsgcGF0aG5hbWUgKyBzZWFyY2ggKyBoYXNoO1xufTtcblxuZnVuY3Rpb24gdXJsUmVzb2x2ZShzb3VyY2UsIHJlbGF0aXZlKSB7XG4gIHJldHVybiB1cmxQYXJzZShzb3VyY2UsIGZhbHNlLCB0cnVlKS5yZXNvbHZlKHJlbGF0aXZlKTtcbn1cblxuVXJsLnByb3RvdHlwZS5yZXNvbHZlID0gZnVuY3Rpb24ocmVsYXRpdmUpIHtcbiAgcmV0dXJuIHRoaXMucmVzb2x2ZU9iamVjdCh1cmxQYXJzZShyZWxhdGl2ZSwgZmFsc2UsIHRydWUpKS5mb3JtYXQoKTtcbn07XG5cbmZ1bmN0aW9uIHVybFJlc29sdmVPYmplY3Qoc291cmNlLCByZWxhdGl2ZSkge1xuICBpZiAoIXNvdXJjZSkgcmV0dXJuIHJlbGF0aXZlO1xuICByZXR1cm4gdXJsUGFyc2Uoc291cmNlLCBmYWxzZSwgdHJ1ZSkucmVzb2x2ZU9iamVjdChyZWxhdGl2ZSk7XG59XG5cblVybC5wcm90b3R5cGUucmVzb2x2ZU9iamVjdCA9IGZ1bmN0aW9uKHJlbGF0aXZlKSB7XG4gIGlmICh1dGlsLmlzU3RyaW5nKHJlbGF0aXZlKSkge1xuICAgIHZhciByZWwgPSBuZXcgVXJsKCk7XG4gICAgcmVsLnBhcnNlKHJlbGF0aXZlLCBmYWxzZSwgdHJ1ZSk7XG4gICAgcmVsYXRpdmUgPSByZWw7XG4gIH1cblxuICB2YXIgcmVzdWx0ID0gbmV3IFVybCgpO1xuICB2YXIgdGtleXMgPSBPYmplY3Qua2V5cyh0aGlzKTtcbiAgZm9yICh2YXIgdGsgPSAwOyB0ayA8IHRrZXlzLmxlbmd0aDsgdGsrKykge1xuICAgIHZhciB0a2V5ID0gdGtleXNbdGtdO1xuICAgIHJlc3VsdFt0a2V5XSA9IHRoaXNbdGtleV07XG4gIH1cblxuICAvLyBoYXNoIGlzIGFsd2F5cyBvdmVycmlkZGVuLCBubyBtYXR0ZXIgd2hhdC5cbiAgLy8gZXZlbiBocmVmPVwiXCIgd2lsbCByZW1vdmUgaXQuXG4gIHJlc3VsdC5oYXNoID0gcmVsYXRpdmUuaGFzaDtcblxuICAvLyBpZiB0aGUgcmVsYXRpdmUgdXJsIGlzIGVtcHR5LCB0aGVuIHRoZXJlJ3Mgbm90aGluZyBsZWZ0IHRvIGRvIGhlcmUuXG4gIGlmIChyZWxhdGl2ZS5ocmVmID09PSAnJykge1xuICAgIHJlc3VsdC5ocmVmID0gcmVzdWx0LmZvcm1hdCgpO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvLyBocmVmcyBsaWtlIC8vZm9vL2JhciBhbHdheXMgY3V0IHRvIHRoZSBwcm90b2NvbC5cbiAgaWYgKHJlbGF0aXZlLnNsYXNoZXMgJiYgIXJlbGF0aXZlLnByb3RvY29sKSB7XG4gICAgLy8gdGFrZSBldmVyeXRoaW5nIGV4Y2VwdCB0aGUgcHJvdG9jb2wgZnJvbSByZWxhdGl2ZVxuICAgIHZhciBya2V5cyA9IE9iamVjdC5rZXlzKHJlbGF0aXZlKTtcbiAgICBmb3IgKHZhciByayA9IDA7IHJrIDwgcmtleXMubGVuZ3RoOyByaysrKSB7XG4gICAgICB2YXIgcmtleSA9IHJrZXlzW3JrXTtcbiAgICAgIGlmIChya2V5ICE9PSAncHJvdG9jb2wnKVxuICAgICAgICByZXN1bHRbcmtleV0gPSByZWxhdGl2ZVtya2V5XTtcbiAgICB9XG5cbiAgICAvL3VybFBhcnNlIGFwcGVuZHMgdHJhaWxpbmcgLyB0byB1cmxzIGxpa2UgaHR0cDovL3d3dy5leGFtcGxlLmNvbVxuICAgIGlmIChzbGFzaGVkUHJvdG9jb2xbcmVzdWx0LnByb3RvY29sXSAmJlxuICAgICAgICByZXN1bHQuaG9zdG5hbWUgJiYgIXJlc3VsdC5wYXRobmFtZSkge1xuICAgICAgcmVzdWx0LnBhdGggPSByZXN1bHQucGF0aG5hbWUgPSAnLyc7XG4gICAgfVxuXG4gICAgcmVzdWx0LmhyZWYgPSByZXN1bHQuZm9ybWF0KCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGlmIChyZWxhdGl2ZS5wcm90b2NvbCAmJiByZWxhdGl2ZS5wcm90b2NvbCAhPT0gcmVzdWx0LnByb3RvY29sKSB7XG4gICAgLy8gaWYgaXQncyBhIGtub3duIHVybCBwcm90b2NvbCwgdGhlbiBjaGFuZ2luZ1xuICAgIC8vIHRoZSBwcm90b2NvbCBkb2VzIHdlaXJkIHRoaW5nc1xuICAgIC8vIGZpcnN0LCBpZiBpdCdzIG5vdCBmaWxlOiwgdGhlbiB3ZSBNVVNUIGhhdmUgYSBob3N0LFxuICAgIC8vIGFuZCBpZiB0aGVyZSB3YXMgYSBwYXRoXG4gICAgLy8gdG8gYmVnaW4gd2l0aCwgdGhlbiB3ZSBNVVNUIGhhdmUgYSBwYXRoLlxuICAgIC8vIGlmIGl0IGlzIGZpbGU6LCB0aGVuIHRoZSBob3N0IGlzIGRyb3BwZWQsXG4gICAgLy8gYmVjYXVzZSB0aGF0J3Mga25vd24gdG8gYmUgaG9zdGxlc3MuXG4gICAgLy8gYW55dGhpbmcgZWxzZSBpcyBhc3N1bWVkIHRvIGJlIGFic29sdXRlLlxuICAgIGlmICghc2xhc2hlZFByb3RvY29sW3JlbGF0aXZlLnByb3RvY29sXSkge1xuICAgICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhyZWxhdGl2ZSk7XG4gICAgICBmb3IgKHZhciB2ID0gMDsgdiA8IGtleXMubGVuZ3RoOyB2KyspIHtcbiAgICAgICAgdmFyIGsgPSBrZXlzW3ZdO1xuICAgICAgICByZXN1bHRba10gPSByZWxhdGl2ZVtrXTtcbiAgICAgIH1cbiAgICAgIHJlc3VsdC5ocmVmID0gcmVzdWx0LmZvcm1hdCgpO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICByZXN1bHQucHJvdG9jb2wgPSByZWxhdGl2ZS5wcm90b2NvbDtcbiAgICBpZiAoIXJlbGF0aXZlLmhvc3QgJiYgIWhvc3RsZXNzUHJvdG9jb2xbcmVsYXRpdmUucHJvdG9jb2xdKSB7XG4gICAgICB2YXIgcmVsUGF0aCA9IChyZWxhdGl2ZS5wYXRobmFtZSB8fCAnJykuc3BsaXQoJy8nKTtcbiAgICAgIHdoaWxlIChyZWxQYXRoLmxlbmd0aCAmJiAhKHJlbGF0aXZlLmhvc3QgPSByZWxQYXRoLnNoaWZ0KCkpKTtcbiAgICAgIGlmICghcmVsYXRpdmUuaG9zdCkgcmVsYXRpdmUuaG9zdCA9ICcnO1xuICAgICAgaWYgKCFyZWxhdGl2ZS5ob3N0bmFtZSkgcmVsYXRpdmUuaG9zdG5hbWUgPSAnJztcbiAgICAgIGlmIChyZWxQYXRoWzBdICE9PSAnJykgcmVsUGF0aC51bnNoaWZ0KCcnKTtcbiAgICAgIGlmIChyZWxQYXRoLmxlbmd0aCA8IDIpIHJlbFBhdGgudW5zaGlmdCgnJyk7XG4gICAgICByZXN1bHQucGF0aG5hbWUgPSByZWxQYXRoLmpvaW4oJy8nKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVzdWx0LnBhdGhuYW1lID0gcmVsYXRpdmUucGF0aG5hbWU7XG4gICAgfVxuICAgIHJlc3VsdC5zZWFyY2ggPSByZWxhdGl2ZS5zZWFyY2g7XG4gICAgcmVzdWx0LnF1ZXJ5ID0gcmVsYXRpdmUucXVlcnk7XG4gICAgcmVzdWx0Lmhvc3QgPSByZWxhdGl2ZS5ob3N0IHx8ICcnO1xuICAgIHJlc3VsdC5hdXRoID0gcmVsYXRpdmUuYXV0aDtcbiAgICByZXN1bHQuaG9zdG5hbWUgPSByZWxhdGl2ZS5ob3N0bmFtZSB8fCByZWxhdGl2ZS5ob3N0O1xuICAgIHJlc3VsdC5wb3J0ID0gcmVsYXRpdmUucG9ydDtcbiAgICAvLyB0byBzdXBwb3J0IGh0dHAucmVxdWVzdFxuICAgIGlmIChyZXN1bHQucGF0aG5hbWUgfHwgcmVzdWx0LnNlYXJjaCkge1xuICAgICAgdmFyIHAgPSByZXN1bHQucGF0aG5hbWUgfHwgJyc7XG4gICAgICB2YXIgcyA9IHJlc3VsdC5zZWFyY2ggfHwgJyc7XG4gICAgICByZXN1bHQucGF0aCA9IHAgKyBzO1xuICAgIH1cbiAgICByZXN1bHQuc2xhc2hlcyA9IHJlc3VsdC5zbGFzaGVzIHx8IHJlbGF0aXZlLnNsYXNoZXM7XG4gICAgcmVzdWx0LmhyZWYgPSByZXN1bHQuZm9ybWF0KCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIHZhciBpc1NvdXJjZUFicyA9IChyZXN1bHQucGF0aG5hbWUgJiYgcmVzdWx0LnBhdGhuYW1lLmNoYXJBdCgwKSA9PT0gJy8nKSxcbiAgICAgIGlzUmVsQWJzID0gKFxuICAgICAgICAgIHJlbGF0aXZlLmhvc3QgfHxcbiAgICAgICAgICByZWxhdGl2ZS5wYXRobmFtZSAmJiByZWxhdGl2ZS5wYXRobmFtZS5jaGFyQXQoMCkgPT09ICcvJ1xuICAgICAgKSxcbiAgICAgIG11c3RFbmRBYnMgPSAoaXNSZWxBYnMgfHwgaXNTb3VyY2VBYnMgfHxcbiAgICAgICAgICAgICAgICAgICAgKHJlc3VsdC5ob3N0ICYmIHJlbGF0aXZlLnBhdGhuYW1lKSksXG4gICAgICByZW1vdmVBbGxEb3RzID0gbXVzdEVuZEFicyxcbiAgICAgIHNyY1BhdGggPSByZXN1bHQucGF0aG5hbWUgJiYgcmVzdWx0LnBhdGhuYW1lLnNwbGl0KCcvJykgfHwgW10sXG4gICAgICByZWxQYXRoID0gcmVsYXRpdmUucGF0aG5hbWUgJiYgcmVsYXRpdmUucGF0aG5hbWUuc3BsaXQoJy8nKSB8fCBbXSxcbiAgICAgIHBzeWNob3RpYyA9IHJlc3VsdC5wcm90b2NvbCAmJiAhc2xhc2hlZFByb3RvY29sW3Jlc3VsdC5wcm90b2NvbF07XG5cbiAgLy8gaWYgdGhlIHVybCBpcyBhIG5vbi1zbGFzaGVkIHVybCwgdGhlbiByZWxhdGl2ZVxuICAvLyBsaW5rcyBsaWtlIC4uLy4uIHNob3VsZCBiZSBhYmxlXG4gIC8vIHRvIGNyYXdsIHVwIHRvIHRoZSBob3N0bmFtZSwgYXMgd2VsbC4gIFRoaXMgaXMgc3RyYW5nZS5cbiAgLy8gcmVzdWx0LnByb3RvY29sIGhhcyBhbHJlYWR5IGJlZW4gc2V0IGJ5IG5vdy5cbiAgLy8gTGF0ZXIgb24sIHB1dCB0aGUgZmlyc3QgcGF0aCBwYXJ0IGludG8gdGhlIGhvc3QgZmllbGQuXG4gIGlmIChwc3ljaG90aWMpIHtcbiAgICByZXN1bHQuaG9zdG5hbWUgPSAnJztcbiAgICByZXN1bHQucG9ydCA9IG51bGw7XG4gICAgaWYgKHJlc3VsdC5ob3N0KSB7XG4gICAgICBpZiAoc3JjUGF0aFswXSA9PT0gJycpIHNyY1BhdGhbMF0gPSByZXN1bHQuaG9zdDtcbiAgICAgIGVsc2Ugc3JjUGF0aC51bnNoaWZ0KHJlc3VsdC5ob3N0KTtcbiAgICB9XG4gICAgcmVzdWx0Lmhvc3QgPSAnJztcbiAgICBpZiAocmVsYXRpdmUucHJvdG9jb2wpIHtcbiAgICAgIHJlbGF0aXZlLmhvc3RuYW1lID0gbnVsbDtcbiAgICAgIHJlbGF0aXZlLnBvcnQgPSBudWxsO1xuICAgICAgaWYgKHJlbGF0aXZlLmhvc3QpIHtcbiAgICAgICAgaWYgKHJlbFBhdGhbMF0gPT09ICcnKSByZWxQYXRoWzBdID0gcmVsYXRpdmUuaG9zdDtcbiAgICAgICAgZWxzZSByZWxQYXRoLnVuc2hpZnQocmVsYXRpdmUuaG9zdCk7XG4gICAgICB9XG4gICAgICByZWxhdGl2ZS5ob3N0ID0gbnVsbDtcbiAgICB9XG4gICAgbXVzdEVuZEFicyA9IG11c3RFbmRBYnMgJiYgKHJlbFBhdGhbMF0gPT09ICcnIHx8IHNyY1BhdGhbMF0gPT09ICcnKTtcbiAgfVxuXG4gIGlmIChpc1JlbEFicykge1xuICAgIC8vIGl0J3MgYWJzb2x1dGUuXG4gICAgcmVzdWx0Lmhvc3QgPSAocmVsYXRpdmUuaG9zdCB8fCByZWxhdGl2ZS5ob3N0ID09PSAnJykgP1xuICAgICAgICAgICAgICAgICAgcmVsYXRpdmUuaG9zdCA6IHJlc3VsdC5ob3N0O1xuICAgIHJlc3VsdC5ob3N0bmFtZSA9IChyZWxhdGl2ZS5ob3N0bmFtZSB8fCByZWxhdGl2ZS5ob3N0bmFtZSA9PT0gJycpID9cbiAgICAgICAgICAgICAgICAgICAgICByZWxhdGl2ZS5ob3N0bmFtZSA6IHJlc3VsdC5ob3N0bmFtZTtcbiAgICByZXN1bHQuc2VhcmNoID0gcmVsYXRpdmUuc2VhcmNoO1xuICAgIHJlc3VsdC5xdWVyeSA9IHJlbGF0aXZlLnF1ZXJ5O1xuICAgIHNyY1BhdGggPSByZWxQYXRoO1xuICAgIC8vIGZhbGwgdGhyb3VnaCB0byB0aGUgZG90LWhhbmRsaW5nIGJlbG93LlxuICB9IGVsc2UgaWYgKHJlbFBhdGgubGVuZ3RoKSB7XG4gICAgLy8gaXQncyByZWxhdGl2ZVxuICAgIC8vIHRocm93IGF3YXkgdGhlIGV4aXN0aW5nIGZpbGUsIGFuZCB0YWtlIHRoZSBuZXcgcGF0aCBpbnN0ZWFkLlxuICAgIGlmICghc3JjUGF0aCkgc3JjUGF0aCA9IFtdO1xuICAgIHNyY1BhdGgucG9wKCk7XG4gICAgc3JjUGF0aCA9IHNyY1BhdGguY29uY2F0KHJlbFBhdGgpO1xuICAgIHJlc3VsdC5zZWFyY2ggPSByZWxhdGl2ZS5zZWFyY2g7XG4gICAgcmVzdWx0LnF1ZXJ5ID0gcmVsYXRpdmUucXVlcnk7XG4gIH0gZWxzZSBpZiAoIXV0aWwuaXNOdWxsT3JVbmRlZmluZWQocmVsYXRpdmUuc2VhcmNoKSkge1xuICAgIC8vIGp1c3QgcHVsbCBvdXQgdGhlIHNlYXJjaC5cbiAgICAvLyBsaWtlIGhyZWY9Jz9mb28nLlxuICAgIC8vIFB1dCB0aGlzIGFmdGVyIHRoZSBvdGhlciB0d28gY2FzZXMgYmVjYXVzZSBpdCBzaW1wbGlmaWVzIHRoZSBib29sZWFuc1xuICAgIGlmIChwc3ljaG90aWMpIHtcbiAgICAgIHJlc3VsdC5ob3N0bmFtZSA9IHJlc3VsdC5ob3N0ID0gc3JjUGF0aC5zaGlmdCgpO1xuICAgICAgLy9vY2NhdGlvbmFseSB0aGUgYXV0aCBjYW4gZ2V0IHN0dWNrIG9ubHkgaW4gaG9zdFxuICAgICAgLy90aGlzIGVzcGVjaWFsbHkgaGFwcGVucyBpbiBjYXNlcyBsaWtlXG4gICAgICAvL3VybC5yZXNvbHZlT2JqZWN0KCdtYWlsdG86bG9jYWwxQGRvbWFpbjEnLCAnbG9jYWwyQGRvbWFpbjInKVxuICAgICAgdmFyIGF1dGhJbkhvc3QgPSByZXN1bHQuaG9zdCAmJiByZXN1bHQuaG9zdC5pbmRleE9mKCdAJykgPiAwID9cbiAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0Lmhvc3Quc3BsaXQoJ0AnKSA6IGZhbHNlO1xuICAgICAgaWYgKGF1dGhJbkhvc3QpIHtcbiAgICAgICAgcmVzdWx0LmF1dGggPSBhdXRoSW5Ib3N0LnNoaWZ0KCk7XG4gICAgICAgIHJlc3VsdC5ob3N0ID0gcmVzdWx0Lmhvc3RuYW1lID0gYXV0aEluSG9zdC5zaGlmdCgpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXN1bHQuc2VhcmNoID0gcmVsYXRpdmUuc2VhcmNoO1xuICAgIHJlc3VsdC5xdWVyeSA9IHJlbGF0aXZlLnF1ZXJ5O1xuICAgIC8vdG8gc3VwcG9ydCBodHRwLnJlcXVlc3RcbiAgICBpZiAoIXV0aWwuaXNOdWxsKHJlc3VsdC5wYXRobmFtZSkgfHwgIXV0aWwuaXNOdWxsKHJlc3VsdC5zZWFyY2gpKSB7XG4gICAgICByZXN1bHQucGF0aCA9IChyZXN1bHQucGF0aG5hbWUgPyByZXN1bHQucGF0aG5hbWUgOiAnJykgK1xuICAgICAgICAgICAgICAgICAgICAocmVzdWx0LnNlYXJjaCA/IHJlc3VsdC5zZWFyY2ggOiAnJyk7XG4gICAgfVxuICAgIHJlc3VsdC5ocmVmID0gcmVzdWx0LmZvcm1hdCgpO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICBpZiAoIXNyY1BhdGgubGVuZ3RoKSB7XG4gICAgLy8gbm8gcGF0aCBhdCBhbGwuICBlYXN5LlxuICAgIC8vIHdlJ3ZlIGFscmVhZHkgaGFuZGxlZCB0aGUgb3RoZXIgc3R1ZmYgYWJvdmUuXG4gICAgcmVzdWx0LnBhdGhuYW1lID0gbnVsbDtcbiAgICAvL3RvIHN1cHBvcnQgaHR0cC5yZXF1ZXN0XG4gICAgaWYgKHJlc3VsdC5zZWFyY2gpIHtcbiAgICAgIHJlc3VsdC5wYXRoID0gJy8nICsgcmVzdWx0LnNlYXJjaDtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVzdWx0LnBhdGggPSBudWxsO1xuICAgIH1cbiAgICByZXN1bHQuaHJlZiA9IHJlc3VsdC5mb3JtYXQoKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLy8gaWYgYSB1cmwgRU5EcyBpbiAuIG9yIC4uLCB0aGVuIGl0IG11c3QgZ2V0IGEgdHJhaWxpbmcgc2xhc2guXG4gIC8vIGhvd2V2ZXIsIGlmIGl0IGVuZHMgaW4gYW55dGhpbmcgZWxzZSBub24tc2xhc2h5LFxuICAvLyB0aGVuIGl0IG11c3QgTk9UIGdldCBhIHRyYWlsaW5nIHNsYXNoLlxuICB2YXIgbGFzdCA9IHNyY1BhdGguc2xpY2UoLTEpWzBdO1xuICB2YXIgaGFzVHJhaWxpbmdTbGFzaCA9IChcbiAgICAgIChyZXN1bHQuaG9zdCB8fCByZWxhdGl2ZS5ob3N0IHx8IHNyY1BhdGgubGVuZ3RoID4gMSkgJiZcbiAgICAgIChsYXN0ID09PSAnLicgfHwgbGFzdCA9PT0gJy4uJykgfHwgbGFzdCA9PT0gJycpO1xuXG4gIC8vIHN0cmlwIHNpbmdsZSBkb3RzLCByZXNvbHZlIGRvdWJsZSBkb3RzIHRvIHBhcmVudCBkaXJcbiAgLy8gaWYgdGhlIHBhdGggdHJpZXMgdG8gZ28gYWJvdmUgdGhlIHJvb3QsIGB1cGAgZW5kcyB1cCA+IDBcbiAgdmFyIHVwID0gMDtcbiAgZm9yICh2YXIgaSA9IHNyY1BhdGgubGVuZ3RoOyBpID49IDA7IGktLSkge1xuICAgIGxhc3QgPSBzcmNQYXRoW2ldO1xuICAgIGlmIChsYXN0ID09PSAnLicpIHtcbiAgICAgIHNyY1BhdGguc3BsaWNlKGksIDEpO1xuICAgIH0gZWxzZSBpZiAobGFzdCA9PT0gJy4uJykge1xuICAgICAgc3JjUGF0aC5zcGxpY2UoaSwgMSk7XG4gICAgICB1cCsrO1xuICAgIH0gZWxzZSBpZiAodXApIHtcbiAgICAgIHNyY1BhdGguc3BsaWNlKGksIDEpO1xuICAgICAgdXAtLTtcbiAgICB9XG4gIH1cblxuICAvLyBpZiB0aGUgcGF0aCBpcyBhbGxvd2VkIHRvIGdvIGFib3ZlIHRoZSByb290LCByZXN0b3JlIGxlYWRpbmcgLi5zXG4gIGlmICghbXVzdEVuZEFicyAmJiAhcmVtb3ZlQWxsRG90cykge1xuICAgIGZvciAoOyB1cC0tOyB1cCkge1xuICAgICAgc3JjUGF0aC51bnNoaWZ0KCcuLicpO1xuICAgIH1cbiAgfVxuXG4gIGlmIChtdXN0RW5kQWJzICYmIHNyY1BhdGhbMF0gIT09ICcnICYmXG4gICAgICAoIXNyY1BhdGhbMF0gfHwgc3JjUGF0aFswXS5jaGFyQXQoMCkgIT09ICcvJykpIHtcbiAgICBzcmNQYXRoLnVuc2hpZnQoJycpO1xuICB9XG5cbiAgaWYgKGhhc1RyYWlsaW5nU2xhc2ggJiYgKHNyY1BhdGguam9pbignLycpLnN1YnN0cigtMSkgIT09ICcvJykpIHtcbiAgICBzcmNQYXRoLnB1c2goJycpO1xuICB9XG5cbiAgdmFyIGlzQWJzb2x1dGUgPSBzcmNQYXRoWzBdID09PSAnJyB8fFxuICAgICAgKHNyY1BhdGhbMF0gJiYgc3JjUGF0aFswXS5jaGFyQXQoMCkgPT09ICcvJyk7XG5cbiAgLy8gcHV0IHRoZSBob3N0IGJhY2tcbiAgaWYgKHBzeWNob3RpYykge1xuICAgIHJlc3VsdC5ob3N0bmFtZSA9IHJlc3VsdC5ob3N0ID0gaXNBYnNvbHV0ZSA/ICcnIDpcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNyY1BhdGgubGVuZ3RoID8gc3JjUGF0aC5zaGlmdCgpIDogJyc7XG4gICAgLy9vY2NhdGlvbmFseSB0aGUgYXV0aCBjYW4gZ2V0IHN0dWNrIG9ubHkgaW4gaG9zdFxuICAgIC8vdGhpcyBlc3BlY2lhbGx5IGhhcHBlbnMgaW4gY2FzZXMgbGlrZVxuICAgIC8vdXJsLnJlc29sdmVPYmplY3QoJ21haWx0bzpsb2NhbDFAZG9tYWluMScsICdsb2NhbDJAZG9tYWluMicpXG4gICAgdmFyIGF1dGhJbkhvc3QgPSByZXN1bHQuaG9zdCAmJiByZXN1bHQuaG9zdC5pbmRleE9mKCdAJykgPiAwID9cbiAgICAgICAgICAgICAgICAgICAgIHJlc3VsdC5ob3N0LnNwbGl0KCdAJykgOiBmYWxzZTtcbiAgICBpZiAoYXV0aEluSG9zdCkge1xuICAgICAgcmVzdWx0LmF1dGggPSBhdXRoSW5Ib3N0LnNoaWZ0KCk7XG4gICAgICByZXN1bHQuaG9zdCA9IHJlc3VsdC5ob3N0bmFtZSA9IGF1dGhJbkhvc3Quc2hpZnQoKTtcbiAgICB9XG4gIH1cblxuICBtdXN0RW5kQWJzID0gbXVzdEVuZEFicyB8fCAocmVzdWx0Lmhvc3QgJiYgc3JjUGF0aC5sZW5ndGgpO1xuXG4gIGlmIChtdXN0RW5kQWJzICYmICFpc0Fic29sdXRlKSB7XG4gICAgc3JjUGF0aC51bnNoaWZ0KCcnKTtcbiAgfVxuXG4gIGlmICghc3JjUGF0aC5sZW5ndGgpIHtcbiAgICByZXN1bHQucGF0aG5hbWUgPSBudWxsO1xuICAgIHJlc3VsdC5wYXRoID0gbnVsbDtcbiAgfSBlbHNlIHtcbiAgICByZXN1bHQucGF0aG5hbWUgPSBzcmNQYXRoLmpvaW4oJy8nKTtcbiAgfVxuXG4gIC8vdG8gc3VwcG9ydCByZXF1ZXN0Lmh0dHBcbiAgaWYgKCF1dGlsLmlzTnVsbChyZXN1bHQucGF0aG5hbWUpIHx8ICF1dGlsLmlzTnVsbChyZXN1bHQuc2VhcmNoKSkge1xuICAgIHJlc3VsdC5wYXRoID0gKHJlc3VsdC5wYXRobmFtZSA/IHJlc3VsdC5wYXRobmFtZSA6ICcnKSArXG4gICAgICAgICAgICAgICAgICAocmVzdWx0LnNlYXJjaCA/IHJlc3VsdC5zZWFyY2ggOiAnJyk7XG4gIH1cbiAgcmVzdWx0LmF1dGggPSByZWxhdGl2ZS5hdXRoIHx8IHJlc3VsdC5hdXRoO1xuICByZXN1bHQuc2xhc2hlcyA9IHJlc3VsdC5zbGFzaGVzIHx8IHJlbGF0aXZlLnNsYXNoZXM7XG4gIHJlc3VsdC5ocmVmID0gcmVzdWx0LmZvcm1hdCgpO1xuICByZXR1cm4gcmVzdWx0O1xufTtcblxuVXJsLnByb3RvdHlwZS5wYXJzZUhvc3QgPSBmdW5jdGlvbigpIHtcbiAgdmFyIGhvc3QgPSB0aGlzLmhvc3Q7XG4gIHZhciBwb3J0ID0gcG9ydFBhdHRlcm4uZXhlYyhob3N0KTtcbiAgaWYgKHBvcnQpIHtcbiAgICBwb3J0ID0gcG9ydFswXTtcbiAgICBpZiAocG9ydCAhPT0gJzonKSB7XG4gICAgICB0aGlzLnBvcnQgPSBwb3J0LnN1YnN0cigxKTtcbiAgICB9XG4gICAgaG9zdCA9IGhvc3Quc3Vic3RyKDAsIGhvc3QubGVuZ3RoIC0gcG9ydC5sZW5ndGgpO1xuICB9XG4gIGlmIChob3N0KSB0aGlzLmhvc3RuYW1lID0gaG9zdDtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBpc1N0cmluZzogZnVuY3Rpb24oYXJnKSB7XG4gICAgcmV0dXJuIHR5cGVvZihhcmcpID09PSAnc3RyaW5nJztcbiAgfSxcbiAgaXNPYmplY3Q6IGZ1bmN0aW9uKGFyZykge1xuICAgIHJldHVybiB0eXBlb2YoYXJnKSA9PT0gJ29iamVjdCcgJiYgYXJnICE9PSBudWxsO1xuICB9LFxuICBpc051bGw6IGZ1bmN0aW9uKGFyZykge1xuICAgIHJldHVybiBhcmcgPT09IG51bGw7XG4gIH0sXG4gIGlzTnVsbE9yVW5kZWZpbmVkOiBmdW5jdGlvbihhcmcpIHtcbiAgICByZXR1cm4gYXJnID09IG51bGw7XG4gIH1cbn07XG4iLCJpZiAodHlwZW9mIE9iamVjdC5jcmVhdGUgPT09ICdmdW5jdGlvbicpIHtcbiAgLy8gaW1wbGVtZW50YXRpb24gZnJvbSBzdGFuZGFyZCBub2RlLmpzICd1dGlsJyBtb2R1bGVcbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmhlcml0cyhjdG9yLCBzdXBlckN0b3IpIHtcbiAgICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvclxuICAgIGN0b3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShzdXBlckN0b3IucHJvdG90eXBlLCB7XG4gICAgICBjb25zdHJ1Y3Rvcjoge1xuICAgICAgICB2YWx1ZTogY3RvcixcbiAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcbn0gZWxzZSB7XG4gIC8vIG9sZCBzY2hvb2wgc2hpbSBmb3Igb2xkIGJyb3dzZXJzXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICB2YXIgVGVtcEN0b3IgPSBmdW5jdGlvbiAoKSB7fVxuICAgIFRlbXBDdG9yLnByb3RvdHlwZSA9IHN1cGVyQ3Rvci5wcm90b3R5cGVcbiAgICBjdG9yLnByb3RvdHlwZSA9IG5ldyBUZW1wQ3RvcigpXG4gICAgY3Rvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBjdG9yXG4gIH1cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaXNCdWZmZXIoYXJnKSB7XG4gIHJldHVybiBhcmcgJiYgdHlwZW9mIGFyZyA9PT0gJ29iamVjdCdcbiAgICAmJiB0eXBlb2YgYXJnLmNvcHkgPT09ICdmdW5jdGlvbidcbiAgICAmJiB0eXBlb2YgYXJnLmZpbGwgPT09ICdmdW5jdGlvbidcbiAgICAmJiB0eXBlb2YgYXJnLnJlYWRVSW50OCA9PT0gJ2Z1bmN0aW9uJztcbn0iLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxudmFyIGZvcm1hdFJlZ0V4cCA9IC8lW3NkaiVdL2c7XG5leHBvcnRzLmZvcm1hdCA9IGZ1bmN0aW9uKGYpIHtcbiAgaWYgKCFpc1N0cmluZyhmKSkge1xuICAgIHZhciBvYmplY3RzID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIG9iamVjdHMucHVzaChpbnNwZWN0KGFyZ3VtZW50c1tpXSkpO1xuICAgIH1cbiAgICByZXR1cm4gb2JqZWN0cy5qb2luKCcgJyk7XG4gIH1cblxuICB2YXIgaSA9IDE7XG4gIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICB2YXIgbGVuID0gYXJncy5sZW5ndGg7XG4gIHZhciBzdHIgPSBTdHJpbmcoZikucmVwbGFjZShmb3JtYXRSZWdFeHAsIGZ1bmN0aW9uKHgpIHtcbiAgICBpZiAoeCA9PT0gJyUlJykgcmV0dXJuICclJztcbiAgICBpZiAoaSA+PSBsZW4pIHJldHVybiB4O1xuICAgIHN3aXRjaCAoeCkge1xuICAgICAgY2FzZSAnJXMnOiByZXR1cm4gU3RyaW5nKGFyZ3NbaSsrXSk7XG4gICAgICBjYXNlICclZCc6IHJldHVybiBOdW1iZXIoYXJnc1tpKytdKTtcbiAgICAgIGNhc2UgJyVqJzpcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoYXJnc1tpKytdKTtcbiAgICAgICAgfSBjYXRjaCAoXykge1xuICAgICAgICAgIHJldHVybiAnW0NpcmN1bGFyXSc7XG4gICAgICAgIH1cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybiB4O1xuICAgIH1cbiAgfSk7XG4gIGZvciAodmFyIHggPSBhcmdzW2ldOyBpIDwgbGVuOyB4ID0gYXJnc1srK2ldKSB7XG4gICAgaWYgKGlzTnVsbCh4KSB8fCAhaXNPYmplY3QoeCkpIHtcbiAgICAgIHN0ciArPSAnICcgKyB4O1xuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgKz0gJyAnICsgaW5zcGVjdCh4KTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHN0cjtcbn07XG5cblxuLy8gTWFyayB0aGF0IGEgbWV0aG9kIHNob3VsZCBub3QgYmUgdXNlZC5cbi8vIFJldHVybnMgYSBtb2RpZmllZCBmdW5jdGlvbiB3aGljaCB3YXJucyBvbmNlIGJ5IGRlZmF1bHQuXG4vLyBJZiAtLW5vLWRlcHJlY2F0aW9uIGlzIHNldCwgdGhlbiBpdCBpcyBhIG5vLW9wLlxuZXhwb3J0cy5kZXByZWNhdGUgPSBmdW5jdGlvbihmbiwgbXNnKSB7XG4gIC8vIEFsbG93IGZvciBkZXByZWNhdGluZyB0aGluZ3MgaW4gdGhlIHByb2Nlc3Mgb2Ygc3RhcnRpbmcgdXAuXG4gIGlmIChpc1VuZGVmaW5lZChnbG9iYWwucHJvY2VzcykpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gZXhwb3J0cy5kZXByZWNhdGUoZm4sIG1zZykuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9O1xuICB9XG5cbiAgaWYgKHByb2Nlc3Mubm9EZXByZWNhdGlvbiA9PT0gdHJ1ZSkge1xuICAgIHJldHVybiBmbjtcbiAgfVxuXG4gIHZhciB3YXJuZWQgPSBmYWxzZTtcbiAgZnVuY3Rpb24gZGVwcmVjYXRlZCgpIHtcbiAgICBpZiAoIXdhcm5lZCkge1xuICAgICAgaWYgKHByb2Nlc3MudGhyb3dEZXByZWNhdGlvbikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IobXNnKTtcbiAgICAgIH0gZWxzZSBpZiAocHJvY2Vzcy50cmFjZURlcHJlY2F0aW9uKSB7XG4gICAgICAgIGNvbnNvbGUudHJhY2UobXNnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IobXNnKTtcbiAgICAgIH1cbiAgICAgIHdhcm5lZCA9IHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9XG5cbiAgcmV0dXJuIGRlcHJlY2F0ZWQ7XG59O1xuXG5cbnZhciBkZWJ1Z3MgPSB7fTtcbnZhciBkZWJ1Z0Vudmlyb247XG5leHBvcnRzLmRlYnVnbG9nID0gZnVuY3Rpb24oc2V0KSB7XG4gIGlmIChpc1VuZGVmaW5lZChkZWJ1Z0Vudmlyb24pKVxuICAgIGRlYnVnRW52aXJvbiA9IHByb2Nlc3MuZW52Lk5PREVfREVCVUcgfHwgJyc7XG4gIHNldCA9IHNldC50b1VwcGVyQ2FzZSgpO1xuICBpZiAoIWRlYnVnc1tzZXRdKSB7XG4gICAgaWYgKG5ldyBSZWdFeHAoJ1xcXFxiJyArIHNldCArICdcXFxcYicsICdpJykudGVzdChkZWJ1Z0Vudmlyb24pKSB7XG4gICAgICB2YXIgcGlkID0gcHJvY2Vzcy5waWQ7XG4gICAgICBkZWJ1Z3Nbc2V0XSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgbXNnID0gZXhwb3J0cy5mb3JtYXQuYXBwbHkoZXhwb3J0cywgYXJndW1lbnRzKTtcbiAgICAgICAgY29uc29sZS5lcnJvcignJXMgJWQ6ICVzJywgc2V0LCBwaWQsIG1zZyk7XG4gICAgICB9O1xuICAgIH0gZWxzZSB7XG4gICAgICBkZWJ1Z3Nbc2V0XSA9IGZ1bmN0aW9uKCkge307XG4gICAgfVxuICB9XG4gIHJldHVybiBkZWJ1Z3Nbc2V0XTtcbn07XG5cblxuLyoqXG4gKiBFY2hvcyB0aGUgdmFsdWUgb2YgYSB2YWx1ZS4gVHJ5cyB0byBwcmludCB0aGUgdmFsdWUgb3V0XG4gKiBpbiB0aGUgYmVzdCB3YXkgcG9zc2libGUgZ2l2ZW4gdGhlIGRpZmZlcmVudCB0eXBlcy5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqIFRoZSBvYmplY3QgdG8gcHJpbnQgb3V0LlxuICogQHBhcmFtIHtPYmplY3R9IG9wdHMgT3B0aW9uYWwgb3B0aW9ucyBvYmplY3QgdGhhdCBhbHRlcnMgdGhlIG91dHB1dC5cbiAqL1xuLyogbGVnYWN5OiBvYmosIHNob3dIaWRkZW4sIGRlcHRoLCBjb2xvcnMqL1xuZnVuY3Rpb24gaW5zcGVjdChvYmosIG9wdHMpIHtcbiAgLy8gZGVmYXVsdCBvcHRpb25zXG4gIHZhciBjdHggPSB7XG4gICAgc2VlbjogW10sXG4gICAgc3R5bGl6ZTogc3R5bGl6ZU5vQ29sb3JcbiAgfTtcbiAgLy8gbGVnYWN5Li4uXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID49IDMpIGN0eC5kZXB0aCA9IGFyZ3VtZW50c1syXTtcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPj0gNCkgY3R4LmNvbG9ycyA9IGFyZ3VtZW50c1szXTtcbiAgaWYgKGlzQm9vbGVhbihvcHRzKSkge1xuICAgIC8vIGxlZ2FjeS4uLlxuICAgIGN0eC5zaG93SGlkZGVuID0gb3B0cztcbiAgfSBlbHNlIGlmIChvcHRzKSB7XG4gICAgLy8gZ290IGFuIFwib3B0aW9uc1wiIG9iamVjdFxuICAgIGV4cG9ydHMuX2V4dGVuZChjdHgsIG9wdHMpO1xuICB9XG4gIC8vIHNldCBkZWZhdWx0IG9wdGlvbnNcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5zaG93SGlkZGVuKSkgY3R4LnNob3dIaWRkZW4gPSBmYWxzZTtcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5kZXB0aCkpIGN0eC5kZXB0aCA9IDI7XG4gIGlmIChpc1VuZGVmaW5lZChjdHguY29sb3JzKSkgY3R4LmNvbG9ycyA9IGZhbHNlO1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LmN1c3RvbUluc3BlY3QpKSBjdHguY3VzdG9tSW5zcGVjdCA9IHRydWU7XG4gIGlmIChjdHguY29sb3JzKSBjdHguc3R5bGl6ZSA9IHN0eWxpemVXaXRoQ29sb3I7XG4gIHJldHVybiBmb3JtYXRWYWx1ZShjdHgsIG9iaiwgY3R4LmRlcHRoKTtcbn1cbmV4cG9ydHMuaW5zcGVjdCA9IGluc3BlY3Q7XG5cblxuLy8gaHR0cDovL2VuLndpa2lwZWRpYS5vcmcvd2lraS9BTlNJX2VzY2FwZV9jb2RlI2dyYXBoaWNzXG5pbnNwZWN0LmNvbG9ycyA9IHtcbiAgJ2JvbGQnIDogWzEsIDIyXSxcbiAgJ2l0YWxpYycgOiBbMywgMjNdLFxuICAndW5kZXJsaW5lJyA6IFs0LCAyNF0sXG4gICdpbnZlcnNlJyA6IFs3LCAyN10sXG4gICd3aGl0ZScgOiBbMzcsIDM5XSxcbiAgJ2dyZXknIDogWzkwLCAzOV0sXG4gICdibGFjaycgOiBbMzAsIDM5XSxcbiAgJ2JsdWUnIDogWzM0LCAzOV0sXG4gICdjeWFuJyA6IFszNiwgMzldLFxuICAnZ3JlZW4nIDogWzMyLCAzOV0sXG4gICdtYWdlbnRhJyA6IFszNSwgMzldLFxuICAncmVkJyA6IFszMSwgMzldLFxuICAneWVsbG93JyA6IFszMywgMzldXG59O1xuXG4vLyBEb24ndCB1c2UgJ2JsdWUnIG5vdCB2aXNpYmxlIG9uIGNtZC5leGVcbmluc3BlY3Quc3R5bGVzID0ge1xuICAnc3BlY2lhbCc6ICdjeWFuJyxcbiAgJ251bWJlcic6ICd5ZWxsb3cnLFxuICAnYm9vbGVhbic6ICd5ZWxsb3cnLFxuICAndW5kZWZpbmVkJzogJ2dyZXknLFxuICAnbnVsbCc6ICdib2xkJyxcbiAgJ3N0cmluZyc6ICdncmVlbicsXG4gICdkYXRlJzogJ21hZ2VudGEnLFxuICAvLyBcIm5hbWVcIjogaW50ZW50aW9uYWxseSBub3Qgc3R5bGluZ1xuICAncmVnZXhwJzogJ3JlZCdcbn07XG5cblxuZnVuY3Rpb24gc3R5bGl6ZVdpdGhDb2xvcihzdHIsIHN0eWxlVHlwZSkge1xuICB2YXIgc3R5bGUgPSBpbnNwZWN0LnN0eWxlc1tzdHlsZVR5cGVdO1xuXG4gIGlmIChzdHlsZSkge1xuICAgIHJldHVybiAnXFx1MDAxYlsnICsgaW5zcGVjdC5jb2xvcnNbc3R5bGVdWzBdICsgJ20nICsgc3RyICtcbiAgICAgICAgICAgJ1xcdTAwMWJbJyArIGluc3BlY3QuY29sb3JzW3N0eWxlXVsxXSArICdtJztcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gc3RyO1xuICB9XG59XG5cblxuZnVuY3Rpb24gc3R5bGl6ZU5vQ29sb3Ioc3RyLCBzdHlsZVR5cGUpIHtcbiAgcmV0dXJuIHN0cjtcbn1cblxuXG5mdW5jdGlvbiBhcnJheVRvSGFzaChhcnJheSkge1xuICB2YXIgaGFzaCA9IHt9O1xuXG4gIGFycmF5LmZvckVhY2goZnVuY3Rpb24odmFsLCBpZHgpIHtcbiAgICBoYXNoW3ZhbF0gPSB0cnVlO1xuICB9KTtcblxuICByZXR1cm4gaGFzaDtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRWYWx1ZShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMpIHtcbiAgLy8gUHJvdmlkZSBhIGhvb2sgZm9yIHVzZXItc3BlY2lmaWVkIGluc3BlY3QgZnVuY3Rpb25zLlxuICAvLyBDaGVjayB0aGF0IHZhbHVlIGlzIGFuIG9iamVjdCB3aXRoIGFuIGluc3BlY3QgZnVuY3Rpb24gb24gaXRcbiAgaWYgKGN0eC5jdXN0b21JbnNwZWN0ICYmXG4gICAgICB2YWx1ZSAmJlxuICAgICAgaXNGdW5jdGlvbih2YWx1ZS5pbnNwZWN0KSAmJlxuICAgICAgLy8gRmlsdGVyIG91dCB0aGUgdXRpbCBtb2R1bGUsIGl0J3MgaW5zcGVjdCBmdW5jdGlvbiBpcyBzcGVjaWFsXG4gICAgICB2YWx1ZS5pbnNwZWN0ICE9PSBleHBvcnRzLmluc3BlY3QgJiZcbiAgICAgIC8vIEFsc28gZmlsdGVyIG91dCBhbnkgcHJvdG90eXBlIG9iamVjdHMgdXNpbmcgdGhlIGNpcmN1bGFyIGNoZWNrLlxuICAgICAgISh2YWx1ZS5jb25zdHJ1Y3RvciAmJiB2YWx1ZS5jb25zdHJ1Y3Rvci5wcm90b3R5cGUgPT09IHZhbHVlKSkge1xuICAgIHZhciByZXQgPSB2YWx1ZS5pbnNwZWN0KHJlY3Vyc2VUaW1lcywgY3R4KTtcbiAgICBpZiAoIWlzU3RyaW5nKHJldCkpIHtcbiAgICAgIHJldCA9IGZvcm1hdFZhbHVlKGN0eCwgcmV0LCByZWN1cnNlVGltZXMpO1xuICAgIH1cbiAgICByZXR1cm4gcmV0O1xuICB9XG5cbiAgLy8gUHJpbWl0aXZlIHR5cGVzIGNhbm5vdCBoYXZlIHByb3BlcnRpZXNcbiAgdmFyIHByaW1pdGl2ZSA9IGZvcm1hdFByaW1pdGl2ZShjdHgsIHZhbHVlKTtcbiAgaWYgKHByaW1pdGl2ZSkge1xuICAgIHJldHVybiBwcmltaXRpdmU7XG4gIH1cblxuICAvLyBMb29rIHVwIHRoZSBrZXlzIG9mIHRoZSBvYmplY3QuXG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXModmFsdWUpO1xuICB2YXIgdmlzaWJsZUtleXMgPSBhcnJheVRvSGFzaChrZXlzKTtcblxuICBpZiAoY3R4LnNob3dIaWRkZW4pIHtcbiAgICBrZXlzID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXModmFsdWUpO1xuICB9XG5cbiAgLy8gSUUgZG9lc24ndCBtYWtlIGVycm9yIGZpZWxkcyBub24tZW51bWVyYWJsZVxuICAvLyBodHRwOi8vbXNkbi5taWNyb3NvZnQuY29tL2VuLXVzL2xpYnJhcnkvaWUvZHd3NTJzYnQodj12cy45NCkuYXNweFxuICBpZiAoaXNFcnJvcih2YWx1ZSlcbiAgICAgICYmIChrZXlzLmluZGV4T2YoJ21lc3NhZ2UnKSA+PSAwIHx8IGtleXMuaW5kZXhPZignZGVzY3JpcHRpb24nKSA+PSAwKSkge1xuICAgIHJldHVybiBmb3JtYXRFcnJvcih2YWx1ZSk7XG4gIH1cblxuICAvLyBTb21lIHR5cGUgb2Ygb2JqZWN0IHdpdGhvdXQgcHJvcGVydGllcyBjYW4gYmUgc2hvcnRjdXR0ZWQuXG4gIGlmIChrZXlzLmxlbmd0aCA9PT0gMCkge1xuICAgIGlmIChpc0Z1bmN0aW9uKHZhbHVlKSkge1xuICAgICAgdmFyIG5hbWUgPSB2YWx1ZS5uYW1lID8gJzogJyArIHZhbHVlLm5hbWUgOiAnJztcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZSgnW0Z1bmN0aW9uJyArIG5hbWUgKyAnXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICAgIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZShSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCAncmVnZXhwJyk7XG4gICAgfVxuICAgIGlmIChpc0RhdGUodmFsdWUpKSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoRGF0ZS5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksICdkYXRlJyk7XG4gICAgfVxuICAgIGlmIChpc0Vycm9yKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGZvcm1hdEVycm9yKHZhbHVlKTtcbiAgICB9XG4gIH1cblxuICB2YXIgYmFzZSA9ICcnLCBhcnJheSA9IGZhbHNlLCBicmFjZXMgPSBbJ3snLCAnfSddO1xuXG4gIC8vIE1ha2UgQXJyYXkgc2F5IHRoYXQgdGhleSBhcmUgQXJyYXlcbiAgaWYgKGlzQXJyYXkodmFsdWUpKSB7XG4gICAgYXJyYXkgPSB0cnVlO1xuICAgIGJyYWNlcyA9IFsnWycsICddJ107XG4gIH1cblxuICAvLyBNYWtlIGZ1bmN0aW9ucyBzYXkgdGhhdCB0aGV5IGFyZSBmdW5jdGlvbnNcbiAgaWYgKGlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgdmFyIG4gPSB2YWx1ZS5uYW1lID8gJzogJyArIHZhbHVlLm5hbWUgOiAnJztcbiAgICBiYXNlID0gJyBbRnVuY3Rpb24nICsgbiArICddJztcbiAgfVxuXG4gIC8vIE1ha2UgUmVnRXhwcyBzYXkgdGhhdCB0aGV5IGFyZSBSZWdFeHBzXG4gIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICBiYXNlID0gJyAnICsgUmVnRXhwLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKTtcbiAgfVxuXG4gIC8vIE1ha2UgZGF0ZXMgd2l0aCBwcm9wZXJ0aWVzIGZpcnN0IHNheSB0aGUgZGF0ZVxuICBpZiAoaXNEYXRlKHZhbHVlKSkge1xuICAgIGJhc2UgPSAnICcgKyBEYXRlLnByb3RvdHlwZS50b1VUQ1N0cmluZy5jYWxsKHZhbHVlKTtcbiAgfVxuXG4gIC8vIE1ha2UgZXJyb3Igd2l0aCBtZXNzYWdlIGZpcnN0IHNheSB0aGUgZXJyb3JcbiAgaWYgKGlzRXJyb3IodmFsdWUpKSB7XG4gICAgYmFzZSA9ICcgJyArIGZvcm1hdEVycm9yKHZhbHVlKTtcbiAgfVxuXG4gIGlmIChrZXlzLmxlbmd0aCA9PT0gMCAmJiAoIWFycmF5IHx8IHZhbHVlLmxlbmd0aCA9PSAwKSkge1xuICAgIHJldHVybiBicmFjZXNbMF0gKyBiYXNlICsgYnJhY2VzWzFdO1xuICB9XG5cbiAgaWYgKHJlY3Vyc2VUaW1lcyA8IDApIHtcbiAgICBpZiAoaXNSZWdFeHAodmFsdWUpKSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoUmVnRXhwLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSwgJ3JlZ2V4cCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gY3R4LnN0eWxpemUoJ1tPYmplY3RdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH1cblxuICBjdHguc2Vlbi5wdXNoKHZhbHVlKTtcblxuICB2YXIgb3V0cHV0O1xuICBpZiAoYXJyYXkpIHtcbiAgICBvdXRwdXQgPSBmb3JtYXRBcnJheShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXlzKTtcbiAgfSBlbHNlIHtcbiAgICBvdXRwdXQgPSBrZXlzLm1hcChmdW5jdGlvbihrZXkpIHtcbiAgICAgIHJldHVybiBmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXksIGFycmF5KTtcbiAgICB9KTtcbiAgfVxuXG4gIGN0eC5zZWVuLnBvcCgpO1xuXG4gIHJldHVybiByZWR1Y2VUb1NpbmdsZVN0cmluZyhvdXRwdXQsIGJhc2UsIGJyYWNlcyk7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0UHJpbWl0aXZlKGN0eCwgdmFsdWUpIHtcbiAgaWYgKGlzVW5kZWZpbmVkKHZhbHVlKSlcbiAgICByZXR1cm4gY3R4LnN0eWxpemUoJ3VuZGVmaW5lZCcsICd1bmRlZmluZWQnKTtcbiAgaWYgKGlzU3RyaW5nKHZhbHVlKSkge1xuICAgIHZhciBzaW1wbGUgPSAnXFwnJyArIEpTT04uc3RyaW5naWZ5KHZhbHVlKS5yZXBsYWNlKC9eXCJ8XCIkL2csICcnKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoLycvZywgXCJcXFxcJ1wiKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcXFxcIi9nLCAnXCInKSArICdcXCcnO1xuICAgIHJldHVybiBjdHguc3R5bGl6ZShzaW1wbGUsICdzdHJpbmcnKTtcbiAgfVxuICBpZiAoaXNOdW1iZXIodmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgnJyArIHZhbHVlLCAnbnVtYmVyJyk7XG4gIGlmIChpc0Jvb2xlYW4odmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgnJyArIHZhbHVlLCAnYm9vbGVhbicpO1xuICAvLyBGb3Igc29tZSByZWFzb24gdHlwZW9mIG51bGwgaXMgXCJvYmplY3RcIiwgc28gc3BlY2lhbCBjYXNlIGhlcmUuXG4gIGlmIChpc051bGwodmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgnbnVsbCcsICdudWxsJyk7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0RXJyb3IodmFsdWUpIHtcbiAgcmV0dXJuICdbJyArIEVycm9yLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSArICddJztcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRBcnJheShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLCBrZXlzKSB7XG4gIHZhciBvdXRwdXQgPSBbXTtcbiAgZm9yICh2YXIgaSA9IDAsIGwgPSB2YWx1ZS5sZW5ndGg7IGkgPCBsOyArK2kpIHtcbiAgICBpZiAoaGFzT3duUHJvcGVydHkodmFsdWUsIFN0cmluZyhpKSkpIHtcbiAgICAgIG91dHB1dC5wdXNoKGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsXG4gICAgICAgICAgU3RyaW5nKGkpLCB0cnVlKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG91dHB1dC5wdXNoKCcnKTtcbiAgICB9XG4gIH1cbiAga2V5cy5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgIGlmICgha2V5Lm1hdGNoKC9eXFxkKyQvKSkge1xuICAgICAgb3V0cHV0LnB1c2goZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cyxcbiAgICAgICAgICBrZXksIHRydWUpKTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gb3V0cHV0O1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleSwgYXJyYXkpIHtcbiAgdmFyIG5hbWUsIHN0ciwgZGVzYztcbiAgZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodmFsdWUsIGtleSkgfHwgeyB2YWx1ZTogdmFsdWVba2V5XSB9O1xuICBpZiAoZGVzYy5nZXQpIHtcbiAgICBpZiAoZGVzYy5zZXQpIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbR2V0dGVyL1NldHRlcl0nLCAnc3BlY2lhbCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW0dldHRlcl0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBpZiAoZGVzYy5zZXQpIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbU2V0dGVyXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9XG4gIGlmICghaGFzT3duUHJvcGVydHkodmlzaWJsZUtleXMsIGtleSkpIHtcbiAgICBuYW1lID0gJ1snICsga2V5ICsgJ10nO1xuICB9XG4gIGlmICghc3RyKSB7XG4gICAgaWYgKGN0eC5zZWVuLmluZGV4T2YoZGVzYy52YWx1ZSkgPCAwKSB7XG4gICAgICBpZiAoaXNOdWxsKHJlY3Vyc2VUaW1lcykpIHtcbiAgICAgICAgc3RyID0gZm9ybWF0VmFsdWUoY3R4LCBkZXNjLnZhbHVlLCBudWxsKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHN0ciA9IGZvcm1hdFZhbHVlKGN0eCwgZGVzYy52YWx1ZSwgcmVjdXJzZVRpbWVzIC0gMSk7XG4gICAgICB9XG4gICAgICBpZiAoc3RyLmluZGV4T2YoJ1xcbicpID4gLTEpIHtcbiAgICAgICAgaWYgKGFycmF5KSB7XG4gICAgICAgICAgc3RyID0gc3RyLnNwbGl0KCdcXG4nKS5tYXAoZnVuY3Rpb24obGluZSkge1xuICAgICAgICAgICAgcmV0dXJuICcgICcgKyBsaW5lO1xuICAgICAgICAgIH0pLmpvaW4oJ1xcbicpLnN1YnN0cigyKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzdHIgPSAnXFxuJyArIHN0ci5zcGxpdCgnXFxuJykubWFwKGZ1bmN0aW9uKGxpbmUpIHtcbiAgICAgICAgICAgIHJldHVybiAnICAgJyArIGxpbmU7XG4gICAgICAgICAgfSkuam9pbignXFxuJyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tDaXJjdWxhcl0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfVxuICBpZiAoaXNVbmRlZmluZWQobmFtZSkpIHtcbiAgICBpZiAoYXJyYXkgJiYga2V5Lm1hdGNoKC9eXFxkKyQvKSkge1xuICAgICAgcmV0dXJuIHN0cjtcbiAgICB9XG4gICAgbmFtZSA9IEpTT04uc3RyaW5naWZ5KCcnICsga2V5KTtcbiAgICBpZiAobmFtZS5tYXRjaCgvXlwiKFthLXpBLVpfXVthLXpBLVpfMC05XSopXCIkLykpIHtcbiAgICAgIG5hbWUgPSBuYW1lLnN1YnN0cigxLCBuYW1lLmxlbmd0aCAtIDIpO1xuICAgICAgbmFtZSA9IGN0eC5zdHlsaXplKG5hbWUsICduYW1lJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIG5hbWUgPSBuYW1lLnJlcGxhY2UoLycvZywgXCJcXFxcJ1wiKVxuICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFxcXFwiL2csICdcIicpXG4gICAgICAgICAgICAgICAgIC5yZXBsYWNlKC8oXlwifFwiJCkvZywgXCInXCIpO1xuICAgICAgbmFtZSA9IGN0eC5zdHlsaXplKG5hbWUsICdzdHJpbmcnKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gbmFtZSArICc6ICcgKyBzdHI7XG59XG5cblxuZnVuY3Rpb24gcmVkdWNlVG9TaW5nbGVTdHJpbmcob3V0cHV0LCBiYXNlLCBicmFjZXMpIHtcbiAgdmFyIG51bUxpbmVzRXN0ID0gMDtcbiAgdmFyIGxlbmd0aCA9IG91dHB1dC5yZWR1Y2UoZnVuY3Rpb24ocHJldiwgY3VyKSB7XG4gICAgbnVtTGluZXNFc3QrKztcbiAgICBpZiAoY3VyLmluZGV4T2YoJ1xcbicpID49IDApIG51bUxpbmVzRXN0Kys7XG4gICAgcmV0dXJuIHByZXYgKyBjdXIucmVwbGFjZSgvXFx1MDAxYlxcW1xcZFxcZD9tL2csICcnKS5sZW5ndGggKyAxO1xuICB9LCAwKTtcblxuICBpZiAobGVuZ3RoID4gNjApIHtcbiAgICByZXR1cm4gYnJhY2VzWzBdICtcbiAgICAgICAgICAgKGJhc2UgPT09ICcnID8gJycgOiBiYXNlICsgJ1xcbiAnKSArXG4gICAgICAgICAgICcgJyArXG4gICAgICAgICAgIG91dHB1dC5qb2luKCcsXFxuICAnKSArXG4gICAgICAgICAgICcgJyArXG4gICAgICAgICAgIGJyYWNlc1sxXTtcbiAgfVxuXG4gIHJldHVybiBicmFjZXNbMF0gKyBiYXNlICsgJyAnICsgb3V0cHV0LmpvaW4oJywgJykgKyAnICcgKyBicmFjZXNbMV07XG59XG5cblxuLy8gTk9URTogVGhlc2UgdHlwZSBjaGVja2luZyBmdW5jdGlvbnMgaW50ZW50aW9uYWxseSBkb24ndCB1c2UgYGluc3RhbmNlb2ZgXG4vLyBiZWNhdXNlIGl0IGlzIGZyYWdpbGUgYW5kIGNhbiBiZSBlYXNpbHkgZmFrZWQgd2l0aCBgT2JqZWN0LmNyZWF0ZSgpYC5cbmZ1bmN0aW9uIGlzQXJyYXkoYXIpIHtcbiAgcmV0dXJuIEFycmF5LmlzQXJyYXkoYXIpO1xufVxuZXhwb3J0cy5pc0FycmF5ID0gaXNBcnJheTtcblxuZnVuY3Rpb24gaXNCb29sZWFuKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Jvb2xlYW4nO1xufVxuZXhwb3J0cy5pc0Jvb2xlYW4gPSBpc0Jvb2xlYW47XG5cbmZ1bmN0aW9uIGlzTnVsbChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gbnVsbDtcbn1cbmV4cG9ydHMuaXNOdWxsID0gaXNOdWxsO1xuXG5mdW5jdGlvbiBpc051bGxPclVuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PSBudWxsO1xufVxuZXhwb3J0cy5pc051bGxPclVuZGVmaW5lZCA9IGlzTnVsbE9yVW5kZWZpbmVkO1xuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuZXhwb3J0cy5pc051bWJlciA9IGlzTnVtYmVyO1xuXG5mdW5jdGlvbiBpc1N0cmluZyhhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdzdHJpbmcnO1xufVxuZXhwb3J0cy5pc1N0cmluZyA9IGlzU3RyaW5nO1xuXG5mdW5jdGlvbiBpc1N5bWJvbChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdzeW1ib2wnO1xufVxuZXhwb3J0cy5pc1N5bWJvbCA9IGlzU3ltYm9sO1xuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gdm9pZCAwO1xufVxuZXhwb3J0cy5pc1VuZGVmaW5lZCA9IGlzVW5kZWZpbmVkO1xuXG5mdW5jdGlvbiBpc1JlZ0V4cChyZSkge1xuICByZXR1cm4gaXNPYmplY3QocmUpICYmIG9iamVjdFRvU3RyaW5nKHJlKSA9PT0gJ1tvYmplY3QgUmVnRXhwXSc7XG59XG5leHBvcnRzLmlzUmVnRXhwID0gaXNSZWdFeHA7XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgYXJnICE9PSBudWxsO1xufVxuZXhwb3J0cy5pc09iamVjdCA9IGlzT2JqZWN0O1xuXG5mdW5jdGlvbiBpc0RhdGUoZCkge1xuICByZXR1cm4gaXNPYmplY3QoZCkgJiYgb2JqZWN0VG9TdHJpbmcoZCkgPT09ICdbb2JqZWN0IERhdGVdJztcbn1cbmV4cG9ydHMuaXNEYXRlID0gaXNEYXRlO1xuXG5mdW5jdGlvbiBpc0Vycm9yKGUpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KGUpICYmXG4gICAgICAob2JqZWN0VG9TdHJpbmcoZSkgPT09ICdbb2JqZWN0IEVycm9yXScgfHwgZSBpbnN0YW5jZW9mIEVycm9yKTtcbn1cbmV4cG9ydHMuaXNFcnJvciA9IGlzRXJyb3I7XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuZXhwb3J0cy5pc0Z1bmN0aW9uID0gaXNGdW5jdGlvbjtcblxuZnVuY3Rpb24gaXNQcmltaXRpdmUoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IG51bGwgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdib29sZWFuJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ251bWJlcicgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdzdHJpbmcnIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnc3ltYm9sJyB8fCAgLy8gRVM2IHN5bWJvbFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3VuZGVmaW5lZCc7XG59XG5leHBvcnRzLmlzUHJpbWl0aXZlID0gaXNQcmltaXRpdmU7XG5cbmV4cG9ydHMuaXNCdWZmZXIgPSByZXF1aXJlKCcuL3N1cHBvcnQvaXNCdWZmZXInKTtcblxuZnVuY3Rpb24gb2JqZWN0VG9TdHJpbmcobykge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG8pO1xufVxuXG5cbmZ1bmN0aW9uIHBhZChuKSB7XG4gIHJldHVybiBuIDwgMTAgPyAnMCcgKyBuLnRvU3RyaW5nKDEwKSA6IG4udG9TdHJpbmcoMTApO1xufVxuXG5cbnZhciBtb250aHMgPSBbJ0phbicsICdGZWInLCAnTWFyJywgJ0FwcicsICdNYXknLCAnSnVuJywgJ0p1bCcsICdBdWcnLCAnU2VwJyxcbiAgICAgICAgICAgICAgJ09jdCcsICdOb3YnLCAnRGVjJ107XG5cbi8vIDI2IEZlYiAxNjoxOTozNFxuZnVuY3Rpb24gdGltZXN0YW1wKCkge1xuICB2YXIgZCA9IG5ldyBEYXRlKCk7XG4gIHZhciB0aW1lID0gW3BhZChkLmdldEhvdXJzKCkpLFxuICAgICAgICAgICAgICBwYWQoZC5nZXRNaW51dGVzKCkpLFxuICAgICAgICAgICAgICBwYWQoZC5nZXRTZWNvbmRzKCkpXS5qb2luKCc6Jyk7XG4gIHJldHVybiBbZC5nZXREYXRlKCksIG1vbnRoc1tkLmdldE1vbnRoKCldLCB0aW1lXS5qb2luKCcgJyk7XG59XG5cblxuLy8gbG9nIGlzIGp1c3QgYSB0aGluIHdyYXBwZXIgdG8gY29uc29sZS5sb2cgdGhhdCBwcmVwZW5kcyBhIHRpbWVzdGFtcFxuZXhwb3J0cy5sb2cgPSBmdW5jdGlvbigpIHtcbiAgY29uc29sZS5sb2coJyVzIC0gJXMnLCB0aW1lc3RhbXAoKSwgZXhwb3J0cy5mb3JtYXQuYXBwbHkoZXhwb3J0cywgYXJndW1lbnRzKSk7XG59O1xuXG5cbi8qKlxuICogSW5oZXJpdCB0aGUgcHJvdG90eXBlIG1ldGhvZHMgZnJvbSBvbmUgY29uc3RydWN0b3IgaW50byBhbm90aGVyLlxuICpcbiAqIFRoZSBGdW5jdGlvbi5wcm90b3R5cGUuaW5oZXJpdHMgZnJvbSBsYW5nLmpzIHJld3JpdHRlbiBhcyBhIHN0YW5kYWxvbmVcbiAqIGZ1bmN0aW9uIChub3Qgb24gRnVuY3Rpb24ucHJvdG90eXBlKS4gTk9URTogSWYgdGhpcyBmaWxlIGlzIHRvIGJlIGxvYWRlZFxuICogZHVyaW5nIGJvb3RzdHJhcHBpbmcgdGhpcyBmdW5jdGlvbiBuZWVkcyB0byBiZSByZXdyaXR0ZW4gdXNpbmcgc29tZSBuYXRpdmVcbiAqIGZ1bmN0aW9ucyBhcyBwcm90b3R5cGUgc2V0dXAgdXNpbmcgbm9ybWFsIEphdmFTY3JpcHQgZG9lcyBub3Qgd29yayBhc1xuICogZXhwZWN0ZWQgZHVyaW5nIGJvb3RzdHJhcHBpbmcgKHNlZSBtaXJyb3IuanMgaW4gcjExNDkwMykuXG4gKlxuICogQHBhcmFtIHtmdW5jdGlvbn0gY3RvciBDb25zdHJ1Y3RvciBmdW5jdGlvbiB3aGljaCBuZWVkcyB0byBpbmhlcml0IHRoZVxuICogICAgIHByb3RvdHlwZS5cbiAqIEBwYXJhbSB7ZnVuY3Rpb259IHN1cGVyQ3RvciBDb25zdHJ1Y3RvciBmdW5jdGlvbiB0byBpbmhlcml0IHByb3RvdHlwZSBmcm9tLlxuICovXG5leHBvcnRzLmluaGVyaXRzID0gcmVxdWlyZSgnaW5oZXJpdHMnKTtcblxuZXhwb3J0cy5fZXh0ZW5kID0gZnVuY3Rpb24ob3JpZ2luLCBhZGQpIHtcbiAgLy8gRG9uJ3QgZG8gYW55dGhpbmcgaWYgYWRkIGlzbid0IGFuIG9iamVjdFxuICBpZiAoIWFkZCB8fCAhaXNPYmplY3QoYWRkKSkgcmV0dXJuIG9yaWdpbjtcblxuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGFkZCk7XG4gIHZhciBpID0ga2V5cy5sZW5ndGg7XG4gIHdoaWxlIChpLS0pIHtcbiAgICBvcmlnaW5ba2V5c1tpXV0gPSBhZGRba2V5c1tpXV07XG4gIH1cbiAgcmV0dXJuIG9yaWdpbjtcbn07XG5cbmZ1bmN0aW9uIGhhc093blByb3BlcnR5KG9iaiwgcHJvcCkge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcHJvcCk7XG59XG4iLCJcInVzZSBzdHJpY3RcIjtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5jb25zdCBjb21tb25fMSA9IHJlcXVpcmUoXCIuL2NvbW1vblwiKTtcclxuZXhwb3J0cy5zZXJ2aWNlTW9kdWxlID0gY29tbW9uXzEuc2VydmljZU1vZHVsZTtcclxuY29uc3Qgcm91dGVyXzEgPSByZXF1aXJlKFwiLi9yb3V0ZXJcIik7XHJcbmV4cG9ydHMuUm91dGVyID0gcm91dGVyXzEuUm91dGVyO1xyXG5jb25zdCBsb2NhdGlvblNlcnZpY2VfMSA9IHJlcXVpcmUoXCIuL2xvY2F0aW9uU2VydmljZVwiKTtcclxuZXhwb3J0cy5Mb2NhdGlvblNlcnZpY2UgPSBsb2NhdGlvblNlcnZpY2VfMS5Mb2NhdGlvblNlcnZpY2U7XHJcbmNvbnN0IGNvcmVfMSA9IHJlcXVpcmUoXCJAYWthbGEvY29yZVwiKTtcclxuZXhwb3J0cy5PYnNlcnZhYmxlQXJyYXkgPSBjb3JlXzEuT2JzZXJ2YWJsZUFycmF5O1xyXG5jb25zdCBodHRwXzEgPSByZXF1aXJlKFwiLi9odHRwXCIpO1xyXG5jb25zdCB0ZW1wbGF0ZV8xID0gcmVxdWlyZShcIi4vdGVtcGxhdGVcIik7XHJcbmV4cG9ydHMuVGVtcGxhdGUgPSB0ZW1wbGF0ZV8xLlRlbXBsYXRlO1xyXG5jb25zdCBwYXJ0XzEgPSByZXF1aXJlKFwiLi9wYXJ0XCIpO1xyXG5leHBvcnRzLlBhcnQgPSBwYXJ0XzEuUGFydDtcclxuY29uc3Qgc2NvcGVfMSA9IHJlcXVpcmUoXCIuL3Njb3BlXCIpO1xyXG5jb25zdCBjb250cm9sc18xID0gcmVxdWlyZShcIi4vY29udHJvbHMvY29udHJvbHNcIik7XHJcbmV4cG9ydHMuQmFzZUNvbnRyb2wgPSBjb250cm9sc18xLkJhc2VDb250cm9sO1xyXG5leHBvcnRzLkNvbnRyb2wgPSBjb250cm9sc18xLkNvbnRyb2w7XHJcbmV4cG9ydHMuY29udHJvbCA9IGNvbnRyb2xzXzEuY29udHJvbDtcclxuY29tbW9uXzEuJCRpbmplY3Rvclsncm91dGVyJ10gPSByb3V0ZXJfMS5yb3V0ZXI7XHJcbmNvbW1vbl8xLiQkaW5qZWN0b3JbJ0Jhc2VDb250cm9sJ10gPSBjb250cm9sc18xLkJhc2VDb250cm9sO1xyXG5jb21tb25fMS4kJGluamVjdG9yWydDb250cm9sJ10gPSBjb250cm9sc18xLkNvbnRyb2w7XHJcbmNvbW1vbl8xLiQkaW5qZWN0b3JbJ2NvbnRyb2wnXSA9IGNvbnRyb2xzXzEuY29udHJvbDtcclxudmFyIG1haW5Sb3V0ZXIgPSByb3V0ZXJfMS5yb3V0ZXIoKTtcclxubWFpblJvdXRlci51c2UoY29tbW9uXzEuc2VydmljZU1vZHVsZS5yZWdpc3RlcignJHByZVJvdXRlcicsIHJvdXRlcl8xLnJvdXRlcigpKS5yb3V0ZXIpO1xyXG5tYWluUm91dGVyLnVzZShjb21tb25fMS5zZXJ2aWNlTW9kdWxlLnJlZ2lzdGVyKCckcm91dGVyJywgcm91dGVyXzEucm91dGVyKCkpLnJvdXRlcik7XHJcbm1haW5Sb3V0ZXIudXNlKGZ1bmN0aW9uIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcihlcnJvcik7XHJcbn0pO1xyXG5jb21tb25fMS5zZXJ2aWNlTW9kdWxlLnJlZ2lzdGVyKCckaHR0cCcsIG5ldyBodHRwXzEuSHR0cCgpKTtcclxuY29tbW9uXzEuc2VydmljZU1vZHVsZS5yZWdpc3RlcignJGxvY2F0aW9uJywgbmV3IGxvY2F0aW9uU2VydmljZV8xLkxvY2F0aW9uU2VydmljZSgpKTtcclxuY29tbW9uXzEuc2VydmljZU1vZHVsZS5yZWdpc3RlcigncHJvbWlzaWZ5JywgY29yZV8xLlByb21pc2lmeSk7XHJcbmNvbW1vbl8xLnNlcnZpY2VNb2R1bGUucmVnaXN0ZXIoJyRkZWZlcicsIGNvcmVfMS5EZWZlcnJlZCk7XHJcbi8vIGV4cG9ydCB7IFByb21pc2lmeSwgRGVmZXJyZWQgfTtcclxuZXhwb3J0cy5ydW4gPSBjb21tb25fMS4kJGluamVjdG9yLnJ1bi5iaW5kKGNvbW1vbl8xLiQkaW5qZWN0b3IpO1xyXG5jb21tb25fMS4kJGluamVjdG9yLmluaXQoW10sIGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciByb290U2NvcGUgPSBjb21tb25fMS4kJGluamVjdG9yLnJlZ2lzdGVyKCckcm9vdFNjb3BlJywgbmV3IHNjb3BlXzEuU2NvcGUoKSk7XHJcbiAgICAkKGRvY3VtZW50KS5hcHBseVRlbXBsYXRlKHJvb3RTY29wZSk7XHJcbn0pO1xyXG5jb21tb25fMS4kJGluamVjdG9yLnN0YXJ0KFsnJGxvY2F0aW9uJ10sIGZ1bmN0aW9uICgkbG9jYXRpb24pIHtcclxuICAgIHZhciBzdGFydGVkID0gZmFsc2U7XHJcbiAgICAkbG9jYXRpb24ub24oJ2NoYW5nZScsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICBpZiAoc3RhcnRlZClcclxuICAgICAgICAgICAgbWFpblJvdXRlci5oYW5kbGUobmV3IHJvdXRlcl8xLlJlcXVlc3QobG9jYXRpb24pLCBmdW5jdGlvbiAoZXJyKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoZXJyKVxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcclxuICAgICAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ2RlYWRlbmQnKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICB9KTtcclxuICAgICRsb2NhdGlvbi5zdGFydCh7IGhhc2hiYW5nOiB0cnVlIH0pO1xyXG4gICAgc3RhcnRlZCA9IHRydWU7XHJcbn0pO1xyXG4kKGZ1bmN0aW9uICgpIHtcclxuICAgIGNvbW1vbl8xLiQkaW5qZWN0b3Iuc3RhcnQoKTtcclxufSk7XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWNsaWVudGlmeS5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5jb25zdCBjb3JlXzEgPSByZXF1aXJlKFwiQGFrYWxhL2NvcmVcIik7XHJcbnJlcXVpcmUoXCJAYWthbGEvY29yZVwiKTtcclxuZXhwb3J0cy4kJGluamVjdG9yID0gd2luZG93Wydha2FsYSddID0gY29yZV8xLm1vZHVsZSgnYWthbGEnLCAnYWthbGEtc2VydmljZXMnLCAnY29udHJvbHMnKTtcclxuZXhwb3J0cy4kJGluamVjdG9yWydwcm9taXNpZnknXSA9IGNvcmVfMS5Qcm9taXNpZnk7XHJcbmV4cG9ydHMuJCRpbmplY3RvclsnZGVmZXInXSA9IGNvcmVfMS5EZWZlcnJlZDtcclxuZXhwb3J0cy4kJGluamVjdG9yWydCaW5kaW5nJ10gPSBjb3JlXzEuQmluZGluZztcclxuZXhwb3J0cy4kJGluamVjdG9yWydPYnNlcnZhYmxlQXJyYXknXSA9IGNvcmVfMS5PYnNlcnZhYmxlQXJyYXk7XHJcbmV4cG9ydHMuc2VydmljZU1vZHVsZSA9IGNvcmVfMS5tb2R1bGUoJ2FrYWxhLXNlcnZpY2VzJyk7XHJcbmZ1bmN0aW9uIHNlcnZpY2UobmFtZSwgLi4udG9JbmplY3QpIHtcclxuICAgIHJldHVybiBmdW5jdGlvbiAodGFyZ2V0KSB7XHJcbiAgICAgICAgdmFyIGluc3RhbmNlID0gbnVsbDtcclxuICAgICAgICBpZiAodG9JbmplY3QgPT0gbnVsbCB8fCB0b0luamVjdC5sZW5ndGggPT0gMCAmJiB0YXJnZXQubGVuZ3RoID4gMClcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdtaXNzaW5nIGluamVjdCBuYW1lcycpO1xyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgICAgZXhwb3J0cy5zZXJ2aWNlTW9kdWxlLnJlZ2lzdGVyRmFjdG9yeShuYW1lLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gaW5zdGFuY2UgfHwgZXhwb3J0cy5zZXJ2aWNlTW9kdWxlLmluamVjdFdpdGhOYW1lKHRvSW5qZWN0LCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSBbbnVsbF07XHJcbiAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3NbaSArIDFdID0gYXJndW1lbnRzW2ldO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBpbnN0YW5jZSA9IG5ldyAoRnVuY3Rpb24ucHJvdG90eXBlLmJpbmQuYXBwbHkodGFyZ2V0LCBhcmdzKSk7XHJcbiAgICAgICAgICAgICAgICB9KSgpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgIH07XHJcbn1cclxuZXhwb3J0cy5zZXJ2aWNlID0gc2VydmljZTtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9Y29tbW9uLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xyXG52YXIgX19kZWNvcmF0ZSA9ICh0aGlzICYmIHRoaXMuX19kZWNvcmF0ZSkgfHwgZnVuY3Rpb24gKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKSB7XHJcbiAgICB2YXIgYyA9IGFyZ3VtZW50cy5sZW5ndGgsIHIgPSBjIDwgMyA/IHRhcmdldCA6IGRlc2MgPT09IG51bGwgPyBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIGtleSkgOiBkZXNjLCBkO1xyXG4gICAgaWYgKHR5cGVvZiBSZWZsZWN0ID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiBSZWZsZWN0LmRlY29yYXRlID09PSBcImZ1bmN0aW9uXCIpIHIgPSBSZWZsZWN0LmRlY29yYXRlKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKTtcclxuICAgIGVsc2UgZm9yICh2YXIgaSA9IGRlY29yYXRvcnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIGlmIChkID0gZGVjb3JhdG9yc1tpXSkgciA9IChjIDwgMyA/IGQocikgOiBjID4gMyA/IGQodGFyZ2V0LCBrZXksIHIpIDogZCh0YXJnZXQsIGtleSkpIHx8IHI7XHJcbiAgICByZXR1cm4gYyA+IDMgJiYgciAmJiBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBrZXksIHIpLCByO1xyXG59O1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbmNvbnN0IGNvbnRyb2xfMSA9IHJlcXVpcmUoXCIuL2NvbnRyb2xcIik7XHJcbmNvbnN0IGNvcmVfMSA9IHJlcXVpcmUoXCJAYWthbGEvY29yZVwiKTtcclxubGV0IENsaWNrID0gY2xhc3MgQ2xpY2sgZXh0ZW5kcyBjb250cm9sXzEuQmFzZUNvbnRyb2wge1xyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgc3VwZXIoJ2NsaWNrJywgNDAwKTtcclxuICAgIH1cclxuICAgIGxpbmsoc2NvcGUsIGVsZW1lbnQsIHBhcmFtZXRlcikge1xyXG4gICAgICAgIGVsZW1lbnQuY2xpY2soZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBpZiAocGFyYW1ldGVyIGluc3RhbmNlb2YgY29yZV8xLkJpbmRpbmcpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBzY29wZS4kaW5qZWN0KHBhcmFtZXRlci5nZXRWYWx1ZSgpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gc2NvcGUuJGluamVjdChwYXJhbWV0ZXIpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG59O1xyXG5DbGljayA9IF9fZGVjb3JhdGUoW1xyXG4gICAgY29udHJvbF8xLmNvbnRyb2woKVxyXG5dLCBDbGljayk7XHJcbmV4cG9ydHMuQ2xpY2sgPSBDbGljaztcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9Y2xpY2suanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxuY29uc3QgZGkgPSByZXF1aXJlKFwiQGFrYWxhL2NvcmVcIik7XHJcbnZhciByZWdpc3RlcmVkQ29udHJvbHMgPSBbXTtcclxuZnVuY3Rpb24gY29udHJvbCguLi50b0luamVjdCkge1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uIChjdHJsKSB7XHJcbiAgICAgICAgaWYgKHJlZ2lzdGVyZWRDb250cm9scy5sZW5ndGggPT0gMClcclxuICAgICAgICAgICAgQ29udHJvbC5pbmplY3Rvci5pbml0KFtdLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICByZWdpc3RlcmVkQ29udHJvbHMuZm9yRWFjaChmdW5jdGlvbiAoY3RybCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGRpLmluamVjdE5ld1dpdGhOYW1lKGN0cmxbMF0sIGN0cmxbMV0pKCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgcmVnaXN0ZXJlZENvbnRyb2xzLnB1c2goW3RvSW5qZWN0LCBjdHJsXSk7XHJcbiAgICB9O1xyXG59XHJcbmV4cG9ydHMuY29udHJvbCA9IGNvbnRyb2w7XHJcbmNsYXNzIENvbnRyb2wge1xyXG4gICAgY29uc3RydWN0b3IoJCRuYW1lLCBwcmlvcml0eSA9IDUwMCkge1xyXG4gICAgICAgIHRoaXMuJCRuYW1lID0gJCRuYW1lO1xyXG4gICAgICAgIHRoaXMucHJpb3JpdHkgPSBwcmlvcml0eTtcclxuICAgICAgICBDb250cm9sLmluamVjdG9yLnJlZ2lzdGVyKCQkbmFtZSwgdGhpcyk7XHJcbiAgICB9XHJcbiAgICBzdGF0aWMgYXBwbHkoY29udHJvbHMsIGVsZW1lbnQsIHNjb3BlKSB7XHJcbiAgICAgICAgdmFyIGFwcGxpY2FibGVDb250cm9scyA9IFtdO1xyXG4gICAgICAgIHZhciByZXF1aXJlc05ld1Njb3BlID0gZmFsc2U7XHJcbiAgICAgICAgT2JqZWN0LmtleXMoY29udHJvbHMpLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xyXG4gICAgICAgICAgICB2YXIgY29udHJvbDtcclxuICAgICAgICAgICAgYXBwbGljYWJsZUNvbnRyb2xzLnB1c2goY29udHJvbCA9IENvbnRyb2wuaW5qZWN0b3IucmVzb2x2ZShrZXkpKTtcclxuICAgICAgICAgICAgaWYgKGNvbnRyb2wuc2NvcGUpXHJcbiAgICAgICAgICAgICAgICByZXF1aXJlc05ld1Njb3BlID0gdHJ1ZTtcclxuICAgICAgICB9KTtcclxuICAgICAgICBhcHBsaWNhYmxlQ29udHJvbHMuc29ydChmdW5jdGlvbiAoYSwgYikgeyByZXR1cm4gYS5wcmlvcml0eSAtIGIucHJpb3JpdHk7IH0pO1xyXG4gICAgICAgIGlmICghc2NvcGUpXHJcbiAgICAgICAgICAgIHNjb3BlID0gZWxlbWVudC5kYXRhKCckc2NvcGUnKTtcclxuICAgICAgICBpZiAocmVxdWlyZXNOZXdTY29wZSkge1xyXG4gICAgICAgICAgICBzY29wZSA9IHNjb3BlLiRuZXcoKTtcclxuICAgICAgICAgICAgZWxlbWVudC5kYXRhKCckc2NvcGUnLCBzY29wZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGZvciAodmFyIGNvbnRyb2wgb2YgYXBwbGljYWJsZUNvbnRyb2xzKSB7XHJcbiAgICAgICAgICAgIHZhciBjb250cm9sU2V0dGluZ3MgPSBjb250cm9sc1tjb250cm9sLiQkbmFtZV07XHJcbiAgICAgICAgICAgIGlmIChjb250cm9sU2V0dGluZ3MgaW5zdGFuY2VvZiBGdW5jdGlvbilcclxuICAgICAgICAgICAgICAgIGNvbnRyb2xTZXR0aW5ncyA9IGNvbnRyb2xTZXR0aW5ncyhzY29wZSwgdHJ1ZSk7XHJcbiAgICAgICAgICAgIHZhciBuZXdFbGVtID0gY29udHJvbC5pbnN0YW5jaWF0ZShzY29wZSwgZWxlbWVudCwgY29udHJvbFNldHRpbmdzLCBjb250cm9scyk7XHJcbiAgICAgICAgICAgIGlmIChuZXdFbGVtKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3RWxlbTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICA7XHJcbiAgICAgICAgZWxlbWVudC5maW5kKCdbZGF0YS1iaW5kXScpLmVhY2goZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBpZiAoJCh0aGlzKS5wYXJlbnQoKS5jbG9zZXN0KCdbZGF0YS1iaW5kXScpWzBdID09IGVsZW1lbnRbMF0pXHJcbiAgICAgICAgICAgICAgICAkKHRoaXMpLmFwcGx5VGVtcGxhdGUoc2NvcGUsIGVsZW1lbnQpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHJldHVybiBlbGVtZW50O1xyXG4gICAgfVxyXG4gICAgd3JhcChlbGVtZW50LCBzY29wZSwgbmV3Q29udHJvbHMpIHtcclxuICAgICAgICBpZiAobmV3Q29udHJvbHMpIHtcclxuICAgICAgICAgICAgdmFyIGNvbnRyb2xzID0gZGkuUGFyc2VyLnBhcnNlKGVsZW1lbnQuYXR0cignZGF0YS1iaW5kJyksIHRydWUpO1xyXG4gICAgICAgICAgICB2YXIgYXBwbGljYWJsZUNvbnRyb2xzID0gW107XHJcbiAgICAgICAgICAgIE9iamVjdC5rZXlzKGNvbnRyb2xzKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcclxuICAgICAgICAgICAgICAgIGFwcGxpY2FibGVDb250cm9scy5wdXNoKENvbnRyb2wuaW5qZWN0b3IucmVzb2x2ZShrZXkpKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIGFwcGxpY2FibGVDb250cm9scy5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7IHJldHVybiBhLnByaW9yaXR5IC0gYi5wcmlvcml0eTsgfSk7XHJcbiAgICAgICAgICAgIGFwcGxpY2FibGVDb250cm9scyA9IGFwcGxpY2FibGVDb250cm9scy5zbGljZShhcHBsaWNhYmxlQ29udHJvbHMuaW5kZXhPZih0aGlzKSArIDEpO1xyXG4gICAgICAgICAgICBuZXdDb250cm9scyA9IHt9O1xyXG4gICAgICAgICAgICBhcHBsaWNhYmxlQ29udHJvbHMuZm9yRWFjaChmdW5jdGlvbiAoY29udHJvbCkge1xyXG4gICAgICAgICAgICAgICAgbmV3Q29udHJvbHNbY29udHJvbC4kJG5hbWVdID0gY29udHJvbHNbY29udHJvbC4kJG5hbWVdO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIENvbnRyb2wuYXBwbHkobmV3Q29udHJvbHMsIGVsZW1lbnQsIHNjb3BlKTtcclxuICAgIH1cclxuICAgIGNsb25lKGVsZW1lbnQsIHNjb3BlLCBuZXdDb250cm9scykge1xyXG4gICAgICAgIHZhciBjbG9uZSA9IGVsZW1lbnQuY2xvbmUoKTtcclxuICAgICAgICBjbG9uZS5kYXRhKCckc2NvcGUnLCBzY29wZSk7XHJcbiAgICAgICAgdGhpcy53cmFwKGNsb25lLCBzY29wZSwgbmV3Q29udHJvbHMpO1xyXG4gICAgICAgIHJldHVybiBjbG9uZTtcclxuICAgIH1cclxufVxyXG5Db250cm9sLmluamVjdG9yID0gZGkubW9kdWxlKCdjb250cm9scycsICdha2FsYS1zZXJ2aWNlcycpO1xyXG5leHBvcnRzLkNvbnRyb2wgPSBDb250cm9sO1xyXG5jbGFzcyBCYXNlQ29udHJvbCBleHRlbmRzIENvbnRyb2wge1xyXG4gICAgY29uc3RydWN0b3IobmFtZSwgcHJpb3JpdHkpIHtcclxuICAgICAgICBzdXBlcihuYW1lLCBwcmlvcml0eSk7XHJcbiAgICB9XHJcbiAgICBpbnN0YW5jaWF0ZShzY29wZSwgZWxlbWVudCwgcGFyYW1ldGVyKSB7XHJcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgICAgIGRpLlByb21pc2lmeShzY29wZSkudGhlbihmdW5jdGlvbiAoc2NvcGUpIHtcclxuICAgICAgICAgICAgZGkuUHJvbWlzaWZ5KHBhcmFtZXRlcikudGhlbihmdW5jdGlvbiAocGFyYW1ldGVyKSB7XHJcbiAgICAgICAgICAgICAgICBzZWxmLmxpbmsoc2NvcGUsIGVsZW1lbnQsIHBhcmFtZXRlcik7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG59XHJcbmV4cG9ydHMuQmFzZUNvbnRyb2wgPSBCYXNlQ29udHJvbDtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9Y29udHJvbC5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcclxuZnVuY3Rpb24gX19leHBvcnQobSkge1xyXG4gICAgZm9yICh2YXIgcCBpbiBtKSBpZiAoIWV4cG9ydHMuaGFzT3duUHJvcGVydHkocCkpIGV4cG9ydHNbcF0gPSBtW3BdO1xyXG59XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxuX19leHBvcnQocmVxdWlyZShcIi4vY29udHJvbFwiKSk7XHJcbl9fZXhwb3J0KHJlcXVpcmUoXCIuL2ZvcmVhY2hcIikpO1xyXG5fX2V4cG9ydChyZXF1aXJlKFwiLi90ZXh0XCIpKTtcclxuX19leHBvcnQocmVxdWlyZShcIi4vdmFsdWVcIikpO1xyXG5fX2V4cG9ydChyZXF1aXJlKFwiLi9jc3NDbGFzc1wiKSk7XHJcbl9fZXhwb3J0KHJlcXVpcmUoXCIuL3BhcnRcIikpO1xyXG5fX2V4cG9ydChyZXF1aXJlKFwiLi9jbGlja1wiKSk7XHJcbl9fZXhwb3J0KHJlcXVpcmUoXCIuL29wdGlvbnNcIikpO1xyXG5fX2V4cG9ydChyZXF1aXJlKFwiLi9oaWRlXCIpKTtcclxuX19leHBvcnQocmVxdWlyZShcIi4vc3Bpbm5lclwiKSk7XHJcbl9fZXhwb3J0KHJlcXVpcmUoXCIuL3RyYW5zbGF0ZVwiKSk7XHJcbl9fZXhwb3J0KHJlcXVpcmUoXCIuL2pzb25cIikpO1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1jb250cm9scy5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcclxudmFyIF9fZGVjb3JhdGUgPSAodGhpcyAmJiB0aGlzLl9fZGVjb3JhdGUpIHx8IGZ1bmN0aW9uIChkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYykge1xyXG4gICAgdmFyIGMgPSBhcmd1bWVudHMubGVuZ3RoLCByID0gYyA8IDMgPyB0YXJnZXQgOiBkZXNjID09PSBudWxsID8gZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBrZXkpIDogZGVzYywgZDtcclxuICAgIGlmICh0eXBlb2YgUmVmbGVjdCA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgUmVmbGVjdC5kZWNvcmF0ZSA9PT0gXCJmdW5jdGlvblwiKSByID0gUmVmbGVjdC5kZWNvcmF0ZShkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYyk7XHJcbiAgICBlbHNlIGZvciAodmFyIGkgPSBkZWNvcmF0b3JzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSBpZiAoZCA9IGRlY29yYXRvcnNbaV0pIHIgPSAoYyA8IDMgPyBkKHIpIDogYyA+IDMgPyBkKHRhcmdldCwga2V5LCByKSA6IGQodGFyZ2V0LCBrZXkpKSB8fCByO1xyXG4gICAgcmV0dXJuIGMgPiAzICYmIHIgJiYgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwga2V5LCByKSwgcjtcclxufTtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5jb25zdCBjb250cm9sXzEgPSByZXF1aXJlKFwiLi9jb250cm9sXCIpO1xyXG5jb25zdCBjb3JlXzEgPSByZXF1aXJlKFwiQGFrYWxhL2NvcmVcIik7XHJcbmxldCBDc3NDbGFzcyA9IGNsYXNzIENzc0NsYXNzIGV4dGVuZHMgY29udHJvbF8xLkJhc2VDb250cm9sIHtcclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHN1cGVyKCdjbGFzcycsIDQwMCk7XHJcbiAgICB9XHJcbiAgICBsaW5rKHRhcmdldCwgZWxlbWVudCwgcGFyYW1ldGVyKSB7XHJcbiAgICAgICAgaWYgKHBhcmFtZXRlciBpbnN0YW5jZW9mIEFycmF5KSB7XHJcbiAgICAgICAgICAgIG5ldyBjb3JlXzEuT2JzZXJ2YWJsZUFycmF5KHBhcmFtZXRlcikub24oJ2NvbGxlY3Rpb25DaGFuZ2VkJywgZnVuY3Rpb24gKGFyZykge1xyXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSBpbiBhcmcubmV3SXRlbXMpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIChhcmcubmV3SXRlbXNbaV0pID09ICdzdHJpbmcnKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmFkZENsYXNzKGFyZy5uZXdJdGVtc1tpXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhcmcubmV3SXRlbXNbaV0gaW5zdGFuY2VvZiBjb3JlXzEuQmluZGluZykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXJnLm5ld0l0ZW1zW2ldLm9uQ2hhbmdlZChmdW5jdGlvbiAodGFyZ2V0LCBldmVudEFyZ3MpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmFkZENsYXNzKGFyZy5uZXdJdGVtc1tpXS5nZXRWYWx1ZSgpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gZWxlbWVudC50ZXh0KHBhcmFtZXRlci5nZXRWYWx1ZSgpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmFkZENsYXNzKGFyZy5uZXdJdGVtc1tpXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KS5pbml0KCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBPYmplY3Qua2V5cyhwYXJhbWV0ZXIpLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xyXG4gICAgICAgICAgICAgICAgcGFyYW1ldGVyW2tleV0ub25DaGFuZ2VkKGZ1bmN0aW9uIChldikge1xyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQudG9nZ2xlQ2xhc3Moa2V5LCBldi5ldmVudEFyZ3MudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICBlbGVtZW50LnRvZ2dsZUNsYXNzKGtleSwgcGFyYW1ldGVyW2tleV0uZ2V0VmFsdWUoKSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufTtcclxuQ3NzQ2xhc3MgPSBfX2RlY29yYXRlKFtcclxuICAgIGNvbnRyb2xfMS5jb250cm9sKClcclxuXSwgQ3NzQ2xhc3MpO1xyXG5leHBvcnRzLkNzc0NsYXNzID0gQ3NzQ2xhc3M7XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWNzc0NsYXNzLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xyXG52YXIgX19kZWNvcmF0ZSA9ICh0aGlzICYmIHRoaXMuX19kZWNvcmF0ZSkgfHwgZnVuY3Rpb24gKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKSB7XHJcbiAgICB2YXIgYyA9IGFyZ3VtZW50cy5sZW5ndGgsIHIgPSBjIDwgMyA/IHRhcmdldCA6IGRlc2MgPT09IG51bGwgPyBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIGtleSkgOiBkZXNjLCBkO1xyXG4gICAgaWYgKHR5cGVvZiBSZWZsZWN0ID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiBSZWZsZWN0LmRlY29yYXRlID09PSBcImZ1bmN0aW9uXCIpIHIgPSBSZWZsZWN0LmRlY29yYXRlKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKTtcclxuICAgIGVsc2UgZm9yICh2YXIgaSA9IGRlY29yYXRvcnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIGlmIChkID0gZGVjb3JhdG9yc1tpXSkgciA9IChjIDwgMyA/IGQocikgOiBjID4gMyA/IGQodGFyZ2V0LCBrZXksIHIpIDogZCh0YXJnZXQsIGtleSkpIHx8IHI7XHJcbiAgICByZXR1cm4gYyA+IDMgJiYgciAmJiBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBrZXksIHIpLCByO1xyXG59O1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbmNvbnN0IGRpID0gcmVxdWlyZShcIkBha2FsYS9jb3JlXCIpO1xyXG5jb25zdCBjb250cm9sXzEgPSByZXF1aXJlKFwiLi9jb250cm9sXCIpO1xyXG5sZXQgRm9yRWFjaCA9IEZvckVhY2hfMSA9IGNsYXNzIEZvckVhY2ggZXh0ZW5kcyBjb250cm9sXzEuQ29udHJvbCB7XHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICBzdXBlcignZWFjaCcsIDEwMCk7XHJcbiAgICB9XHJcbiAgICBpbnN0YW5jaWF0ZSh0YXJnZXQsIGVsZW1lbnQsIHBhcmFtZXRlcikge1xyXG4gICAgICAgIGlmICh0eXBlb2YgKHBhcmFtZXRlcikgPT0gJ3N0cmluZycpIHtcclxuICAgICAgICAgICAgcGFyYW1ldGVyID0gdGhpcy5wYXJzZShwYXJhbWV0ZXIpO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgc291cmNlID0gZGkuUGFyc2VyLmV2YWwocGFyYW1ldGVyLmluLCB0YXJnZXQpO1xyXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgICB2YXIgcGFyZW50ID0gZWxlbWVudC5wYXJlbnQoKTtcclxuICAgICAgICBlbGVtZW50LmRldGFjaCgpO1xyXG4gICAgICAgIC8vIHZhciBuZXdDb250cm9scztcclxuICAgICAgICByZXR1cm4gZGkuUHJvbWlzaWZ5KHNvdXJjZSkudGhlbihmdW5jdGlvbiAoc291cmNlKSB7XHJcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSAkKCk7XHJcbiAgICAgICAgICAgIGlmIChzb3VyY2UgaW5zdGFuY2VvZiBkaS5PYnNlcnZhYmxlQXJyYXkpIHtcclxuICAgICAgICAgICAgICAgIHNvdXJjZS5vbignY29sbGVjdGlvbkNoYW5nZWQnLCBmdW5jdGlvbiAoYXJncykge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBrZXkgPSAtMTtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgaXNBZGRlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaCAoYXJncy5hY3Rpb24pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAnaW5pdCc6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAnc2hpZnQnOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50LmVxKDApLnJlbW92ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ3BvcCc6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJlbnQuZXEoc291cmNlLmxlbmd0aCkucmVtb3ZlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAncHVzaCc6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgc2NvcGUgPSB0YXJnZXQuJG5ldygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBhcmFtZXRlci5rZXkpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGVbcGFyYW1ldGVyLmtleV0gPSBzb3VyY2UubGVuZ3RoIC0gMTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwYXJhbWV0ZXIudmFsdWUpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGVbcGFyYW1ldGVyLnZhbHVlXSA9IGFyZ3MubmV3SXRlbXNbMF07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJlbnQuYXBwZW5kKHNlbGYuY2xvbmUoZWxlbWVudCwgc2NvcGUsIHRydWUpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlICd1bnNoaWZ0JzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBzY29wZSA9IHRhcmdldC4kbmV3KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocGFyYW1ldGVyLmtleSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY29wZVtwYXJhbWV0ZXIua2V5XSA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocGFyYW1ldGVyLnZhbHVlKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlW3BhcmFtZXRlci52YWx1ZV0gPSBhcmdzLm5ld0l0ZW1zWzBdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50LnByZXBlbmQoc2VsZi5jbG9uZShlbGVtZW50LCBzY29wZSwgdHJ1ZSkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ3JlcGxhY2UnOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHNjb3BlID0gdGFyZ2V0LiRuZXcoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwYXJhbWV0ZXIua2V5KVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlW3BhcmFtZXRlci5rZXldID0gc291cmNlLmluZGV4T2YoYXJncy5uZXdJdGVtc1swXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocGFyYW1ldGVyLnZhbHVlKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlW3BhcmFtZXRlci52YWx1ZV0gPSBhcmdzLm5ld0l0ZW1zWzBdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50LmVxKHNvdXJjZS5pbmRleE9mKGFyZ3MubmV3SXRlbXNbMF0pKS5yZXBsYWNlV2l0aChzZWxmLmNsb25lKGVsZW1lbnQsIHNjb3BlLCB0cnVlKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIHNvdXJjZSA9IHNvdXJjZS5hcnJheTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAkLmVhY2goc291cmNlLCBmdW5jdGlvbiAoa2V5LCB2YWx1ZSkge1xyXG4gICAgICAgICAgICAgICAgdmFyIHNjb3BlID0gdGFyZ2V0LiRuZXcoKTtcclxuICAgICAgICAgICAgICAgIGlmIChwYXJhbWV0ZXIua2V5KVxyXG4gICAgICAgICAgICAgICAgICAgIHNjb3BlW3BhcmFtZXRlci5rZXldID0ga2V5O1xyXG4gICAgICAgICAgICAgICAgaWYgKHBhcmFtZXRlci52YWx1ZSlcclxuICAgICAgICAgICAgICAgICAgICBzY29wZVtwYXJhbWV0ZXIudmFsdWVdID0gdmFsdWU7XHJcbiAgICAgICAgICAgICAgICBwYXJlbnQuYXBwZW5kKHNlbGYuY2xvbmUoZWxlbWVudCwgc2NvcGUsIHRydWUpKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBwYXJzZShleHApIHtcclxuICAgICAgICB2YXIgcmVzdWx0ID0gRm9yRWFjaF8xLmV4cFJlZ2V4LmV4ZWMoZXhwKS5zbGljZSgxKTtcclxuICAgICAgICByZXR1cm4geyBpbjogcmVzdWx0WzJdLCBrZXk6IHJlc3VsdFsxXSAmJiByZXN1bHRbMF0sIHZhbHVlOiByZXN1bHRbMV0gfHwgcmVzdWx0WzBdIH07XHJcbiAgICB9XHJcbn07XHJcbkZvckVhY2guZXhwUmVnZXggPSAvXlxccypcXCg/KFxcdyspKD86LCAoXFx3KykpP1xcKT9cXHMraW5cXHMrKFxcdyspXFxzKi87XHJcbkZvckVhY2ggPSBGb3JFYWNoXzEgPSBfX2RlY29yYXRlKFtcclxuICAgIGNvbnRyb2xfMS5jb250cm9sKClcclxuXSwgRm9yRWFjaCk7XHJcbmV4cG9ydHMuRm9yRWFjaCA9IEZvckVhY2g7XHJcbnZhciBGb3JFYWNoXzE7XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWZvcmVhY2guanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbnZhciBfX2RlY29yYXRlID0gKHRoaXMgJiYgdGhpcy5fX2RlY29yYXRlKSB8fCBmdW5jdGlvbiAoZGVjb3JhdG9ycywgdGFyZ2V0LCBrZXksIGRlc2MpIHtcclxuICAgIHZhciBjID0gYXJndW1lbnRzLmxlbmd0aCwgciA9IGMgPCAzID8gdGFyZ2V0IDogZGVzYyA9PT0gbnVsbCA/IGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRhcmdldCwga2V5KSA6IGRlc2MsIGQ7XHJcbiAgICBpZiAodHlwZW9mIFJlZmxlY3QgPT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIFJlZmxlY3QuZGVjb3JhdGUgPT09IFwiZnVuY3Rpb25cIikgciA9IFJlZmxlY3QuZGVjb3JhdGUoZGVjb3JhdG9ycywgdGFyZ2V0LCBrZXksIGRlc2MpO1xyXG4gICAgZWxzZSBmb3IgKHZhciBpID0gZGVjb3JhdG9ycy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkgaWYgKGQgPSBkZWNvcmF0b3JzW2ldKSByID0gKGMgPCAzID8gZChyKSA6IGMgPiAzID8gZCh0YXJnZXQsIGtleSwgcikgOiBkKHRhcmdldCwga2V5KSkgfHwgcjtcclxuICAgIHJldHVybiBjID4gMyAmJiByICYmIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGtleSwgciksIHI7XHJcbn07XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxuY29uc3QgY29udHJvbF8xID0gcmVxdWlyZShcIi4vY29udHJvbFwiKTtcclxubGV0IEhpZGUgPSBjbGFzcyBIaWRlIGV4dGVuZHMgY29udHJvbF8xLkJhc2VDb250cm9sIHtcclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHN1cGVyKCdoaWRlJywgNDAwKTtcclxuICAgIH1cclxuICAgIGxpbmsodGFyZ2V0LCBlbGVtZW50LCBwYXJhbWV0ZXIpIHtcclxuICAgICAgICBwYXJhbWV0ZXIub25DaGFuZ2VkKGZ1bmN0aW9uIChldikge1xyXG4gICAgICAgICAgICBlbGVtZW50LnRvZ2dsZShldi5ldmVudEFyZ3MudmFsdWUpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG59O1xyXG5IaWRlID0gX19kZWNvcmF0ZShbXHJcbiAgICBjb250cm9sXzEuY29udHJvbCgpXHJcbl0sIEhpZGUpO1xyXG5leHBvcnRzLkhpZGUgPSBIaWRlO1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1oaWRlLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xyXG52YXIgX19kZWNvcmF0ZSA9ICh0aGlzICYmIHRoaXMuX19kZWNvcmF0ZSkgfHwgZnVuY3Rpb24gKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKSB7XHJcbiAgICB2YXIgYyA9IGFyZ3VtZW50cy5sZW5ndGgsIHIgPSBjIDwgMyA/IHRhcmdldCA6IGRlc2MgPT09IG51bGwgPyBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIGtleSkgOiBkZXNjLCBkO1xyXG4gICAgaWYgKHR5cGVvZiBSZWZsZWN0ID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiBSZWZsZWN0LmRlY29yYXRlID09PSBcImZ1bmN0aW9uXCIpIHIgPSBSZWZsZWN0LmRlY29yYXRlKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKTtcclxuICAgIGVsc2UgZm9yICh2YXIgaSA9IGRlY29yYXRvcnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIGlmIChkID0gZGVjb3JhdG9yc1tpXSkgciA9IChjIDwgMyA/IGQocikgOiBjID4gMyA/IGQodGFyZ2V0LCBrZXksIHIpIDogZCh0YXJnZXQsIGtleSkpIHx8IHI7XHJcbiAgICByZXR1cm4gYyA+IDMgJiYgciAmJiBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBrZXksIHIpLCByO1xyXG59O1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbmNvbnN0IGNvbnRyb2xfMSA9IHJlcXVpcmUoXCIuL2NvbnRyb2xcIik7XHJcbmNvbnN0IGNvcmVfMSA9IHJlcXVpcmUoXCJAYWthbGEvY29yZVwiKTtcclxubGV0IEpzb24gPSBjbGFzcyBKc29uIGV4dGVuZHMgY29udHJvbF8xLkJhc2VDb250cm9sIHtcclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHN1cGVyKCdqc29uJywgNDAwKTtcclxuICAgIH1cclxuICAgIGxpbmsodGFyZ2V0LCBlbGVtZW50LCBwYXJhbWV0ZXIpIHtcclxuICAgICAgICBpZiAocGFyYW1ldGVyIGluc3RhbmNlb2YgY29yZV8xLkJpbmRpbmcpIHtcclxuICAgICAgICAgICAgcGFyYW1ldGVyLm9uQ2hhbmdlZChmdW5jdGlvbiAoZXYpIHtcclxuICAgICAgICAgICAgICAgIGVsZW1lbnQudGV4dChKU09OLnN0cmluZ2lmeShldi5ldmVudEFyZ3MudmFsdWUpKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgICAgZWxlbWVudC50ZXh0KEpTT04uc3RyaW5naWZ5KHBhcmFtZXRlcikpO1xyXG4gICAgfVxyXG59O1xyXG5Kc29uID0gX19kZWNvcmF0ZShbXHJcbiAgICBjb250cm9sXzEuY29udHJvbCgpXHJcbl0sIEpzb24pO1xyXG5leHBvcnRzLkpzb24gPSBKc29uO1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1qc29uLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xyXG52YXIgX19kZWNvcmF0ZSA9ICh0aGlzICYmIHRoaXMuX19kZWNvcmF0ZSkgfHwgZnVuY3Rpb24gKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKSB7XHJcbiAgICB2YXIgYyA9IGFyZ3VtZW50cy5sZW5ndGgsIHIgPSBjIDwgMyA/IHRhcmdldCA6IGRlc2MgPT09IG51bGwgPyBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIGtleSkgOiBkZXNjLCBkO1xyXG4gICAgaWYgKHR5cGVvZiBSZWZsZWN0ID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiBSZWZsZWN0LmRlY29yYXRlID09PSBcImZ1bmN0aW9uXCIpIHIgPSBSZWZsZWN0LmRlY29yYXRlKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKTtcclxuICAgIGVsc2UgZm9yICh2YXIgaSA9IGRlY29yYXRvcnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIGlmIChkID0gZGVjb3JhdG9yc1tpXSkgciA9IChjIDwgMyA/IGQocikgOiBjID4gMyA/IGQodGFyZ2V0LCBrZXksIHIpIDogZCh0YXJnZXQsIGtleSkpIHx8IHI7XHJcbiAgICByZXR1cm4gYyA+IDMgJiYgciAmJiBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBrZXksIHIpLCByO1xyXG59O1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbmNvbnN0IGRpID0gcmVxdWlyZShcIkBha2FsYS9jb3JlXCIpO1xyXG5jb25zdCBjb250cm9sXzEgPSByZXF1aXJlKFwiLi9jb250cm9sXCIpO1xyXG5sZXQgT3B0aW9ucyA9IGNsYXNzIE9wdGlvbnMgZXh0ZW5kcyBjb250cm9sXzEuQ29udHJvbCB7XHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICBzdXBlcignb3B0aW9ucycsIDM1MCk7XHJcbiAgICB9XHJcbiAgICBpbnN0YW5jaWF0ZSh0YXJnZXQsIGVsZW1lbnQsIHBhcmFtZXRlciwgY29udHJvbHMpIHtcclxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICAgICAgdmFyIHZhbHVlID0gY29udHJvbHMudmFsdWU7XHJcbiAgICAgICAgaWYgKGNvbnRyb2xzLnZhbHVlIGluc3RhbmNlb2YgRnVuY3Rpb24pXHJcbiAgICAgICAgICAgIHZhbHVlID0gY29udHJvbHMudmFsdWUodGFyZ2V0LCB0cnVlKTtcclxuICAgICAgICBkZWxldGUgY29udHJvbHMudmFsdWU7XHJcbiAgICAgICAgLy8gdmFyIG5ld0NvbnRyb2xzO1xyXG4gICAgICAgIGRpLlByb21pc2lmeShwYXJhbWV0ZXIuaW4pLnRoZW4oZnVuY3Rpb24gKHNvdXJjZSkge1xyXG4gICAgICAgICAgICB2YXIgYXJyYXk7XHJcbiAgICAgICAgICAgIGlmIChzb3VyY2UgaW5zdGFuY2VvZiBkaS5CaW5kaW5nKVxyXG4gICAgICAgICAgICAgICAgYXJyYXkgPSBzb3VyY2UgPSBzb3VyY2UuZ2V0VmFsdWUoKTtcclxuICAgICAgICAgICAgaWYgKHBhcmFtZXRlci50ZXh0IGluc3RhbmNlb2YgZGkuQmluZGluZylcclxuICAgICAgICAgICAgICAgIHBhcmFtZXRlci50ZXh0ID0gcGFyYW1ldGVyLnRleHQuZXhwcmVzc2lvbjtcclxuICAgICAgICAgICAgaWYgKHBhcmFtZXRlci52YWx1ZSBpbnN0YW5jZW9mIGRpLkJpbmRpbmcpXHJcbiAgICAgICAgICAgICAgICBwYXJhbWV0ZXIudmFsdWUgPSBwYXJhbWV0ZXIudmFsdWUuZXhwcmVzc2lvbjtcclxuICAgICAgICAgICAgaWYgKHBhcmFtZXRlci50ZXh0WzBdICE9ICckJylcclxuICAgICAgICAgICAgICAgIHBhcmFtZXRlci50ZXh0ID0gJyRpdGVtLicgKyBwYXJhbWV0ZXIudGV4dDtcclxuICAgICAgICAgICAgaWYgKHBhcmFtZXRlci52YWx1ZVswXSAhPSAnJCcpXHJcbiAgICAgICAgICAgICAgICBwYXJhbWV0ZXIudmFsdWUgPSAnJGl0ZW0uJyArIHBhcmFtZXRlci52YWx1ZTtcclxuICAgICAgICAgICAgaWYgKHNvdXJjZSBpbnN0YW5jZW9mIGRpLk9ic2VydmFibGVBcnJheSkge1xyXG4gICAgICAgICAgICAgICAgdmFyIG9mZnNldCA9IGVsZW1lbnQuY2hpbGRyZW4oKS5sZW5ndGg7XHJcbiAgICAgICAgICAgICAgICBzb3VyY2Uub24oJ2NvbGxlY3Rpb25DaGFuZ2VkJywgZnVuY3Rpb24gKGFyZ3MpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIga2V5ID0gLTE7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGlzQWRkZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKGFyZ3MuYWN0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ2luaXQnOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ3NoaWZ0JzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuY2hpbGRyZW4oKS5lcShvZmZzZXQpLnJlbW92ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ3BvcCc6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmNoaWxkcmVuKCkuZXEodGhpcy5sZW5ndGgpLnJlbW92ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ3B1c2gnOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHNjb3BlID0gdGFyZ2V0LiRuZXcoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlWycka2V5J10gPSB0aGlzLmxlbmd0aCAtIDE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY29wZVsnJHZhbHVlJ10gPSBhcmdzLm5ld0l0ZW1zWzBdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5hcHBlbmQoc2VsZi5jbG9uZSgkKCc8b3B0aW9uIGRhdGEtYmluZD1cInt2YWx1ZTogJyArIHBhcmFtZXRlci52YWx1ZSArICcsIHRleHQ6JyArIHBhcmFtZXRlci50ZXh0ICsgJ31cIiAvPicpLCBzY29wZSwgdHJ1ZSkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ3Vuc2hpZnQnOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHNjb3BlID0gdGFyZ2V0LiRuZXcoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlWycka2V5J10gPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGVbJyR2YWx1ZSddID0gYXJncy5uZXdJdGVtc1swXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQucHJlcGVuZChzZWxmLmNsb25lKCQoJzxvcHRpb24gZGF0YS1iaW5kPVwie3ZhbHVlOiAnICsgcGFyYW1ldGVyLnZhbHVlICsgJywgdGV4dDonICsgcGFyYW1ldGVyLnRleHQgKyAnfVwiIC8+JyksIHNjb3BlLCB0cnVlKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAncmVwbGFjZSc6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgc2NvcGUgPSB0YXJnZXQuJG5ldygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGVbJyRrZXknXSA9IHRoaXMuaW5kZXhPZihhcmdzLm5ld0l0ZW1zWzBdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlWyckdmFsdWUnXSA9IGFyZ3MubmV3SXRlbXNbMF07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmVxKG9mZnNldCArIHRoaXMuaW5kZXhPZihhcmdzLm5ld0l0ZW1zWzBdKSkucmVwbGFjZVdpdGgoc2VsZi5jbG9uZSgkKCc8b3B0aW9uIGRhdGEtYmluZD1cInt2YWx1ZTogJyArIHBhcmFtZXRlci52YWx1ZSArICcsIHRleHQ6JyArIHBhcmFtZXRlci50ZXh0ICsgJ31cIiAvPicpLCBzY29wZSwgdHJ1ZSkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICBhcnJheSA9IHNvdXJjZS5hcnJheTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAodHlwZW9mIChhcnJheSkgPT0gJ3VuZGVmaW5lZCcpXHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2ludmFsaWQgYXJyYXkgdHlwZScpO1xyXG4gICAgICAgICAgICAkLmVhY2goYXJyYXksIGZ1bmN0aW9uIChrZXksIHZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgc2NvcGUgPSB0YXJnZXQuJG5ldygpO1xyXG4gICAgICAgICAgICAgICAgc2NvcGVbJyRrZXknXSA9IGtleTtcclxuICAgICAgICAgICAgICAgIHNjb3BlWyckaXRlbSddID0gdmFsdWU7XHJcbiAgICAgICAgICAgICAgICBlbGVtZW50LmFwcGVuZChzZWxmLmNsb25lKCQoJzxvcHRpb24gZGF0YS1iaW5kPVwie3ZhbHVlOiAnICsgcGFyYW1ldGVyLnZhbHVlICsgJywgdGV4dDonICsgcGFyYW1ldGVyLnRleHQgKyAnfVwiIC8+JyksIHNjb3BlLCB0cnVlKSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBlbGVtZW50LmNoYW5nZShmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgdmFsID0gZWxlbWVudC52YWwoKTtcclxuICAgICAgICAgICAgICAgIHZhciBtb2RlbCA9ICQuZ3JlcChhcnJheSwgZnVuY3Rpb24gKGl0LCBpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbCA9PSBkaS5QYXJzZXIuZXZhbChwYXJhbWV0ZXIudmFsdWUsIHsgJGl0ZW06IGl0LCAka2V5OiBpIH0pO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICBpZiAobW9kZWwubGVuZ3RoID09IDApXHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUuc2V0VmFsdWUodmFsLCB2YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWUuc2V0VmFsdWUobW9kZWxbMF0sIHZhbHVlKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHZhbHVlLm9uQ2hhbmdlZChmdW5jdGlvbiAoZXYpIHtcclxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZSAhPT0gZXYuc291cmNlKVxyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQudmFsKGRpLlBhcnNlci5ldmFsKHBhcmFtZXRlci52YWx1ZSwgZXYuZXZlbnRBcmdzLnZhbHVlKSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG59O1xyXG5PcHRpb25zID0gX19kZWNvcmF0ZShbXHJcbiAgICBjb250cm9sXzEuY29udHJvbCgpXHJcbl0sIE9wdGlvbnMpO1xyXG5leHBvcnRzLk9wdGlvbnMgPSBPcHRpb25zO1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1vcHRpb25zLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xyXG52YXIgX19kZWNvcmF0ZSA9ICh0aGlzICYmIHRoaXMuX19kZWNvcmF0ZSkgfHwgZnVuY3Rpb24gKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKSB7XHJcbiAgICB2YXIgYyA9IGFyZ3VtZW50cy5sZW5ndGgsIHIgPSBjIDwgMyA/IHRhcmdldCA6IGRlc2MgPT09IG51bGwgPyBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIGtleSkgOiBkZXNjLCBkO1xyXG4gICAgaWYgKHR5cGVvZiBSZWZsZWN0ID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiBSZWZsZWN0LmRlY29yYXRlID09PSBcImZ1bmN0aW9uXCIpIHIgPSBSZWZsZWN0LmRlY29yYXRlKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKTtcclxuICAgIGVsc2UgZm9yICh2YXIgaSA9IGRlY29yYXRvcnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIGlmIChkID0gZGVjb3JhdG9yc1tpXSkgciA9IChjIDwgMyA/IGQocikgOiBjID4gMyA/IGQodGFyZ2V0LCBrZXksIHIpIDogZCh0YXJnZXQsIGtleSkpIHx8IHI7XHJcbiAgICByZXR1cm4gYyA+IDMgJiYgciAmJiBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBrZXksIHIpLCByO1xyXG59O1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbmNvbnN0IGNvbnRyb2xfMSA9IHJlcXVpcmUoXCIuL2NvbnRyb2xcIik7XHJcbmxldCBQYXJ0ID0gY2xhc3MgUGFydCBleHRlbmRzIGNvbnRyb2xfMS5CYXNlQ29udHJvbCB7XHJcbiAgICBjb25zdHJ1Y3RvcihwYXJ0U2VydmljZSkge1xyXG4gICAgICAgIHN1cGVyKCdwYXJ0JywgMTAwKTtcclxuICAgICAgICB0aGlzLnBhcnRTZXJ2aWNlID0gcGFydFNlcnZpY2U7XHJcbiAgICB9XHJcbiAgICBsaW5rKHRhcmdldCwgZWxlbWVudCwgcGFyYW1ldGVyKSB7XHJcbiAgICAgICAgdmFyIHBhcnRTZXJ2aWNlID0gdGhpcy5wYXJ0U2VydmljZTtcclxuICAgICAgICBpZiAodHlwZW9mIHBhcmFtZXRlciAhPSAnc3RyaW5nJykge1xyXG4gICAgICAgICAgICBwYXJhbWV0ZXJbJ3RlbXBsYXRlJ10ub25DaGFuZ2VkKGZ1bmN0aW9uIChldikge1xyXG4gICAgICAgICAgICAgICAgcGFydFNlcnZpY2UuYXBwbHkoZnVuY3Rpb24gKCkgeyByZXR1cm4geyBzY29wZTogcGFyYW1ldGVyLCBlbGVtZW50OiBlbGVtZW50IH07IH0sIHsgY29udHJvbGxlcjogcGFyYW1ldGVyLmNvbnRyb2xsZXIsIHRlbXBsYXRlOiBldi5ldmVudEFyZ3MudmFsdWUgfSwge30sICQubm9vcCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgIHBhcnRTZXJ2aWNlLnJlZ2lzdGVyKHBhcmFtZXRlciwgeyBzY29wZTogdGFyZ2V0LCBlbGVtZW50OiBlbGVtZW50IH0pO1xyXG4gICAgfVxyXG59O1xyXG5QYXJ0ID0gX19kZWNvcmF0ZShbXHJcbiAgICBjb250cm9sXzEuY29udHJvbChcIiRwYXJ0XCIpXHJcbl0sIFBhcnQpO1xyXG5leHBvcnRzLlBhcnQgPSBQYXJ0O1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1wYXJ0LmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xyXG52YXIgX19kZWNvcmF0ZSA9ICh0aGlzICYmIHRoaXMuX19kZWNvcmF0ZSkgfHwgZnVuY3Rpb24gKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKSB7XHJcbiAgICB2YXIgYyA9IGFyZ3VtZW50cy5sZW5ndGgsIHIgPSBjIDwgMyA/IHRhcmdldCA6IGRlc2MgPT09IG51bGwgPyBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIGtleSkgOiBkZXNjLCBkO1xyXG4gICAgaWYgKHR5cGVvZiBSZWZsZWN0ID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiBSZWZsZWN0LmRlY29yYXRlID09PSBcImZ1bmN0aW9uXCIpIHIgPSBSZWZsZWN0LmRlY29yYXRlKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKTtcclxuICAgIGVsc2UgZm9yICh2YXIgaSA9IGRlY29yYXRvcnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIGlmIChkID0gZGVjb3JhdG9yc1tpXSkgciA9IChjIDwgMyA/IGQocikgOiBjID4gMyA/IGQodGFyZ2V0LCBrZXksIHIpIDogZCh0YXJnZXQsIGtleSkpIHx8IHI7XHJcbiAgICByZXR1cm4gYyA+IDMgJiYgciAmJiBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBrZXksIHIpLCByO1xyXG59O1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbmNvbnN0IGRpID0gcmVxdWlyZShcIkBha2FsYS9jb3JlXCIpO1xyXG5jb25zdCBjb250cm9sXzEgPSByZXF1aXJlKFwiLi9jb250cm9sXCIpO1xyXG5sZXQgU3Bpbm5lciA9IGNsYXNzIFNwaW5uZXIgZXh0ZW5kcyBjb250cm9sXzEuQ29udHJvbCB7XHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICBzdXBlcignc3Bpbm5lcicsIDUwKTtcclxuICAgIH1cclxuICAgIGluc3RhbmNpYXRlKHRhcmdldCwgZWxlbWVudCwgcGFyYW1ldGVyKSB7XHJcbiAgICAgICAgdmFyIHBhcmVudCA9IGVsZW1lbnQucGFyZW50KCk7XHJcbiAgICAgICAgdmFyIHdyYXBwZWQgPSB0aGlzLndyYXAoZWxlbWVudCwgdGFyZ2V0LCB0cnVlKTtcclxuICAgICAgICB2YXIgc2V0dGluZ3MgPSB7fTtcclxuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShwYXJhbWV0ZXIpKVxyXG4gICAgICAgICAgICBzZXR0aW5ncy5jbGFzc2VzID0gcGFyYW1ldGVyO1xyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgICAgc2V0dGluZ3MuY2xhc3NlcyA9IHBhcmFtZXRlci5jbGFzc2VzIHx8ICdmYSBmYS1zcGluIGZhLTN4IGZhLWNpcmNsZS1vLW5vdGNoJztcclxuICAgICAgICBpZiAod3JhcHBlZCAhPSBlbGVtZW50ICYmIGRpLmlzUHJvbWlzZUxpa2Uod3JhcHBlZCkpIHtcclxuICAgICAgICAgICAgdmFyIHNwaW5uZXI7XHJcbiAgICAgICAgICAgIGlmIChlbGVtZW50WzBdLnRhZ05hbWUudG9Mb3dlckNhc2UoKSA9PSAndHInKSB7XHJcbiAgICAgICAgICAgICAgICBzcGlubmVyID0gJCgnPHRyIGNsYXNzPVwic3Bpbm5lclwiPjx0ZCBjb2xzcGFuPVwiOTlcIj48L3RkPjwvdHI+JykuYXBwZW5kVG8ocGFyZW50KTtcclxuICAgICAgICAgICAgICAgIHBhcmVudCA9IHNwaW5uZXIuZmluZCgndGQnKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBzcGlubmVyID0gJCgnPHNwYW4gY2xhc3M9XCJzcGlubmVyXCI+PC9zcGFuPicpO1xyXG4gICAgICAgICAgICBzcGlubmVyLmFkZENsYXNzKHNldHRpbmdzLmNsYXNzZXMpO1xyXG4gICAgICAgICAgICBzcGlubmVyLmFwcGVuZFRvKHBhcmVudCk7XHJcbiAgICAgICAgICAgIHdyYXBwZWQudGhlbihmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICBzcGlubmVyLnJlbW92ZSgpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHdyYXBwZWQ7XHJcbiAgICB9XHJcbn07XHJcblNwaW5uZXIgPSBfX2RlY29yYXRlKFtcclxuICAgIGNvbnRyb2xfMS5jb250cm9sKClcclxuXSwgU3Bpbm5lcik7XHJcbmV4cG9ydHMuU3Bpbm5lciA9IFNwaW5uZXI7XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXNwaW5uZXIuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbnZhciBfX2RlY29yYXRlID0gKHRoaXMgJiYgdGhpcy5fX2RlY29yYXRlKSB8fCBmdW5jdGlvbiAoZGVjb3JhdG9ycywgdGFyZ2V0LCBrZXksIGRlc2MpIHtcclxuICAgIHZhciBjID0gYXJndW1lbnRzLmxlbmd0aCwgciA9IGMgPCAzID8gdGFyZ2V0IDogZGVzYyA9PT0gbnVsbCA/IGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRhcmdldCwga2V5KSA6IGRlc2MsIGQ7XHJcbiAgICBpZiAodHlwZW9mIFJlZmxlY3QgPT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIFJlZmxlY3QuZGVjb3JhdGUgPT09IFwiZnVuY3Rpb25cIikgciA9IFJlZmxlY3QuZGVjb3JhdGUoZGVjb3JhdG9ycywgdGFyZ2V0LCBrZXksIGRlc2MpO1xyXG4gICAgZWxzZSBmb3IgKHZhciBpID0gZGVjb3JhdG9ycy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkgaWYgKGQgPSBkZWNvcmF0b3JzW2ldKSByID0gKGMgPCAzID8gZChyKSA6IGMgPiAzID8gZCh0YXJnZXQsIGtleSwgcikgOiBkKHRhcmdldCwga2V5KSkgfHwgcjtcclxuICAgIHJldHVybiBjID4gMyAmJiByICYmIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGtleSwgciksIHI7XHJcbn07XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxuY29uc3QgY29udHJvbF8xID0gcmVxdWlyZShcIi4vY29udHJvbFwiKTtcclxuY29uc3QgY29yZV8xID0gcmVxdWlyZShcIkBha2FsYS9jb3JlXCIpO1xyXG5sZXQgVGV4dCA9IGNsYXNzIFRleHQgZXh0ZW5kcyBjb250cm9sXzEuQmFzZUNvbnRyb2wge1xyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgc3VwZXIoJ3RleHQnLCA0MDApO1xyXG4gICAgfVxyXG4gICAgbGluayh0YXJnZXQsIGVsZW1lbnQsIHBhcmFtZXRlcikge1xyXG4gICAgICAgIGlmIChwYXJhbWV0ZXIgaW5zdGFuY2VvZiBjb3JlXzEuQmluZGluZykge1xyXG4gICAgICAgICAgICBwYXJhbWV0ZXIub25DaGFuZ2VkKGZ1bmN0aW9uIChldikge1xyXG4gICAgICAgICAgICAgICAgZWxlbWVudC50ZXh0KGV2LmV2ZW50QXJncy52YWx1ZSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgIGVsZW1lbnQudGV4dChwYXJhbWV0ZXIpO1xyXG4gICAgfVxyXG59O1xyXG5UZXh0ID0gX19kZWNvcmF0ZShbXHJcbiAgICBjb250cm9sXzEuY29udHJvbCgpXHJcbl0sIFRleHQpO1xyXG5leHBvcnRzLlRleHQgPSBUZXh0O1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD10ZXh0LmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xyXG52YXIgX19kZWNvcmF0ZSA9ICh0aGlzICYmIHRoaXMuX19kZWNvcmF0ZSkgfHwgZnVuY3Rpb24gKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKSB7XHJcbiAgICB2YXIgYyA9IGFyZ3VtZW50cy5sZW5ndGgsIHIgPSBjIDwgMyA/IHRhcmdldCA6IGRlc2MgPT09IG51bGwgPyBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIGtleSkgOiBkZXNjLCBkO1xyXG4gICAgaWYgKHR5cGVvZiBSZWZsZWN0ID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiBSZWZsZWN0LmRlY29yYXRlID09PSBcImZ1bmN0aW9uXCIpIHIgPSBSZWZsZWN0LmRlY29yYXRlKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKTtcclxuICAgIGVsc2UgZm9yICh2YXIgaSA9IGRlY29yYXRvcnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIGlmIChkID0gZGVjb3JhdG9yc1tpXSkgciA9IChjIDwgMyA/IGQocikgOiBjID4gMyA/IGQodGFyZ2V0LCBrZXksIHIpIDogZCh0YXJnZXQsIGtleSkpIHx8IHI7XHJcbiAgICByZXR1cm4gYyA+IDMgJiYgciAmJiBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBrZXksIHIpLCByO1xyXG59O1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbmNvbnN0IGRpID0gcmVxdWlyZShcIkBha2FsYS9jb3JlXCIpO1xyXG5jb25zdCBjb250cm9sXzEgPSByZXF1aXJlKFwiLi9jb250cm9sXCIpO1xyXG5jb25zdCBjb3JlXzEgPSByZXF1aXJlKFwiQGFrYWxhL2NvcmVcIik7XHJcbmRpLnJlZ2lzdGVyRmFjdG9yeSgnJHRyYW5zbGF0b3InLCBkaS5pbmplY3RXaXRoTmFtZShbJyR0cmFuc2xhdGlvbnMnXSwgZnVuY3Rpb24gKHRyYW5zbGF0aW9ucykge1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uIChrZXksIC4uLnBhcmFtZXRlcnMpIHtcclxuICAgICAgICBpZiAoIXBhcmFtZXRlcnMpXHJcbiAgICAgICAgICAgIHJldHVybiB0cmFuc2xhdGlvbnMgJiYgdHJhbnNsYXRpb25zW2tleV0gfHwga2V5O1xyXG4gICAgICAgIHJldHVybiAodHJhbnNsYXRpb25zICYmIHRyYW5zbGF0aW9uc1trZXldIHx8IGtleSkucmVwbGFjZSgvXFx7XFxkK1xcfS9nLCBmdW5jdGlvbiAobSkge1xyXG4gICAgICAgICAgICByZXR1cm4gcGFyYW1ldGVyc1ttXTtcclxuICAgICAgICB9KTtcclxuICAgIH07XHJcbn0pKTtcclxubGV0IFRyYW5zbGF0ZSA9IGNsYXNzIFRyYW5zbGF0ZSBleHRlbmRzIGNvbnRyb2xfMS5CYXNlQ29udHJvbCB7XHJcbiAgICBjb25zdHJ1Y3Rvcih0cmFuc2xhdG9yKSB7XHJcbiAgICAgICAgc3VwZXIoJ3RyYW5zbGF0ZScsIDQwMCk7XHJcbiAgICAgICAgdGhpcy50cmFuc2xhdG9yID0gdHJhbnNsYXRvcjtcclxuICAgIH1cclxuICAgIGxpbmsodGFyZ2V0LCBlbGVtZW50LCBwYXJhbWV0ZXIpIHtcclxuICAgICAgICB2YXIgdHJhbnNsYXRvciA9IHRoaXMudHJhbnNsYXRvcjtcclxuICAgICAgICBpZiAocGFyYW1ldGVyIGluc3RhbmNlb2YgY29yZV8xLkJpbmRpbmcpIHtcclxuICAgICAgICAgICAgcGFyYW1ldGVyLm9uQ2hhbmdlZChmdW5jdGlvbiAoZXYpIHtcclxuICAgICAgICAgICAgICAgIGVsZW1lbnQudGV4dCh0cmFuc2xhdG9yKGV2LmV2ZW50QXJncy52YWx1ZSkpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICBlbGVtZW50LnRleHQodHJhbnNsYXRvcihwYXJhbWV0ZXIpKTtcclxuICAgIH1cclxufTtcclxuVHJhbnNsYXRlID0gX19kZWNvcmF0ZShbXHJcbiAgICBjb250cm9sXzEuY29udHJvbCgnJHRyYW5zbGF0b3InKVxyXG5dLCBUcmFuc2xhdGUpO1xyXG5leHBvcnRzLlRyYW5zbGF0ZSA9IFRyYW5zbGF0ZTtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9dHJhbnNsYXRlLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xyXG52YXIgX19kZWNvcmF0ZSA9ICh0aGlzICYmIHRoaXMuX19kZWNvcmF0ZSkgfHwgZnVuY3Rpb24gKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKSB7XHJcbiAgICB2YXIgYyA9IGFyZ3VtZW50cy5sZW5ndGgsIHIgPSBjIDwgMyA/IHRhcmdldCA6IGRlc2MgPT09IG51bGwgPyBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIGtleSkgOiBkZXNjLCBkO1xyXG4gICAgaWYgKHR5cGVvZiBSZWZsZWN0ID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiBSZWZsZWN0LmRlY29yYXRlID09PSBcImZ1bmN0aW9uXCIpIHIgPSBSZWZsZWN0LmRlY29yYXRlKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKTtcclxuICAgIGVsc2UgZm9yICh2YXIgaSA9IGRlY29yYXRvcnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIGlmIChkID0gZGVjb3JhdG9yc1tpXSkgciA9IChjIDwgMyA/IGQocikgOiBjID4gMyA/IGQodGFyZ2V0LCBrZXksIHIpIDogZCh0YXJnZXQsIGtleSkpIHx8IHI7XHJcbiAgICByZXR1cm4gYyA+IDMgJiYgciAmJiBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBrZXksIHIpLCByO1xyXG59O1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbmNvbnN0IGRpID0gcmVxdWlyZShcIkBha2FsYS9jb3JlXCIpO1xyXG5jb25zdCBjb250cm9sXzEgPSByZXF1aXJlKFwiLi9jb250cm9sXCIpO1xyXG5sZXQgVmFsdWUgPSBjbGFzcyBWYWx1ZSBleHRlbmRzIGNvbnRyb2xfMS5CYXNlQ29udHJvbCB7XHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICBzdXBlcigndmFsdWUnLCA0MDApO1xyXG4gICAgfVxyXG4gICAgbGluayh0YXJnZXQsIGVsZW1lbnQsIHBhcmFtZXRlcikge1xyXG4gICAgICAgIGlmICh0eXBlb2YgKHBhcmFtZXRlcikgPT0gJ3VuZGVmaW5lZCcpXHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICBpZiAocGFyYW1ldGVyIGluc3RhbmNlb2YgZGkuQmluZGluZykge1xyXG4gICAgICAgICAgICBlbGVtZW50LmNoYW5nZShmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICBwYXJhbWV0ZXIuc2V0VmFsdWUoZWxlbWVudC52YWwoKSwgcGFyYW1ldGVyKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHBhcmFtZXRlci5vbkNoYW5nZWQoZnVuY3Rpb24gKGV2KSB7XHJcbiAgICAgICAgICAgICAgICBpZiAocGFyYW1ldGVyICE9PSBldi5zb3VyY2UpXHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudC52YWwoZXYuZXZlbnRBcmdzLnZhbHVlKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgICAgZWxlbWVudC52YWwocGFyYW1ldGVyKTtcclxuICAgIH1cclxufTtcclxuVmFsdWUgPSBfX2RlY29yYXRlKFtcclxuICAgIGNvbnRyb2xfMS5jb250cm9sKClcclxuXSwgVmFsdWUpO1xyXG5leHBvcnRzLlZhbHVlID0gVmFsdWU7XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXZhbHVlLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbmNvbnN0IHVybF8xID0gcmVxdWlyZShcInVybFwiKTtcclxuY29uc3QgZGkgPSByZXF1aXJlKFwiQGFrYWxhL2NvcmVcIik7XHJcbi8vIEBzZXJ2aWNlKCckaHR0cCcpXHJcbmNsYXNzIEh0dHAge1xyXG4gICAgY29uc3RydWN0b3IoKSB7IH1cclxuICAgIGdldCh1cmwsIHBhcmFtcykge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmNhbGwoJ0dFVCcsIHVybCwgcGFyYW1zKTtcclxuICAgIH1cclxuICAgIGdldEpTT04odXJsLCBwYXJhbXMpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5nZXQodXJsLCBwYXJhbXMpLnRoZW4oZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgcmV0dXJuIEpTT04ucGFyc2UoZGF0YSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBjYWxsKG1ldGhvZCwgdXJsLCBwYXJhbXMpIHtcclxuICAgICAgICB2YXIgdXJpID0gdXJsXzEucGFyc2UodXJsKTtcclxuICAgICAgICB1cmkucXVlcnkgPSAkLmV4dGVuZCh7fSwgdXJpLnF1ZXJ5LCBwYXJhbXMpO1xyXG4gICAgICAgIHZhciByZXEgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcclxuICAgICAgICByZXEub3BlbihtZXRob2QsIHVybF8xLmZvcm1hdCh1cmkpLCB0cnVlKTtcclxuICAgICAgICB2YXIgZGVmZXJyZWQgPSBuZXcgZGkuRGVmZXJyZWQoKTtcclxuICAgICAgICByZXEub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24gKGFFdnQpIHtcclxuICAgICAgICAgICAgaWYgKHJlcS5yZWFkeVN0YXRlID09IDQpIHtcclxuICAgICAgICAgICAgICAgIGlmIChyZXEuc3RhdHVzID09IDIwMClcclxuICAgICAgICAgICAgICAgICAgICBkZWZlcnJlZC5yZXNvbHZlKHJlcS5yZXNwb25zZVRleHQpO1xyXG4gICAgICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlamVjdChyZXEucmVzcG9uc2VUZXh0KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgcmVxLnNlbmQobnVsbCk7XHJcbiAgICAgICAgcmV0dXJuIGRlZmVycmVkO1xyXG4gICAgfVxyXG59XHJcbmV4cG9ydHMuSHR0cCA9IEh0dHA7XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWh0dHAuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxuY29uc3QgZXZlbnRzXzEgPSByZXF1aXJlKFwiZXZlbnRzXCIpO1xyXG5jb25zdCBjb3JlXzEgPSByZXF1aXJlKFwiQGFrYWxhL2NvcmVcIik7XHJcbi8qKlxyXG4gKiBQcmV2aW91cyBjb250ZXh0LCBmb3IgY2FwdHVyaW5nXHJcbiAqIHBhZ2UgZXhpdCBldmVudHMuXHJcbiAqL1xyXG52YXIgcHJldkNvbnRleHQ7XHJcbi8qKlxyXG4gKiBQZXJmb3JtIGluaXRpYWwgZGlzcGF0Y2guXHJcbiAqL1xyXG52YXIgZGlzcGF0Y2ggPSB0cnVlO1xyXG4vKipcclxuICogRGVjb2RlIFVSTCBjb21wb25lbnRzIChxdWVyeSBzdHJpbmcsIHBhdGhuYW1lLCBoYXNoKS5cclxuICogQWNjb21tb2RhdGVzIGJvdGggcmVndWxhciBwZXJjZW50IGVuY29kaW5nIGFuZCB4LXd3dy1mb3JtLXVybGVuY29kZWQgZm9ybWF0LlxyXG4gKi9cclxudmFyIGRlY29kZVVSTENvbXBvbmVudHMgPSB0cnVlO1xyXG4vKipcclxuICogQmFzZSBwYXRoLlxyXG4gKi9cclxudmFyIGJhc2UgPSAnJztcclxuLyoqXHJcbiAqIFJ1bm5pbmcgZmxhZy5cclxuICovXHJcbnZhciBydW5uaW5nO1xyXG4vKipcclxuICogSGFzaEJhbmcgb3B0aW9uXHJcbiAqL1xyXG52YXIgaGFzaGJhbmcgPSBmYWxzZTtcclxuLyoqXHJcbiAqIERldGVjdCBjbGljayBldmVudFxyXG4gKi9cclxudmFyIGNsaWNrRXZlbnQgPSAoJ3VuZGVmaW5lZCcgIT09IHR5cGVvZiBkb2N1bWVudCkgJiYgZG9jdW1lbnQub250b3VjaHN0YXJ0ID8gJ3RvdWNoc3RhcnQnIDogJ2NsaWNrJztcclxuY2xhc3MgTG9jYXRpb25TZXJ2aWNlIGV4dGVuZHMgZXZlbnRzXzEuRXZlbnRFbWl0dGVyIHtcclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHN1cGVyKCk7XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogQ3VycmVudCBwYXRoIGJlaW5nIHByb2Nlc3NlZFxyXG4gICAgICAgICAqIEB0eXBlIHtzdHJpbmd9XHJcbiAgICAgICAgICovXHJcbiAgICAgICAgdGhpcy5jdXJyZW50ID0gJyc7XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogTnVtYmVyIG9mIHBhZ2VzIG5hdmlnYXRlZCB0by5cclxuICAgICAgICAgKiBAdHlwZSB7bnVtYmVyfVxyXG4gICAgICAgICAqXHJcbiAgICAgICAgICogICAgIHBhZ2UubGVuID09IDA7XHJcbiAgICAgICAgICogICAgIHBhZ2UoJy9sb2dpbicpO1xyXG4gICAgICAgICAqICAgICBwYWdlLmxlbiA9PSAxO1xyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHRoaXMubGVuID0gMDtcclxuICAgIH1cclxuICAgIHN0YXJ0KG9wdGlvbnMpIHtcclxuICAgICAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcclxuICAgICAgICBpZiAocnVubmluZylcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIHJ1bm5pbmcgPSB0cnVlO1xyXG4gICAgICAgIGlmIChmYWxzZSA9PT0gb3B0aW9ucy5kaXNwYXRjaClcclxuICAgICAgICAgICAgZGlzcGF0Y2ggPSBmYWxzZTtcclxuICAgICAgICBpZiAoZmFsc2UgPT09IG9wdGlvbnMuZGVjb2RlVVJMQ29tcG9uZW50cylcclxuICAgICAgICAgICAgZGVjb2RlVVJMQ29tcG9uZW50cyA9IGZhbHNlO1xyXG4gICAgICAgIGlmIChmYWxzZSAhPT0gb3B0aW9ucy5wb3BzdGF0ZSlcclxuICAgICAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3BvcHN0YXRlJywgb25wb3BzdGF0ZSwgZmFsc2UpO1xyXG4gICAgICAgIGlmIChmYWxzZSAhPT0gb3B0aW9ucy5jbGljaykge1xyXG4gICAgICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKGNsaWNrRXZlbnQsIG9uY2xpY2ssIGZhbHNlKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHRydWUgPT09IG9wdGlvbnMuaGFzaGJhbmcpXHJcbiAgICAgICAgICAgIGhhc2hiYW5nID0gdHJ1ZTtcclxuICAgICAgICBpZiAoIWRpc3BhdGNoKVxyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgdmFyIHVybCA9IChoYXNoYmFuZyAmJiB+bG9jYXRpb24uaGFzaC5pbmRleE9mKCcjLycpKSA/IGxvY2F0aW9uLmhhc2guc3Vic3RyKDIpICsgbG9jYXRpb24uc2VhcmNoIDogbG9jYXRpb24ucGF0aG5hbWUgKyBsb2NhdGlvbi5zZWFyY2ggKyBsb2NhdGlvbi5oYXNoO1xyXG4gICAgICAgIHRoaXMucmVwbGFjZSh1cmwsIG51bGwsIHRydWUsIGRpc3BhdGNoKTtcclxuICAgICAgICBuZXcgY29yZV8xLldhdGNoQmluZGluZygnaHJlZicsIGxvY2F0aW9uLCAxMDApLm9uQ2hhbmdlZCh0aGlzLnNob3cuYmluZCh0aGlzKSk7XHJcbiAgICB9XHJcbiAgICA7XHJcbiAgICAvKipcclxuICogUmVwbGFjZSBgcGF0aGAgd2l0aCBvcHRpb25hbCBgc3RhdGVgIG9iamVjdC5cclxuICpcclxuICogQHBhcmFtIHtzdHJpbmd9IHBhdGhcclxuICogQHBhcmFtIHtPYmplY3Q9fSBzdGF0ZVxyXG4gKiBAcGFyYW0ge2Jvb2xlYW49fSBpbml0XHJcbiAqIEBwYXJhbSB7Ym9vbGVhbj19IGRpc3BhdGNoXHJcbiAqIEByZXR1cm4geyFDb250ZXh0fVxyXG4gKiBAYXBpIHB1YmxpY1xyXG4gKi9cclxuICAgIHNldChwYXRoKSB7XHJcbiAgICAgICAgaWYgKGhhc2hiYW5nICYmIHBhdGhbMF0gIT0gJyMnKVxyXG4gICAgICAgICAgICBsb2NhdGlvbi5hc3NpZ24oJyMnICsgcGF0aCk7XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICBsb2NhdGlvbi5hc3NpZ24ocGF0aCk7XHJcbiAgICB9XHJcbiAgICByZXBsYWNlKHBhdGgsIHN0YXRlLCBpbml0LCBkaXNwYXRjaCkge1xyXG4gICAgICAgIC8vIHZhciBjdHggPSBuZXcgQ29udGV4dChwYXRoLCBzdGF0ZSk7XHJcbiAgICAgICAgdGhpcy5jdXJyZW50ID0gcGF0aDtcclxuICAgICAgICAvLyBjdHguaW5pdCA9IGluaXQ7XHJcbiAgICAgICAgLy8gY3R4LnNhdmUoKTsgLy8gc2F2ZSBiZWZvcmUgZGlzcGF0Y2hpbmcsIHdoaWNoIG1heSByZWRpcmVjdFxyXG4gICAgICAgIGlmIChmYWxzZSAhPT0gZGlzcGF0Y2gpXHJcbiAgICAgICAgICAgIHRoaXMuZGlzcGF0Y2gocGF0aCk7XHJcbiAgICAgICAgcmV0dXJuIHBhdGg7XHJcbiAgICB9XHJcbiAgICA7XHJcbiAgICAvKipcclxuICAgICAqIFVuYmluZCBjbGljayBhbmQgcG9wc3RhdGUgZXZlbnQgaGFuZGxlcnMuXHJcbiAgICAgKlxyXG4gICAgICogQGFwaSBwdWJsaWNcclxuICAgICAqL1xyXG4gICAgc3RvcCgpIHtcclxuICAgICAgICBpZiAoIXJ1bm5pbmcpXHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB0aGlzLmN1cnJlbnQgPSAnJztcclxuICAgICAgICB0aGlzLmxlbiA9IDA7XHJcbiAgICAgICAgcnVubmluZyA9IGZhbHNlO1xyXG4gICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoY2xpY2tFdmVudCwgb25jbGljaywgZmFsc2UpO1xyXG4gICAgICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdwb3BzdGF0ZScsIG9ucG9wc3RhdGUsIGZhbHNlKTtcclxuICAgIH1cclxuICAgIDtcclxuICAgIC8qKlxyXG4gICAgICogU2hvdyBgcGF0aGAgd2l0aCBvcHRpb25hbCBgc3RhdGVgIG9iamVjdC5cclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGF0aFxyXG4gICAgICogQHBhcmFtIHtPYmplY3Q9fSBzdGF0ZVxyXG4gICAgICogQHBhcmFtIHtib29sZWFuPX0gZGlzcGF0Y2hcclxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbj19IHB1c2hcclxuICAgICAqIEByZXR1cm4geyFDb250ZXh0fVxyXG4gICAgICogQGFwaSBwdWJsaWNcclxuICAgICAqL1xyXG4gICAgc2hvdyhwYXRoLCBzdGF0ZSwgZGlzcGF0Y2gpIHtcclxuICAgICAgICB0aGlzLmN1cnJlbnQgPSBwYXRoO1xyXG4gICAgICAgIGlmICghZGlzcGF0Y2gpXHJcbiAgICAgICAgICAgIHRoaXMuZGlzcGF0Y2gocGF0aCk7XHJcbiAgICAgICAgLy8gaWYgKGZhbHNlICE9PSBjdHguaGFuZGxlZCAmJiBmYWxzZSAhPT0gcHVzaCkgY3R4LnB1c2hTdGF0ZSgpO1xyXG4gICAgICAgIHJldHVybiBzdGF0ZTtcclxuICAgIH1cclxuICAgIDtcclxuICAgIC8qKlxyXG4gICAgICogR29lcyBiYWNrIGluIHRoZSBoaXN0b3J5XHJcbiAgICAgKiBCYWNrIHNob3VsZCBhbHdheXMgbGV0IHRoZSBjdXJyZW50IHJvdXRlIHB1c2ggc3RhdGUgYW5kIHRoZW4gZ28gYmFjay5cclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGF0aCAtIGZhbGxiYWNrIHBhdGggdG8gZ28gYmFjayBpZiBubyBtb3JlIGhpc3RvcnkgZXhpc3RzLCBpZiB1bmRlZmluZWQgZGVmYXVsdHMgdG8gcGFnZS5iYXNlXHJcbiAgICAgKiBAcGFyYW0ge09iamVjdD19IHN0YXRlXHJcbiAgICAgKiBAYXBpIHB1YmxpY1xyXG4gICAgICovXHJcbiAgICBiYWNrKHBhdGgsIHN0YXRlKSB7XHJcbiAgICAgICAgaWYgKHRoaXMubGVuID4gMCkge1xyXG4gICAgICAgICAgICAvLyB0aGlzIG1heSBuZWVkIG1vcmUgdGVzdGluZyB0byBzZWUgaWYgYWxsIGJyb3dzZXJzXHJcbiAgICAgICAgICAgIC8vIHdhaXQgZm9yIHRoZSBuZXh0IHRpY2sgdG8gZ28gYmFjayBpbiBoaXN0b3J5XHJcbiAgICAgICAgICAgIGhpc3RvcnkuYmFjaygpO1xyXG4gICAgICAgICAgICB0aGlzLmxlbi0tO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIGlmIChwYXRoKSB7XHJcbiAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zaG93KHBhdGgsIHN0YXRlKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2hvdyhiYXNlLCBzdGF0ZSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIDtcclxuICAgIGRpc3BhdGNoKHBhdGgpIHtcclxuICAgICAgICB0aGlzLmVtaXQoJ2NoYW5naW5nJywgcGF0aCk7XHJcbiAgICAgICAgdGhpcy5lbWl0KCdjaGFuZ2UnLCBwYXRoKTtcclxuICAgIH1cclxufVxyXG5leHBvcnRzLkxvY2F0aW9uU2VydmljZSA9IExvY2F0aW9uU2VydmljZTtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9bG9jYXRpb25TZXJ2aWNlLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xyXG52YXIgX19kZWNvcmF0ZSA9ICh0aGlzICYmIHRoaXMuX19kZWNvcmF0ZSkgfHwgZnVuY3Rpb24gKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKSB7XHJcbiAgICB2YXIgYyA9IGFyZ3VtZW50cy5sZW5ndGgsIHIgPSBjIDwgMyA/IHRhcmdldCA6IGRlc2MgPT09IG51bGwgPyBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIGtleSkgOiBkZXNjLCBkO1xyXG4gICAgaWYgKHR5cGVvZiBSZWZsZWN0ID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiBSZWZsZWN0LmRlY29yYXRlID09PSBcImZ1bmN0aW9uXCIpIHIgPSBSZWZsZWN0LmRlY29yYXRlKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKTtcclxuICAgIGVsc2UgZm9yICh2YXIgaSA9IGRlY29yYXRvcnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIGlmIChkID0gZGVjb3JhdG9yc1tpXSkgciA9IChjIDwgMyA/IGQocikgOiBjID4gMyA/IGQodGFyZ2V0LCBrZXksIHIpIDogZCh0YXJnZXQsIGtleSkpIHx8IHI7XHJcbiAgICByZXR1cm4gYyA+IDMgJiYgciAmJiBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBrZXksIHIpLCByO1xyXG59O1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbmNvbnN0IGFrYWxhID0gcmVxdWlyZShcIkBha2FsYS9jb3JlXCIpO1xyXG5jb25zdCBldmVudHNfMSA9IHJlcXVpcmUoXCJldmVudHNcIik7XHJcbmNvbnN0IGNvbW1vbl8xID0gcmVxdWlyZShcIi4vY29tbW9uXCIpO1xyXG5sZXQgUGFydCA9IGNsYXNzIFBhcnQgZXh0ZW5kcyBldmVudHNfMS5FdmVudEVtaXR0ZXIge1xyXG4gICAgY29uc3RydWN0b3IodGVtcGxhdGUsIHJvdXRlciwgbG9jYXRpb24pIHtcclxuICAgICAgICBzdXBlcigpO1xyXG4gICAgICAgIHRoaXMudGVtcGxhdGUgPSB0ZW1wbGF0ZTtcclxuICAgICAgICB0aGlzLnJvdXRlciA9IHJvdXRlcjtcclxuICAgICAgICB0aGlzLnBhcnRzID0gbmV3IGFrYWxhLkluamVjdG9yKCk7XHJcbiAgICAgICAgbG9jYXRpb24ub24oJ2NoYW5naW5nJywgKCkgPT4ge1xyXG4gICAgICAgICAgICB2YXIgcGFydHMgPSB0aGlzLnBhcnRzO1xyXG4gICAgICAgICAgICBwYXJ0cy5rZXlzKCkuZm9yRWFjaChmdW5jdGlvbiAocGFydE5hbWUpIHtcclxuICAgICAgICAgICAgICAgIGlmIChwYXJ0TmFtZSA9PSAnJGluamVjdG9yJylcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICBwYXJ0cy5yZXNvbHZlKHBhcnROYW1lKS5lbGVtZW50LmVtcHR5KCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgcmVnaXN0ZXIocGFydE5hbWUsIGNvbnRyb2wpIHtcclxuICAgICAgICB0aGlzLnBhcnRzLnJlZ2lzdGVyKHBhcnROYW1lLCBjb250cm9sKTtcclxuICAgIH1cclxuICAgIGFwcGx5KHBhcnRJbnN0YW5jZSwgcGFydCwgcGFyYW1zLCBuZXh0KSB7XHJcbiAgICAgICAgdmFyIHBhcnRzID0gdGhpcy5wYXJ0cztcclxuICAgICAgICB2YXIgdGVtcGxhdGUgPSB0aGlzLnRlbXBsYXRlO1xyXG4gICAgICAgIGlmIChwYXJ0LnRlbXBsYXRlKVxyXG4gICAgICAgICAgICB0ZW1wbGF0ZS5nZXQocGFydC50ZW1wbGF0ZSkudGhlbihmdW5jdGlvbiAodGVtcGxhdGUpIHtcclxuICAgICAgICAgICAgICAgIHZhciBwID0gcGFydEluc3RhbmNlKCk7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXApXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgaWYgKHBhcnQuY29udHJvbGxlcilcclxuICAgICAgICAgICAgICAgICAgICBwYXJ0LmNvbnRyb2xsZXIocC5zY29wZSwgcC5lbGVtZW50LCBwYXJhbXMsIG5leHQpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRlbXBsYXRlKVxyXG4gICAgICAgICAgICAgICAgICAgIHRlbXBsYXRlKHAuc2NvcGUsIHAuZWxlbWVudC5lbXB0eSgpKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIHZhciBwID0gcGFydEluc3RhbmNlKCk7XHJcbiAgICAgICAgICAgIGlmICghcClcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgaWYgKHBhcnQuY29udHJvbGxlcilcclxuICAgICAgICAgICAgICAgIHBhcnQuY29udHJvbGxlcihwLnNjb3BlLCBwLmVsZW1lbnQsIHBhcmFtcywgbmV4dCk7XHJcbiAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgICAgIG5leHQoKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICB1c2UodXJsLCBwYXJ0TmFtZSA9ICdib2R5JywgcGFydCkge1xyXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgICB0aGlzLnJvdXRlci51c2UodXJsLCBmdW5jdGlvbiAocmVxLCBuZXh0KSB7XHJcbiAgICAgICAgICAgIHNlbGYuYXBwbHkoKCkgPT4gc2VsZi5wYXJ0cy5yZXNvbHZlKHBhcnROYW1lKSwgcGFydCwgcmVxLnBhcmFtcywgbmV4dCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbn07XHJcblBhcnQgPSBfX2RlY29yYXRlKFtcclxuICAgIGNvbW1vbl8xLnNlcnZpY2UoJyRwYXJ0JywgJyR0ZW1wbGF0ZScsICckcm91dGVyJywgJyRsb2NhdGlvbicpXHJcbl0sIFBhcnQpO1xyXG5leHBvcnRzLlBhcnQgPSBQYXJ0O1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1wYXJ0LmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbmNvbnN0IHVybCA9IHJlcXVpcmUoXCJ1cmxcIik7XHJcbmNvbnN0IGFrYWxhID0gcmVxdWlyZShcIkBha2FsYS9jb3JlXCIpO1xyXG52YXIgZGVidWcgPSByZXF1aXJlKCdkZWJ1ZycpKCdha2FsYTpyb3V0ZXInKTtcclxuY2xhc3MgUmVxdWVzdCB7XHJcbiAgICBjb25zdHJ1Y3Rvcihsb2MpIHtcclxuICAgICAgICBpZiAobG9jLmhhc2gpXHJcbiAgICAgICAgICAgIHRoaXMudXJsID0gbG9jLmhhc2guc3Vic3RyKDEpO1xyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgICAgdGhpcy51cmwgPSAnLyc7XHJcbiAgICAgICAgdGhpcy51cmkgPSB1cmwucGFyc2UodGhpcy51cmwsIHRydWUpO1xyXG4gICAgfVxyXG59XHJcbmV4cG9ydHMuUmVxdWVzdCA9IFJlcXVlc3Q7XHJcbjtcclxuaWYgKCF3aW5kb3cuc2V0SW1tZWRpYXRlKVxyXG4gICAgd2luZG93WydzZXRJbW1lZGlhdGUnXSA9IGZ1bmN0aW9uIChmbikge1xyXG4gICAgICAgIHZhciBhcmdzID0gYXJndW1lbnRzLmxlbmd0aCAmJiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpIHx8IFtdO1xyXG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgZm4uYXBwbHkodGhpcywgYXJncyk7XHJcbiAgICAgICAgfSwgMCk7XHJcbiAgICB9O1xyXG5jbGFzcyBCcm93c2VyTGF5ZXIgZXh0ZW5kcyBha2FsYS5MYXllciB7XHJcbiAgICBjb25zdHJ1Y3RvcihwYXRoLCBvcHRpb25zLCBoYW5kbGVyKSB7XHJcbiAgICAgICAgc3VwZXIocGF0aCwgb3B0aW9ucywgaGFuZGxlcik7XHJcbiAgICB9XHJcbn1cclxuZXhwb3J0cy5Ccm93c2VyTGF5ZXIgPSBCcm93c2VyTGF5ZXI7XHJcbmNsYXNzIEJyb3dzZXJSb3V0ZSBleHRlbmRzIGFrYWxhLlJvdXRlIHtcclxuICAgIGNvbnN0cnVjdG9yKHBhdGgpIHtcclxuICAgICAgICBzdXBlcihwYXRoKTtcclxuICAgIH1cclxuICAgIGJ1aWxkTGF5ZXIocGF0aCwgb3B0aW9ucywgY2FsbGJhY2spIHtcclxuICAgICAgICByZXR1cm4gbmV3IEJyb3dzZXJMYXllcignLycsIG9wdGlvbnMsIGNhbGxiYWNrKTtcclxuICAgIH1cclxufVxyXG5leHBvcnRzLkJyb3dzZXJSb3V0ZSA9IEJyb3dzZXJSb3V0ZTtcclxuY2xhc3MgUm91dGVyIGV4dGVuZHMgYWthbGEuUm91dGVyIHtcclxuICAgIGNvbnN0cnVjdG9yKG9wdGlvbnMpIHtcclxuICAgICAgICBzdXBlcihvcHRpb25zKTtcclxuICAgIH1cclxuICAgIGJ1aWxkTGF5ZXIocGF0aCwgb3B0aW9ucywgaGFuZGxlcikge1xyXG4gICAgICAgIHJldHVybiBuZXcgQnJvd3NlckxheWVyKHBhdGgsIG9wdGlvbnMsIGhhbmRsZXIpO1xyXG4gICAgfVxyXG4gICAgYnVpbGRSb3V0ZShwYXRoKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBCcm93c2VyUm91dGUocGF0aCk7XHJcbiAgICB9XHJcbn1cclxuZXhwb3J0cy5Sb3V0ZXIgPSBSb3V0ZXI7XHJcbmZ1bmN0aW9uIHJvdXRlcigpIHtcclxuICAgIHZhciBwcm90byA9IG5ldyBSb3V0ZXIoKTtcclxuICAgIHJldHVybiBwcm90bztcclxufVxyXG5leHBvcnRzLnJvdXRlciA9IHJvdXRlcjtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9cm91dGVyLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbmNvbnN0IGRpID0gcmVxdWlyZShcIkBha2FsYS9jb3JlXCIpO1xyXG5jbGFzcyBTY29wZSB7XHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICB0aGlzLiQkd2F0Y2hlcnMgPSB7fTtcclxuICAgIH1cclxuICAgICRuZXcoKSB7XHJcbiAgICAgICAgdmFyIG5ld1Njb3BlID0gZnVuY3Rpb24gKCkgeyB9O1xyXG4gICAgICAgIG5ld1Njb3BlLnByb3RvdHlwZSA9IHRoaXM7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBuZXdTY29wZSgpO1xyXG4gICAgfVxyXG4gICAgJGluamVjdChmKSB7XHJcbiAgICAgICAgdmFyIHNjb3BlID0gdGhpcztcclxuICAgICAgICBpZiAoIXRoaXMucmVzb2x2ZXIpIHtcclxuICAgICAgICAgICAgdGhpcy5yZXNvbHZlciA9IG5ldyBkaS5JbmplY3RvcigpO1xyXG4gICAgICAgICAgICB0aGlzLnJlc29sdmVyLnNldEluamVjdGFibGVzKHRoaXMpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdGhpcy5yZXNvbHZlci5pbmplY3QoZikodGhpcyk7XHJcbiAgICB9XHJcbiAgICAkc2V0KGV4cHJlc3Npb24sIHZhbHVlKSB7XHJcbiAgICAgICAgZGkuQmluZGluZy5nZXRTZXR0ZXIodGhpcywgZXhwcmVzc2lvbikodmFsdWUsICdzY29wZScpO1xyXG4gICAgfVxyXG4gICAgJHdhdGNoKGV4cHJlc3Npb24sIGhhbmRsZXIpIHtcclxuICAgICAgICB2YXIgYmluZGluZyA9IHRoaXMuJCR3YXRjaGVyc1tleHByZXNzaW9uXTtcclxuICAgICAgICBpZiAoIWJpbmRpbmcpIHtcclxuICAgICAgICAgICAgYmluZGluZyA9IG5ldyBkaS5CaW5kaW5nKGV4cHJlc3Npb24sIHRoaXMpO1xyXG4gICAgICAgICAgICB0aGlzLiQkd2F0Y2hlcnNbZXhwcmVzc2lvbl0gPSBiaW5kaW5nO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoIWJpbmRpbmdbJ2hhbmRsZXJzJ10pXHJcbiAgICAgICAgICAgIGJpbmRpbmdbJ2hhbmRsZXJzJ10gPSBbXTtcclxuICAgICAgICBpZiAoYmluZGluZ1snaGFuZGxlcnMnXS5pbmRleE9mKGhhbmRsZXIpID4gLTEpXHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICBiaW5kaW5nWydoYW5kbGVycyddLnB1c2goaGFuZGxlcik7XHJcbiAgICAgICAgYmluZGluZy5vbkNoYW5nZWQoZnVuY3Rpb24gKGV2KSB7XHJcbiAgICAgICAgICAgIGhhbmRsZXIoZXYuZXZlbnRBcmdzLnZhbHVlKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxufVxyXG5leHBvcnRzLlNjb3BlID0gU2NvcGU7XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXNjb3BlLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xyXG52YXIgX19kZWNvcmF0ZSA9ICh0aGlzICYmIHRoaXMuX19kZWNvcmF0ZSkgfHwgZnVuY3Rpb24gKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKSB7XHJcbiAgICB2YXIgYyA9IGFyZ3VtZW50cy5sZW5ndGgsIHIgPSBjIDwgMyA/IHRhcmdldCA6IGRlc2MgPT09IG51bGwgPyBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIGtleSkgOiBkZXNjLCBkO1xyXG4gICAgaWYgKHR5cGVvZiBSZWZsZWN0ID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiBSZWZsZWN0LmRlY29yYXRlID09PSBcImZ1bmN0aW9uXCIpIHIgPSBSZWZsZWN0LmRlY29yYXRlKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKTtcclxuICAgIGVsc2UgZm9yICh2YXIgaSA9IGRlY29yYXRvcnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIGlmIChkID0gZGVjb3JhdG9yc1tpXSkgciA9IChjIDwgMyA/IGQocikgOiBjID4gMyA/IGQodGFyZ2V0LCBrZXksIHIpIDogZCh0YXJnZXQsIGtleSkpIHx8IHI7XHJcbiAgICByZXR1cm4gYyA+IDMgJiYgciAmJiBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBrZXksIHIpLCByO1xyXG59O1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbnJlcXVpcmUoXCJAYWthbGEvY29yZVwiKTtcclxuY29uc3QgZGkgPSByZXF1aXJlKFwiQGFrYWxhL2NvcmVcIik7XHJcbmNvbnN0IGNvbnRyb2xzXzEgPSByZXF1aXJlKFwiLi9jb250cm9scy9jb250cm9sc1wiKTtcclxuY29uc3Qgc2NvcGVfMSA9IHJlcXVpcmUoXCIuL3Njb3BlXCIpO1xyXG5jb25zdCBjb21tb25fMSA9IHJlcXVpcmUoXCIuL2NvbW1vblwiKTtcclxuaWYgKE11dGF0aW9uT2JzZXJ2ZXIpIHtcclxuICAgIHZhciBkb21PYnNlcnZlciA9IG5ldyBNdXRhdGlvbk9ic2VydmVyKGZ1bmN0aW9uIChtdXRhdGlvbnMpIHtcclxuICAgICAgICBtdXRhdGlvbnMuZm9yRWFjaChmdW5jdGlvbiAobXV0YXRpb24pIHtcclxuICAgICAgICAgICAgc3dpdGNoIChtdXRhdGlvbi50eXBlKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlICdjaGFyYWN0ZXJEYXRhJzpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICBjYXNlICdhdHRyaWJ1dGVzJzpcclxuICAgICAgICAgICAgICAgIGNhc2UgJ2NoaWxkTGlzdCc6XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH0pO1xyXG59XHJcbmxldCBJbnRlcnBvbGF0ZSA9IEludGVycG9sYXRlXzEgPSBjbGFzcyBJbnRlcnBvbGF0ZSB7XHJcbiAgICBnZXQgc3RhcnRTeW1ib2woKSB7IHJldHVybiBJbnRlcnBvbGF0ZV8xLl9zdGFydFN5bWJvbDsgfVxyXG4gICAgO1xyXG4gICAgc2V0IHN0YXJ0U3ltYm9sKHZhbHVlKSB7IEludGVycG9sYXRlXzEuX3N0YXJ0U3ltYm9sID0gdmFsdWU7IH1cclxuICAgIDtcclxuICAgIGdldCBlbmRTeW1ib2woKSB7IHJldHVybiBJbnRlcnBvbGF0ZV8xLl9lbmRTeW1ib2w7IH1cclxuICAgIDtcclxuICAgIHNldCBlbmRTeW1ib2wodmFsdWUpIHsgSW50ZXJwb2xhdGVfMS5fZW5kU3ltYm9sID0gdmFsdWU7IH1cclxuICAgIDtcclxuICAgIHN0YXRpYyB1bmVzY2FwZVRleHQodGV4dCkge1xyXG4gICAgICAgIHJldHVybiB0ZXh0LnJlcGxhY2UodGhpcy5lc2NhcGVkU3RhcnRSZWdleHAsIEludGVycG9sYXRlXzEuX3N0YXJ0U3ltYm9sKS5cclxuICAgICAgICAgICAgcmVwbGFjZSh0aGlzLmVzY2FwZWRFbmRSZWdleHAsIEludGVycG9sYXRlXzEuX2VuZFN5bWJvbCk7XHJcbiAgICB9XHJcbiAgICBzdGF0aWMgZXNjYXBlKGNoKSB7XHJcbiAgICAgICAgcmV0dXJuICdcXFxcXFxcXFxcXFwnICsgY2g7XHJcbiAgICB9XHJcbiAgICBzdGF0aWMgYnVpbGQodGV4dCwgbXVzdEhhdmVFeHByZXNzaW9uLCB0cnVzdGVkQ29udGV4dCwgYWxsT3JOb3RoaW5nKSB7XHJcbiAgICAgICAgdmFyIHN0YXJ0U3ltYm9sTGVuZ3RoID0gSW50ZXJwb2xhdGVfMS5fc3RhcnRTeW1ib2wubGVuZ3RoLCBlbmRTeW1ib2xMZW5ndGggPSBJbnRlcnBvbGF0ZV8xLl9lbmRTeW1ib2wubGVuZ3RoO1xyXG4gICAgICAgIGlmICghdGV4dC5sZW5ndGggfHwgdGV4dC5pbmRleE9mKEludGVycG9sYXRlXzEuX3N0YXJ0U3ltYm9sKSA9PT0gLTEpIHtcclxuICAgICAgICAgICAgdmFyIGNvbnN0YW50SW50ZXJwO1xyXG4gICAgICAgICAgICBpZiAoIW11c3RIYXZlRXhwcmVzc2lvbikge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh0YXJnZXQpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGV4dDtcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIGNvbnN0YW50SW50ZXJwO1xyXG4gICAgICAgIH1cclxuICAgICAgICBhbGxPck5vdGhpbmcgPSAhIWFsbE9yTm90aGluZztcclxuICAgICAgICB2YXIgc3RhcnRJbmRleCwgZW5kSW5kZXgsIGluZGV4ID0gMCwgZXhwcmVzc2lvbnMgPSBbXSwgcGFyc2VGbnMgPSBbXSwgdGV4dExlbmd0aCA9IHRleHQubGVuZ3RoLCBleHAsIGNvbmNhdCA9IFtdLCBleHByZXNzaW9uUG9zaXRpb25zID0gW107XHJcbiAgICAgICAgd2hpbGUgKGluZGV4IDwgdGV4dExlbmd0aCkge1xyXG4gICAgICAgICAgICBpZiAoKChzdGFydEluZGV4ID0gdGV4dC5pbmRleE9mKEludGVycG9sYXRlXzEuX3N0YXJ0U3ltYm9sLCBpbmRleCkpICE9PSAtMSkgJiZcclxuICAgICAgICAgICAgICAgICgoZW5kSW5kZXggPSB0ZXh0LmluZGV4T2YoSW50ZXJwb2xhdGVfMS5fZW5kU3ltYm9sLCBzdGFydEluZGV4ICsgc3RhcnRTeW1ib2xMZW5ndGgpKSAhPT0gLTEpKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoaW5kZXggIT09IHN0YXJ0SW5kZXgpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25jYXQucHVzaCh0aGlzLnVuZXNjYXBlVGV4dCh0ZXh0LnN1YnN0cmluZyhpbmRleCwgc3RhcnRJbmRleCkpKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGV4cCA9IHRleHQuc3Vic3RyaW5nKHN0YXJ0SW5kZXggKyBzdGFydFN5bWJvbExlbmd0aCwgZW5kSW5kZXgpO1xyXG4gICAgICAgICAgICAgICAgZXhwcmVzc2lvbnMucHVzaChleHApO1xyXG4gICAgICAgICAgICAgICAgcGFyc2VGbnMucHVzaChmdW5jdGlvbiAodGFyZ2V0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBkaS5CaW5kaW5nKGV4cCwgdGFyZ2V0KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgaW5kZXggPSBlbmRJbmRleCArIGVuZFN5bWJvbExlbmd0aDtcclxuICAgICAgICAgICAgICAgIGV4cHJlc3Npb25Qb3NpdGlvbnMucHVzaChjb25jYXQubGVuZ3RoKTtcclxuICAgICAgICAgICAgICAgIGNvbmNhdC5wdXNoKCcnKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIC8vIHdlIGRpZCBub3QgZmluZCBhbiBpbnRlcnBvbGF0aW9uLCBzbyB3ZSBoYXZlIHRvIGFkZCB0aGUgcmVtYWluZGVyIHRvIHRoZSBzZXBhcmF0b3JzIGFycmF5XHJcbiAgICAgICAgICAgICAgICBpZiAoaW5kZXggIT09IHRleHRMZW5ndGgpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25jYXQucHVzaCh0aGlzLnVuZXNjYXBlVGV4dCh0ZXh0LnN1YnN0cmluZyhpbmRleCkpKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBjb21wdXRlID0gZnVuY3Rpb24gKHZhbHVlcykge1xyXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgaWkgPSBleHByZXNzaW9ucy5sZW5ndGg7IGkgPCBpaTsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoYWxsT3JOb3RoaW5nICYmIHR5cGVvZiAodmFsdWVzW2ldKSlcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICBjb25jYXRbZXhwcmVzc2lvblBvc2l0aW9uc1tpXV0gPSB2YWx1ZXNbaV0uZ2V0VmFsdWUoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gY29uY2F0LmpvaW4oJycpO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIGludGVycG9sYXRpb25Gbih0YXJnZXQpIHtcclxuICAgICAgICAgICAgdmFyIGJpbmRpbmdzID0gW107XHJcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZXhwcmVzc2lvbnMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIGJpbmRpbmdzW2ldID0gcGFyc2VGbnNbaV0odGFyZ2V0KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gY29tcHV0ZShiaW5kaW5ncyk7XHJcbiAgICAgICAgfTtcclxuICAgIH1cclxufTtcclxuSW50ZXJwb2xhdGUuX3N0YXJ0U3ltYm9sID0gJ3t7JztcclxuSW50ZXJwb2xhdGUuX2VuZFN5bWJvbCA9ICd9fSc7XHJcbkludGVycG9sYXRlLmVzY2FwZWRTdGFydFJlZ2V4cCA9IG5ldyBSZWdFeHAoSW50ZXJwb2xhdGVfMS5fc3RhcnRTeW1ib2wucmVwbGFjZSgvLi9nLCBJbnRlcnBvbGF0ZV8xLmVzY2FwZSksICdnJyk7XHJcbkludGVycG9sYXRlLmVzY2FwZWRFbmRSZWdleHAgPSBuZXcgUmVnRXhwKEludGVycG9sYXRlXzEuX2VuZFN5bWJvbC5yZXBsYWNlKC8uL2csIEludGVycG9sYXRlXzEuZXNjYXBlKSwgJ2cnKTtcclxuSW50ZXJwb2xhdGUgPSBJbnRlcnBvbGF0ZV8xID0gX19kZWNvcmF0ZShbXHJcbiAgICBjb21tb25fMS5zZXJ2aWNlKCckaW50ZXJwb2xhdGUnKVxyXG5dLCBJbnRlcnBvbGF0ZSk7XHJcbmV4cG9ydHMuSW50ZXJwb2xhdGUgPSBJbnRlcnBvbGF0ZTtcclxudmFyIGNhY2hlID0gbmV3IGRpLkluamVjdG9yKCk7XHJcbmxldCBUZW1wbGF0ZSA9IFRlbXBsYXRlXzEgPSBjbGFzcyBUZW1wbGF0ZSB7XHJcbiAgICBjb25zdHJ1Y3RvcihpbnRlcnBvbGF0b3IsIGh0dHApIHtcclxuICAgICAgICB0aGlzLmludGVycG9sYXRvciA9IGludGVycG9sYXRvcjtcclxuICAgICAgICB0aGlzLmh0dHAgPSBodHRwO1xyXG4gICAgfVxyXG4gICAgZ2V0KHQsIHJlZ2lzdGVyVGVtcGxhdGUgPSB0cnVlKSB7XHJcbiAgICAgICAgdmFyIGh0dHAgPSB0aGlzLmh0dHA7XHJcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgICAgIHZhciBwID0gbmV3IGRpLkRlZmVycmVkKCk7XHJcbiAgICAgICAgaWYgKCF0KVxyXG4gICAgICAgICAgICBzZXRJbW1lZGlhdGUocC5yZXNvbHZlLCB0KTtcclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgdmFyIHRlbXBsYXRlID0gY2FjaGUucmVzb2x2ZSh0KTtcclxuICAgICAgICAgICAgaWYgKHRlbXBsYXRlKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoZGkuaXNQcm9taXNlTGlrZSh0ZW1wbGF0ZSkpXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRlbXBsYXRlLnRoZW4oZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcC5yZXNvbHZlKGRhdGEpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGF0YTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgICAgICAgICBzZXRJbW1lZGlhdGUocC5yZXNvbHZlLmJpbmQocCksIHRlbXBsYXRlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIGlmICgvPC8udGVzdCh0KSkge1xyXG4gICAgICAgICAgICAgICAgdmFyIHRlbXBsYXRlID0gVGVtcGxhdGVfMS5idWlsZCh0KTtcclxuICAgICAgICAgICAgICAgIHNldEltbWVkaWF0ZShwLnJlc29sdmUuYmluZChwKSwgdGVtcGxhdGUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgY2FjaGUucmVnaXN0ZXIodCwgcCk7XHJcbiAgICAgICAgICAgICAgICBodHRwLmdldCh0KS50aGVuKGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHRlbXBsYXRlID0gVGVtcGxhdGVfMS5idWlsZChkYXRhKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAocmVnaXN0ZXJUZW1wbGF0ZSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FjaGUucmVnaXN0ZXIodCwgdGVtcGxhdGUsIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHAucmVzb2x2ZSh0ZW1wbGF0ZSk7XHJcbiAgICAgICAgICAgICAgICB9LCBwLnJlamVjdC5iaW5kKHApKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gcDtcclxuICAgIH1cclxuICAgIHN0YXRpYyBidWlsZChtYXJrdXApIHtcclxuICAgICAgICB2YXIgdGVtcGxhdGUgPSBJbnRlcnBvbGF0ZS5idWlsZChtYXJrdXApO1xyXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoZGF0YSwgcGFyZW50KSB7XHJcbiAgICAgICAgICAgIHZhciB0ZW1wbGF0ZUluc3RhbmNlID0gJCh0ZW1wbGF0ZShkYXRhKSk7XHJcbiAgICAgICAgICAgIGlmIChwYXJlbnQpXHJcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZUluc3RhbmNlLmFwcGVuZFRvKHBhcmVudCk7XHJcbiAgICAgICAgICAgIHJldHVybiB0ZW1wbGF0ZUluc3RhbmNlLmFwcGx5VGVtcGxhdGUoZGF0YSwgcGFyZW50KTtcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG59O1xyXG5UZW1wbGF0ZSA9IFRlbXBsYXRlXzEgPSBfX2RlY29yYXRlKFtcclxuICAgIGNvbW1vbl8xLnNlcnZpY2UoJyR0ZW1wbGF0ZScsICckaW50ZXJwb2xhdGUnLCAnJGh0dHAnKVxyXG5dLCBUZW1wbGF0ZSk7XHJcbmV4cG9ydHMuVGVtcGxhdGUgPSBUZW1wbGF0ZTtcclxudmFyIGRhdGFiaW5kUmVnZXggPSAvKFxcdyspOihbXjtdKyk7Py9nO1xyXG4kLmV4dGVuZCgkLmZuLCB7XHJcbiAgICBhcHBseVRlbXBsYXRlOiBmdW5jdGlvbiBhcHBseVRlbXBsYXRlKGRhdGEsIHJvb3QpIHtcclxuICAgICAgICBkYXRhLiRuZXcgPSBzY29wZV8xLlNjb3BlLnByb3RvdHlwZS4kbmV3O1xyXG4gICAgICAgIGlmICh0aGlzLmZpbHRlcignW2RhdGEtYmluZF0nKS5sZW5ndGggPT0gMCkge1xyXG4gICAgICAgICAgICB0aGlzLmZpbmQoJ1tkYXRhLWJpbmRdJykuZWFjaChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgY2xvc2VzdCA9ICQodGhpcykucGFyZW50KCkuY2xvc2VzdCgnW2RhdGEtYmluZF0nKTtcclxuICAgICAgICAgICAgICAgIHZhciBhcHBseUlubmVyVGVtcGxhdGUgPSBjbG9zZXN0Lmxlbmd0aCA9PSAwO1xyXG4gICAgICAgICAgICAgICAgaWYgKCFhcHBseUlubmVyVGVtcGxhdGUgJiYgcm9vdClcclxuICAgICAgICAgICAgICAgICAgICByb290LmVhY2goZnVuY3Rpb24gKGksIGl0KSB7IGFwcGx5SW5uZXJUZW1wbGF0ZSA9IGFwcGx5SW5uZXJUZW1wbGF0ZSB8fCBpdCA9PSBjbG9zZXN0WzBdOyB9KTtcclxuICAgICAgICAgICAgICAgIGlmIChhcHBseUlubmVyVGVtcGxhdGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAkKHRoaXMpLmFwcGx5VGVtcGxhdGUoZGF0YSwgdGhpcyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIHZhciBlbGVtZW50ID0gJCgpO1xyXG4gICAgICAgICAgICB2YXIgcHJvbWlzZXMgPSBbXTtcclxuICAgICAgICAgICAgdGhpcy5maWx0ZXIoJ1tkYXRhLWJpbmRdJykuZWFjaChmdW5jdGlvbiAoaW5kZXgsIGl0ZW0pIHtcclxuICAgICAgICAgICAgICAgIHZhciAkaXRlbSA9ICQoaXRlbSk7XHJcbiAgICAgICAgICAgICAgICB2YXIgc3ViRWxlbSA9IGNvbnRyb2xzXzEuQ29udHJvbC5hcHBseShkaS5QYXJzZXIuZXZhbEFzRnVuY3Rpb24oJGl0ZW0uYXR0cihcImRhdGEtYmluZFwiKSwgdHJ1ZSksICRpdGVtLCBkYXRhKTtcclxuICAgICAgICAgICAgICAgIGlmIChkaS5pc1Byb21pc2VMaWtlKHN1YkVsZW0pKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcHJvbWlzZXMucHVzaChzdWJFbGVtLnRoZW4oZnVuY3Rpb24gKHN1YkVsZW0pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudCA9IGVsZW1lbnQuYWRkKHN1YkVsZW0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50ID0gZWxlbWVudC5hZGQoc3ViRWxlbSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBpZiAocHJvbWlzZXMubGVuZ3RoKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGRpLndoZW4ocHJvbWlzZXMpLnRoZW4oZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBlbGVtZW50O1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHJldHVybiBlbGVtZW50O1xyXG4gICAgICAgIH1cclxuICAgIH0sXHJcbiAgICB0bXBsOiBmdW5jdGlvbiAoZGF0YSwgb3B0aW9ucykge1xyXG4gICAgICAgIGlmICh0aGlzLmxlbmd0aCA+IDEpXHJcbiAgICAgICAgICAgIHRocm93ICdBIHRlbXBsYXRlIGNhbiBvbmx5IGJlIGEgc2luZ2xlIGl0ZW0nO1xyXG4gICAgICAgIGlmICh0aGlzLmxlbmd0aCA9PSAwKVxyXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICByZXR1cm4gVGVtcGxhdGUuYnVpbGQodGhpc1swXSk7XHJcbiAgICB9XHJcbn0pO1xyXG52YXIgSW50ZXJwb2xhdGVfMSwgVGVtcGxhdGVfMTtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9dGVtcGxhdGUuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxuY29uc3QgcGFyc2VyXzEgPSByZXF1aXJlKFwiLi9wYXJzZXJcIik7XHJcbmNvbnN0IGV2ZW50c18xID0gcmVxdWlyZShcImV2ZW50c1wiKTtcclxuY29uc3QgcHJvbWlzZUhlbHBlcnNfMSA9IHJlcXVpcmUoXCIuL3Byb21pc2VIZWxwZXJzXCIpO1xyXG5jb25zdCBmb3JtYXR0ZXJzID0gcmVxdWlyZShcIi4vZm9ybWF0dGVyc1wiKTtcclxuZnVuY3Rpb24gZWFjaEFzeW5jKGFycmF5LCBib2R5LCBjb21wbGV0ZSkge1xyXG4gICAgKGZ1bmN0aW9uIGxvb3AoaSkge1xyXG4gICAgICAgIGZ1bmN0aW9uIG5leHQoKSB7XHJcbiAgICAgICAgICAgIGlmIChhcnJheS5sZW5ndGggLSAxID09IGkpXHJcbiAgICAgICAgICAgICAgICBjb21wbGV0ZSgpO1xyXG4gICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGxvb3AsIDAsIGkgKyAxKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgYm9keShpLCBhcnJheVtpXSwgbmV4dCk7XHJcbiAgICB9KSgwKTtcclxufVxyXG5jbGFzcyBCaW5kaW5nIGV4dGVuZHMgZXZlbnRzXzEuRXZlbnRFbWl0dGVyIHtcclxuICAgIGNvbnN0cnVjdG9yKF9leHByZXNzaW9uLCBfdGFyZ2V0LCByZWdpc3RlciA9IHRydWUpIHtcclxuICAgICAgICBzdXBlcigpO1xyXG4gICAgICAgIHRoaXMuX2V4cHJlc3Npb24gPSBfZXhwcmVzc2lvbjtcclxuICAgICAgICB0aGlzLl90YXJnZXQgPSBfdGFyZ2V0O1xyXG4gICAgICAgIHRoaXMuZXZhbHVhdG9yID0gcGFyc2VyXzEuUGFyc2VyLmV2YWxBc0Z1bmN0aW9uKHRoaXMuZXhwcmVzc2lvbik7XHJcbiAgICAgICAgdGhpcy5yZWdpc3RlcmVkQmluZGluZ3MgPSBbXTtcclxuICAgICAgICB0aGlzLmZvcm1hdHRlciA9IGZvcm1hdHRlcnMuaWRlbnRpdHk7XHJcbiAgICAgICAgaWYgKHJlZ2lzdGVyKVxyXG4gICAgICAgICAgICB0aGlzLnJlZ2lzdGVyKCk7XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICB0aGlzLnNldE1heExpc3RlbmVycygwKTtcclxuICAgIH1cclxuICAgIGdldCBleHByZXNzaW9uKCkgeyByZXR1cm4gdGhpcy5fZXhwcmVzc2lvbjsgfVxyXG4gICAgZ2V0IHRhcmdldCgpIHsgcmV0dXJuIHRoaXMuX3RhcmdldDsgfVxyXG4gICAgc2V0IHRhcmdldCh2YWx1ZSkgeyB0aGlzLl90YXJnZXQgPSB2YWx1ZTsgdGhpcy5yZWdpc3RlcigpOyB9XHJcbiAgICBvbkNoYW5naW5nKGhhbmRsZXIpIHtcclxuICAgICAgICB0aGlzLm9uKEJpbmRpbmcuQ2hhbmdpbmdGaWVsZEV2ZW50TmFtZSwgaGFuZGxlcik7XHJcbiAgICB9XHJcbiAgICBvbkNoYW5nZWQoaGFuZGxlcikge1xyXG4gICAgICAgIHRoaXMub24oQmluZGluZy5DaGFuZ2VkRmllbGRFdmVudE5hbWUsIGhhbmRsZXIpO1xyXG4gICAgICAgIGhhbmRsZXIoe1xyXG4gICAgICAgICAgICB0YXJnZXQ6IHRoaXMudGFyZ2V0LFxyXG4gICAgICAgICAgICBldmVudEFyZ3M6IHtcclxuICAgICAgICAgICAgICAgIGZpZWxkTmFtZTogdGhpcy5leHByZXNzaW9uLFxyXG4gICAgICAgICAgICAgICAgdmFsdWU6IHRoaXMuZm9ybWF0dGVyKHRoaXMuZ2V0VmFsdWUoKSlcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc291cmNlOiBudWxsXHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBvbkVycm9yKGhhbmRsZXIpIHtcclxuICAgICAgICB0aGlzLm9uKEJpbmRpbmcuRXJyb3JFdmVudE5hbWUsIGhhbmRsZXIpO1xyXG4gICAgfVxyXG4gICAgcGlwZShiaW5kaW5nKSB7XHJcbiAgICAgICAgaWYgKHRoaXMucmVnaXN0ZXJlZEJpbmRpbmdzLmluZGV4T2YoYmluZGluZykgPiAtMSlcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIHRoaXMucmVnaXN0ZXJlZEJpbmRpbmdzLnB1c2goYmluZGluZyk7XHJcbiAgICAgICAgdmFyIHdhdGNoZXIgPSB0aGlzO1xyXG4gICAgICAgIHdhdGNoZXIub25DaGFuZ2luZyhmdW5jdGlvbiAoYSkge1xyXG4gICAgICAgICAgICBpZiAoYS5zb3VyY2UgPT0gYmluZGluZyB8fCBhLnNvdXJjZSA9PT0gbnVsbClcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgdmFyIGFyZ3MgPSBbQmluZGluZy5DaGFuZ2luZ0ZpZWxkRXZlbnROYW1lLCBhXTtcclxuICAgICAgICAgICAgYmluZGluZy5lbWl0LmFwcGx5KGJpbmRpbmcsIGFyZ3MpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHdhdGNoZXIub25DaGFuZ2VkKGZ1bmN0aW9uIChhKSB7XHJcbiAgICAgICAgICAgIGlmIChhLnNvdXJjZSA9PSBiaW5kaW5nIHx8IGEuc291cmNlID09PSBudWxsKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB2YXIgYXJncyA9IFtCaW5kaW5nLkNoYW5nZWRGaWVsZEV2ZW50TmFtZSwgeyBzb3VyY2U6IGEuc291cmNlLCB0YXJnZXQ6IGEudGFyZ2V0LCBldmVudEFyZ3M6IHsgZmllbGROYW1lOiBhLmV2ZW50QXJncy5maWVsZE5hbWUsIHZhbHVlOiBiaW5kaW5nLmdldFZhbHVlKCkgfSB9XTtcclxuICAgICAgICAgICAgYmluZGluZy5lbWl0LmFwcGx5KGJpbmRpbmcsIGFyZ3MpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHdhdGNoZXIub25FcnJvcihmdW5jdGlvbiAoYSkge1xyXG4gICAgICAgICAgICBpZiAoYS5zb3VyY2UgPT0gYmluZGluZyB8fCBhLnNvdXJjZSA9PT0gbnVsbClcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgdmFyIGFyZ3MgPSBbQmluZGluZy5DaGFuZ2VkRmllbGRFdmVudE5hbWUsIGFdO1xyXG4gICAgICAgICAgICBiaW5kaW5nLmVtaXQuYXBwbHkoYmluZGluZywgYXJncyk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICAvL2RlZmluZWQgaW4gY29uc3RydWN0b3JcclxuICAgIGdldFZhbHVlKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmZvcm1hdHRlcih0aGlzLmV2YWx1YXRvcih0aGlzLnRhcmdldCwgZmFsc2UpKTtcclxuICAgIH1cclxuICAgIHJlZ2lzdGVyKCkge1xyXG4gICAgICAgIHZhciB0YXJnZXQgPSB0aGlzLnRhcmdldDtcclxuICAgICAgICB2YXIgcGFydHMgPSBwYXJzZXJfMS5QYXJzZXIucGFyc2VCaW5kYWJsZSh0aGlzLmV4cHJlc3Npb24pO1xyXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgICB3aGlsZSAocGFydHMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICB2YXIgcGFydCA9IHBhcnRzLnNoaWZ0KCk7XHJcbiAgICAgICAgICAgIGlmICh0YXJnZXQgIT09IG51bGwgJiYgdGFyZ2V0ICE9PSB1bmRlZmluZWQgJiYgdHlwZW9mICh0YXJnZXQpID09ICdvYmplY3QnKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mICh0YXJnZXQuJCR3YXRjaGVycykgPT0gJ3VuZGVmaW5lZCcpIHtcclxuICAgICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCAnJCR3YXRjaGVycycsIHsgZW51bWVyYWJsZTogZmFsc2UsIHdyaXRhYmxlOiBmYWxzZSwgdmFsdWU6IHt9LCBjb25maWd1cmFibGU6IHRydWUgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ2NvdWxkIG5vdCByZWdpc3RlciB3YXRjaGVyIG9uICcsIHRhcmdldCwgJ3RoaXMgY291bGQgbGVhZCB0byBwZXJmb3JtYW5jZSBpc3N1ZXMnKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB2YXIgd2F0Y2hlciA9IHRhcmdldC4kJHdhdGNoZXJzICYmIHRhcmdldC4kJHdhdGNoZXJzW3BhcnRdO1xyXG4gICAgICAgICAgICAgICAgaWYgKCF3YXRjaGVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHByb21pc2VIZWxwZXJzXzEuaXNQcm9taXNlTGlrZSh0YXJnZXQpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBzdWJQYXJ0cyA9IHBhcnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwYXJ0cy5sZW5ndGggPiAwKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3ViUGFydHMgKz0gJy4nICsgcGFydHMuam9pbignLicpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB3YXRjaGVyID0gbmV3IFByb21pc2VCaW5kaW5nKHN1YlBhcnRzLCB0YXJnZXQpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmICh0YXJnZXQgaW5zdGFuY2VvZiBPYnNlcnZhYmxlQXJyYXkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGluaXRIYW5kbGVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldC5vbignY29sbGVjdGlvbkNoYW5nZWQnLCBmdW5jdGlvbiAoYXJncykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFyZ3MuYWN0aW9uID09ICdpbml0Jykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbml0SGFuZGxlZClcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluaXRIYW5kbGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBzdWJQYXJ0cyA9IHBhcnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocGFydHMubGVuZ3RoID4gMClcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdWJQYXJ0cyArPSAnLicgKyBwYXJ0cy5qb2luKCcuJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpIGluIGFyZ3MubmV3SXRlbXMpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXcgQmluZGluZyhzdWJQYXJ0cywgYXJncy5uZXdJdGVtc1tpXSkucGlwZSh0aGlzKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldC5pbml0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB3YXRjaGVyID0gbmV3IEJpbmRpbmcocGFydCwgdGFyZ2V0LCBmYWxzZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRhcmdldC4kJHdhdGNoZXJzKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXQuJCR3YXRjaGVyc1twYXJ0XSA9IHdhdGNoZXI7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB3YXRjaGVyLnBpcGUodGhpcyk7XHJcbiAgICAgICAgICAgICAgICBpZiAod2F0Y2hlciBpbnN0YW5jZW9mIFByb21pc2VCaW5kaW5nKVxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIHRhcmdldCA9IHdhdGNoZXIuZ2V0VmFsdWUoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGFwcGx5KGVsZW1lbnRzLCBkb05vdFJlZ2lzdGVyRXZlbnRzKSB7IH1cclxuICAgIC8qYXBwbHkoZWxlbWVudHMsIGRvTm90UmVnaXN0ZXJFdmVudHMpXHJcbiAgICB7XHJcbiAgICAgICAgdmFyIHZhbCA9IHRoaXMuZ2V0VmFsdWUoKTtcclxuICAgICAgICB2YXIgaW5wdXRzID0gZWxlbWVudHMuZmlsdGVyKCc6aW5wdXQnKS52YWwodmFsKVxyXG4gICAgICAgIHZhciBiaW5kaW5nID0gdGhpcztcclxuICAgICAgICBpZiAoIWRvTm90UmVnaXN0ZXJFdmVudHMpXHJcbiAgICAgICAgICAgIGlucHV0cy5jaGFuZ2UoZnVuY3Rpb24gKClcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgYmluZGluZy5zZXRWYWx1ZSgkKHRoaXMpLnZhbCgpLCB0aGlzKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgZWxlbWVudHMuZmlsdGVyKCc6bm90KDppbnB1dCkpJykudGV4dCh2YWwpO1xyXG4gICAgfSovXHJcbiAgICBzdGF0aWMgZ2V0U2V0dGVyKHRhcmdldCwgZXhwcmVzc2lvbikge1xyXG4gICAgICAgIHZhciBwYXJ0cyA9IHBhcnNlcl8xLlBhcnNlci5wYXJzZUJpbmRhYmxlKGV4cHJlc3Npb24pO1xyXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAodmFsdWUsIHNvdXJjZSwgZG9Ob3RUcmlnZ2VyRXZlbnRzKSB7XHJcbiAgICAgICAgICAgIHdoaWxlIChwYXJ0cy5sZW5ndGggPiAxKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXRhcmdldCAmJiB0YXJnZXQgIT09ICcnKVxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIHRhcmdldCA9IHRhcmdldFtwYXJ0cy5zaGlmdCgpXTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB2YXIgd2F0Y2hlciA9IHRhcmdldC4kJHdhdGNoZXJzW3BhcnRzWzBdXTtcclxuICAgICAgICAgICAgdmFyIHNldHRlciA9IHBhcnNlcl8xLlBhcnNlci5nZXRTZXR0ZXIocGFydHNbMF0sIHRhcmdldCk7XHJcbiAgICAgICAgICAgIGlmIChzZXR0ZXIgPT09IG51bGwpXHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgcHJvbWlzZSA9IG5ldyBwcm9taXNlSGVscGVyc18xLkRlZmVycmVkKCk7XHJcbiAgICAgICAgICAgICAgICBwcm9taXNlLnRoZW4oZnVuY3Rpb24gcmVzb2x2ZSh2YWx1ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHNldHRlci5zZXQodmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh3YXRjaGVyICYmICFkb05vdFRyaWdnZXJFdmVudHMpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHdhdGNoZXIuZW1pdChCaW5kaW5nLkNoYW5nZWRGaWVsZEV2ZW50TmFtZSwge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0OiB0YXJnZXQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBldmVudEFyZ3M6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWVsZE5hbWU6IHNldHRlci5leHByZXNzaW9uLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlOiB2YWx1ZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNvdXJjZTogc291cmNlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGV4KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHdhdGNoZXIpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHdhdGNoZXIuZW1pdChCaW5kaW5nLkVycm9yRXZlbnROYW1lLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXQ6IHRhcmdldCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpZWxkOiBzZXR0ZXIuZXhwcmVzc2lvbixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEV4Y2VwdGlvbjogZXgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzb3VyY2U6IHNvdXJjZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgaWYgKGRvTm90VHJpZ2dlckV2ZW50cylcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcHJvbWlzZS5yZXNvbHZlKHZhbHVlKTtcclxuICAgICAgICAgICAgICAgIGlmICh3YXRjaGVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGxpc3RlbmVycyA9IHdhdGNoZXIubGlzdGVuZXJzKEJpbmRpbmcuQ2hhbmdpbmdGaWVsZEV2ZW50TmFtZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgZWFjaEFzeW5jKGxpc3RlbmVycywgZnVuY3Rpb24gKGksIGxpc3RlbmVyLCBuZXh0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21pc2VIZWxwZXJzXzEuUHJvbWlzaWZ5KGxpc3RlbmVyKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldDogdGFyZ2V0LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmllbGROYW1lOiBzZXR0ZXIuZXhwcmVzc2lvbixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNvdXJjZTogc291cmNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KSkudGhlbihmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXh0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sIHByb21pc2UucmVqZWN0KTtcclxuICAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21pc2UucmVzb2x2ZSh2YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvbWlzZS5yZXNvbHZlKHZhbHVlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjYXRjaCAoZXgpIHtcclxuICAgICAgICAgICAgICAgIHdhdGNoZXIuZW1pdChCaW5kaW5nLkVycm9yRXZlbnROYW1lLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0OiB0YXJnZXQsXHJcbiAgICAgICAgICAgICAgICAgICAgZmllbGQ6IHNldHRlci5leHByZXNzaW9uLFxyXG4gICAgICAgICAgICAgICAgICAgIEV4Y2VwdGlvbjogZXgsXHJcbiAgICAgICAgICAgICAgICAgICAgc291cmNlOiBzb3VyY2VcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgcHJvbWlzZS5yZWplY3QoZXgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuICAgIHNldFZhbHVlKHZhbHVlLCBzb3VyY2UsIGRvTm90VHJpZ2dlckV2ZW50cykge1xyXG4gICAgICAgIHZhciB0YXJnZXQgPSB0aGlzLnRhcmdldDtcclxuICAgICAgICB2YXIgc2V0dGVyID0gQmluZGluZy5nZXRTZXR0ZXIodGhpcy50YXJnZXQsIHRoaXMuZXhwcmVzc2lvbik7XHJcbiAgICAgICAgaWYgKHNldHRlciAhPSBudWxsKVxyXG4gICAgICAgICAgICBzZXR0ZXIodmFsdWUsIHNvdXJjZSB8fCB0aGlzLCBkb05vdFRyaWdnZXJFdmVudHMpO1xyXG4gICAgfVxyXG4gICAgO1xyXG59XHJcbkJpbmRpbmcuQ2hhbmdpbmdGaWVsZEV2ZW50TmFtZSA9IFwiZmllbGRDaGFuZ2luZ1wiO1xyXG5CaW5kaW5nLkNoYW5nZWRGaWVsZEV2ZW50TmFtZSA9IFwiZmllbGRDaGFuZ2VkXCI7XHJcbkJpbmRpbmcuRXJyb3JFdmVudE5hbWUgPSBcImJpbmRpbmdFcnJvclwiO1xyXG5leHBvcnRzLkJpbmRpbmcgPSBCaW5kaW5nO1xyXG5jbGFzcyBQcm9taXNlQmluZGluZyBleHRlbmRzIEJpbmRpbmcge1xyXG4gICAgY29uc3RydWN0b3IoZXhwcmVzc2lvbiwgdGFyZ2V0KSB7XHJcbiAgICAgICAgc3VwZXIoZXhwcmVzc2lvbiwgbnVsbCwgZmFsc2UpO1xyXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgICB2YXIgYmluZGluZyA9IG5ldyBCaW5kaW5nKGV4cHJlc3Npb24sIG51bGwpO1xyXG4gICAgICAgIGJpbmRpbmcucGlwZShzZWxmKTtcclxuICAgICAgICB2YXIgY2FsbGJhY2sgPSBmdW5jdGlvbiAodmFsdWUpIHtcclxuICAgICAgICAgICAgaWYgKHByb21pc2VIZWxwZXJzXzEuaXNQcm9taXNlTGlrZSh2YWx1ZSkpIHtcclxuICAgICAgICAgICAgICAgIHZhbHVlLnRoZW4oY2FsbGJhY2spO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGJpbmRpbmcuZm9ybWF0dGVyID0gc2VsZi5mb3JtYXR0ZXI7XHJcbiAgICAgICAgICAgIGJpbmRpbmcudGFyZ2V0ID0gdmFsdWU7XHJcbiAgICAgICAgICAgIHNlbGYuZW1pdChCaW5kaW5nLkNoYW5nZWRGaWVsZEV2ZW50TmFtZSwge1xyXG4gICAgICAgICAgICAgICAgdGFyZ2V0OiB2YWx1ZSxcclxuICAgICAgICAgICAgICAgIGV2ZW50QXJnczoge1xyXG4gICAgICAgICAgICAgICAgICAgIGZpZWxkTmFtZTogc2VsZi5leHByZXNzaW9uLFxyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBzZWxmLmdldFZhbHVlKClcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBzb3VyY2U6IGJpbmRpbmdcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICB0YXJnZXQudGhlbihjYWxsYmFjayk7XHJcbiAgICB9XHJcbn1cclxuZXhwb3J0cy5Qcm9taXNlQmluZGluZyA9IFByb21pc2VCaW5kaW5nO1xyXG5pZiAodHlwZW9mIChBcnJheS5wcm90b3R5cGVbJ3JlcGxhY2UnXSkgPT0gJ3VuZGVmaW5lZCcpXHJcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoQXJyYXkucHJvdG90eXBlLCAncmVwbGFjZScsIHtcclxuICAgICAgICB2YWx1ZTogZnVuY3Rpb24gKGluZGV4LCBpdGVtKSB7XHJcbiAgICAgICAgICAgIHRoaXNbaW5kZXhdID0gaXRlbTtcclxuICAgICAgICB9LCBjb25maWd1cmFibGU6IHRydWUsIHdyaXRhYmxlOiB0cnVlLCBlbnVtZXJhYmxlOiBmYWxzZVxyXG4gICAgfSk7XHJcbmNsYXNzIE9ic2VydmFibGVBcnJheSBleHRlbmRzIGV2ZW50c18xLkV2ZW50RW1pdHRlciB7XHJcbiAgICBjb25zdHJ1Y3RvcihhcnJheSkge1xyXG4gICAgICAgIHN1cGVyKCk7XHJcbiAgICAgICAgdGhpcy5hcnJheSA9IGFycmF5O1xyXG4gICAgICAgIHRoaXMudW5zaGlmdCA9IGZ1bmN0aW9uIChpdGVtKSB7XHJcbiAgICAgICAgICAgIHRoaXMuYXJyYXkudW5zaGlmdChpdGVtKTtcclxuICAgICAgICAgICAgdGhpcy5lbWl0KCdjb2xsZWN0aW9uQ2hhbmdlZCcsIHtcclxuICAgICAgICAgICAgICAgIGFjdGlvbjogJ3Vuc2hpZnQnLFxyXG4gICAgICAgICAgICAgICAgbmV3SXRlbXM6IFtpdGVtXVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG4gICAgZ2V0IGxlbmd0aCgpIHsgcmV0dXJuIHRoaXMuYXJyYXkubGVuZ3RoOyB9XHJcbiAgICBwdXNoKC4uLml0ZW1zKSB7XHJcbiAgICAgICAgdGhpcy5hcnJheS5wdXNoLmFwcGx5KHRoaXMuYXJyYXksIGl0ZW1zKTtcclxuICAgICAgICB0aGlzLmVtaXQoJ2NvbGxlY3Rpb25DaGFuZ2VkJywge1xyXG4gICAgICAgICAgICBhY3Rpb246ICdwdXNoJyxcclxuICAgICAgICAgICAgbmV3SXRlbXM6IGl0ZW1zXHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICA7XHJcbiAgICBzaGlmdCgpIHtcclxuICAgICAgICB2YXIgaXRlbSA9IHRoaXMuYXJyYXkuc2hpZnQoKTtcclxuICAgICAgICB0aGlzLmVtaXQoJ2NvbGxlY3Rpb25DaGFuZ2VkJywge1xyXG4gICAgICAgICAgICBhY3Rpb246ICdzaGlmdCcsXHJcbiAgICAgICAgICAgIG9sZEl0ZW1zOiBbaXRlbV1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIDtcclxuICAgIHBvcCgpIHtcclxuICAgICAgICB2YXIgaXRlbSA9IHRoaXMuYXJyYXkucG9wKCk7XHJcbiAgICAgICAgdGhpcy5lbWl0KCdjb2xsZWN0aW9uQ2hhbmdlZCcsIHtcclxuICAgICAgICAgICAgYWN0aW9uOiAncG9wJyxcclxuICAgICAgICAgICAgb2xkSXRlbXM6IFtpdGVtXVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgO1xyXG4gICAgcmVwbGFjZShpbmRleCwgaXRlbSkge1xyXG4gICAgICAgIHZhciBvbGRJdGVtID0gdGhpcy5hcnJheVtpbmRleF07XHJcbiAgICAgICAgdGhpcy5hcnJheVsncmVwbGFjZSddKGluZGV4LCBpdGVtKTtcclxuICAgICAgICB0aGlzLmVtaXQoJ2NvbGxlY3Rpb25DaGFuZ2VkJywge1xyXG4gICAgICAgICAgICBhY3Rpb246ICdyZXBsYWNlJyxcclxuICAgICAgICAgICAgbmV3SXRlbXM6IFtpdGVtXSxcclxuICAgICAgICAgICAgb2xkSXRlbXM6IFtvbGRJdGVtXVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgO1xyXG4gICAgaW5pdCgpIHtcclxuICAgICAgICB0aGlzLmVtaXQoJ2NvbGxlY3Rpb25DaGFuZ2VkJywge1xyXG4gICAgICAgICAgICBhY3Rpb246ICdpbml0JyxcclxuICAgICAgICAgICAgbmV3SXRlbXM6IHRoaXMuYXJyYXkuc2xpY2UoMClcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGluZGV4T2YoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuYXJyYXkuaW5kZXhPZi5hcHBseSh0aGlzLmFycmF5LCBhcmd1bWVudHMpO1xyXG4gICAgfVxyXG4gICAgdG9TdHJpbmcoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuYXJyYXkudG9TdHJpbmcoKTtcclxuICAgIH1cclxuICAgIDtcclxufVxyXG5leHBvcnRzLk9ic2VydmFibGVBcnJheSA9IE9ic2VydmFibGVBcnJheTtcclxuO1xyXG5jbGFzcyBXYXRjaEJpbmRpbmcgZXh0ZW5kcyBCaW5kaW5nIHtcclxuICAgIGNvbnN0cnVjdG9yKGV4cHJlc3Npb24sIHRhcmdldCwgaW50ZXJ2YWwpIHtcclxuICAgICAgICBzdXBlcihleHByZXNzaW9uLCB0YXJnZXQsIHRydWUpO1xyXG4gICAgICAgIHNldEludGVydmFsKHRoaXMuY2hlY2suYmluZCh0aGlzKSwgaW50ZXJ2YWwpO1xyXG4gICAgfVxyXG4gICAgY2hlY2soKSB7XHJcbiAgICAgICAgdmFyIG5ld1ZhbHVlID0gdGhpcy5nZXRWYWx1ZSgpO1xyXG4gICAgICAgIGlmICh0aGlzLmxhc3RWYWx1ZSAhPT0gbmV3VmFsdWUpIHtcclxuICAgICAgICAgICAgdGhpcy5sYXN0VmFsdWUgPSBuZXdWYWx1ZTtcclxuICAgICAgICAgICAgdGhpcy5lbWl0KEJpbmRpbmcuQ2hhbmdlZEZpZWxkRXZlbnROYW1lLCB7XHJcbiAgICAgICAgICAgICAgICB0YXJnZXQ6IHRoaXMudGFyZ2V0LFxyXG4gICAgICAgICAgICAgICAgZXZlbnRBcmdzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgZmllbGROYW1lOiB0aGlzLmV4cHJlc3Npb24sXHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IG5ld1ZhbHVlXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgc291cmNlOiB0aGlzXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5leHBvcnRzLldhdGNoQmluZGluZyA9IFdhdGNoQmluZGluZztcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9YmluZGVyLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbmZ1bmN0aW9uIGFycmF5KGFycmF5LCBib2R5LCBjb21wbGV0ZSkge1xyXG4gICAgdmFyIGxvb3AgPSBmdW5jdGlvbiAoaSkge1xyXG4gICAgICAgIGlmIChpID09IGFycmF5Lmxlbmd0aClcclxuICAgICAgICAgICAgY29tcGxldGUoKTtcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBib2R5KGFycmF5W2ldLCBpLCBmdW5jdGlvbiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyb3IpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBsZXRlKGVycm9yKTtcclxuICAgICAgICAgICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldEltbWVkaWF0ZShsb29wLCBpICsgMSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgY29tcGxldGUoZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgIH07XHJcbiAgICBsb29wKDApO1xyXG59XHJcbmV4cG9ydHMuYXJyYXkgPSBhcnJheTtcclxuZnVuY3Rpb24gb2JqZWN0KG8sIGJvZHksIGNvbXBsZXRlKSB7XHJcbiAgICBhcnJheShPYmplY3Qua2V5cyhvKSwgZnVuY3Rpb24gKGtleSwgaSwgbmV4dCkge1xyXG4gICAgICAgIGJvZHkob1trZXldLCBrZXksIG5leHQpO1xyXG4gICAgfSwgY29tcGxldGUpO1xyXG59XHJcbmV4cG9ydHMub2JqZWN0ID0gb2JqZWN0O1xyXG5mdW5jdGlvbiBhbnkoaXQsIGJvZHksIGNvbXBsZXRlKSB7XHJcbiAgICBpZiAoQXJyYXkuaXNBcnJheShpdCkgfHwgdHlwZW9mIChpdFsnbGVuZ3RoJ10pICE9ICd1bmRlZmluZWQnKVxyXG4gICAgICAgIHJldHVybiBhcnJheShpdCwgYm9keSwgY29tcGxldGUpO1xyXG4gICAgcmV0dXJuIG9iamVjdChpdCwgYm9keSwgY29tcGxldGUpO1xyXG59XHJcbmV4cG9ydHMuYW55ID0gYW55O1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1lYWNoQXN5bmMuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxuY29uc3QgaW5qZWN0b3JfMSA9IHJlcXVpcmUoXCIuL2luamVjdG9yXCIpO1xyXG5mdW5jdGlvbiBmYWN0b3J5KG5hbWUsIC4uLnRvSW5qZWN0KSB7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24gKHRhcmdldCkge1xyXG4gICAgICAgIHZhciBpbnN0YW5jZSA9IG51bGw7XHJcbiAgICAgICAgdmFyIGZhY3RvcnkgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIGlmICghaW5zdGFuY2UpIHtcclxuICAgICAgICAgICAgICAgIHZhciBhcmdzID0gW251bGxdO1xyXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgYXJnIGluIGFyZ3VtZW50cylcclxuICAgICAgICAgICAgICAgICAgICBhcmdzLnB1c2goYXJndW1lbnRzW2FyZ10pO1xyXG4gICAgICAgICAgICAgICAgaW5zdGFuY2UgPSBuZXcgKHRhcmdldC5iaW5kLmFwcGx5KHRhcmdldCwgYXJncykpKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIGluc3RhbmNlLmJ1aWxkKCk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICBpZiAodG9JbmplY3QgPT0gbnVsbCB8fCB0b0luamVjdC5sZW5ndGggPT0gMClcclxuICAgICAgICAgICAgaW5qZWN0b3JfMS5yZWdpc3RlckZhY3RvcnkobmFtZSwgaW5qZWN0b3JfMS5pbmplY3QoZmFjdG9yeSkpO1xyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgICAgaW5qZWN0b3JfMS5yZWdpc3RlckZhY3RvcnkobmFtZSwgaW5qZWN0b3JfMS5pbmplY3RXaXRoTmFtZSh0b0luamVjdCwgZmFjdG9yeSkpO1xyXG4gICAgfTtcclxufVxyXG5leHBvcnRzLmZhY3RvcnkgPSBmYWN0b3J5O1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1mYWN0b3J5LmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbmZ1bmN0aW9uIGlkZW50aXR5KGEpIHtcclxuICAgIHJldHVybiBhO1xyXG59XHJcbmV4cG9ydHMuaWRlbnRpdHkgPSBpZGVudGl0eTtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9aWRlbnRpdHkuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbmZ1bmN0aW9uIF9fZXhwb3J0KG0pIHtcclxuICAgIGZvciAodmFyIHAgaW4gbSkgaWYgKCFleHBvcnRzLmhhc093blByb3BlcnR5KHApKSBleHBvcnRzW3BdID0gbVtwXTtcclxufVxyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbl9fZXhwb3J0KHJlcXVpcmUoXCIuL2lkZW50aXR5XCIpKTtcclxuX19leHBvcnQocmVxdWlyZShcIi4vbmVnYXRlXCIpKTtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9aW5kZXguanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxuZnVuY3Rpb24gbmVnYXRlKGEpIHtcclxuICAgIHJldHVybiAhYTtcclxufVxyXG5leHBvcnRzLm5lZ2F0ZSA9IG5lZ2F0ZTtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9bmVnYXRlLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xyXG5mdW5jdGlvbiBfX2V4cG9ydChtKSB7XHJcbiAgICBmb3IgKHZhciBwIGluIG0pIGlmICghZXhwb3J0cy5oYXNPd25Qcm9wZXJ0eShwKSkgZXhwb3J0c1twXSA9IG1bcF07XHJcbn1cclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5fX2V4cG9ydChyZXF1aXJlKFwiLi9pbmplY3RvclwiKSk7XHJcbl9fZXhwb3J0KHJlcXVpcmUoXCIuL2ZhY3RvcnlcIikpO1xyXG5fX2V4cG9ydChyZXF1aXJlKFwiLi9zZXJ2aWNlXCIpKTtcclxuX19leHBvcnQocmVxdWlyZShcIi4vYmluZGVyXCIpKTtcclxuX19leHBvcnQocmVxdWlyZShcIi4vcGFyc2VyXCIpKTtcclxuY29uc3QgbW9kdWxlXzEgPSByZXF1aXJlKFwiLi9tb2R1bGVcIik7XHJcbl9fZXhwb3J0KHJlcXVpcmUoXCIuL3Byb21pc2VIZWxwZXJzXCIpKTtcclxudmFyIGVhY2hBc3luY18xID0gcmVxdWlyZShcIi4vZWFjaEFzeW5jXCIpO1xyXG5leHBvcnRzLmVhY2hBc3luYyA9IGVhY2hBc3luY18xLmFueTtcclxuX19leHBvcnQocmVxdWlyZShcIi4vcm91dGVyXCIpKTtcclxuZnVuY3Rpb24gbW9kdWxlKG5hbWUsIC4uLmRlcGVuZGVuY2llcykge1xyXG4gICAgcmV0dXJuIG5ldyBtb2R1bGVfMS5Nb2R1bGUobmFtZSwgZGVwZW5kZW5jaWVzKTtcclxufVxyXG5leHBvcnRzLm1vZHVsZSA9IG1vZHVsZTtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9aW5kZXguanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxuY29uc3QgcmVmbGVjdF8xID0gcmVxdWlyZShcIi4vcmVmbGVjdFwiKTtcclxuZnVuY3Rpb24gY3RvclRvRnVuY3Rpb24oKSB7XHJcbiAgICB2YXIgYXJncyA9IFtudWxsXTtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKVxyXG4gICAgICAgIGFyZ3NbaSArIDFdID0gYXJndW1lbnRzW2ldO1xyXG4gICAgcmV0dXJuIG5ldyAoRnVuY3Rpb24ucHJvdG90eXBlLmJpbmQuYXBwbHkodGhpcywgYXJncykpO1xyXG59XHJcbmNsYXNzIEluamVjdG9yIHtcclxuICAgIGNvbnN0cnVjdG9yKHBhcmVudCkge1xyXG4gICAgICAgIHRoaXMucGFyZW50ID0gcGFyZW50O1xyXG4gICAgICAgIHRoaXMuaW5qZWN0YWJsZXMgPSB7fTtcclxuICAgICAgICBpZiAodGhpcy5wYXJlbnQgPT0gbnVsbClcclxuICAgICAgICAgICAgdGhpcy5wYXJlbnQgPSBkZWZhdWx0SW5qZWN0b3I7XHJcbiAgICAgICAgdGhpcy5yZWdpc3RlcignJGluamVjdG9yJywgdGhpcyk7XHJcbiAgICB9XHJcbiAgICBzZXRJbmplY3RhYmxlcyh2YWx1ZSkge1xyXG4gICAgICAgIHRoaXMuaW5qZWN0YWJsZXMgPSB2YWx1ZTtcclxuICAgIH1cclxuICAgIGtleXMoKSB7XHJcbiAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKHRoaXMuaW5qZWN0YWJsZXMpO1xyXG4gICAgfVxyXG4gICAgbWVyZ2UoaSkge1xyXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgICBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhpLmluamVjdGFibGVzKS5mb3JFYWNoKGZ1bmN0aW9uIChwcm9wZXJ0eSkge1xyXG4gICAgICAgICAgICBpZiAocHJvcGVydHkgIT0gJyRpbmplY3RvcicpXHJcbiAgICAgICAgICAgICAgICBzZWxmLnJlZ2lzdGVyRGVzY3JpcHRvcihwcm9wZXJ0eSwgT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihpLmluamVjdGFibGVzLCBwcm9wZXJ0eSkpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgaW5qZWN0KGEpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5pbmplY3RXaXRoTmFtZShhWyckaW5qZWN0J10gfHwgcmVmbGVjdF8xLmdldFBhcmFtTmFtZXMoYSksIGEpO1xyXG4gICAgfVxyXG4gICAgcmVzb2x2ZShwYXJhbSkge1xyXG4gICAgICAgIGlmICh0eXBlb2YgKHRoaXMuaW5qZWN0YWJsZXNbcGFyYW1dKSAhPSAndW5kZWZpbmVkJylcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaW5qZWN0YWJsZXNbcGFyYW1dO1xyXG4gICAgICAgIGlmICh0aGlzLnBhcmVudClcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMucGFyZW50LnJlc29sdmUocGFyYW0pO1xyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG4gICAgaW5zcGVjdCgpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyh0aGlzLmluamVjdGFibGVzKTtcclxuICAgIH1cclxuICAgIGluamVjdE5ld1dpdGhOYW1lKHRvSW5qZWN0LCBjdG9yKSB7XHJcbiAgICAgICAgcmV0dXJuIGluamVjdFdpdGhOYW1lKHRvSW5qZWN0LCBjdG9yVG9GdW5jdGlvbi5iaW5kKGN0b3IpKTtcclxuICAgIH1cclxuICAgIGluamVjdFdpdGhOYW1lKHRvSW5qZWN0LCBhKSB7XHJcbiAgICAgICAgdmFyIHBhcmFtTmFtZXMgPSByZWZsZWN0XzEuZ2V0UGFyYW1OYW1lcyhhKTtcclxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICAgICAgaWYgKHBhcmFtTmFtZXMubGVuZ3RoID09IHRvSW5qZWN0Lmxlbmd0aCB8fCBwYXJhbU5hbWVzLmxlbmd0aCA9PSAwKSB7XHJcbiAgICAgICAgICAgIGlmICh0b0luamVjdC5sZW5ndGggPT0gcGFyYW1OYW1lcy5sZW5ndGggJiYgcGFyYW1OYW1lcy5sZW5ndGggPT0gMClcclxuICAgICAgICAgICAgICAgIHJldHVybiBhO1xyXG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGluc3RhbmNlKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgYXJncyA9IFtdO1xyXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgcGFyYW0gb2YgdG9JbmplY3QpIHtcclxuICAgICAgICAgICAgICAgICAgICBhcmdzW2FyZ3MubGVuZ3RoXSA9IHNlbGYucmVzb2x2ZShwYXJhbSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYS5hcHBseShpbnN0YW5jZSwgYXJncyk7XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChpbnN0YW5jZSkge1xyXG4gICAgICAgICAgICAgICAgdmFyIGFyZ3MgPSBbXTtcclxuICAgICAgICAgICAgICAgIHZhciB1bmtub3duQXJnSW5kZXggPSAwO1xyXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgcGFyYW0gb2YgcGFyYW1OYW1lcykge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChwYXJhbSBpbiB0b0luamVjdClcclxuICAgICAgICAgICAgICAgICAgICAgICAgYXJnc1thcmdzLmxlbmd0aF0gPSBzZWxmLnJlc29sdmUocGFyYW0pO1xyXG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKHR5cGVvZiAoYXJndW1lbnRzW3Vua25vd25BcmdJbmRleF0pICE9ICd1bmRlZmluZWQnKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhcmdzW2FyZ3MubGVuZ3RoXSA9IGFyZ3VtZW50c1t1bmtub3duQXJnSW5kZXgrK107XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhcmdzW2FyZ3MubGVuZ3RoXSA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYS5hcHBseShpbnN0YW5jZSwgYXJncyk7XHJcbiAgICAgICAgICAgIH07XHJcbiAgICB9XHJcbiAgICB1bnJlZ2lzdGVyKG5hbWUpIHtcclxuICAgICAgICB2YXIgcmVnaXN0cmF0aW9uID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0aGlzLmluamVjdGFibGVzLCBuYW1lKTtcclxuICAgICAgICBpZiAocmVnaXN0cmF0aW9uKVxyXG4gICAgICAgICAgICBkZWxldGUgdGhpcy5pbmplY3RhYmxlc1tuYW1lXTtcclxuICAgIH1cclxuICAgIHJlZ2lzdGVyKG5hbWUsIHZhbHVlLCBvdmVycmlkZSkge1xyXG4gICAgICAgIGlmICh0eXBlb2YgKHZhbHVlKSAhPSAndW5kZWZpbmVkJyAmJiB2YWx1ZSAhPT0gbnVsbClcclxuICAgICAgICAgICAgdGhpcy5yZWdpc3RlckRlc2NyaXB0b3IobmFtZSwgeyB2YWx1ZTogdmFsdWUsIGVudW1lcmFibGU6IHRydWUsIGNvbmZpZ3VyYWJsZTogdHJ1ZSB9LCBvdmVycmlkZSk7XHJcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xyXG4gICAgfVxyXG4gICAgcmVnaXN0ZXJGYWN0b3J5KG5hbWUsIHZhbHVlLCBvdmVycmlkZSkge1xyXG4gICAgICAgIHRoaXMucmVnaXN0ZXIobmFtZSArICdGYWN0b3J5JywgdmFsdWUsIG92ZXJyaWRlKTtcclxuICAgICAgICB0aGlzLnJlZ2lzdGVyRGVzY3JpcHRvcihuYW1lLCB7XHJcbiAgICAgICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlKCk7XHJcbiAgICAgICAgICAgIH0sIGVudW1lcmFibGU6IHRydWUsIGNvbmZpZ3VyYWJsZTogdHJ1ZVxyXG4gICAgICAgIH0sIG92ZXJyaWRlKTtcclxuICAgICAgICByZXR1cm4gdmFsdWU7XHJcbiAgICB9XHJcbiAgICByZWdpc3RlckRlc2NyaXB0b3IobmFtZSwgdmFsdWUsIG92ZXJyaWRlKSB7XHJcbiAgICAgICAgaWYgKCFvdmVycmlkZSAmJiB0eXBlb2YgKHRoaXMuaW5qZWN0YWJsZXNbbmFtZV0pICE9ICd1bmRlZmluZWQnKVxyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1RoZXJlIGlzIGFscmVhZHkgYSByZWdpc3RlcmVkIGl0ZW0gZm9yICcgKyBuYW1lKTtcclxuICAgICAgICBpZiAodHlwZW9mICh0aGlzLmluamVjdGFibGVzW25hbWVdKSAhPT0gJ3VuZGVmaW5lZCcpXHJcbiAgICAgICAgICAgIHRoaXMudW5yZWdpc3RlcihuYW1lKTtcclxuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGhpcy5pbmplY3RhYmxlcywgbmFtZSwgdmFsdWUpO1xyXG4gICAgfVxyXG59XHJcbmV4cG9ydHMuSW5qZWN0b3IgPSBJbmplY3RvcjtcclxuaWYgKCFnbG9iYWxbJyQkZGVmYXVsdEluamVjdG9yJ10pXHJcbiAgICBnbG9iYWxbJyQkZGVmYXVsdEluamVjdG9yJ10gPSBuZXcgSW5qZWN0b3IoKTtcclxudmFyIGRlZmF1bHRJbmplY3RvciA9IGdsb2JhbFsnJCRkZWZhdWx0SW5qZWN0b3InXTtcclxuZnVuY3Rpb24gcmVzb2x2ZShuYW1lKSB7XHJcbiAgICByZXR1cm4gZGVmYXVsdEluamVjdG9yLnJlc29sdmUobmFtZSk7XHJcbn1cclxuZXhwb3J0cy5yZXNvbHZlID0gcmVzb2x2ZTtcclxuZnVuY3Rpb24gdW5yZWdpc3RlcihuYW1lKSB7XHJcbiAgICByZXR1cm4gZGVmYXVsdEluamVjdG9yLnVucmVnaXN0ZXIobmFtZSk7XHJcbn1cclxuZXhwb3J0cy51bnJlZ2lzdGVyID0gdW5yZWdpc3RlcjtcclxuZnVuY3Rpb24gbWVyZ2UoaSkge1xyXG4gICAgcmV0dXJuIGRlZmF1bHRJbmplY3Rvci5tZXJnZShpKTtcclxufVxyXG5leHBvcnRzLm1lcmdlID0gbWVyZ2U7XHJcbmZ1bmN0aW9uIGluc3BlY3QoKSB7XHJcbiAgICByZXR1cm4gZGVmYXVsdEluamVjdG9yLmluc3BlY3QoKTtcclxufVxyXG5leHBvcnRzLmluc3BlY3QgPSBpbnNwZWN0O1xyXG5mdW5jdGlvbiBpbmplY3QoYSkge1xyXG4gICAgcmV0dXJuIGRlZmF1bHRJbmplY3Rvci5pbmplY3QoYSk7XHJcbn1cclxuZXhwb3J0cy5pbmplY3QgPSBpbmplY3Q7XHJcbmZ1bmN0aW9uIGluamVjdFdpdGhOYW1lKHRvSW5qZWN0LCBhKSB7XHJcbiAgICByZXR1cm4gZGVmYXVsdEluamVjdG9yLmluamVjdFdpdGhOYW1lKHRvSW5qZWN0LCBhKTtcclxufVxyXG5leHBvcnRzLmluamVjdFdpdGhOYW1lID0gaW5qZWN0V2l0aE5hbWU7XHJcbmZ1bmN0aW9uIGluamVjdE5ld1dpdGhOYW1lKHRvSW5qZWN0LCBhKSB7XHJcbiAgICByZXR1cm4gZGVmYXVsdEluamVjdG9yLmluamVjdE5ld1dpdGhOYW1lKHRvSW5qZWN0LCBhKTtcclxufVxyXG5leHBvcnRzLmluamVjdE5ld1dpdGhOYW1lID0gaW5qZWN0TmV3V2l0aE5hbWU7XHJcbmZ1bmN0aW9uIHJlZ2lzdGVyKG5hbWUsIHZhbHVlLCBvdmVycmlkZSkge1xyXG4gICAgcmV0dXJuIGRlZmF1bHRJbmplY3Rvci5yZWdpc3RlcihuYW1lLCB2YWx1ZSwgb3ZlcnJpZGUpO1xyXG59XHJcbmV4cG9ydHMucmVnaXN0ZXIgPSByZWdpc3RlcjtcclxuZnVuY3Rpb24gcmVnaXN0ZXJGYWN0b3J5KG5hbWUsIHZhbHVlLCBvdmVycmlkZSkge1xyXG4gICAgcmV0dXJuIGRlZmF1bHRJbmplY3Rvci5yZWdpc3RlckZhY3RvcnkobmFtZSwgdmFsdWUsIG92ZXJyaWRlKTtcclxufVxyXG5leHBvcnRzLnJlZ2lzdGVyRmFjdG9yeSA9IHJlZ2lzdGVyRmFjdG9yeTtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9aW5qZWN0b3IuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxuY29uc3QgZGkgPSByZXF1aXJlKFwiLi9pbmplY3RvclwiKTtcclxuY29uc3Qgb3JjaGVzdHJhdG9yID0gcmVxdWlyZShcIm9yY2hlc3RyYXRvclwiKTtcclxuY29uc3QgZXZlbnRzXzEgPSByZXF1aXJlKFwiZXZlbnRzXCIpO1xyXG5wcm9jZXNzLmhydGltZSA9IHByb2Nlc3MuaHJ0aW1lIHx8IHJlcXVpcmUoJ2Jyb3dzZXItcHJvY2Vzcy1ocnRpbWUnKTtcclxuY2xhc3MgTW9kdWxlIGV4dGVuZHMgZGkuSW5qZWN0b3Ige1xyXG4gICAgY29uc3RydWN0b3IobmFtZSwgZGVwKSB7XHJcbiAgICAgICAgc3VwZXIoKTtcclxuICAgICAgICB0aGlzLm5hbWUgPSBuYW1lO1xyXG4gICAgICAgIHRoaXMuZGVwID0gZGVwO1xyXG4gICAgICAgIHRoaXMuZW1pdHRlciA9IG5ldyBldmVudHNfMS5FdmVudEVtaXR0ZXIoKTtcclxuICAgICAgICBNb2R1bGUucmVnaXN0ZXJNb2R1bGUodGhpcyk7XHJcbiAgICB9XHJcbiAgICBzdGF0aWMgcmVnaXN0ZXJNb2R1bGUobSkge1xyXG4gICAgICAgIHZhciBlbWl0dGVyID0gbS5lbWl0dGVyO1xyXG4gICAgICAgIE1vZHVsZS5vLmFkZChtLm5hbWUsIG0uZGVwLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIGRpLm1lcmdlKG0pO1xyXG4gICAgICAgICAgICBlbWl0dGVyLmVtaXQoJ2luaXQnKTtcclxuICAgICAgICAgICAgZW1pdHRlci5lbWl0KCdydW4nKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIHJ1bih0b0luamVjdCwgZikge1xyXG4gICAgICAgIHRoaXMuZW1pdHRlci5vbigncnVuJywgZGkuaW5qZWN0V2l0aE5hbWUodG9JbmplY3QsIGYpKTtcclxuICAgIH1cclxuICAgIGluaXQodG9JbmplY3QsIGYpIHtcclxuICAgICAgICBpZiAoIXRvSW5qZWN0IHx8IHRvSW5qZWN0Lmxlbmd0aCA9PSAwKVxyXG4gICAgICAgICAgICB0aGlzLmVtaXR0ZXIub24oJ2luaXQnLCBmKTtcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgIHRoaXMuZW1pdHRlci5vbignaW5pdCcsIGRpLmluamVjdFdpdGhOYW1lKHRvSW5qZWN0LCBmKSk7XHJcbiAgICB9XHJcbiAgICBzdGFydCh0b0luamVjdCwgZikge1xyXG4gICAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09IDApXHJcbiAgICAgICAgICAgIE1vZHVsZS5vLnN0YXJ0KHRoaXMubmFtZSk7XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICBNb2R1bGUuby5vbignc3RvcCcsIGRpLmluamVjdFdpdGhOYW1lKHRvSW5qZWN0LCBmKSk7XHJcbiAgICB9XHJcbiAgICBpbnRlcm5hbFN0YXJ0KGNhbGxiYWNrKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuc3RhcnRpbmcpXHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB0aGlzLnN0YXJ0aW5nID0gdHJ1ZTtcclxuICAgIH1cclxufVxyXG5Nb2R1bGUubyA9IG5ldyBvcmNoZXN0cmF0b3IoKTtcclxuZXhwb3J0cy5Nb2R1bGUgPSBNb2R1bGU7XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPW1vZHVsZS5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5jb25zdCBwcm9taXNlSGVscGVyc18xID0gcmVxdWlyZShcIi4vcHJvbWlzZUhlbHBlcnNcIik7XHJcbmNvbnN0IGJpbmRlcl8xID0gcmVxdWlyZShcIi4vYmluZGVyXCIpO1xyXG5jb25zdCBmb3JtYXR0ZXJzID0gcmVxdWlyZShcIi4vZm9ybWF0dGVyc1wiKTtcclxudmFyIGpzb25LZXlSZWdleCA9IC9eICpcIihbXlwiXSspXCJ8KFteXFw6IF0rKSAqOiAqLztcclxuY2xhc3MgUGFyc2VkQmluYXJ5IHtcclxuICAgIGNvbnN0cnVjdG9yKG9wZXJhdG9yLCBsZWZ0LCByaWdodCkge1xyXG4gICAgICAgIHRoaXMub3BlcmF0b3IgPSBvcGVyYXRvcjtcclxuICAgICAgICB0aGlzLmxlZnQgPSBsZWZ0O1xyXG4gICAgICAgIHRoaXMucmlnaHQgPSByaWdodDtcclxuICAgICAgICB0aGlzLiQkbGVuZ3RoID0gdGhpcy5sZWZ0LiQkbGVuZ3RoICsgdGhpcy5vcGVyYXRvci5sZW5ndGggKyB0aGlzLnJpZ2h0LiQkbGVuZ3RoO1xyXG4gICAgfVxyXG4gICAgZXZhbHVhdGUodmFsdWUsIGFzQmluZGluZykge1xyXG4gICAgICAgIHZhciBvcGVyYXRpb24gPSB0aGlzO1xyXG4gICAgICAgIGlmIChhc0JpbmRpbmcpIHtcclxuICAgICAgICAgICAgdmFyIGxlZnQsIHJpZ2h0O1xyXG4gICAgICAgICAgICBpZiAob3BlcmF0aW9uLmxlZnQgaW5zdGFuY2VvZiBGdW5jdGlvbilcclxuICAgICAgICAgICAgICAgIGxlZnQgPSBvcGVyYXRpb24ubGVmdCh2YWx1ZSwgYXNCaW5kaW5nKTtcclxuICAgICAgICAgICAgZWxzZSBpZiAob3BlcmF0aW9uLmxlZnQgaW5zdGFuY2VvZiBQYXJzZWRCaW5hcnkpXHJcbiAgICAgICAgICAgICAgICBsZWZ0ID0gb3BlcmF0aW9uLmxlZnQuZXZhbHVhdGUodmFsdWUsIGFzQmluZGluZyk7XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKG9wZXJhdGlvbi5sZWZ0IGluc3RhbmNlb2YgUGFyc2VkU3RyaW5nKVxyXG4gICAgICAgICAgICAgICAgbGVmdCA9IG9wZXJhdGlvbi5sZWZ0LnZhbHVlO1xyXG4gICAgICAgICAgICBlbHNlIGlmIChvcGVyYXRpb24ubGVmdCBpbnN0YW5jZW9mIFBhcnNlZE51bWJlcilcclxuICAgICAgICAgICAgICAgIGxlZnQgPSBvcGVyYXRpb24ubGVmdC52YWx1ZTtcclxuICAgICAgICAgICAgZWxzZSBpZiAob3BlcmF0aW9uLmxlZnQgaW5zdGFuY2VvZiBBcnJheSlcclxuICAgICAgICAgICAgICAgIGxlZnQgPSBvcGVyYXRpb24ubGVmdDtcclxuICAgICAgICAgICAgZWxzZSBpZiAob3BlcmF0aW9uLmxlZnQgaW5zdGFuY2VvZiBPYmplY3QpXHJcbiAgICAgICAgICAgICAgICBsZWZ0ID0gb3BlcmF0aW9uLmxlZnQ7XHJcbiAgICAgICAgICAgIGlmIChvcGVyYXRpb24ucmlnaHQgaW5zdGFuY2VvZiBGdW5jdGlvbilcclxuICAgICAgICAgICAgICAgIHJpZ2h0ID0gb3BlcmF0aW9uLnJpZ2h0KHZhbHVlLCBhc0JpbmRpbmcpO1xyXG4gICAgICAgICAgICBlbHNlIGlmIChvcGVyYXRpb24ucmlnaHQgaW5zdGFuY2VvZiBQYXJzZWRCaW5hcnkpXHJcbiAgICAgICAgICAgICAgICByaWdodCA9IG9wZXJhdGlvbi5yaWdodC5ldmFsdWF0ZSh2YWx1ZSwgYXNCaW5kaW5nKTtcclxuICAgICAgICAgICAgZWxzZSBpZiAob3BlcmF0aW9uLnJpZ2h0IGluc3RhbmNlb2YgUGFyc2VkU3RyaW5nKVxyXG4gICAgICAgICAgICAgICAgcmlnaHQgPSBvcGVyYXRpb24ucmlnaHQudmFsdWU7XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKG9wZXJhdGlvbi5yaWdodCBpbnN0YW5jZW9mIFBhcnNlZE51bWJlcilcclxuICAgICAgICAgICAgICAgIHJpZ2h0ID0gb3BlcmF0aW9uLnJpZ2h0LnZhbHVlO1xyXG4gICAgICAgICAgICBlbHNlIGlmIChvcGVyYXRpb24ucmlnaHQgaW5zdGFuY2VvZiBBcnJheSlcclxuICAgICAgICAgICAgICAgIHJpZ2h0ID0gb3BlcmF0aW9uLnJpZ2h0O1xyXG4gICAgICAgICAgICBlbHNlIGlmIChvcGVyYXRpb24ucmlnaHQgaW5zdGFuY2VvZiBPYmplY3QpXHJcbiAgICAgICAgICAgICAgICByaWdodCA9IG9wZXJhdGlvbi5yaWdodDtcclxuICAgICAgICAgICAgdmFyIGJpbmRpbmcgPSBuZXcgYmluZGVyXzEuQmluZGluZyhudWxsLCBudWxsLCBmYWxzZSk7XHJcbiAgICAgICAgICAgIGlmIChsZWZ0IGluc3RhbmNlb2YgYmluZGVyXzEuQmluZGluZylcclxuICAgICAgICAgICAgICAgIGxlZnQucGlwZShiaW5kaW5nKTtcclxuICAgICAgICAgICAgaWYgKHJpZ2h0IGluc3RhbmNlb2YgYmluZGVyXzEuQmluZGluZylcclxuICAgICAgICAgICAgICAgIHJpZ2h0LnBpcGUoYmluZGluZyk7XHJcbiAgICAgICAgICAgIGJpbmRpbmdbJyQkbGVuZ3RoJ10gPSBvcGVyYXRpb24uJCRsZW5ndGg7XHJcbiAgICAgICAgICAgIGJpbmRpbmcuZ2V0VmFsdWUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgZmxlZnQsIGZyaWdodDtcclxuICAgICAgICAgICAgICAgIGlmIChsZWZ0IGluc3RhbmNlb2YgYmluZGVyXzEuQmluZGluZylcclxuICAgICAgICAgICAgICAgICAgICBmbGVmdCA9IGxlZnQuZ2V0VmFsdWUoKTtcclxuICAgICAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgICAgICAgICBmbGVmdCA9IGxlZnQ7XHJcbiAgICAgICAgICAgICAgICBpZiAocmlnaHQgaW5zdGFuY2VvZiBiaW5kZXJfMS5CaW5kaW5nKVxyXG4gICAgICAgICAgICAgICAgICAgIGZyaWdodCA9IHJpZ2h0LmdldFZhbHVlKCk7XHJcbiAgICAgICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgZnJpZ2h0ID0gcmlnaHQ7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gUGFyc2VyLm9wZXJhdGUob3BlcmF0aW9uLm9wZXJhdG9yLCBmbGVmdCwgZnJpZ2h0KTtcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgcmV0dXJuIGJpbmRpbmc7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICB2YXIgbGVmdCwgcmlnaHQ7XHJcbiAgICAgICAgICAgIGlmIChvcGVyYXRpb24ubGVmdCBpbnN0YW5jZW9mIEZ1bmN0aW9uKVxyXG4gICAgICAgICAgICAgICAgbGVmdCA9IG9wZXJhdGlvbi5sZWZ0KHZhbHVlLCBmYWxzZSk7XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKG9wZXJhdGlvbi5sZWZ0IGluc3RhbmNlb2YgUGFyc2VkQmluYXJ5KVxyXG4gICAgICAgICAgICAgICAgbGVmdCA9IG9wZXJhdGlvbi5sZWZ0LmV2YWx1YXRlKHZhbHVlLCBhc0JpbmRpbmcpO1xyXG4gICAgICAgICAgICBlbHNlIGlmIChvcGVyYXRpb24ubGVmdCBpbnN0YW5jZW9mIFBhcnNlZFN0cmluZylcclxuICAgICAgICAgICAgICAgIGxlZnQgPSBvcGVyYXRpb24ubGVmdC52YWx1ZTtcclxuICAgICAgICAgICAgZWxzZSBpZiAob3BlcmF0aW9uLmxlZnQgaW5zdGFuY2VvZiBQYXJzZWROdW1iZXIpXHJcbiAgICAgICAgICAgICAgICBsZWZ0ID0gb3BlcmF0aW9uLmxlZnQudmFsdWU7XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKG9wZXJhdGlvbi5sZWZ0IGluc3RhbmNlb2YgQXJyYXkpXHJcbiAgICAgICAgICAgICAgICBsZWZ0ID0gb3BlcmF0aW9uLmxlZnQ7XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKG9wZXJhdGlvbi5sZWZ0IGluc3RhbmNlb2YgT2JqZWN0KVxyXG4gICAgICAgICAgICAgICAgbGVmdCA9IG9wZXJhdGlvbi5sZWZ0O1xyXG4gICAgICAgICAgICBpZiAob3BlcmF0aW9uLnJpZ2h0IGluc3RhbmNlb2YgRnVuY3Rpb24pXHJcbiAgICAgICAgICAgICAgICByaWdodCA9IG9wZXJhdGlvbi5yaWdodCh2YWx1ZSwgZmFsc2UpO1xyXG4gICAgICAgICAgICBlbHNlIGlmIChvcGVyYXRpb24ucmlnaHQgaW5zdGFuY2VvZiBQYXJzZWRCaW5hcnkpXHJcbiAgICAgICAgICAgICAgICByaWdodCA9IG9wZXJhdGlvbi5yaWdodC5ldmFsdWF0ZSh2YWx1ZSwgYXNCaW5kaW5nKTtcclxuICAgICAgICAgICAgZWxzZSBpZiAob3BlcmF0aW9uLnJpZ2h0IGluc3RhbmNlb2YgUGFyc2VkU3RyaW5nKVxyXG4gICAgICAgICAgICAgICAgcmlnaHQgPSBvcGVyYXRpb24ucmlnaHQudmFsdWU7XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKG9wZXJhdGlvbi5yaWdodCBpbnN0YW5jZW9mIFBhcnNlZE51bWJlcilcclxuICAgICAgICAgICAgICAgIHJpZ2h0ID0gb3BlcmF0aW9uLnJpZ2h0LnZhbHVlO1xyXG4gICAgICAgICAgICBlbHNlIGlmIChvcGVyYXRpb24ucmlnaHQgaW5zdGFuY2VvZiBBcnJheSlcclxuICAgICAgICAgICAgICAgIHJpZ2h0ID0gb3BlcmF0aW9uLnJpZ2h0O1xyXG4gICAgICAgICAgICBlbHNlIGlmIChvcGVyYXRpb24ucmlnaHQgaW5zdGFuY2VvZiBPYmplY3QpXHJcbiAgICAgICAgICAgICAgICByaWdodCA9IG9wZXJhdGlvbi5yaWdodDtcclxuICAgICAgICAgICAgcmV0dXJuIFBhcnNlci5vcGVyYXRlKG9wZXJhdGlvbi5vcGVyYXRvciwgbGVmdCwgcmlnaHQpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHN0YXRpYyBhcHBseVByZWNlZGVuY2Uob3BlcmF0aW9uKSB7XHJcbiAgICAgICAgaWYgKG9wZXJhdGlvbi5vcGVyYXRvciAhPSAnKycgJiYgb3BlcmF0aW9uLm9wZXJhdG9yICE9ICctJykge1xyXG4gICAgICAgICAgICBpZiAob3BlcmF0aW9uLnJpZ2h0IGluc3RhbmNlb2YgRnVuY3Rpb24pIHtcclxuICAgICAgICAgICAgICAgIHZhciByaWdodCA9IFBhcnNlZEJpbmFyeS5hcHBseVByZWNlZGVuY2Uob3BlcmF0aW9uLnJpZ2h0LiQkYXN0KTtcclxuICAgICAgICAgICAgICAgIHN3aXRjaCAocmlnaHQub3BlcmF0b3IpIHtcclxuICAgICAgICAgICAgICAgICAgICBjYXNlICcrJzpcclxuICAgICAgICAgICAgICAgICAgICBjYXNlICctJzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnKic6IC8vIGIqKGMrZCkgPT0+IChiKmMpK2RcclxuICAgICAgICAgICAgICAgICAgICBjYXNlICcvJzpcclxuICAgICAgICAgICAgICAgICAgICBjYXNlICcmJic6XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnfHwnOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgbGVmdCA9IG9wZXJhdGlvbi5sZWZ0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBvcGVyYXRpb24ucmlnaHQgPSByaWdodC5yaWdodDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgb3BlcmF0aW9uLmxlZnQgPSBuZXcgUGFyc2VkQmluYXJ5KG9wZXJhdGlvbi5vcGVyYXRvciwgbGVmdCwgcmlnaHQubGVmdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG9wZXJhdGlvbi5vcGVyYXRvciA9IHJpZ2h0Lm9wZXJhdG9yO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gb3BlcmF0aW9uO1xyXG4gICAgfVxyXG4gICAgdG9TdHJpbmcoKSB7XHJcbiAgICAgICAgcmV0dXJuICcoJyArIHRoaXMubGVmdC50b1N0cmluZygpICsgdGhpcy5vcGVyYXRvciArIHRoaXMucmlnaHQudG9TdHJpbmcoKSArICcpJztcclxuICAgIH1cclxufVxyXG5leHBvcnRzLlBhcnNlZEJpbmFyeSA9IFBhcnNlZEJpbmFyeTtcclxuY2xhc3MgUGFyc2VkU3RyaW5nIHtcclxuICAgIGNvbnN0cnVjdG9yKHZhbHVlKSB7XHJcbiAgICAgICAgdGhpcy52YWx1ZSA9IHZhbHVlO1xyXG4gICAgICAgIHRoaXMuJCRsZW5ndGggPSB2YWx1ZS5sZW5ndGggKyAyO1xyXG4gICAgfVxyXG4gICAgdG9TdHJpbmcoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMudmFsdWU7XHJcbiAgICB9XHJcbn1cclxuZXhwb3J0cy5QYXJzZWRTdHJpbmcgPSBQYXJzZWRTdHJpbmc7XHJcbmNsYXNzIFBhcnNlZE51bWJlciB7XHJcbiAgICBjb25zdHJ1Y3Rvcih2YWx1ZSkge1xyXG4gICAgICAgIHRoaXMudmFsdWUgPSBOdW1iZXIodmFsdWUpO1xyXG4gICAgICAgIHRoaXMuJCRsZW5ndGggPSB2YWx1ZS5sZW5ndGg7XHJcbiAgICB9XHJcbn1cclxuZXhwb3J0cy5QYXJzZWROdW1iZXIgPSBQYXJzZWROdW1iZXI7XHJcbmNsYXNzIFBhcnNlZEJvb2xlYW4ge1xyXG4gICAgY29uc3RydWN0b3IodmFsdWUpIHtcclxuICAgICAgICB0aGlzLnZhbHVlID0gQm9vbGVhbih2YWx1ZSk7XHJcbiAgICAgICAgaWYgKHR5cGVvZiB2YWx1ZSAhPSAndW5kZWZpbmVkJylcclxuICAgICAgICAgICAgdGhpcy4kJGxlbmd0aCA9IHZhbHVlLnRvU3RyaW5nKCkubGVuZ3RoO1xyXG4gICAgfVxyXG59XHJcbmV4cG9ydHMuUGFyc2VkQm9vbGVhbiA9IFBhcnNlZEJvb2xlYW47XHJcbmNsYXNzIFBhcnNlciB7XHJcbiAgICBzdGF0aWMgcGFyc2UoZXhwcmVzc2lvbiwgZXhjbHVkZUZpcnN0TGV2ZWxGdW5jdGlvbikge1xyXG4gICAgICAgIGV4cHJlc3Npb24gPSBleHByZXNzaW9uLnRyaW0oKTtcclxuICAgICAgICB2YXIgcmVzdWx0ID0gUGFyc2VyLnBhcnNlQW55KGV4cHJlc3Npb24sIGV4Y2x1ZGVGaXJzdExldmVsRnVuY3Rpb24pO1xyXG4gICAgICAgIGlmICghZXhjbHVkZUZpcnN0TGV2ZWxGdW5jdGlvbiAmJiByZXN1bHQgaW5zdGFuY2VvZiBQYXJzZWRCaW5hcnkpXHJcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQuZXZhbHVhdGUuYmluZChyZXN1bHQpO1xyXG4gICAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICB9XHJcbiAgICBzdGF0aWMgcGFyc2VBbnkoZXhwcmVzc2lvbiwgZXhjbHVkZUZpcnN0TGV2ZWxGdW5jdGlvbikge1xyXG4gICAgICAgIHN3aXRjaCAoZXhwcmVzc2lvblswXSkge1xyXG4gICAgICAgICAgICBjYXNlICd7JzpcclxuICAgICAgICAgICAgICAgIHJldHVybiBQYXJzZXIucGFyc2VPYmplY3QoZXhwcmVzc2lvbiwgZXhjbHVkZUZpcnN0TGV2ZWxGdW5jdGlvbik7XHJcbiAgICAgICAgICAgIGNhc2UgJ1snOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFBhcnNlci5wYXJzZUFycmF5KGV4cHJlc3Npb24sIGV4Y2x1ZGVGaXJzdExldmVsRnVuY3Rpb24pO1xyXG4gICAgICAgICAgICBjYXNlICdcIic6XHJcbiAgICAgICAgICAgIGNhc2UgXCInXCI6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gUGFyc2VyLnBhcnNlU3RyaW5nKGV4cHJlc3Npb24sIGV4cHJlc3Npb25bMF0pO1xyXG4gICAgICAgICAgICBjYXNlICcwJzpcclxuICAgICAgICAgICAgY2FzZSAnMSc6XHJcbiAgICAgICAgICAgIGNhc2UgJzInOlxyXG4gICAgICAgICAgICBjYXNlICczJzpcclxuICAgICAgICAgICAgY2FzZSAnNCc6XHJcbiAgICAgICAgICAgIGNhc2UgJzUnOlxyXG4gICAgICAgICAgICBjYXNlICc2JzpcclxuICAgICAgICAgICAgY2FzZSAnNyc6XHJcbiAgICAgICAgICAgIGNhc2UgJzgnOlxyXG4gICAgICAgICAgICBjYXNlICc5JzpcclxuICAgICAgICAgICAgY2FzZSAnLic6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gUGFyc2VyLnBhcnNlTnVtYmVyKGV4cHJlc3Npb24pO1xyXG4gICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFBhcnNlci5wYXJzZUV2YWwoZXhwcmVzc2lvbik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgc3RhdGljIHBhcnNlTnVtYmVyKGV4cHJlc3Npb24pIHtcclxuICAgICAgICB2YXIgcmVzdWx0ID0gbmV3IFBhcnNlZE51bWJlcigvXlswLTkuXS8uZXhlYyhleHByZXNzaW9uKVswXSk7XHJcbiAgICAgICAgcmV0dXJuIFBhcnNlci50cnlQYXJzZU9wZXJhdG9yKGV4cHJlc3Npb24uc3Vic3RyaW5nKHJlc3VsdC4kJGxlbmd0aCksIHJlc3VsdCk7XHJcbiAgICB9XHJcbiAgICBzdGF0aWMgcGFyc2VCb29sZWFuKGV4cHJlc3Npb24pIHtcclxuICAgICAgICB2YXIgZm9ybWF0dGVyID0gZm9ybWF0dGVycy5pZGVudGl0eTtcclxuICAgICAgICBpZiAoZXhwcmVzc2lvblswXSA9PSAnIScpIHtcclxuICAgICAgICAgICAgZm9ybWF0dGVyID0gZm9ybWF0dGVycy5uZWdhdGU7XHJcbiAgICAgICAgICAgIGV4cHJlc3Npb24gPSBleHByZXNzaW9uLnN1YnN0cmluZygxKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKC9edHJ1ZXxmYWxzZXx1bmRlZmluZWQvLmV4ZWMoZXhwcmVzc2lvbikpIHtcclxuICAgICAgICAgICAgdmFyIHJlc3VsdCA9IG5ldyBQYXJzZWRCb29sZWFuKC9edHJ1ZXxmYWxzZXx1bmRlZmluZWQvLmV4ZWMoZXhwcmVzc2lvbilbMF0pO1xyXG4gICAgICAgICAgICBpZiAoZm9ybWF0dGVyICE9PSBmb3JtYXR0ZXJzLmlkZW50aXR5KVxyXG4gICAgICAgICAgICAgICAgcmVzdWx0LnZhbHVlID0gZm9ybWF0dGVyKHJlc3VsdC52YWx1ZSk7XHJcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG4gICAgc3RhdGljIHBhcnNlRXZhbChleHByZXNzaW9uKSB7XHJcbiAgICAgICAgdmFyIGIgPSBQYXJzZXIucGFyc2VCb29sZWFuKGV4cHJlc3Npb24pO1xyXG4gICAgICAgIGlmIChiKVxyXG4gICAgICAgICAgICByZXR1cm4gYjtcclxuICAgICAgICByZXR1cm4gUGFyc2VyLnBhcnNlRnVuY3Rpb24oZXhwcmVzc2lvbik7XHJcbiAgICB9XHJcbiAgICBzdGF0aWMgcGFyc2VGdW5jdGlvbihleHByZXNzaW9uKSB7XHJcbiAgICAgICAgdmFyIGZvcm1hdHRlciA9IGZvcm1hdHRlcnMuaWRlbnRpdHk7XHJcbiAgICAgICAgaWYgKGV4cHJlc3Npb25bMF0gPT0gJyEnKSB7XHJcbiAgICAgICAgICAgIGZvcm1hdHRlciA9IGZvcm1hdHRlcnMubmVnYXRlO1xyXG4gICAgICAgICAgICBleHByZXNzaW9uID0gZXhwcmVzc2lvbi5zdWJzdHJpbmcoMSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBpdGVtID0gL15bXFx3MC05XFwuXFwkXSsvLmV4ZWMoZXhwcmVzc2lvbilbMF07XHJcbiAgICAgICAgdmFyIHBhcnRzID0gUGFyc2VyLnBhcnNlQmluZGFibGUoaXRlbSk7XHJcbiAgICAgICAgdmFyIGYgPSBmdW5jdGlvbiAodmFsdWUsIGFzQmluZGluZykge1xyXG4gICAgICAgICAgICBpZiAoYXNCaW5kaW5nKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAocHJvbWlzZUhlbHBlcnNfMS5pc1Byb21pc2VMaWtlKHZhbHVlKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBiaW5kaW5nID0gbmV3IGJpbmRlcl8xLlByb21pc2VCaW5kaW5nKGl0ZW0sIHZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICBiaW5kaW5nWyckJGxlbmd0aCddID0gaXRlbS5sZW5ndGg7XHJcbiAgICAgICAgICAgICAgICAgICAgYmluZGluZy5mb3JtYXR0ZXIgPSBmb3JtYXR0ZXI7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGJpbmRpbmc7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB2YXIgYmluZGluZyA9IG5ldyBiaW5kZXJfMS5CaW5kaW5nKGl0ZW0sIHZhbHVlKTtcclxuICAgICAgICAgICAgICAgIGJpbmRpbmdbJyQkbGVuZ3RoJ10gPSBpdGVtLmxlbmd0aDtcclxuICAgICAgICAgICAgICAgIGJpbmRpbmcuZm9ybWF0dGVyID0gZm9ybWF0dGVyO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGJpbmRpbmc7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXJ0cy5sZW5ndGggJiYgdmFsdWU7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZVtwYXJ0c1tpXV07XHJcbiAgICAgICAgICAgICAgICBpZiAocHJvbWlzZUhlbHBlcnNfMS5pc1Byb21pc2VMaWtlKHZhbHVlKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh2YWx1ZSBpbnN0YW5jZW9mIHByb21pc2VIZWxwZXJzXzEuRGVmZXJyZWQgJiYgdmFsdWUuJCRzdGF0dXMgPT0gcHJvbWlzZUhlbHBlcnNfMS5Qcm9taXNlU3RhdHVzLlJlc29sdmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gdmFsdWUuJCR2YWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBwcm9taXNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaSA9PSBwYXJ0cy5sZW5ndGggLSAxKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvbWlzZSA9IHZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9taXNlID0gdmFsdWUudGhlbihQYXJzZXIucGFyc2VGdW5jdGlvbihwYXJ0cy5zbGljZShpICsgMSkuam9pbignLicpKSkudGhlbihmb3JtYXR0ZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9taXNlWyckJGxlbmd0aCddID0gaXRlbS5sZW5ndGg7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBwcm9taXNlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gdmFsdWU7XHJcbiAgICAgICAgfTtcclxuICAgICAgICBmLiQkbGVuZ3RoID0gaXRlbS5sZW5ndGg7XHJcbiAgICAgICAgZiA9IFBhcnNlci50cnlQYXJzZU9wZXJhdG9yKGV4cHJlc3Npb24uc3Vic3RyKGl0ZW0ubGVuZ3RoKSwgZik7XHJcbiAgICAgICAgcmV0dXJuIGY7XHJcbiAgICB9XHJcbiAgICBzdGF0aWMgdHJ5UGFyc2VPcGVyYXRvcihleHByZXNzaW9uLCBsaHMpIHtcclxuICAgICAgICB2YXIgb3BlcmF0b3IgPSAvXiAqKFs8Pj0hXFwrXFwtXFwvXFwqJlxcfF0rKSAqLy5leGVjKGV4cHJlc3Npb24pO1xyXG4gICAgICAgIGlmIChvcGVyYXRvcikge1xyXG4gICAgICAgICAgICBleHByZXNzaW9uID0gZXhwcmVzc2lvbi5zdWJzdHJpbmcob3BlcmF0b3JbMF0ubGVuZ3RoKTtcclxuICAgICAgICAgICAgdmFyIHJocyA9IFBhcnNlci5wYXJzZUFueShleHByZXNzaW9uLCBmYWxzZSk7XHJcbiAgICAgICAgICAgIHJldHVybiBQYXJzZWRCaW5hcnkuYXBwbHlQcmVjZWRlbmNlKG5ldyBQYXJzZWRCaW5hcnkob3BlcmF0b3JbMV0sIGxocywgcmhzKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgICAgcmV0dXJuIGxocztcclxuICAgIH1cclxuICAgIHN0YXRpYyBwYXJzZUFycmF5KGV4cHJlc3Npb24sIGV4Y2x1ZGVGaXJzdExldmVsRnVuY3Rpb24pIHtcclxuICAgICAgICB2YXIgcmVzdWx0cyA9IFtdO1xyXG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShyZXN1bHRzLCAnJCRsZW5ndGgnLCB7IHZhbHVlOiAwLCBlbnVtZXJhYmxlOiBmYWxzZSwgY29uZmlndXJhYmxlOiB0cnVlLCB3cml0YWJsZTogdHJ1ZSB9KTtcclxuICAgICAgICB2YXIgaXNGdW5jdGlvbiA9IGZhbHNlO1xyXG4gICAgICAgIHJldHVybiBQYXJzZXIucGFyc2VDU1YoZXhwcmVzc2lvbiwgZnVuY3Rpb24gKHJlc3VsdCkge1xyXG4gICAgICAgICAgICB2YXIgaXRlbSA9IFBhcnNlci5wYXJzZUFueShyZXN1bHQsIGZhbHNlKTtcclxuICAgICAgICAgICAgaXRlbSA9IFBhcnNlci50cnlQYXJzZU9wZXJhdG9yKHJlc3VsdC5zdWJzdHJpbmcoaXRlbS4kJGxlbmd0aCksIGl0ZW0pO1xyXG4gICAgICAgICAgICBpZiAoaXRlbSBpbnN0YW5jZW9mIFBhcnNlZEJvb2xlYW4gfHwgaXRlbSBpbnN0YW5jZW9mIFBhcnNlZFN0cmluZyB8fCBpdGVtIGluc3RhbmNlb2YgUGFyc2VkTnVtYmVyKVxyXG4gICAgICAgICAgICAgICAgcmVzdWx0cy5wdXNoKGl0ZW0udmFsdWUpO1xyXG4gICAgICAgICAgICBlbHNlIGlmIChpdGVtIGluc3RhbmNlb2YgUGFyc2VkQmluYXJ5KVxyXG4gICAgICAgICAgICAgICAgcmVzdWx0cy5wdXNoKGl0ZW0uZXZhbHVhdGUuYmluZChpdGVtKSk7XHJcbiAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgICAgIHJlc3VsdHMucHVzaChpdGVtKTtcclxuICAgICAgICAgICAgLy8gcmVzdWx0cy4kJGxlbmd0aCArPSBpdGVtLiQkbGVuZ3RoO1xyXG4gICAgICAgICAgICByZXR1cm4gaXRlbTtcclxuICAgICAgICB9LCAnXScsIHJlc3VsdHMsIGV4Y2x1ZGVGaXJzdExldmVsRnVuY3Rpb24pO1xyXG4gICAgfVxyXG4gICAgc3RhdGljIHBhcnNlU3RyaW5nKGV4cHJlc3Npb24sIHN0YXJ0KSB7XHJcbiAgICAgICAgdmFyIGV2YWx1YXRlZFJlZ2V4ID0gbmV3IFJlZ0V4cChcIl5cIiArIHN0YXJ0ICsgXCIoKD86W15cXFxcXCIgKyBzdGFydCArIFwiXXxcXFxcLikrKVwiICsgc3RhcnQpLmV4ZWMoZXhwcmVzc2lvbik7XHJcbiAgICAgICAgLy8gY29uc29sZS5sb2coYXJndW1lbnRzKTtcclxuICAgICAgICB2YXIgcmVzdWx0ID0gZXZhbHVhdGVkUmVnZXhbMV07XHJcbiAgICAgICAgdmFyIHBhcnNlZFN0cmluZyA9IG5ldyBQYXJzZWRTdHJpbmcocmVzdWx0KTtcclxuICAgICAgICByZXR1cm4gUGFyc2VyLnRyeVBhcnNlT3BlcmF0b3IoZXhwcmVzc2lvbi5zdWJzdHJpbmcoZXZhbHVhdGVkUmVnZXhbMF0ubGVuZ3RoKSwgcGFyc2VkU3RyaW5nKTtcclxuICAgIH1cclxuICAgIHN0YXRpYyBvcGVyYXRlKG9wZXJhdG9yLCBsZWZ0LCByaWdodCkge1xyXG4gICAgICAgIC8vIGlmIChhcmd1bWVudHMubGVuZ3RoID09IDEpXHJcbiAgICAgICAgLy8gICAgIHJldHVybiBmdW5jdGlvbiAobGVmdDogYW55LCByaWdodDogYW55KVxyXG4gICAgICAgIC8vICAgICB7XHJcbiAgICAgICAgLy8gICAgICAgICByZXR1cm4gUGFyc2VyLm9wZXJhdGUob3BlcmF0b3IsIGxlZnQsIHJpZ2h0KTtcclxuICAgICAgICAvLyAgICAgfVxyXG4gICAgICAgIHN3aXRjaCAob3BlcmF0b3IpIHtcclxuICAgICAgICAgICAgY2FzZSAnPT0nOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGxlZnQgPT0gcmlnaHQ7XHJcbiAgICAgICAgICAgIGNhc2UgJz09PSc6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbGVmdCA9PT0gcmlnaHQ7XHJcbiAgICAgICAgICAgIGNhc2UgJzwnOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGxlZnQgPCByaWdodDtcclxuICAgICAgICAgICAgY2FzZSAnPD0nOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGxlZnQgPD0gcmlnaHQ7XHJcbiAgICAgICAgICAgIGNhc2UgJz4nOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGxlZnQgPiByaWdodDtcclxuICAgICAgICAgICAgY2FzZSAnPj0nOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGxlZnQgPj0gcmlnaHQ7XHJcbiAgICAgICAgICAgIGNhc2UgJyE9JzpcclxuICAgICAgICAgICAgICAgIHJldHVybiBsZWZ0ICE9IHJpZ2h0O1xyXG4gICAgICAgICAgICBjYXNlICchPT0nOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGxlZnQgIT09IHJpZ2h0O1xyXG4gICAgICAgICAgICBjYXNlICcrJzpcclxuICAgICAgICAgICAgICAgIHJldHVybiBsZWZ0ICsgcmlnaHQ7XHJcbiAgICAgICAgICAgIGNhc2UgJy0nOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGxlZnQgLSByaWdodDtcclxuICAgICAgICAgICAgY2FzZSAnLyc6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbGVmdCAvIHJpZ2h0O1xyXG4gICAgICAgICAgICBjYXNlICcqJzpcclxuICAgICAgICAgICAgICAgIHJldHVybiBsZWZ0ICogcmlnaHQ7XHJcbiAgICAgICAgICAgIGNhc2UgJ3x8JzpcclxuICAgICAgICAgICAgICAgIHJldHVybiBsZWZ0IHx8IHJpZ2h0O1xyXG4gICAgICAgICAgICBjYXNlICcmJic6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbGVmdCAmJiByaWdodDtcclxuICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignaW52YWxpZCBvcGVyYXRvcicgKyBvcGVyYXRvcik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgc3RhdGljIHBhcnNlQ1NWKGV4cHJlc3Npb24sIHBhcnNlSXRlbSwgZW5kLCBvdXRwdXQsIGV4Y2x1ZGVGaXJzdExldmVsRnVuY3Rpb24pIHtcclxuICAgICAgICBleHByZXNzaW9uID0gZXhwcmVzc2lvbi5zdWJzdHJpbmcoMSk7XHJcbiAgICAgICAgb3V0cHV0LiQkbGVuZ3RoKys7XHJcbiAgICAgICAgdmFyIGlzRnVuY3Rpb24gPSBmYWxzZTtcclxuICAgICAgICBkbyB7XHJcbiAgICAgICAgICAgIHZhciBpdGVtID0gcGFyc2VJdGVtKGV4cHJlc3Npb24pO1xyXG4gICAgICAgICAgICBpZiAoaXRlbSBpbnN0YW5jZW9mIEZ1bmN0aW9uIHx8IGl0ZW0gaW5zdGFuY2VvZiBQYXJzZWRCaW5hcnkpXHJcbiAgICAgICAgICAgICAgICBpc0Z1bmN0aW9uID0gdHJ1ZTtcclxuICAgICAgICAgICAgZXhwcmVzc2lvbiA9IGV4cHJlc3Npb24uc3Vic3RyaW5nKGl0ZW0uJCRsZW5ndGgpO1xyXG4gICAgICAgICAgICB2YXIgbmV4dCA9IC9eICosICovLmV4ZWMoZXhwcmVzc2lvbik7XHJcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGV4cHJlc3Npb24pXHJcbiAgICAgICAgICAgIGlmICghbmV4dClcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBleHByZXNzaW9uID0gZXhwcmVzc2lvbi5zdWJzdHJpbmcobmV4dFswXS5sZW5ndGgpO1xyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhleHByZXNzaW9uKTtcclxuICAgICAgICAgICAgb3V0cHV0LiQkbGVuZ3RoICs9IG5leHRbMF0ubGVuZ3RoO1xyXG4gICAgICAgIH0gd2hpbGUgKGV4cHJlc3Npb25bMF0gIT0gZW5kKTtcclxuICAgICAgICBvdXRwdXQuJCRsZW5ndGggKz0gZW5kLmxlbmd0aDtcclxuICAgICAgICAvLyBjb25zb2xlLmxvZyhvdXRwdXQuJCRsZW5ndGgpO1xyXG4gICAgICAgIHZhciByZXN1bHQ7XHJcbiAgICAgICAgaWYgKG91dHB1dCBpbnN0YW5jZW9mIEFycmF5KVxyXG4gICAgICAgICAgICByZXN1bHQgPSBbXTtcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgIHJlc3VsdCA9IHt9O1xyXG4gICAgICAgIGlmIChpc0Z1bmN0aW9uICYmICFleGNsdWRlRmlyc3RMZXZlbEZ1bmN0aW9uKSB7XHJcbiAgICAgICAgICAgIHZhciBmID0gZnVuY3Rpb24gKHZhbHVlLCBhc0JpbmRpbmcpIHtcclxuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgaW4gb3V0cHV0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG91dHB1dFtpXSBpbnN0YW5jZW9mIEZ1bmN0aW9uKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHRbaV0gPSBvdXRwdXRbaV0odmFsdWUsIGFzQmluZGluZyk7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHRbaV0gPSBvdXRwdXRbaV07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICBmLiQkbGVuZ3RoID0gb3V0cHV0LiQkbGVuZ3RoO1xyXG4gICAgICAgICAgICByZXR1cm4gZjtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICByZXR1cm4gb3V0cHV0O1xyXG4gICAgfVxyXG4gICAgc3RhdGljIHBhcnNlT2JqZWN0KGV4cHJlc3Npb24sIGV4Y2x1ZGVGaXJzdExldmVsRnVuY3Rpb24pIHtcclxuICAgICAgICB2YXIga2V5TWF0Y2g7XHJcbiAgICAgICAgdmFyIHJlc3VsdCA9IHt9O1xyXG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShyZXN1bHQsICckJGxlbmd0aCcsIHsgdmFsdWU6IDAsIGVudW1lcmFibGU6IGZhbHNlLCB3cml0YWJsZTogdHJ1ZSwgY29uZmlndXJhYmxlOiB0cnVlIH0pO1xyXG4gICAgICAgIHJldHVybiBQYXJzZXIucGFyc2VDU1YoZXhwcmVzc2lvbiwgZnVuY3Rpb24gKGV4cHJlc3Npb24pIHtcclxuICAgICAgICAgICAgLy8gdmFyIGxlbmd0aCA9IDA7XHJcbiAgICAgICAgICAgIHZhciBrZXlNYXRjaCA9IGpzb25LZXlSZWdleC5leGVjKGV4cHJlc3Npb24pO1xyXG4gICAgICAgICAgICB2YXIga2V5ID0ga2V5TWF0Y2hbMV0gfHwga2V5TWF0Y2hbMl07XHJcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coa2V5TWF0Y2gpO1xyXG4gICAgICAgICAgICB2YXIgbGVuZ3RoID0ga2V5TWF0Y2hbMF0ubGVuZ3RoICsga2V5TWF0Y2guaW5kZXg7XHJcbiAgICAgICAgICAgIGV4cHJlc3Npb24gPSBleHByZXNzaW9uLnN1YnN0cmluZyhsZW5ndGgpO1xyXG4gICAgICAgICAgICB2YXIgaXRlbSA9IFBhcnNlci5wYXJzZUFueShleHByZXNzaW9uLCBmYWxzZSk7XHJcbiAgICAgICAgICAgIGxlbmd0aCArPSBpdGVtLiQkbGVuZ3RoO1xyXG4gICAgICAgICAgICBpZiAoaXRlbSBpbnN0YW5jZW9mIFBhcnNlZEJvb2xlYW4gfHwgaXRlbSBpbnN0YW5jZW9mIFBhcnNlZFN0cmluZyB8fCBpdGVtIGluc3RhbmNlb2YgUGFyc2VkTnVtYmVyKVxyXG4gICAgICAgICAgICAgICAgcmVzdWx0W2tleV0gPSBpdGVtLnZhbHVlO1xyXG4gICAgICAgICAgICBlbHNlIGlmIChpdGVtIGluc3RhbmNlb2YgUGFyc2VkQmluYXJ5KVxyXG4gICAgICAgICAgICAgICAgcmVzdWx0W2tleV0gPSBpdGVtLmV2YWx1YXRlLmJpbmQoaXRlbSk7XHJcbiAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgICAgIHJlc3VsdFtrZXldID0gaXRlbTtcclxuICAgICAgICAgICAgLy8gZXhwcmVzc2lvbiA9IGV4cHJlc3Npb24uc3Vic3RyaW5nKHJlc3VsdFtrZXldLiQkbGVuZ3RoKTtcclxuICAgICAgICAgICAgaXRlbS4kJGxlbmd0aCA9IGxlbmd0aDtcclxuICAgICAgICAgICAgcmVzdWx0LiQkbGVuZ3RoICs9IGxlbmd0aDtcclxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coZXhwcmVzc2lvbik7XHJcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2cobGVuZ3RoKTtcclxuICAgICAgICAgICAgcmV0dXJuIGl0ZW07XHJcbiAgICAgICAgfSwgJ30nLCByZXN1bHQsIGV4Y2x1ZGVGaXJzdExldmVsRnVuY3Rpb24pO1xyXG4gICAgfVxyXG4gICAgc3RhdGljIHBhcnNlQmluZGFibGUoZXhwcmVzc2lvbikge1xyXG4gICAgICAgIHJldHVybiBleHByZXNzaW9uLnNwbGl0KCcuJyk7XHJcbiAgICB9XHJcbiAgICBzdGF0aWMgZ2V0U2V0dGVyKGV4cHJlc3Npb24sIHJvb3QpIHtcclxuICAgICAgICB2YXIgdGFyZ2V0ID0gcm9vdDtcclxuICAgICAgICB2YXIgcGFydHMgPSBQYXJzZXIucGFyc2VCaW5kYWJsZShleHByZXNzaW9uKTtcclxuICAgICAgICB3aGlsZSAocGFydHMubGVuZ3RoID4gMSAmJiB0eXBlb2YgKHRhcmdldCkgIT0gJ3VuZGVmaW5lZCcpIHtcclxuICAgICAgICAgICAgdGFyZ2V0ID0gUGFyc2VyLmV2YWwocGFydHNbMF0sIHRhcmdldCk7XHJcbiAgICAgICAgICAgIHBhcnRzLnNoaWZ0KCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh0eXBlb2YgKHRhcmdldCkgPT0gJ3VuZGVmaW5lZCcpXHJcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIHJldHVybiB7IGV4cHJlc3Npb246IHBhcnRzWzBdLCB0YXJnZXQ6IHRhcmdldCwgc2V0OiBmdW5jdGlvbiAodmFsdWUpIHsgdGFyZ2V0W3BhcnRzWzBdXSA9IHZhbHVlOyB9IH07XHJcbiAgICB9XHJcbiAgICBzdGF0aWMgZXZhbEFzRnVuY3Rpb24oZXhwcmVzc2lvbiwgZXhjbHVkZUZpcnN0TGV2ZWxGdW5jdGlvbikge1xyXG4gICAgICAgIGlmICghZXhwcmVzc2lvbilcclxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgdmFyIHBhcnRzID0gUGFyc2VyLnBhcnNlKGV4cHJlc3Npb24sIGV4Y2x1ZGVGaXJzdExldmVsRnVuY3Rpb24pO1xyXG4gICAgICAgIGlmIChwYXJ0cyBpbnN0YW5jZW9mIEFycmF5KVxyXG4gICAgICAgICAgICByZXR1cm4gUGFyc2VyLnBhcnNlRnVuY3Rpb24oZXhwcmVzc2lvbik7XHJcbiAgICAgICAgcmV0dXJuIHBhcnRzO1xyXG4gICAgfVxyXG4gICAgc3RhdGljIGV2YWwoZXhwcmVzc2lvbiwgdmFsdWUpIHtcclxuICAgICAgICByZXR1cm4gUGFyc2VyLmV2YWxBc0Z1bmN0aW9uKGV4cHJlc3Npb24sIGZhbHNlKSh2YWx1ZSwgZmFsc2UpO1xyXG4gICAgfVxyXG59XHJcbmV4cG9ydHMuUGFyc2VyID0gUGFyc2VyO1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1wYXJzZXIuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxuY29uc3QgZXZlbnRzXzEgPSByZXF1aXJlKFwiZXZlbnRzXCIpO1xyXG5mdW5jdGlvbiBQcm9taXNpZnkobykge1xyXG4gICAgaWYgKG8gJiYgbyBpbnN0YW5jZW9mIFByb21pc2UpXHJcbiAgICAgICAgcmV0dXJuIG87XHJcbiAgICBpZiAobyAmJiBvWyd0aGVuJ10pXHJcbiAgICAgICAgcmV0dXJuIG87XHJcbiAgICB2YXIgZGVmZXJyZWQgPSBuZXcgRGVmZXJyZWQoKTtcclxuICAgIHZhciBlID0gbmV3IEVycm9yKCk7XHJcbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAvLyBjb25zb2xlLmRlYnVnKGUuc3RhY2spO1xyXG4gICAgICAgIGRlZmVycmVkLnJlc29sdmUobyk7XHJcbiAgICB9KTtcclxuICAgIHJldHVybiBkZWZlcnJlZDtcclxufVxyXG5leHBvcnRzLlByb21pc2lmeSA9IFByb21pc2lmeTtcclxuZnVuY3Rpb24gaXNQcm9taXNlTGlrZShvKSB7XHJcbiAgICByZXR1cm4gbyAmJiBvWyd0aGVuJ10gJiYgdHlwZW9mIChvWyd0aGVuJ10pID09ICdmdW5jdGlvbic7XHJcbn1cclxuZXhwb3J0cy5pc1Byb21pc2VMaWtlID0gaXNQcm9taXNlTGlrZTtcclxuZnVuY3Rpb24gd2hlbihwcm9taXNlcykge1xyXG4gICAgaWYgKHByb21pc2VzICYmICFwcm9taXNlcy5sZW5ndGgpXHJcbiAgICAgICAgcmV0dXJuIFByb21pc2lmeShudWxsKTtcclxuICAgIGlmIChwcm9taXNlcyAmJiBwcm9taXNlcy5sZW5ndGggPT0gMSlcclxuICAgICAgICByZXR1cm4gcHJvbWlzZXNbMF07XHJcbiAgICB2YXIgcmVzdWx0cyA9IG5ldyBBcnJheShwcm9taXNlcy5sZW5ndGgpO1xyXG4gICAgdmFyIGRlZmVycmVkID0gbmV3IERlZmVycmVkKCk7XHJcbiAgICB2YXIgY29tcGxldGVkID0gMDtcclxuICAgIHByb21pc2VzLmZvckVhY2goZnVuY3Rpb24gKHByb21pc2UsIGlkeCkge1xyXG4gICAgICAgIHByb21pc2UudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XHJcbiAgICAgICAgICAgIHJlc3VsdHNbaWR4XSA9IHJlc3VsdDtcclxuICAgICAgICAgICAgaWYgKCsrY29tcGxldGVkID09IHByb21pc2VzLmxlbmd0aClcclxuICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUocmVzdWx0cyk7XHJcbiAgICAgICAgfSwgZnVuY3Rpb24gKHJlamVjdGlvbikge1xyXG4gICAgICAgICAgICBkZWZlcnJlZC5yZWplY3QocmVqZWN0aW9uKTtcclxuICAgICAgICB9KTtcclxuICAgIH0pO1xyXG59XHJcbmV4cG9ydHMud2hlbiA9IHdoZW47XHJcbnZhciBQcm9taXNlU3RhdHVzO1xyXG4oZnVuY3Rpb24gKFByb21pc2VTdGF0dXMpIHtcclxuICAgIFByb21pc2VTdGF0dXNbUHJvbWlzZVN0YXR1c1tcIlBlbmRpbmdcIl0gPSAwXSA9IFwiUGVuZGluZ1wiO1xyXG4gICAgUHJvbWlzZVN0YXR1c1tQcm9taXNlU3RhdHVzW1wiUmVzb2x2ZWRcIl0gPSAxXSA9IFwiUmVzb2x2ZWRcIjtcclxuICAgIFByb21pc2VTdGF0dXNbUHJvbWlzZVN0YXR1c1tcIlJlamVjdGVkXCJdID0gMl0gPSBcIlJlamVjdGVkXCI7XHJcbn0pKFByb21pc2VTdGF0dXMgPSBleHBvcnRzLlByb21pc2VTdGF0dXMgfHwgKGV4cG9ydHMuUHJvbWlzZVN0YXR1cyA9IHt9KSk7XHJcbmNsYXNzIERlZmVycmVkIGV4dGVuZHMgZXZlbnRzXzEuRXZlbnRFbWl0dGVyIHtcclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHN1cGVyKCk7XHJcbiAgICAgICAgdGhpcy4kJHN0YXR1cyA9IFByb21pc2VTdGF0dXMuUGVuZGluZztcclxuICAgIH1cclxuICAgIHJlc29sdmUodmFsKSB7XHJcbiAgICAgICAgaWYgKGlzUHJvbWlzZUxpa2UodmFsKSlcclxuICAgICAgICAgICAgdmFsLnRoZW4odGhpcy5yZXNvbHZlLmJpbmQodGhpcyksIHRoaXMucmVqZWN0LmJpbmQodGhpcykpO1xyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLiQkc3RhdHVzID0gUHJvbWlzZVN0YXR1cy5SZXNvbHZlZDtcclxuICAgICAgICAgICAgdGhpcy4kJHZhbHVlID0gdmFsO1xyXG4gICAgICAgICAgICB0aGlzLmVtaXQoJ3Jlc29sdmUnLCB2YWwpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJlamVjdChyZWFzb24pIHtcclxuICAgICAgICB0aGlzLiQkdmFsdWUgPSByZWFzb247XHJcbiAgICAgICAgdGhpcy4kJHN0YXR1cyA9IFByb21pc2VTdGF0dXMuUmVqZWN0ZWQ7XHJcbiAgICAgICAgdGhpcy5lbWl0KCdyZWplY3QnLCByZWFzb24pO1xyXG4gICAgfVxyXG4gICAgdGhlbihvbmZ1bGZpbGxlZCwgb25yZWplY3RlZCkge1xyXG4gICAgICAgIHN3aXRjaCAodGhpcy4kJHN0YXR1cykge1xyXG4gICAgICAgICAgICBjYXNlIFByb21pc2VTdGF0dXMuUmVzb2x2ZWQ6XHJcbiAgICAgICAgICAgICAgICB2YXIgZGVmZXJyZWQgPSBuZXcgRGVmZXJyZWQoKTtcclxuICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSBvbmZ1bGZpbGxlZCh0aGlzLiQkdmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiAocmVzdWx0KSA9PSAndW5kZWZpbmVkJylcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSB0aGlzLiQkdmFsdWU7XHJcbiAgICAgICAgICAgICAgICBzZXRJbW1lZGlhdGUoZGVmZXJyZWQucmVzb2x2ZS5iaW5kKGRlZmVycmVkKSwgUHJvbWlzaWZ5KHJlc3VsdCkpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGRlZmVycmVkO1xyXG4gICAgICAgICAgICBjYXNlIFByb21pc2VTdGF0dXMuUmVqZWN0ZWQ6XHJcbiAgICAgICAgICAgICAgICB2YXIgZGVmZXJyZWQgPSBuZXcgRGVmZXJyZWQoKTtcclxuICAgICAgICAgICAgICAgIHZhciByZWplY3Rpb24gPSBvbnJlamVjdGVkKHRoaXMuJCR2YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIChyZWplY3Rpb24pID09ICd1bmRlZmluZWQnKVxyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdGlvbiA9IHRoaXMuJCR2YWx1ZTtcclxuICAgICAgICAgICAgICAgIHNldEltbWVkaWF0ZShkZWZlcnJlZC5yZWplY3QuYmluZChkZWZlcnJlZCksIFByb21pc2lmeShyZWplY3Rpb24pKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBkZWZlcnJlZDtcclxuICAgICAgICAgICAgY2FzZSBQcm9taXNlU3RhdHVzLlBlbmRpbmc6XHJcbiAgICAgICAgICAgICAgICB2YXIgbmV4dCA9IG5ldyBEZWZlcnJlZCgpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vbmNlKCdyZXNvbHZlJywgZnVuY3Rpb24gKHZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlc3VsdCA9IG9uZnVsZmlsbGVkKHZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIChyZXN1bHQpID09ICd1bmRlZmluZWQnKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXh0LnJlc29sdmUodmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmV4dC5yZXNvbHZlKHJlc3VsdCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIHRoaXMub25jZSgncmVqZWN0JywgZnVuY3Rpb24gKHZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9ucmVqZWN0ZWQpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5leHQucmVqZWN0KG9ucmVqZWN0ZWQodmFsdWUpKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG5leHQ7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcbmV4cG9ydHMuRGVmZXJyZWQgPSBEZWZlcnJlZDtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9cHJvbWlzZUhlbHBlcnMuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxudmFyIFNUUklQX0NPTU1FTlRTID0gLygoXFwvXFwvLiokKXwoXFwvXFwqW1xcc1xcU10qP1xcKlxcLykpL21nO1xyXG5mdW5jdGlvbiBnZXRQYXJhbU5hbWVzKGZ1bmMpIHtcclxuICAgIHZhciBmblN0ciA9IGZ1bmMudG9TdHJpbmcoKS5yZXBsYWNlKFNUUklQX0NPTU1FTlRTLCAnJyk7XHJcbiAgICB2YXIgcmVzdWx0ID0gZm5TdHIuc2xpY2UoZm5TdHIuaW5kZXhPZignKCcpICsgMSwgZm5TdHIuaW5kZXhPZignKScpKS5tYXRjaCgvKFteXFxzLF0rKS9nKTtcclxuICAgIGlmIChyZXN1bHQgPT09IG51bGwpXHJcbiAgICAgICAgcmVzdWx0ID0gW107XHJcbiAgICByZXR1cm4gcmVzdWx0O1xyXG59XHJcbmV4cG9ydHMuZ2V0UGFyYW1OYW1lcyA9IGdldFBhcmFtTmFtZXM7XHJcbmZ1bmN0aW9uIGVzY2FwZVJlZ0V4cChzdHIpIHtcclxuICAgIHJldHVybiBzdHIucmVwbGFjZSgvW1xcLVxcW1xcXVxce1xcfVxcKFxcKVxcKlxcK1xcP1xcLlxcXFxcXF5cXCRcXHxdL2csIFwiXFxcXCQmXCIpO1xyXG59XHJcbmV4cG9ydHMuZXNjYXBlUmVnRXhwID0gZXNjYXBlUmVnRXhwO1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1yZWZsZWN0LmpzLm1hcCIsIi8qIVxyXG4gKiByb3V0ZXJcclxuICogQ29weXJpZ2h0KGMpIDIwMTMgUm9tYW4gU2h0eWxtYW5cclxuICogQ29weXJpZ2h0KGMpIDIwMTQgRG91Z2xhcyBDaHJpc3RvcGhlciBXaWxzb25cclxuICogTUlUIExpY2Vuc2VkXHJcbiAqL1xyXG4ndXNlIHN0cmljdCc7XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxuLyoqXHJcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXHJcbiAqIEBwcml2YXRlXHJcbiAqL1xyXG52YXIgZGVidWcgPSByZXF1aXJlKCdkZWJ1ZycpKCdyb3V0ZXInKTtcclxuY29uc3QgZmxhdHRlbiA9IHJlcXVpcmUoXCJhcnJheS1mbGF0dGVuXCIpO1xyXG5jb25zdCBsYXllcl8xID0gcmVxdWlyZShcIi4vbGF5ZXJcIik7XHJcbmV4cG9ydHMuTGF5ZXIgPSBsYXllcl8xLkxheWVyO1xyXG4vLyBpbXBvcnQgKiBhcyBtZXRob2RzIGZyb20gJ21ldGhvZHMnO1xyXG5jb25zdCBtaXhpbiA9IHJlcXVpcmUoXCJ1dGlscy1tZXJnZVwiKTtcclxuY29uc3QgcGFyc2VVcmwgPSByZXF1aXJlKFwicGFyc2V1cmxcIik7XHJcbmNvbnN0IHJvdXRlXzEgPSByZXF1aXJlKFwiLi9yb3V0ZVwiKTtcclxuZXhwb3J0cy5Sb3V0ZSA9IHJvdXRlXzEuUm91dGU7XHJcbnZhciBzbGljZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZTtcclxuLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxudmFyIGRlZmVyID0gdHlwZW9mIHNldEltbWVkaWF0ZSA9PT0gJ2Z1bmN0aW9uJ1xyXG4gICAgPyBzZXRJbW1lZGlhdGVcclxuICAgIDogZnVuY3Rpb24gKGZuLCAuLi5hcmdzKSB7IHByb2Nlc3MubmV4dFRpY2soZm4uYmluZC5hcHBseShmbiwgYXJndW1lbnRzKSk7IH07XHJcbmNsYXNzIFJvdXRlciB7XHJcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zKSB7XHJcbiAgICAgICAgdGhpcy5wYXJhbXMgPSB7fTtcclxuICAgICAgICB0aGlzLnN0YWNrID0gW107XHJcbiAgICAgICAgdGhpcy5yb3V0ZXIgPSB0aGlzLmhhbmRsZS5iaW5kKHRoaXMpO1xyXG4gICAgICAgIHZhciBvcHRzID0gb3B0aW9ucyB8fCB7fTtcclxuICAgICAgICB0aGlzLmNhc2VTZW5zaXRpdmUgPSBvcHRzLmNhc2VTZW5zaXRpdmU7XHJcbiAgICAgICAgdGhpcy5tZXJnZVBhcmFtcyA9IG9wdHMubWVyZ2VQYXJhbXM7XHJcbiAgICAgICAgdGhpcy5zdHJpY3QgPSBvcHRzLnN0cmljdDtcclxuICAgICAgICB0aGlzLmxlbmd0aCA9IG9wdHMubGVuZ3RoIHx8IDI7XHJcbiAgICB9XHJcbiAgICAvKipcclxuICAgICAqIE1hcCB0aGUgZ2l2ZW4gcGFyYW0gcGxhY2Vob2xkZXIgYG5hbWVgKHMpIHRvIHRoZSBnaXZlbiBjYWxsYmFjay5cclxuICAgICAqXHJcbiAgICAgKiBQYXJhbWV0ZXIgbWFwcGluZyBpcyB1c2VkIHRvIHByb3ZpZGUgcHJlLWNvbmRpdGlvbnMgdG8gcm91dGVzXHJcbiAgICAgKiB3aGljaCB1c2Ugbm9ybWFsaXplZCBwbGFjZWhvbGRlcnMuIEZvciBleGFtcGxlIGEgXzp1c2VyX2lkXyBwYXJhbWV0ZXJcclxuICAgICAqIGNvdWxkIGF1dG9tYXRpY2FsbHkgbG9hZCBhIHVzZXIncyBpbmZvcm1hdGlvbiBmcm9tIHRoZSBkYXRhYmFzZSB3aXRob3V0XHJcbiAgICAgKiBhbnkgYWRkaXRpb25hbCBjb2RlLlxyXG4gICAgICpcclxuICAgICAqIFRoZSBjYWxsYmFjayB1c2VzIHRoZSBzYW1lIHNpZ25hdHVyZSBhcyBtaWRkbGV3YXJlLCB0aGUgb25seSBkaWZmZXJlbmNlXHJcbiAgICAgKiBiZWluZyB0aGF0IHRoZSB2YWx1ZSBvZiB0aGUgcGxhY2Vob2xkZXIgaXMgcGFzc2VkLCBpbiB0aGlzIGNhc2UgdGhlIF9pZF9cclxuICAgICAqIG9mIHRoZSB1c2VyLiBPbmNlIHRoZSBgbmV4dCgpYCBmdW5jdGlvbiBpcyBpbnZva2VkLCBqdXN0IGxpa2UgbWlkZGxld2FyZVxyXG4gICAgICogaXQgd2lsbCBjb250aW51ZSBvbiB0byBleGVjdXRlIHRoZSByb3V0ZSwgb3Igc3Vic2VxdWVudCBwYXJhbWV0ZXIgZnVuY3Rpb25zLlxyXG4gICAgICpcclxuICAgICAqIEp1c3QgbGlrZSBpbiBtaWRkbGV3YXJlLCB5b3UgbXVzdCBlaXRoZXIgcmVzcG9uZCB0byB0aGUgcmVxdWVzdCBvciBjYWxsIG5leHRcclxuICAgICAqIHRvIGF2b2lkIHN0YWxsaW5nIHRoZSByZXF1ZXN0LlxyXG4gICAgICpcclxuICAgICAqICByb3V0ZXIucGFyYW0oJ3VzZXJfaWQnLCBmdW5jdGlvbihyZXEsIHJlcywgbmV4dCwgaWQpe1xyXG4gICAgICogICAgVXNlci5maW5kKGlkLCBmdW5jdGlvbihlcnIsIHVzZXIpe1xyXG4gICAgICogICAgICBpZiAoZXJyKSB7XHJcbiAgICAgKiAgICAgICAgcmV0dXJuIG5leHQoZXJyKVxyXG4gICAgICogICAgICB9IGVsc2UgaWYgKCF1c2VyKSB7XHJcbiAgICAgKiAgICAgICAgcmV0dXJuIG5leHQobmV3IEVycm9yKCdmYWlsZWQgdG8gbG9hZCB1c2VyJykpXHJcbiAgICAgKiAgICAgIH1cclxuICAgICAqICAgICAgcmVxLnVzZXIgPSB1c2VyXHJcbiAgICAgKiAgICAgIG5leHQoKVxyXG4gICAgICogICAgfSlcclxuICAgICAqICB9KVxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lXHJcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBmblxyXG4gICAgICogQHB1YmxpY1xyXG4gICAgICovXHJcbiAgICBwYXJhbShuYW1lLCBmbikge1xyXG4gICAgICAgIGlmICghbmFtZSkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdhcmd1bWVudCBuYW1lIGlzIHJlcXVpcmVkJyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh0eXBlb2YgbmFtZSAhPT0gJ3N0cmluZycpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignYXJndW1lbnQgbmFtZSBtdXN0IGJlIGEgc3RyaW5nJyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICghZm4pIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignYXJndW1lbnQgZm4gaXMgcmVxdWlyZWQnKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHR5cGVvZiBmbiAhPT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdhcmd1bWVudCBmbiBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIHBhcmFtcyA9IHRoaXMucGFyYW1zW25hbWVdO1xyXG4gICAgICAgIGlmICghcGFyYW1zKSB7XHJcbiAgICAgICAgICAgIHBhcmFtcyA9IHRoaXMucGFyYW1zW25hbWVdID0gW107XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHBhcmFtcy5wdXNoKGZuKTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuICAgIC8qKlxyXG4gICAgICogRGlzcGF0Y2ggYSByZXEsIHJlcyBpbnRvIHRoZSByb3V0ZXIuXHJcbiAgICAgKlxyXG4gICAgICogQHByaXZhdGVcclxuICAgICAqL1xyXG4gICAgaGFuZGxlKHJlcSwgLi4ucmVzdCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmludGVybmFsSGFuZGxlLmFwcGx5KHRoaXMsIFt7fSwgcmVxXS5jb25jYXQocmVzdCkpO1xyXG4gICAgfVxyXG4gICAgaW50ZXJuYWxIYW5kbGUob3B0aW9ucywgcmVxLCAuLi5yZXN0KSB7XHJcbiAgICAgICAgdmFyIGNhbGxiYWNrID0gcmVzdFtyZXN0Lmxlbmd0aCAtIDFdO1xyXG4gICAgICAgIGlmICghY2FsbGJhY2spIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignYXJndW1lbnQgY2FsbGJhY2sgaXMgcmVxdWlyZWQnKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZGVidWcoJ2Rpc3BhdGNoaW5nICVzICVzJywgcmVxWydtZXRob2QnXSB8fCAnJywgcmVxLnVybCk7XHJcbiAgICAgICAgdmFyIGlkeCA9IDA7XHJcbiAgICAgICAgdmFyIHJlbW92ZWQgPSAnJztcclxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICAgICAgdmFyIHNsYXNoQWRkZWQgPSBmYWxzZTtcclxuICAgICAgICB2YXIgcGFyYW1jYWxsZWQgPSB7fTtcclxuICAgICAgICAvLyBtaWRkbGV3YXJlIGFuZCByb3V0ZXNcclxuICAgICAgICB2YXIgc3RhY2sgPSB0aGlzLnN0YWNrO1xyXG4gICAgICAgIC8vIG1hbmFnZSBpbnRlci1yb3V0ZXIgdmFyaWFibGVzXHJcbiAgICAgICAgdmFyIHBhcmVudFBhcmFtcyA9IHJlcS5wYXJhbXM7XHJcbiAgICAgICAgdmFyIHBhcmVudFVybCA9IHJlcS5iYXNlVXJsIHx8ICcnO1xyXG4gICAgICAgIHZhciBkb25lID0gUm91dGVyLnJlc3RvcmUoY2FsbGJhY2ssIHJlcSwgJ2Jhc2VVcmwnLCAnbmV4dCcsICdwYXJhbXMnKTtcclxuICAgICAgICAvLyBzZXR1cCBuZXh0IGxheWVyXHJcbiAgICAgICAgcmVxLm5leHQgPSBuZXh0O1xyXG4gICAgICAgIGlmIChvcHRpb25zICYmIG9wdGlvbnMucHJlSGFuZGxlKSB7XHJcbiAgICAgICAgICAgIGRvbmUgPSBvcHRpb25zLnByZUhhbmRsZShkb25lKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gc2V0dXAgYmFzaWMgcmVxIHZhbHVlc1xyXG4gICAgICAgIHJlcS5iYXNlVXJsID0gcGFyZW50VXJsO1xyXG4gICAgICAgIHJlcS5vcmlnaW5hbFVybCA9IHJlcS5vcmlnaW5hbFVybCB8fCByZXEudXJsO1xyXG4gICAgICAgIG5leHQoKTtcclxuICAgICAgICBmdW5jdGlvbiBuZXh0KGVycikge1xyXG4gICAgICAgICAgICB2YXIgbGF5ZXJFcnJvciA9IGVyciA9PT0gJ3JvdXRlJ1xyXG4gICAgICAgICAgICAgICAgPyBudWxsXHJcbiAgICAgICAgICAgICAgICA6IGVycjtcclxuICAgICAgICAgICAgLy8gcmVtb3ZlIGFkZGVkIHNsYXNoXHJcbiAgICAgICAgICAgIGlmIChzbGFzaEFkZGVkKSB7XHJcbiAgICAgICAgICAgICAgICByZXEudXJsID0gcmVxLnVybC5zdWJzdHIoMSk7XHJcbiAgICAgICAgICAgICAgICBzbGFzaEFkZGVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8gcmVzdG9yZSBhbHRlcmVkIHJlcS51cmxcclxuICAgICAgICAgICAgaWYgKHJlbW92ZWQubGVuZ3RoICE9PSAwKSB7XHJcbiAgICAgICAgICAgICAgICByZXEuYmFzZVVybCA9IHBhcmVudFVybDtcclxuICAgICAgICAgICAgICAgIHJlcS51cmwgPSByZW1vdmVkICsgcmVxLnVybDtcclxuICAgICAgICAgICAgICAgIHJlbW92ZWQgPSAnJztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyBzaWduYWwgdG8gZXhpdCByb3V0ZXJcclxuICAgICAgICAgICAgaWYgKGxheWVyRXJyb3IgPT09ICdyb3V0ZXInKSB7XHJcbiAgICAgICAgICAgICAgICBkZWZlcihkb25lLCBudWxsKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyBubyBtb3JlIG1hdGNoaW5nIGxheWVyc1xyXG4gICAgICAgICAgICBpZiAoaWR4ID49IHN0YWNrLmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgZGVmZXIoZG9uZSwgbGF5ZXJFcnJvcik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8gZ2V0IHBhdGhuYW1lIG9mIHJlcXVlc3RcclxuICAgICAgICAgICAgdmFyIHBhdGggPSBSb3V0ZXIuZ2V0UGF0aG5hbWUocmVxKTtcclxuICAgICAgICAgICAgaWYgKHBhdGggPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGRvbmUobGF5ZXJFcnJvcik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8gZmluZCBuZXh0IG1hdGNoaW5nIGxheWVyXHJcbiAgICAgICAgICAgIHZhciBsYXllcjtcclxuICAgICAgICAgICAgdmFyIG1hdGNoO1xyXG4gICAgICAgICAgICB2YXIgcm91dGU7XHJcbiAgICAgICAgICAgIHdoaWxlIChtYXRjaCAhPT0gdHJ1ZSAmJiBpZHggPCBzdGFjay5sZW5ndGgpIHtcclxuICAgICAgICAgICAgICAgIGxheWVyID0gc3RhY2tbaWR4KytdO1xyXG4gICAgICAgICAgICAgICAgbWF0Y2ggPSBSb3V0ZXIubWF0Y2hMYXllcihsYXllciwgcGF0aCk7XHJcbiAgICAgICAgICAgICAgICByb3V0ZSA9IGxheWVyLnJvdXRlO1xyXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBtYXRjaCAhPT0gJ2Jvb2xlYW4nKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gaG9sZCBvbiB0byBsYXllckVycm9yXHJcbiAgICAgICAgICAgICAgICAgICAgbGF5ZXJFcnJvciA9IGxheWVyRXJyb3IgfHwgbWF0Y2g7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAobWF0Y2ggIT09IHRydWUpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmICghcm91dGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBwcm9jZXNzIG5vbi1yb3V0ZSBoYW5kbGVycyBub3JtYWxseVxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKGxheWVyRXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyByb3V0ZXMgZG8gbm90IG1hdGNoIHdpdGggYSBwZW5kaW5nIGVycm9yXHJcbiAgICAgICAgICAgICAgICAgICAgbWF0Y2ggPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHZhciBpc0FwcGxpY2FibGUgPSByb3V0ZS5pc0FwcGxpY2FibGUocmVxKTtcclxuICAgICAgICAgICAgICAgIC8vIGJ1aWxkIHVwIGF1dG9tYXRpYyBvcHRpb25zIHJlc3BvbnNlXHJcbiAgICAgICAgICAgICAgICBpZiAoIWlzQXBwbGljYWJsZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChvcHRpb25zICYmIG9wdGlvbnMubm90QXBwbGljYWJsZVJvdXRlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLm5vdEFwcGxpY2FibGVSb3V0ZShyb3V0ZSkgPT09IGZhbHNlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXRjaCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8gbm8gbWF0Y2hcclxuICAgICAgICAgICAgaWYgKG1hdGNoICE9PSB0cnVlKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZG9uZShsYXllckVycm9yKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyBzdG9yZSByb3V0ZSBmb3IgZGlzcGF0Y2ggb24gY2hhbmdlXHJcbiAgICAgICAgICAgIGlmIChyb3V0ZSkge1xyXG4gICAgICAgICAgICAgICAgcmVxLnJvdXRlID0gcm91dGU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8gQ2FwdHVyZSBvbmUtdGltZSBsYXllciB2YWx1ZXNcclxuICAgICAgICAgICAgcmVxLnBhcmFtcyA9IHNlbGYubWVyZ2VQYXJhbXNcclxuICAgICAgICAgICAgICAgID8gUm91dGVyLm1lcmdlUGFyYW1zKGxheWVyLnBhcmFtcywgcGFyZW50UGFyYW1zKVxyXG4gICAgICAgICAgICAgICAgOiBsYXllci5wYXJhbXM7XHJcbiAgICAgICAgICAgIHZhciBsYXllclBhdGggPSBsYXllci5wYXRoO1xyXG4gICAgICAgICAgICB2YXIgYXJncyA9IFtyZXFdO1xyXG4gICAgICAgICAgICBhcmdzID0gYXJncy5jb25jYXQocmVzdC5zbGljZSgwLCByZXN0Lmxlbmd0aCAtIDEpKTtcclxuICAgICAgICAgICAgO1xyXG4gICAgICAgICAgICAvLyB0aGlzIHNob3VsZCBiZSBkb25lIGZvciB0aGUgbGF5ZXJcclxuICAgICAgICAgICAgc2VsZi5wcm9jZXNzX3BhcmFtcy5hcHBseShzZWxmLCBbbGF5ZXIsIHBhcmFtY2FsbGVkXS5jb25jYXQoYXJncykuY29uY2F0KGZ1bmN0aW9uIChlcnIpIHtcclxuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV4dChsYXllckVycm9yIHx8IGVycik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAocm91dGUpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGF5ZXIuaGFuZGxlX3JlcXVlc3QuYXBwbHkobGF5ZXIsIGFyZ3MuY29uY2F0KG5leHQpKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHRyaW1fcHJlZml4KGxheWVyLCBsYXllckVycm9yLCBsYXllclBhdGgsIHBhdGgpO1xyXG4gICAgICAgICAgICB9KSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGZ1bmN0aW9uIHRyaW1fcHJlZml4KGxheWVyLCBsYXllckVycm9yLCBsYXllclBhdGgsIHBhdGgpIHtcclxuICAgICAgICAgICAgaWYgKGxheWVyUGF0aC5sZW5ndGggIT09IDApIHtcclxuICAgICAgICAgICAgICAgIC8vIFZhbGlkYXRlIHBhdGggYnJlYWtzIG9uIGEgcGF0aCBzZXBhcmF0b3JcclxuICAgICAgICAgICAgICAgIHZhciBjID0gcGF0aFtsYXllclBhdGgubGVuZ3RoXTtcclxuICAgICAgICAgICAgICAgIGlmIChjICYmIGMgIT09ICcvJykge1xyXG4gICAgICAgICAgICAgICAgICAgIG5leHQobGF5ZXJFcnJvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgLy8gVHJpbSBvZmYgdGhlIHBhcnQgb2YgdGhlIHVybCB0aGF0IG1hdGNoZXMgdGhlIHJvdXRlXHJcbiAgICAgICAgICAgICAgICAvLyBtaWRkbGV3YXJlICgudXNlIHN0dWZmKSBuZWVkcyB0byBoYXZlIHRoZSBwYXRoIHN0cmlwcGVkXHJcbiAgICAgICAgICAgICAgICBkZWJ1ZygndHJpbSBwcmVmaXggKCVzKSBmcm9tIHVybCAlcycsIGxheWVyUGF0aCwgcmVxLnVybCk7XHJcbiAgICAgICAgICAgICAgICByZW1vdmVkID0gbGF5ZXJQYXRoO1xyXG4gICAgICAgICAgICAgICAgcmVxLnVybCA9IHJlcS51cmwuc3Vic3RyKHJlbW92ZWQubGVuZ3RoKTtcclxuICAgICAgICAgICAgICAgIC8vIEVuc3VyZSBsZWFkaW5nIHNsYXNoXHJcbiAgICAgICAgICAgICAgICBpZiAocmVxLnVybFswXSAhPT0gJy8nKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVxLnVybCA9ICcvJyArIHJlcS51cmw7XHJcbiAgICAgICAgICAgICAgICAgICAgc2xhc2hBZGRlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAvLyBTZXR1cCBiYXNlIFVSTCAobm8gdHJhaWxpbmcgc2xhc2gpXHJcbiAgICAgICAgICAgICAgICByZXEuYmFzZVVybCA9IHBhcmVudFVybCArIChyZW1vdmVkW3JlbW92ZWQubGVuZ3RoIC0gMV0gPT09ICcvJ1xyXG4gICAgICAgICAgICAgICAgICAgID8gcmVtb3ZlZC5zdWJzdHJpbmcoMCwgcmVtb3ZlZC5sZW5ndGggLSAxKVxyXG4gICAgICAgICAgICAgICAgICAgIDogcmVtb3ZlZCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZGVidWcoJyVzICVzIDogJXMnLCBsYXllci5uYW1lLCBsYXllclBhdGgsIHJlcS5vcmlnaW5hbFVybCk7XHJcbiAgICAgICAgICAgIHZhciBhcmdzID0gW3JlcV0uY29uY2F0KHJlc3Quc2xpY2UoMCwgcmVzdC5sZW5ndGggLSAxKSk7XHJcbiAgICAgICAgICAgIGFyZ3MucHVzaChuZXh0KTtcclxuICAgICAgICAgICAgaWYgKGxheWVyRXJyb3IpIHtcclxuICAgICAgICAgICAgICAgIGxheWVyLmhhbmRsZV9lcnJvci5hcHBseShsYXllciwgW2xheWVyRXJyb3JdLmNvbmNhdChhcmdzKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBsYXllci5oYW5kbGVfcmVxdWVzdC5hcHBseShsYXllciwgYXJncyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBwcm9jZXNzX3BhcmFtcyhsYXllciwgY2FsbGVkLCByZXEsIC4uLnJlc3QpIHtcclxuICAgICAgICB2YXIgZG9uZSA9IHJlc3RbcmVzdC5sZW5ndGggLSAxXTtcclxuICAgICAgICB2YXIgcGFyYW1zID0gdGhpcy5wYXJhbXM7XHJcbiAgICAgICAgLy8gY2FwdHVyZWQgcGFyYW1ldGVycyBmcm9tIHRoZSBsYXllciwga2V5cyBhbmQgdmFsdWVzXHJcbiAgICAgICAgdmFyIGtleXMgPSBsYXllci5rZXlzO1xyXG4gICAgICAgIC8vIGZhc3QgdHJhY2tcclxuICAgICAgICBpZiAoIWtleXMgfHwga2V5cy5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgcmV0dXJuIGRvbmUoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGkgPSAwO1xyXG4gICAgICAgIHZhciBuYW1lO1xyXG4gICAgICAgIHZhciBwYXJhbUluZGV4ID0gMDtcclxuICAgICAgICB2YXIga2V5O1xyXG4gICAgICAgIHZhciBwYXJhbVZhbDtcclxuICAgICAgICB2YXIgcGFyYW1DYWxsYmFja3M7XHJcbiAgICAgICAgdmFyIHBhcmFtQ2FsbGVkO1xyXG4gICAgICAgIC8vIHByb2Nlc3MgcGFyYW1zIGluIG9yZGVyXHJcbiAgICAgICAgLy8gcGFyYW0gY2FsbGJhY2tzIGNhbiBiZSBhc3luY1xyXG4gICAgICAgIGZ1bmN0aW9uIHBhcmFtKGVycikge1xyXG4gICAgICAgICAgICBpZiAoZXJyKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZG9uZShlcnIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChpID49IGtleXMubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZG9uZSgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHBhcmFtSW5kZXggPSAwO1xyXG4gICAgICAgICAgICBrZXkgPSBrZXlzW2krK107XHJcbiAgICAgICAgICAgIG5hbWUgPSBrZXkubmFtZTtcclxuICAgICAgICAgICAgcGFyYW1WYWwgPSByZXEucGFyYW1zW25hbWVdO1xyXG4gICAgICAgICAgICBwYXJhbUNhbGxiYWNrcyA9IHBhcmFtc1tuYW1lXTtcclxuICAgICAgICAgICAgcGFyYW1DYWxsZWQgPSBjYWxsZWRbbmFtZV07XHJcbiAgICAgICAgICAgIGlmIChwYXJhbVZhbCA9PT0gdW5kZWZpbmVkIHx8ICFwYXJhbUNhbGxiYWNrcykge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcmFtKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8gcGFyYW0gcHJldmlvdXNseSBjYWxsZWQgd2l0aCBzYW1lIHZhbHVlIG9yIGVycm9yIG9jY3VycmVkXHJcbiAgICAgICAgICAgIGlmIChwYXJhbUNhbGxlZCAmJiAocGFyYW1DYWxsZWQubWF0Y2ggPT09IHBhcmFtVmFsXHJcbiAgICAgICAgICAgICAgICB8fCAocGFyYW1DYWxsZWQuZXJyb3IgJiYgcGFyYW1DYWxsZWQuZXJyb3IgIT09ICdyb3V0ZScpKSkge1xyXG4gICAgICAgICAgICAgICAgLy8gcmVzdG9yZSB2YWx1ZVxyXG4gICAgICAgICAgICAgICAgcmVxLnBhcmFtc1tuYW1lXSA9IHBhcmFtQ2FsbGVkLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgLy8gbmV4dCBwYXJhbVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcmFtKHBhcmFtQ2FsbGVkLmVycm9yKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjYWxsZWRbbmFtZV0gPSBwYXJhbUNhbGxlZCA9IHtcclxuICAgICAgICAgICAgICAgIGVycm9yOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgbWF0Y2g6IHBhcmFtVmFsLFxyXG4gICAgICAgICAgICAgICAgdmFsdWU6IHBhcmFtVmFsXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIHBhcmFtQ2FsbGJhY2soKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gc2luZ2xlIHBhcmFtIGNhbGxiYWNrc1xyXG4gICAgICAgIGZ1bmN0aW9uIHBhcmFtQ2FsbGJhY2soZXJyKSB7XHJcbiAgICAgICAgICAgIHZhciBmbiA9IHBhcmFtQ2FsbGJhY2tzW3BhcmFtSW5kZXgrK107XHJcbiAgICAgICAgICAgIC8vIHN0b3JlIHVwZGF0ZWQgdmFsdWVcclxuICAgICAgICAgICAgcGFyYW1DYWxsZWQudmFsdWUgPSByZXEucGFyYW1zW2tleS5uYW1lXTtcclxuICAgICAgICAgICAgaWYgKGVycikge1xyXG4gICAgICAgICAgICAgICAgLy8gc3RvcmUgZXJyb3JcclxuICAgICAgICAgICAgICAgIHBhcmFtQ2FsbGVkLmVycm9yID0gZXJyO1xyXG4gICAgICAgICAgICAgICAgcGFyYW0oZXJyKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoIWZuKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcmFtKCk7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBmbihyZXEsIHBhcmFtQ2FsbGJhY2ssIHBhcmFtVmFsLCBrZXkubmFtZSwgcmVzdC5zbGljZSgwLCByZXN0Lmxlbmd0aCAtIDEpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgcGFyYW1DYWxsYmFjayhlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBwYXJhbSgpO1xyXG4gICAgfVxyXG4gICAgdXNlKGFyZywgLi4uaGFuZGxlcnMpIHtcclxuICAgICAgICB2YXIgb2Zmc2V0ID0gMDtcclxuICAgICAgICB2YXIgcGF0aCA9ICcvJztcclxuICAgICAgICAvLyBkZWZhdWx0IHBhdGggdG8gJy8nXHJcbiAgICAgICAgLy8gZGlzYW1iaWd1YXRlIHJvdXRlci51c2UoW2hhbmRsZXJdKVxyXG4gICAgICAgIGlmICh0eXBlb2YgYXJnICE9PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgIHdoaWxlIChBcnJheS5pc0FycmF5KGFyZykgJiYgYXJnLmxlbmd0aCAhPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgYXJnID0gYXJnWzBdO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIGZpcnN0IGFyZyBpcyB0aGUgcGF0aFxyXG4gICAgICAgICAgICBpZiAodHlwZW9mIGFyZyAhPT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICAgICAgb2Zmc2V0ID0gMTtcclxuICAgICAgICAgICAgICAgIHBhdGggPSBhcmc7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGNhbGxiYWNrcyA9IGZsYXR0ZW4oc2xpY2UuY2FsbChhcmd1bWVudHMsIG9mZnNldCkpO1xyXG4gICAgICAgIGlmIChjYWxsYmFja3MubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2FyZ3VtZW50IGhhbmRsZXIgaXMgcmVxdWlyZWQnKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjYWxsYmFja3MubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgdmFyIGZuID0gY2FsbGJhY2tzW2ldO1xyXG4gICAgICAgICAgICBpZiAodHlwZW9mIGZuICE9PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdhcmd1bWVudCBoYW5kbGVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIGFkZCB0aGUgbWlkZGxld2FyZVxyXG4gICAgICAgICAgICBkZWJ1ZygndXNlICVvICVzJywgcGF0aCwgZm4ubmFtZSB8fCAnPGFub255bW91cz4nKTtcclxuICAgICAgICAgICAgdmFyIGxheWVyID0gdGhpcy5idWlsZExheWVyKHBhdGgsIHtcclxuICAgICAgICAgICAgICAgIHNlbnNpdGl2ZTogdGhpcy5jYXNlU2Vuc2l0aXZlLFxyXG4gICAgICAgICAgICAgICAgc3RyaWN0OiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIGVuZDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICBsZW5ndGg6IHRoaXMubGVuZ3RoXHJcbiAgICAgICAgICAgIH0sIGZuKTtcclxuICAgICAgICAgICAgbGF5ZXIucm91dGUgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIHRoaXMuc3RhY2sucHVzaChsYXllcik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG4gICAgLyoqXHJcbiAgICAgKiBDcmVhdGUgYSBuZXcgUm91dGUgZm9yIHRoZSBnaXZlbiBwYXRoLlxyXG4gICAgICpcclxuICAgICAqIEVhY2ggcm91dGUgY29udGFpbnMgYSBzZXBhcmF0ZSBtaWRkbGV3YXJlIHN0YWNrIGFuZCBWRVJCIGhhbmRsZXJzLlxyXG4gICAgICpcclxuICAgICAqIFNlZSB0aGUgUm91dGUgYXBpIGRvY3VtZW50YXRpb24gZm9yIGRldGFpbHMgb24gYWRkaW5nIGhhbmRsZXJzXHJcbiAgICAgKiBhbmQgbWlkZGxld2FyZSB0byByb3V0ZXMuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhdGhcclxuICAgICAqIEByZXR1cm4ge1JvdXRlfVxyXG4gICAgICogQHB1YmxpY1xyXG4gICAgICovXHJcbiAgICByb3V0ZShwYXRoKSB7XHJcbiAgICAgICAgdmFyIHJvdXRlID0gdGhpcy5idWlsZFJvdXRlKHBhdGgpO1xyXG4gICAgICAgIHZhciBsYXllciA9IHRoaXMuYnVpbGRMYXllcihwYXRoLCB7XHJcbiAgICAgICAgICAgIHNlbnNpdGl2ZTogdGhpcy5jYXNlU2Vuc2l0aXZlLFxyXG4gICAgICAgICAgICBzdHJpY3Q6IHRoaXMuc3RyaWN0LFxyXG4gICAgICAgICAgICBlbmQ6IHRydWUsXHJcbiAgICAgICAgICAgIGxlbmd0aDogdGhpcy5sZW5ndGhcclxuICAgICAgICB9LCByb3V0ZS5kaXNwYXRjaC5iaW5kKHJvdXRlKSk7XHJcbiAgICAgICAgbGF5ZXIucm91dGUgPSByb3V0ZTtcclxuICAgICAgICB0aGlzLnN0YWNrLnB1c2gobGF5ZXIpO1xyXG4gICAgICAgIHJldHVybiByb3V0ZTtcclxuICAgIH1cclxuICAgIC8qKlxyXG4gICAgICogR2V0IHBhdGhuYW1lIG9mIHJlcXVlc3QuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtJbmNvbWluZ01lc3NhZ2V9IHJlcVxyXG4gICAgICogQHByaXZhdGVcclxuICAgICAqL1xyXG4gICAgc3RhdGljIGdldFBhdGhuYW1lKHJlcSkge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIHJldHVybiBwYXJzZVVybChyZXEpLnBhdGhuYW1lO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYXRjaCAoZXJyKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgLyoqXHJcbiAgICAgKiBNYXRjaCBwYXRoIHRvIGEgbGF5ZXIuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtMYXllcn0gbGF5ZXJcclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoXHJcbiAgICAgKiBAcHJpdmF0ZVxyXG4gICAgICovXHJcbiAgICBzdGF0aWMgbWF0Y2hMYXllcihsYXllciwgcGF0aCkge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIHJldHVybiBsYXllci5tYXRjaChwYXRoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY2F0Y2ggKGVycikge1xyXG4gICAgICAgICAgICByZXR1cm4gZXJyO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIC8qKlxyXG4gICAgICogTWVyZ2UgcGFyYW1zIHdpdGggcGFyZW50IHBhcmFtc1xyXG4gICAgICpcclxuICAgICAqIEBwcml2YXRlXHJcbiAgICAgKi9cclxuICAgIHN0YXRpYyBtZXJnZVBhcmFtcyhwYXJhbXMsIHBhcmVudCkge1xyXG4gICAgICAgIGlmICh0eXBlb2YgcGFyZW50ICE9PSAnb2JqZWN0JyB8fCAhcGFyZW50KSB7XHJcbiAgICAgICAgICAgIHJldHVybiBwYXJhbXM7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIG1ha2UgY29weSBvZiBwYXJlbnQgZm9yIGJhc2VcclxuICAgICAgICB2YXIgb2JqID0gbWl4aW4oe30sIHBhcmVudCk7XHJcbiAgICAgICAgLy8gc2ltcGxlIG5vbi1udW1lcmljIG1lcmdpbmdcclxuICAgICAgICBpZiAoISgwIGluIHBhcmFtcykgfHwgISgwIGluIHBhcmVudCkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG1peGluKG9iaiwgcGFyYW1zKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGkgPSAwO1xyXG4gICAgICAgIHZhciBvID0gMDtcclxuICAgICAgICAvLyBkZXRlcm1pbmUgbnVtZXJpYyBnYXAgaW4gcGFyYW1zXHJcbiAgICAgICAgd2hpbGUgKGkgaW4gcGFyYW1zKSB7XHJcbiAgICAgICAgICAgIGkrKztcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gZGV0ZXJtaW5lIG51bWVyaWMgZ2FwIGluIHBhcmVudFxyXG4gICAgICAgIHdoaWxlIChvIGluIHBhcmVudCkge1xyXG4gICAgICAgICAgICBvKys7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIG9mZnNldCBudW1lcmljIGluZGljZXMgaW4gcGFyYW1zIGJlZm9yZSBtZXJnZVxyXG4gICAgICAgIGZvciAoaS0tOyBpID49IDA7IGktLSkge1xyXG4gICAgICAgICAgICBwYXJhbXNbaSArIG9dID0gcGFyYW1zW2ldO1xyXG4gICAgICAgICAgICAvLyBjcmVhdGUgaG9sZXMgZm9yIHRoZSBtZXJnZSB3aGVuIG5lY2Vzc2FyeVxyXG4gICAgICAgICAgICBpZiAoaSA8IG8pIHtcclxuICAgICAgICAgICAgICAgIGRlbGV0ZSBwYXJhbXNbaV07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIG1peGluKG9iaiwgcGFyYW1zKTtcclxuICAgIH1cclxuICAgIHN0YXRpYyByZXN0b3JlKGZuLCBvYmosIC4uLnByb3BzKSB7XHJcbiAgICAgICAgdmFyIHZhbHMgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCAtIDIpO1xyXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcHJvcHMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgdmFsc1tpXSA9IG9ialtwcm9wc1tpXV07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoLi4uYXJncykge1xyXG4gICAgICAgICAgICAvLyByZXN0b3JlIHZhbHNcclxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwcm9wcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgb2JqW3Byb3BzW2ldXSA9IHZhbHNbaV07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuICAgIHN0YXRpYyB3cmFwKG9sZCwgZm4pIHtcclxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gcHJveHkoKSB7XHJcbiAgICAgICAgICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGggKyAxKTtcclxuICAgICAgICAgICAgYXJnc1swXSA9IG9sZDtcclxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xyXG4gICAgICAgICAgICAgICAgYXJnc1tpICsgMV0gPSBhcmd1bWVudHNbaV07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZm4uYXBwbHkodGhpcywgYXJncyk7XHJcbiAgICAgICAgfTtcclxuICAgIH1cclxufVxyXG5leHBvcnRzLlJvdXRlciA9IFJvdXRlcjtcclxuLy8gLy8gY3JlYXRlIFJvdXRlciNWRVJCIGZ1bmN0aW9uc1xyXG4vLyBtZXRob2RzLmNvbmNhdCgnYWxsJykuZm9yRWFjaChmdW5jdGlvbiAobWV0aG9kKVxyXG4vLyB7XHJcbi8vICAgICBSb3V0ZXIucHJvdG90eXBlW21ldGhvZF0gPSBmdW5jdGlvbiAocGF0aClcclxuLy8gICAgIHtcclxuLy8gICAgICAgICB2YXIgcm91dGUgPSB0aGlzLnJvdXRlKHBhdGgpXHJcbi8vICAgICAgICAgcm91dGVbbWV0aG9kXS5hcHBseShyb3V0ZSwgc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKVxyXG4vLyAgICAgICAgIHJldHVybiB0aGlzXHJcbi8vICAgICB9XHJcbi8vIH0pIFxyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1pbmRleC5qcy5tYXAiLCIvKiFcclxuICogcm91dGVyXHJcbiAqIENvcHlyaWdodChjKSAyMDEzIFJvbWFuIFNodHlsbWFuXHJcbiAqIENvcHlyaWdodChjKSAyMDE0IERvdWdsYXMgQ2hyaXN0b3BoZXIgV2lsc29uXHJcbiAqIE1JVCBMaWNlbnNlZFxyXG4gKi9cclxuJ3VzZSBzdHJpY3QnO1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbi8qKlxyXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxyXG4gKiBAcHJpdmF0ZVxyXG4gKi9cclxuY29uc3QgcGF0aFJlZ2V4cCA9IHJlcXVpcmUoXCJwYXRoLXRvLXJlZ2V4cFwiKTtcclxuY29uc3QgbG9nID0gcmVxdWlyZShcImRlYnVnXCIpO1xyXG52YXIgZGVidWcgPSBsb2coJ3JvdXRlcjpsYXllcicpO1xyXG4vKipcclxuICogTW9kdWxlIHZhcmlhYmxlcy5cclxuICogQHByaXZhdGVcclxuICovXHJcbnZhciBoYXNPd25Qcm9wZXJ0eSA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XHJcbi8qKlxyXG4gKiBFeHBvc2UgYExheWVyYC5cclxuICovXHJcbmNsYXNzIExheWVyIHtcclxuICAgIGNvbnN0cnVjdG9yKHBhdGgsIG9wdGlvbnMsIGZuKSB7XHJcbiAgICAgICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIExheWVyKSkge1xyXG4gICAgICAgICAgICByZXR1cm4gbmV3IExheWVyKHBhdGgsIG9wdGlvbnMsIGZuKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZGVidWcoJ25ldyAlbycsIHBhdGgpO1xyXG4gICAgICAgIHZhciBvcHRzID0gb3B0aW9ucyB8fCB7IGxlbmd0aDogMiB9O1xyXG4gICAgICAgIHRoaXMuaGFuZGxlciA9IGZuO1xyXG4gICAgICAgIHRoaXMubmFtZSA9IGZuLm5hbWUgfHwgJzxhbm9ueW1vdXM+JztcclxuICAgICAgICB0aGlzLnBhcmFtcyA9IHVuZGVmaW5lZDtcclxuICAgICAgICB0aGlzLnBhdGggPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgdGhpcy5yZWdleHAgPSBwYXRoUmVnZXhwKHBhdGgsIHRoaXMua2V5cyA9IFtdLCBvcHRzKTtcclxuICAgICAgICAvLyBzZXQgZmFzdCBwYXRoIGZsYWdzXHJcbiAgICAgICAgdGhpcy5yZWdleHAuZmFzdF9zdGFyID0gcGF0aCA9PT0gJyonO1xyXG4gICAgICAgIHRoaXMucmVnZXhwLmZhc3Rfc2xhc2ggPSBwYXRoID09PSAnLycgJiYgb3B0cy5lbmQgPT09IGZhbHNlO1xyXG4gICAgICAgIHRoaXMuaXNFcnJvckhhbmRsZXIgPSBmbi5sZW5ndGggPT0gMCB8fCBmbi5sZW5ndGggPj0gKG9wdHMubGVuZ3RoIHx8IDIpICsgMjtcclxuICAgICAgICB0aGlzLmlzUmVxdWVzdEhhbmRsZXIgPSBmbi5sZW5ndGggPT0gMCB8fCBmbi5sZW5ndGggPCAob3B0cy5sZW5ndGggfHwgMikgKyAyO1xyXG4gICAgfVxyXG4gICAgaXNBcHBsaWNhYmxlKHJlcSwgcm91dGUpIHtcclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuICAgIGhhbmRsZV9lcnJvcihlcnJvciwgLi4uYXJncykge1xyXG4gICAgICAgIHZhciBmbiA9IHRoaXMuaGFuZGxlcjtcclxuICAgICAgICB2YXIgbmV4dCA9IGFyZ3NbYXJncy5sZW5ndGggLSAxXTtcclxuICAgICAgICBpZiAoIXRoaXMuaXNFcnJvckhhbmRsZXIpIHtcclxuICAgICAgICAgICAgZGVidWcoJ3NraXBwaW5nIG5vbiBlcnJvciBoYW5kbGVyJyk7XHJcbiAgICAgICAgICAgIC8vIG5vdCBhIHN0YW5kYXJkIGVycm9yIGhhbmRsZXJcclxuICAgICAgICAgICAgcmV0dXJuIG5leHQoZXJyb3IpO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBmbi5hcHBseShudWxsLCBbZXJyb3JdLmNvbmNhdChhcmdzKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhdGNoIChlcnIpIHtcclxuICAgICAgICAgICAgbmV4dChlcnIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGhhbmRsZV9yZXF1ZXN0KC4uLmFyZ3MpIHtcclxuICAgICAgICB2YXIgZm4gPSB0aGlzLmhhbmRsZXI7XHJcbiAgICAgICAgdmFyIG5leHQgPSBhcmdzW2FyZ3MubGVuZ3RoIC0gMV07XHJcbiAgICAgICAgaWYgKCF0aGlzLmlzUmVxdWVzdEhhbmRsZXIpIHtcclxuICAgICAgICAgICAgZGVidWcoJ3NraXBwaW5nIG5vbiByZXF1ZXN0IGhhbmRsZXInKTtcclxuICAgICAgICAgICAgLy8gbm90IGEgc3RhbmRhcmQgcmVxdWVzdCBoYW5kbGVyXHJcbiAgICAgICAgICAgIHJldHVybiBuZXh0KCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGZuLmFwcGx5KG51bGwsIGFyZ3MpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYXRjaCAoZXJyKSB7XHJcbiAgICAgICAgICAgIG5leHQoZXJyKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICAvKipcclxuICAgICAqIENoZWNrIGlmIHRoaXMgcm91dGUgbWF0Y2hlcyBgcGF0aGAsIGlmIHNvXHJcbiAgICAgKiBwb3B1bGF0ZSBgLnBhcmFtc2AuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcclxuICAgICAqIEByZXR1cm4ge0Jvb2xlYW59XHJcbiAgICAgKiBAYXBpIHByaXZhdGVcclxuICAgICAqL1xyXG4gICAgbWF0Y2gocGF0aCkge1xyXG4gICAgICAgIHZhciBtYXRjaDtcclxuICAgICAgICBsb2codGhpcy5yZWdleHApO1xyXG4gICAgICAgIGlmIChwYXRoICE9IG51bGwpIHtcclxuICAgICAgICAgICAgLy8gZmFzdCBwYXRoIG5vbi1lbmRpbmcgbWF0Y2ggZm9yIC8gKGFueSBwYXRoIG1hdGNoZXMpXHJcbiAgICAgICAgICAgIGlmICh0aGlzLnJlZ2V4cC5mYXN0X3NsYXNoKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnBhcmFtcyA9IHt9O1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wYXRoID0gJyc7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyBmYXN0IHBhdGggZm9yICogKGV2ZXJ5dGhpbmcgbWF0Y2hlZCBpbiBhIHBhcmFtKVxyXG4gICAgICAgICAgICBpZiAodGhpcy5yZWdleHAuZmFzdF9zdGFyKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnBhcmFtcyA9IHsgJzAnOiBkZWNvZGVfcGFyYW0ocGF0aCkgfTtcclxuICAgICAgICAgICAgICAgIHRoaXMucGF0aCA9IHBhdGg7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyBtYXRjaCB0aGUgcGF0aFxyXG4gICAgICAgICAgICBtYXRjaCA9IHRoaXMucmVnZXhwLmV4ZWMocGF0aCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICghbWF0Y2gpIHtcclxuICAgICAgICAgICAgbG9nKHRoaXMucmVnZXhwKTtcclxuICAgICAgICAgICAgdGhpcy5wYXJhbXMgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIHRoaXMucGF0aCA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBzdG9yZSB2YWx1ZXNcclxuICAgICAgICB0aGlzLnBhcmFtcyA9IHt9O1xyXG4gICAgICAgIHRoaXMucGF0aCA9IG1hdGNoWzBdO1xyXG4gICAgICAgIC8vIGl0ZXJhdGUgbWF0Y2hlc1xyXG4gICAgICAgIHZhciBrZXlzID0gdGhpcy5rZXlzO1xyXG4gICAgICAgIHZhciBwYXJhbXMgPSB0aGlzLnBhcmFtcztcclxuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IG1hdGNoLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIHZhciBrZXkgPSBrZXlzW2kgLSAxXTtcclxuICAgICAgICAgICAgdmFyIHByb3AgPSBrZXkubmFtZTtcclxuICAgICAgICAgICAgdmFyIHZhbCA9IGRlY29kZV9wYXJhbShtYXRjaFtpXSk7XHJcbiAgICAgICAgICAgIGlmICh2YWwgIT09IHVuZGVmaW5lZCB8fCAhKGhhc093blByb3BlcnR5LmNhbGwocGFyYW1zLCBwcm9wKSkpIHtcclxuICAgICAgICAgICAgICAgIHBhcmFtc1twcm9wXSA9IHZhbDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxufVxyXG5leHBvcnRzLkxheWVyID0gTGF5ZXI7XHJcbi8qKlxyXG4gKiBEZWNvZGUgcGFyYW0gdmFsdWUuXHJcbiAqXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWxcclxuICogQHJldHVybiB7c3RyaW5nfVxyXG4gKiBAcHJpdmF0ZVxyXG4gKi9cclxuZnVuY3Rpb24gZGVjb2RlX3BhcmFtKHZhbCkge1xyXG4gICAgaWYgKHR5cGVvZiB2YWwgIT09ICdzdHJpbmcnIHx8IHZhbC5sZW5ndGggPT09IDApIHtcclxuICAgICAgICByZXR1cm4gdmFsO1xyXG4gICAgfVxyXG4gICAgdHJ5IHtcclxuICAgICAgICByZXR1cm4gZGVjb2RlVVJJQ29tcG9uZW50KHZhbCk7XHJcbiAgICB9XHJcbiAgICBjYXRjaCAoZXJyKSB7XHJcbiAgICAgICAgaWYgKGVyciBpbnN0YW5jZW9mIFVSSUVycm9yKSB7XHJcbiAgICAgICAgICAgIGVyci5tZXNzYWdlID0gJ0ZhaWxlZCB0byBkZWNvZGUgcGFyYW0gXFwnJyArIHZhbCArICdcXCcnO1xyXG4gICAgICAgICAgICBlcnJbJ3N0YXR1cyddID0gNDAwO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aHJvdyBlcnI7XHJcbiAgICB9XHJcbn1cclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9bGF5ZXIuanMubWFwIiwiLyohXHJcbiAqIHJvdXRlclxyXG4gKiBDb3B5cmlnaHQoYykgMjAxMyBSb21hbiBTaHR5bG1hblxyXG4gKiBDb3B5cmlnaHQoYykgMjAxNCBEb3VnbGFzIENocmlzdG9waGVyIFdpbHNvblxyXG4gKiBNSVQgTGljZW5zZWRcclxuICovXHJcbid1c2Ugc3RyaWN0JztcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG4vKipcclxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cclxuICogQHByaXZhdGVcclxuICovXHJcbnZhciBkZWJ1ZyA9IHJlcXVpcmUoJ2RlYnVnJykoJ3JvdXRlcjpyb3V0ZScpO1xyXG52YXIgZmxhdHRlbiA9IHJlcXVpcmUoJ2FycmF5LWZsYXR0ZW4nKTtcclxuY29uc3QgbGF5ZXJfMSA9IHJlcXVpcmUoXCIuL2xheWVyXCIpO1xyXG4vKipcclxuICogTW9kdWxlIHZhcmlhYmxlcy5cclxuICogQHByaXZhdGVcclxuICovXHJcbnZhciBzbGljZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZTtcclxuLyoqXHJcbiAqIEV4cG9zZSBgUm91dGVgLlxyXG4gKi9cclxuY2xhc3MgUm91dGUge1xyXG4gICAgY29uc3RydWN0b3IocGF0aCkge1xyXG4gICAgICAgIHRoaXMucGF0aCA9IHBhdGg7XHJcbiAgICAgICAgdGhpcy5zdGFjayA9IFtdO1xyXG4gICAgICAgIGRlYnVnKCduZXcgJW8nLCBwYXRoKTtcclxuICAgIH1cclxuICAgIGRpc3BhdGNoKHJlcSwgLi4ucmVzdCkge1xyXG4gICAgICAgIHZhciBkb25lID0gYXJndW1lbnRzW2FyZ3VtZW50cy5sZW5ndGggLSAxXTtcclxuICAgICAgICB2YXIgaWR4ID0gMDtcclxuICAgICAgICB2YXIgc3RhY2sgPSB0aGlzLnN0YWNrO1xyXG4gICAgICAgIGlmIChzdGFjay5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgcmV0dXJuIGRvbmUoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmVxLnJvdXRlID0gdGhpcztcclxuICAgICAgICB2YXIgYXJncyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKTtcclxuICAgICAgICBhcmdzW2FyZ3MubGVuZ3RoIC0gMV0gPSBuZXh0O1xyXG4gICAgICAgIG5leHQoKTtcclxuICAgICAgICBmdW5jdGlvbiBuZXh0KGVycikge1xyXG4gICAgICAgICAgICAvLyBzaWduYWwgdG8gZXhpdCByb3V0ZVxyXG4gICAgICAgICAgICBpZiAoZXJyICYmIGVyciA9PT0gJ3JvdXRlJylcclxuICAgICAgICAgICAgICAgIHJldHVybiBkb25lKCk7XHJcbiAgICAgICAgICAgIC8vIHNpZ25hbCB0byBleGl0IHJvdXRlclxyXG4gICAgICAgICAgICBpZiAoZXJyICYmIGVyciA9PT0gJ3JvdXRlcicpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZG9uZShlcnIpO1xyXG4gICAgICAgICAgICAvLyBubyBtb3JlIG1hdGNoaW5nIGxheWVyc1xyXG4gICAgICAgICAgICBpZiAoaWR4ID49IHN0YWNrLmxlbmd0aClcclxuICAgICAgICAgICAgICAgIHJldHVybiBkb25lKGVycik7XHJcbiAgICAgICAgICAgIHZhciBsYXllcjtcclxuICAgICAgICAgICAgdmFyIG1hdGNoO1xyXG4gICAgICAgICAgICAvLyBmaW5kIG5leHQgbWF0Y2hpbmcgbGF5ZXJcclxuICAgICAgICAgICAgd2hpbGUgKG1hdGNoICE9PSB0cnVlICYmIGlkeCA8IHN0YWNrLmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgbGF5ZXIgPSBzdGFja1tpZHgrK107XHJcbiAgICAgICAgICAgICAgICBtYXRjaCA9IGxheWVyLmlzQXBwbGljYWJsZShyZXEsIHRoaXMpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIG5vIG1hdGNoXHJcbiAgICAgICAgICAgIGlmIChtYXRjaCAhPT0gdHJ1ZSlcclxuICAgICAgICAgICAgICAgIHJldHVybiBkb25lKGVycik7XHJcbiAgICAgICAgICAgIGlmIChlcnIpXHJcbiAgICAgICAgICAgICAgICBsYXllci5oYW5kbGVfZXJyb3IuYXBwbHkobGF5ZXIsIFtlcnJdLmNvbmNhdChhcmdzKSk7XHJcbiAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgICAgIGxheWVyLmhhbmRsZV9yZXF1ZXN0LmFwcGx5KGxheWVyLCBhcmdzKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBidWlsZExheWVyKHBhdGgsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBsYXllcl8xLkxheWVyKCcvJywgb3B0aW9ucywgY2FsbGJhY2spO1xyXG4gICAgfVxyXG4gICAgaXNBcHBsaWNhYmxlKHJlcSkge1xyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG4gICAgYWRkSGFuZGxlcihwb3N0QnVpbGRMYXllciwgLi4uaGFuZGxlcnMpIHtcclxuICAgICAgICB2YXIgY2FsbGJhY2tzID0gZmxhdHRlbihoYW5kbGVycyk7XHJcbiAgICAgICAgaWYgKGNhbGxiYWNrcy5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignYXJndW1lbnQgaGFuZGxlciBpcyByZXF1aXJlZCcpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNhbGxiYWNrcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICB2YXIgZm4gPSBjYWxsYmFja3NbaV07XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2YgZm4gIT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2FyZ3VtZW50IGhhbmRsZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdmFyIGxheWVyID0gcG9zdEJ1aWxkTGF5ZXIodGhpcy5idWlsZExheWVyKCcvJywgeyBsZW5ndGg6IGZuLmxlbmd0aCAtIDEgfSwgZm4pKTtcclxuICAgICAgICAgICAgdGhpcy5zdGFjay5wdXNoKGxheWVyKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcbn1cclxuZXhwb3J0cy5Sb3V0ZSA9IFJvdXRlO1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1yb3V0ZS5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5jb25zdCBpbmplY3Rvcl8xID0gcmVxdWlyZShcIi4vaW5qZWN0b3JcIik7XHJcbmZ1bmN0aW9uIHNlcnZpY2UobmFtZSwgLi4udG9JbmplY3QpIHtcclxuICAgIHJldHVybiBmdW5jdGlvbiAodGFyZ2V0KSB7XHJcbiAgICAgICAgdmFyIGluc3RhbmNlID0gbnVsbDtcclxuICAgICAgICBpZiAodG9JbmplY3QgPT0gbnVsbCB8fCB0b0luamVjdC5sZW5ndGggPT0gMCAmJiB0YXJnZXQubGVuZ3RoID4gMClcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdtaXNzaW5nIGluamVjdCBuYW1lcycpO1xyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgICAgaW5qZWN0b3JfMS5yZWdpc3RlckZhY3RvcnkobmFtZSwgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGluc3RhbmNlIHx8IGluamVjdG9yXzEuaW5qZWN0V2l0aE5hbWUodG9JbmplY3QsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgYXJncyA9IFtudWxsXTtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKylcclxuICAgICAgICAgICAgICAgICAgICAgICAgYXJnc1tpICsgMV0gPSBhcmd1bWVudHNbaV07XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGluc3RhbmNlID0gbmV3IChGdW5jdGlvbi5wcm90b3R5cGUuYmluZC5hcHBseSh0YXJnZXQsIGFyZ3MpKTtcclxuICAgICAgICAgICAgICAgIH0pKCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgfTtcclxufVxyXG5leHBvcnRzLnNlcnZpY2UgPSBzZXJ2aWNlO1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1zZXJ2aWNlLmpzLm1hcCIsIid1c2Ugc3RyaWN0J1xuXG4vKipcbiAqIEV4cG9zZSBgYXJyYXlGbGF0dGVuYC5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBhcnJheUZsYXR0ZW5cblxuLyoqXG4gKiBSZWN1cnNpdmUgZmxhdHRlbiBmdW5jdGlvbiB3aXRoIGRlcHRoLlxuICpcbiAqIEBwYXJhbSAge0FycmF5fSAgYXJyYXlcbiAqIEBwYXJhbSAge0FycmF5fSAgcmVzdWx0XG4gKiBAcGFyYW0gIHtOdW1iZXJ9IGRlcHRoXG4gKiBAcmV0dXJuIHtBcnJheX1cbiAqL1xuZnVuY3Rpb24gZmxhdHRlbldpdGhEZXB0aCAoYXJyYXksIHJlc3VsdCwgZGVwdGgpIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnJheS5sZW5ndGg7IGkrKykge1xuICAgIHZhciB2YWx1ZSA9IGFycmF5W2ldXG5cbiAgICBpZiAoZGVwdGggPiAwICYmIEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICBmbGF0dGVuV2l0aERlcHRoKHZhbHVlLCByZXN1bHQsIGRlcHRoIC0gMSlcbiAgICB9IGVsc2Uge1xuICAgICAgcmVzdWx0LnB1c2godmFsdWUpXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlc3VsdFxufVxuXG4vKipcbiAqIFJlY3Vyc2l2ZSBmbGF0dGVuIGZ1bmN0aW9uLiBPbWl0dGluZyBkZXB0aCBpcyBzbGlnaHRseSBmYXN0ZXIuXG4gKlxuICogQHBhcmFtICB7QXJyYXl9IGFycmF5XG4gKiBAcGFyYW0gIHtBcnJheX0gcmVzdWx0XG4gKiBAcmV0dXJuIHtBcnJheX1cbiAqL1xuZnVuY3Rpb24gZmxhdHRlbkZvcmV2ZXIgKGFycmF5LCByZXN1bHQpIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnJheS5sZW5ndGg7IGkrKykge1xuICAgIHZhciB2YWx1ZSA9IGFycmF5W2ldXG5cbiAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgIGZsYXR0ZW5Gb3JldmVyKHZhbHVlLCByZXN1bHQpXG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc3VsdC5wdXNoKHZhbHVlKVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXN1bHRcbn1cblxuLyoqXG4gKiBGbGF0dGVuIGFuIGFycmF5LCB3aXRoIHRoZSBhYmlsaXR5IHRvIGRlZmluZSBhIGRlcHRoLlxuICpcbiAqIEBwYXJhbSAge0FycmF5fSAgYXJyYXlcbiAqIEBwYXJhbSAge051bWJlcn0gZGVwdGhcbiAqIEByZXR1cm4ge0FycmF5fVxuICovXG5mdW5jdGlvbiBhcnJheUZsYXR0ZW4gKGFycmF5LCBkZXB0aCkge1xuICBpZiAoZGVwdGggPT0gbnVsbCkge1xuICAgIHJldHVybiBmbGF0dGVuRm9yZXZlcihhcnJheSwgW10pXG4gIH1cblxuICByZXR1cm4gZmxhdHRlbldpdGhEZXB0aChhcnJheSwgW10sIGRlcHRoKVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBwcm9jZXNzLmhydGltZSB8fCBocnRpbWVcblxuLy8gcG9seWZpbCBmb3Igd2luZG93LnBlcmZvcm1hbmNlLm5vd1xudmFyIHBlcmZvcm1hbmNlID0gZ2xvYmFsLnBlcmZvcm1hbmNlIHx8IHt9XG52YXIgcGVyZm9ybWFuY2VOb3cgPVxuICBwZXJmb3JtYW5jZS5ub3cgICAgICAgIHx8XG4gIHBlcmZvcm1hbmNlLm1vek5vdyAgICAgfHxcbiAgcGVyZm9ybWFuY2UubXNOb3cgICAgICB8fFxuICBwZXJmb3JtYW5jZS5vTm93ICAgICAgIHx8XG4gIHBlcmZvcm1hbmNlLndlYmtpdE5vdyAgfHxcbiAgZnVuY3Rpb24oKXsgcmV0dXJuIChuZXcgRGF0ZSgpKS5nZXRUaW1lKCkgfVxuXG4vLyBnZW5lcmF0ZSB0aW1lc3RhbXAgb3IgZGVsdGFcbi8vIHNlZSBodHRwOi8vbm9kZWpzLm9yZy9hcGkvcHJvY2Vzcy5odG1sI3Byb2Nlc3NfcHJvY2Vzc19ocnRpbWVcbmZ1bmN0aW9uIGhydGltZShwcmV2aW91c1RpbWVzdGFtcCl7XG4gIHZhciBjbG9ja3RpbWUgPSBwZXJmb3JtYW5jZU5vdy5jYWxsKHBlcmZvcm1hbmNlKSoxZS0zXG4gIHZhciBzZWNvbmRzID0gTWF0aC5mbG9vcihjbG9ja3RpbWUpXG4gIHZhciBuYW5vc2Vjb25kcyA9IE1hdGguZmxvb3IoKGNsb2NrdGltZSUxKSoxZTkpXG4gIGlmIChwcmV2aW91c1RpbWVzdGFtcCkge1xuICAgIHNlY29uZHMgPSBzZWNvbmRzIC0gcHJldmlvdXNUaW1lc3RhbXBbMF1cbiAgICBuYW5vc2Vjb25kcyA9IG5hbm9zZWNvbmRzIC0gcHJldmlvdXNUaW1lc3RhbXBbMV1cbiAgICBpZiAobmFub3NlY29uZHM8MCkge1xuICAgICAgc2Vjb25kcy0tXG4gICAgICBuYW5vc2Vjb25kcyArPSAxZTlcbiAgICB9XG4gIH1cbiAgcmV0dXJuIFtzZWNvbmRzLG5hbm9zZWNvbmRzXVxufSIsIlxuLyoqXG4gKiBUaGlzIGlzIHRoZSB3ZWIgYnJvd3NlciBpbXBsZW1lbnRhdGlvbiBvZiBgZGVidWcoKWAuXG4gKlxuICogRXhwb3NlIGBkZWJ1ZygpYCBhcyB0aGUgbW9kdWxlLlxuICovXG5cbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vZGVidWcnKTtcbmV4cG9ydHMubG9nID0gbG9nO1xuZXhwb3J0cy5mb3JtYXRBcmdzID0gZm9ybWF0QXJncztcbmV4cG9ydHMuc2F2ZSA9IHNhdmU7XG5leHBvcnRzLmxvYWQgPSBsb2FkO1xuZXhwb3J0cy51c2VDb2xvcnMgPSB1c2VDb2xvcnM7XG5leHBvcnRzLnN0b3JhZ2UgPSAndW5kZWZpbmVkJyAhPSB0eXBlb2YgY2hyb21lXG4gICAgICAgICAgICAgICAmJiAndW5kZWZpbmVkJyAhPSB0eXBlb2YgY2hyb21lLnN0b3JhZ2VcbiAgICAgICAgICAgICAgICAgID8gY2hyb21lLnN0b3JhZ2UubG9jYWxcbiAgICAgICAgICAgICAgICAgIDogbG9jYWxzdG9yYWdlKCk7XG5cbi8qKlxuICogQ29sb3JzLlxuICovXG5cbmV4cG9ydHMuY29sb3JzID0gW1xuICAnbGlnaHRzZWFncmVlbicsXG4gICdmb3Jlc3RncmVlbicsXG4gICdnb2xkZW5yb2QnLFxuICAnZG9kZ2VyYmx1ZScsXG4gICdkYXJrb3JjaGlkJyxcbiAgJ2NyaW1zb24nXG5dO1xuXG4vKipcbiAqIEN1cnJlbnRseSBvbmx5IFdlYktpdC1iYXNlZCBXZWIgSW5zcGVjdG9ycywgRmlyZWZveCA+PSB2MzEsXG4gKiBhbmQgdGhlIEZpcmVidWcgZXh0ZW5zaW9uIChhbnkgRmlyZWZveCB2ZXJzaW9uKSBhcmUga25vd25cbiAqIHRvIHN1cHBvcnQgXCIlY1wiIENTUyBjdXN0b21pemF0aW9ucy5cbiAqXG4gKiBUT0RPOiBhZGQgYSBgbG9jYWxTdG9yYWdlYCB2YXJpYWJsZSB0byBleHBsaWNpdGx5IGVuYWJsZS9kaXNhYmxlIGNvbG9yc1xuICovXG5cbmZ1bmN0aW9uIHVzZUNvbG9ycygpIHtcbiAgLy8gaXMgd2Via2l0PyBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8xNjQ1OTYwNi8zNzY3NzNcbiAgcmV0dXJuICgnV2Via2l0QXBwZWFyYW5jZScgaW4gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnN0eWxlKSB8fFxuICAgIC8vIGlzIGZpcmVidWc/IGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9hLzM5ODEyMC8zNzY3NzNcbiAgICAod2luZG93LmNvbnNvbGUgJiYgKGNvbnNvbGUuZmlyZWJ1ZyB8fCAoY29uc29sZS5leGNlcHRpb24gJiYgY29uc29sZS50YWJsZSkpKSB8fFxuICAgIC8vIGlzIGZpcmVmb3ggPj0gdjMxP1xuICAgIC8vIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvVG9vbHMvV2ViX0NvbnNvbGUjU3R5bGluZ19tZXNzYWdlc1xuICAgIChuYXZpZ2F0b3IudXNlckFnZW50LnRvTG93ZXJDYXNlKCkubWF0Y2goL2ZpcmVmb3hcXC8oXFxkKykvKSAmJiBwYXJzZUludChSZWdFeHAuJDEsIDEwKSA+PSAzMSk7XG59XG5cbi8qKlxuICogTWFwICVqIHRvIGBKU09OLnN0cmluZ2lmeSgpYCwgc2luY2Ugbm8gV2ViIEluc3BlY3RvcnMgZG8gdGhhdCBieSBkZWZhdWx0LlxuICovXG5cbmV4cG9ydHMuZm9ybWF0dGVycy5qID0gZnVuY3Rpb24odikge1xuICByZXR1cm4gSlNPTi5zdHJpbmdpZnkodik7XG59O1xuXG5cbi8qKlxuICogQ29sb3JpemUgbG9nIGFyZ3VtZW50cyBpZiBlbmFibGVkLlxuICpcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gZm9ybWF0QXJncygpIHtcbiAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XG4gIHZhciB1c2VDb2xvcnMgPSB0aGlzLnVzZUNvbG9ycztcblxuICBhcmdzWzBdID0gKHVzZUNvbG9ycyA/ICclYycgOiAnJylcbiAgICArIHRoaXMubmFtZXNwYWNlXG4gICAgKyAodXNlQ29sb3JzID8gJyAlYycgOiAnICcpXG4gICAgKyBhcmdzWzBdXG4gICAgKyAodXNlQ29sb3JzID8gJyVjICcgOiAnICcpXG4gICAgKyAnKycgKyBleHBvcnRzLmh1bWFuaXplKHRoaXMuZGlmZik7XG5cbiAgaWYgKCF1c2VDb2xvcnMpIHJldHVybiBhcmdzO1xuXG4gIHZhciBjID0gJ2NvbG9yOiAnICsgdGhpcy5jb2xvcjtcbiAgYXJncyA9IFthcmdzWzBdLCBjLCAnY29sb3I6IGluaGVyaXQnXS5jb25jYXQoQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJncywgMSkpO1xuXG4gIC8vIHRoZSBmaW5hbCBcIiVjXCIgaXMgc29tZXdoYXQgdHJpY2t5LCBiZWNhdXNlIHRoZXJlIGNvdWxkIGJlIG90aGVyXG4gIC8vIGFyZ3VtZW50cyBwYXNzZWQgZWl0aGVyIGJlZm9yZSBvciBhZnRlciB0aGUgJWMsIHNvIHdlIG5lZWQgdG9cbiAgLy8gZmlndXJlIG91dCB0aGUgY29ycmVjdCBpbmRleCB0byBpbnNlcnQgdGhlIENTUyBpbnRvXG4gIHZhciBpbmRleCA9IDA7XG4gIHZhciBsYXN0QyA9IDA7XG4gIGFyZ3NbMF0ucmVwbGFjZSgvJVthLXolXS9nLCBmdW5jdGlvbihtYXRjaCkge1xuICAgIGlmICgnJSUnID09PSBtYXRjaCkgcmV0dXJuO1xuICAgIGluZGV4Kys7XG4gICAgaWYgKCclYycgPT09IG1hdGNoKSB7XG4gICAgICAvLyB3ZSBvbmx5IGFyZSBpbnRlcmVzdGVkIGluIHRoZSAqbGFzdCogJWNcbiAgICAgIC8vICh0aGUgdXNlciBtYXkgaGF2ZSBwcm92aWRlZCB0aGVpciBvd24pXG4gICAgICBsYXN0QyA9IGluZGV4O1xuICAgIH1cbiAgfSk7XG5cbiAgYXJncy5zcGxpY2UobGFzdEMsIDAsIGMpO1xuICByZXR1cm4gYXJncztcbn1cblxuLyoqXG4gKiBJbnZva2VzIGBjb25zb2xlLmxvZygpYCB3aGVuIGF2YWlsYWJsZS5cbiAqIE5vLW9wIHdoZW4gYGNvbnNvbGUubG9nYCBpcyBub3QgYSBcImZ1bmN0aW9uXCIuXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5mdW5jdGlvbiBsb2coKSB7XG4gIC8vIHRoaXMgaGFja2VyeSBpcyByZXF1aXJlZCBmb3IgSUU4LzksIHdoZXJlXG4gIC8vIHRoZSBgY29uc29sZS5sb2dgIGZ1bmN0aW9uIGRvZXNuJ3QgaGF2ZSAnYXBwbHknXG4gIHJldHVybiAnb2JqZWN0JyA9PT0gdHlwZW9mIGNvbnNvbGVcbiAgICAmJiBjb25zb2xlLmxvZ1xuICAgICYmIEZ1bmN0aW9uLnByb3RvdHlwZS5hcHBseS5jYWxsKGNvbnNvbGUubG9nLCBjb25zb2xlLCBhcmd1bWVudHMpO1xufVxuXG4vKipcbiAqIFNhdmUgYG5hbWVzcGFjZXNgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lc3BhY2VzXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBzYXZlKG5hbWVzcGFjZXMpIHtcbiAgdHJ5IHtcbiAgICBpZiAobnVsbCA9PSBuYW1lc3BhY2VzKSB7XG4gICAgICBleHBvcnRzLnN0b3JhZ2UucmVtb3ZlSXRlbSgnZGVidWcnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZXhwb3J0cy5zdG9yYWdlLmRlYnVnID0gbmFtZXNwYWNlcztcbiAgICB9XG4gIH0gY2F0Y2goZSkge31cbn1cblxuLyoqXG4gKiBMb2FkIGBuYW1lc3BhY2VzYC5cbiAqXG4gKiBAcmV0dXJuIHtTdHJpbmd9IHJldHVybnMgdGhlIHByZXZpb3VzbHkgcGVyc2lzdGVkIGRlYnVnIG1vZGVzXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBsb2FkKCkge1xuICB2YXIgcjtcbiAgdHJ5IHtcbiAgICByID0gZXhwb3J0cy5zdG9yYWdlLmRlYnVnO1xuICB9IGNhdGNoKGUpIHt9XG4gIHJldHVybiByO1xufVxuXG4vKipcbiAqIEVuYWJsZSBuYW1lc3BhY2VzIGxpc3RlZCBpbiBgbG9jYWxTdG9yYWdlLmRlYnVnYCBpbml0aWFsbHkuXG4gKi9cblxuZXhwb3J0cy5lbmFibGUobG9hZCgpKTtcblxuLyoqXG4gKiBMb2NhbHN0b3JhZ2UgYXR0ZW1wdHMgdG8gcmV0dXJuIHRoZSBsb2NhbHN0b3JhZ2UuXG4gKlxuICogVGhpcyBpcyBuZWNlc3NhcnkgYmVjYXVzZSBzYWZhcmkgdGhyb3dzXG4gKiB3aGVuIGEgdXNlciBkaXNhYmxlcyBjb29raWVzL2xvY2Fsc3RvcmFnZVxuICogYW5kIHlvdSBhdHRlbXB0IHRvIGFjY2VzcyBpdC5cbiAqXG4gKiBAcmV0dXJuIHtMb2NhbFN0b3JhZ2V9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBsb2NhbHN0b3JhZ2UoKXtcbiAgdHJ5IHtcbiAgICByZXR1cm4gd2luZG93LmxvY2FsU3RvcmFnZTtcbiAgfSBjYXRjaCAoZSkge31cbn1cbiIsIlxuLyoqXG4gKiBUaGlzIGlzIHRoZSBjb21tb24gbG9naWMgZm9yIGJvdGggdGhlIE5vZGUuanMgYW5kIHdlYiBicm93c2VyXG4gKiBpbXBsZW1lbnRhdGlvbnMgb2YgYGRlYnVnKClgLlxuICpcbiAqIEV4cG9zZSBgZGVidWcoKWAgYXMgdGhlIG1vZHVsZS5cbiAqL1xuXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBkZWJ1ZztcbmV4cG9ydHMuY29lcmNlID0gY29lcmNlO1xuZXhwb3J0cy5kaXNhYmxlID0gZGlzYWJsZTtcbmV4cG9ydHMuZW5hYmxlID0gZW5hYmxlO1xuZXhwb3J0cy5lbmFibGVkID0gZW5hYmxlZDtcbmV4cG9ydHMuaHVtYW5pemUgPSByZXF1aXJlKCdtcycpO1xuXG4vKipcbiAqIFRoZSBjdXJyZW50bHkgYWN0aXZlIGRlYnVnIG1vZGUgbmFtZXMsIGFuZCBuYW1lcyB0byBza2lwLlxuICovXG5cbmV4cG9ydHMubmFtZXMgPSBbXTtcbmV4cG9ydHMuc2tpcHMgPSBbXTtcblxuLyoqXG4gKiBNYXAgb2Ygc3BlY2lhbCBcIiVuXCIgaGFuZGxpbmcgZnVuY3Rpb25zLCBmb3IgdGhlIGRlYnVnIFwiZm9ybWF0XCIgYXJndW1lbnQuXG4gKlxuICogVmFsaWQga2V5IG5hbWVzIGFyZSBhIHNpbmdsZSwgbG93ZXJjYXNlZCBsZXR0ZXIsIGkuZS4gXCJuXCIuXG4gKi9cblxuZXhwb3J0cy5mb3JtYXR0ZXJzID0ge307XG5cbi8qKlxuICogUHJldmlvdXNseSBhc3NpZ25lZCBjb2xvci5cbiAqL1xuXG52YXIgcHJldkNvbG9yID0gMDtcblxuLyoqXG4gKiBQcmV2aW91cyBsb2cgdGltZXN0YW1wLlxuICovXG5cbnZhciBwcmV2VGltZTtcblxuLyoqXG4gKiBTZWxlY3QgYSBjb2xvci5cbiAqXG4gKiBAcmV0dXJuIHtOdW1iZXJ9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBzZWxlY3RDb2xvcigpIHtcbiAgcmV0dXJuIGV4cG9ydHMuY29sb3JzW3ByZXZDb2xvcisrICUgZXhwb3J0cy5jb2xvcnMubGVuZ3RoXTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgYSBkZWJ1Z2dlciB3aXRoIHRoZSBnaXZlbiBgbmFtZXNwYWNlYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZXNwYWNlXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gZGVidWcobmFtZXNwYWNlKSB7XG5cbiAgLy8gZGVmaW5lIHRoZSBgZGlzYWJsZWRgIHZlcnNpb25cbiAgZnVuY3Rpb24gZGlzYWJsZWQoKSB7XG4gIH1cbiAgZGlzYWJsZWQuZW5hYmxlZCA9IGZhbHNlO1xuXG4gIC8vIGRlZmluZSB0aGUgYGVuYWJsZWRgIHZlcnNpb25cbiAgZnVuY3Rpb24gZW5hYmxlZCgpIHtcblxuICAgIHZhciBzZWxmID0gZW5hYmxlZDtcblxuICAgIC8vIHNldCBgZGlmZmAgdGltZXN0YW1wXG4gICAgdmFyIGN1cnIgPSArbmV3IERhdGUoKTtcbiAgICB2YXIgbXMgPSBjdXJyIC0gKHByZXZUaW1lIHx8IGN1cnIpO1xuICAgIHNlbGYuZGlmZiA9IG1zO1xuICAgIHNlbGYucHJldiA9IHByZXZUaW1lO1xuICAgIHNlbGYuY3VyciA9IGN1cnI7XG4gICAgcHJldlRpbWUgPSBjdXJyO1xuXG4gICAgLy8gYWRkIHRoZSBgY29sb3JgIGlmIG5vdCBzZXRcbiAgICBpZiAobnVsbCA9PSBzZWxmLnVzZUNvbG9ycykgc2VsZi51c2VDb2xvcnMgPSBleHBvcnRzLnVzZUNvbG9ycygpO1xuICAgIGlmIChudWxsID09IHNlbGYuY29sb3IgJiYgc2VsZi51c2VDb2xvcnMpIHNlbGYuY29sb3IgPSBzZWxlY3RDb2xvcigpO1xuXG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuXG4gICAgYXJnc1swXSA9IGV4cG9ydHMuY29lcmNlKGFyZ3NbMF0pO1xuXG4gICAgaWYgKCdzdHJpbmcnICE9PSB0eXBlb2YgYXJnc1swXSkge1xuICAgICAgLy8gYW55dGhpbmcgZWxzZSBsZXQncyBpbnNwZWN0IHdpdGggJW9cbiAgICAgIGFyZ3MgPSBbJyVvJ10uY29uY2F0KGFyZ3MpO1xuICAgIH1cblxuICAgIC8vIGFwcGx5IGFueSBgZm9ybWF0dGVyc2AgdHJhbnNmb3JtYXRpb25zXG4gICAgdmFyIGluZGV4ID0gMDtcbiAgICBhcmdzWzBdID0gYXJnc1swXS5yZXBsYWNlKC8lKFthLXolXSkvZywgZnVuY3Rpb24obWF0Y2gsIGZvcm1hdCkge1xuICAgICAgLy8gaWYgd2UgZW5jb3VudGVyIGFuIGVzY2FwZWQgJSB0aGVuIGRvbid0IGluY3JlYXNlIHRoZSBhcnJheSBpbmRleFxuICAgICAgaWYgKG1hdGNoID09PSAnJSUnKSByZXR1cm4gbWF0Y2g7XG4gICAgICBpbmRleCsrO1xuICAgICAgdmFyIGZvcm1hdHRlciA9IGV4cG9ydHMuZm9ybWF0dGVyc1tmb3JtYXRdO1xuICAgICAgaWYgKCdmdW5jdGlvbicgPT09IHR5cGVvZiBmb3JtYXR0ZXIpIHtcbiAgICAgICAgdmFyIHZhbCA9IGFyZ3NbaW5kZXhdO1xuICAgICAgICBtYXRjaCA9IGZvcm1hdHRlci5jYWxsKHNlbGYsIHZhbCk7XG5cbiAgICAgICAgLy8gbm93IHdlIG5lZWQgdG8gcmVtb3ZlIGBhcmdzW2luZGV4XWAgc2luY2UgaXQncyBpbmxpbmVkIGluIHRoZSBgZm9ybWF0YFxuICAgICAgICBhcmdzLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgIGluZGV4LS07XG4gICAgICB9XG4gICAgICByZXR1cm4gbWF0Y2g7XG4gICAgfSk7XG5cbiAgICBpZiAoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIGV4cG9ydHMuZm9ybWF0QXJncykge1xuICAgICAgYXJncyA9IGV4cG9ydHMuZm9ybWF0QXJncy5hcHBseShzZWxmLCBhcmdzKTtcbiAgICB9XG4gICAgdmFyIGxvZ0ZuID0gZW5hYmxlZC5sb2cgfHwgZXhwb3J0cy5sb2cgfHwgY29uc29sZS5sb2cuYmluZChjb25zb2xlKTtcbiAgICBsb2dGbi5hcHBseShzZWxmLCBhcmdzKTtcbiAgfVxuICBlbmFibGVkLmVuYWJsZWQgPSB0cnVlO1xuXG4gIHZhciBmbiA9IGV4cG9ydHMuZW5hYmxlZChuYW1lc3BhY2UpID8gZW5hYmxlZCA6IGRpc2FibGVkO1xuXG4gIGZuLm5hbWVzcGFjZSA9IG5hbWVzcGFjZTtcblxuICByZXR1cm4gZm47XG59XG5cbi8qKlxuICogRW5hYmxlcyBhIGRlYnVnIG1vZGUgYnkgbmFtZXNwYWNlcy4gVGhpcyBjYW4gaW5jbHVkZSBtb2Rlc1xuICogc2VwYXJhdGVkIGJ5IGEgY29sb24gYW5kIHdpbGRjYXJkcy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZXNwYWNlc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5mdW5jdGlvbiBlbmFibGUobmFtZXNwYWNlcykge1xuICBleHBvcnRzLnNhdmUobmFtZXNwYWNlcyk7XG5cbiAgdmFyIHNwbGl0ID0gKG5hbWVzcGFjZXMgfHwgJycpLnNwbGl0KC9bXFxzLF0rLyk7XG4gIHZhciBsZW4gPSBzcGxpdC5sZW5ndGg7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgIGlmICghc3BsaXRbaV0pIGNvbnRpbnVlOyAvLyBpZ25vcmUgZW1wdHkgc3RyaW5nc1xuICAgIG5hbWVzcGFjZXMgPSBzcGxpdFtpXS5yZXBsYWNlKC9cXCovZywgJy4qPycpO1xuICAgIGlmIChuYW1lc3BhY2VzWzBdID09PSAnLScpIHtcbiAgICAgIGV4cG9ydHMuc2tpcHMucHVzaChuZXcgUmVnRXhwKCdeJyArIG5hbWVzcGFjZXMuc3Vic3RyKDEpICsgJyQnKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGV4cG9ydHMubmFtZXMucHVzaChuZXcgUmVnRXhwKCdeJyArIG5hbWVzcGFjZXMgKyAnJCcpKTtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBEaXNhYmxlIGRlYnVnIG91dHB1dC5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIGRpc2FibGUoKSB7XG4gIGV4cG9ydHMuZW5hYmxlKCcnKTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgdGhlIGdpdmVuIG1vZGUgbmFtZSBpcyBlbmFibGVkLCBmYWxzZSBvdGhlcndpc2UuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWVcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIGVuYWJsZWQobmFtZSkge1xuICB2YXIgaSwgbGVuO1xuICBmb3IgKGkgPSAwLCBsZW4gPSBleHBvcnRzLnNraXBzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgaWYgKGV4cG9ydHMuc2tpcHNbaV0udGVzdChuYW1lKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuICBmb3IgKGkgPSAwLCBsZW4gPSBleHBvcnRzLm5hbWVzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgaWYgKGV4cG9ydHMubmFtZXNbaV0udGVzdChuYW1lKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuLyoqXG4gKiBDb2VyY2UgYHZhbGAuXG4gKlxuICogQHBhcmFtIHtNaXhlZH0gdmFsXG4gKiBAcmV0dXJuIHtNaXhlZH1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIGNvZXJjZSh2YWwpIHtcbiAgaWYgKHZhbCBpbnN0YW5jZW9mIEVycm9yKSByZXR1cm4gdmFsLnN0YWNrIHx8IHZhbC5tZXNzYWdlO1xuICByZXR1cm4gdmFsO1xufVxuIiwiLyoqXG4gKiBIZWxwZXJzLlxuICovXG5cbnZhciBzID0gMTAwMDtcbnZhciBtID0gcyAqIDYwO1xudmFyIGggPSBtICogNjA7XG52YXIgZCA9IGggKiAyNDtcbnZhciB5ID0gZCAqIDM2NS4yNTtcblxuLyoqXG4gKiBQYXJzZSBvciBmb3JtYXQgdGhlIGdpdmVuIGB2YWxgLlxuICpcbiAqIE9wdGlvbnM6XG4gKlxuICogIC0gYGxvbmdgIHZlcmJvc2UgZm9ybWF0dGluZyBbZmFsc2VdXG4gKlxuICogQHBhcmFtIHtTdHJpbmd8TnVtYmVyfSB2YWxcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAcmV0dXJuIHtTdHJpbmd8TnVtYmVyfVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHZhbCwgb3B0aW9ucyl7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICBpZiAoJ3N0cmluZycgPT0gdHlwZW9mIHZhbCkgcmV0dXJuIHBhcnNlKHZhbCk7XG4gIHJldHVybiBvcHRpb25zLmxvbmdcbiAgICA/IGxvbmcodmFsKVxuICAgIDogc2hvcnQodmFsKTtcbn07XG5cbi8qKlxuICogUGFyc2UgdGhlIGdpdmVuIGBzdHJgIGFuZCByZXR1cm4gbWlsbGlzZWNvbmRzLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHJcbiAqIEByZXR1cm4ge051bWJlcn1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIHBhcnNlKHN0cikge1xuICBzdHIgPSAnJyArIHN0cjtcbiAgaWYgKHN0ci5sZW5ndGggPiAxMDAwMCkgcmV0dXJuO1xuICB2YXIgbWF0Y2ggPSAvXigoPzpcXGQrKT9cXC4/XFxkKykgKihtaWxsaXNlY29uZHM/fG1zZWNzP3xtc3xzZWNvbmRzP3xzZWNzP3xzfG1pbnV0ZXM/fG1pbnM/fG18aG91cnM/fGhycz98aHxkYXlzP3xkfHllYXJzP3x5cnM/fHkpPyQvaS5leGVjKHN0cik7XG4gIGlmICghbWF0Y2gpIHJldHVybjtcbiAgdmFyIG4gPSBwYXJzZUZsb2F0KG1hdGNoWzFdKTtcbiAgdmFyIHR5cGUgPSAobWF0Y2hbMl0gfHwgJ21zJykudG9Mb3dlckNhc2UoKTtcbiAgc3dpdGNoICh0eXBlKSB7XG4gICAgY2FzZSAneWVhcnMnOlxuICAgIGNhc2UgJ3llYXInOlxuICAgIGNhc2UgJ3lycyc6XG4gICAgY2FzZSAneXInOlxuICAgIGNhc2UgJ3knOlxuICAgICAgcmV0dXJuIG4gKiB5O1xuICAgIGNhc2UgJ2RheXMnOlxuICAgIGNhc2UgJ2RheSc6XG4gICAgY2FzZSAnZCc6XG4gICAgICByZXR1cm4gbiAqIGQ7XG4gICAgY2FzZSAnaG91cnMnOlxuICAgIGNhc2UgJ2hvdXInOlxuICAgIGNhc2UgJ2hycyc6XG4gICAgY2FzZSAnaHInOlxuICAgIGNhc2UgJ2gnOlxuICAgICAgcmV0dXJuIG4gKiBoO1xuICAgIGNhc2UgJ21pbnV0ZXMnOlxuICAgIGNhc2UgJ21pbnV0ZSc6XG4gICAgY2FzZSAnbWlucyc6XG4gICAgY2FzZSAnbWluJzpcbiAgICBjYXNlICdtJzpcbiAgICAgIHJldHVybiBuICogbTtcbiAgICBjYXNlICdzZWNvbmRzJzpcbiAgICBjYXNlICdzZWNvbmQnOlxuICAgIGNhc2UgJ3NlY3MnOlxuICAgIGNhc2UgJ3NlYyc6XG4gICAgY2FzZSAncyc6XG4gICAgICByZXR1cm4gbiAqIHM7XG4gICAgY2FzZSAnbWlsbGlzZWNvbmRzJzpcbiAgICBjYXNlICdtaWxsaXNlY29uZCc6XG4gICAgY2FzZSAnbXNlY3MnOlxuICAgIGNhc2UgJ21zZWMnOlxuICAgIGNhc2UgJ21zJzpcbiAgICAgIHJldHVybiBuO1xuICB9XG59XG5cbi8qKlxuICogU2hvcnQgZm9ybWF0IGZvciBgbXNgLlxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSBtc1xuICogQHJldHVybiB7U3RyaW5nfVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gc2hvcnQobXMpIHtcbiAgaWYgKG1zID49IGQpIHJldHVybiBNYXRoLnJvdW5kKG1zIC8gZCkgKyAnZCc7XG4gIGlmIChtcyA+PSBoKSByZXR1cm4gTWF0aC5yb3VuZChtcyAvIGgpICsgJ2gnO1xuICBpZiAobXMgPj0gbSkgcmV0dXJuIE1hdGgucm91bmQobXMgLyBtKSArICdtJztcbiAgaWYgKG1zID49IHMpIHJldHVybiBNYXRoLnJvdW5kKG1zIC8gcykgKyAncyc7XG4gIHJldHVybiBtcyArICdtcyc7XG59XG5cbi8qKlxuICogTG9uZyBmb3JtYXQgZm9yIGBtc2AuXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IG1zXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBsb25nKG1zKSB7XG4gIHJldHVybiBwbHVyYWwobXMsIGQsICdkYXknKVxuICAgIHx8IHBsdXJhbChtcywgaCwgJ2hvdXInKVxuICAgIHx8IHBsdXJhbChtcywgbSwgJ21pbnV0ZScpXG4gICAgfHwgcGx1cmFsKG1zLCBzLCAnc2Vjb25kJylcbiAgICB8fCBtcyArICcgbXMnO1xufVxuXG4vKipcbiAqIFBsdXJhbGl6YXRpb24gaGVscGVyLlxuICovXG5cbmZ1bmN0aW9uIHBsdXJhbChtcywgbiwgbmFtZSkge1xuICBpZiAobXMgPCBuKSByZXR1cm47XG4gIGlmIChtcyA8IG4gKiAxLjUpIHJldHVybiBNYXRoLmZsb29yKG1zIC8gbikgKyAnICcgKyBuYW1lO1xuICByZXR1cm4gTWF0aC5jZWlsKG1zIC8gbikgKyAnICcgKyBuYW1lICsgJ3MnO1xufVxuIiwidmFyIHdyYXBweSA9IHJlcXVpcmUoJ3dyYXBweScpXG5tb2R1bGUuZXhwb3J0cyA9IHdyYXBweShvbmNlKVxuXG5vbmNlLnByb3RvID0gb25jZShmdW5jdGlvbiAoKSB7XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShGdW5jdGlvbi5wcm90b3R5cGUsICdvbmNlJywge1xuICAgIHZhbHVlOiBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gb25jZSh0aGlzKVxuICAgIH0sXG4gICAgY29uZmlndXJhYmxlOiB0cnVlXG4gIH0pXG59KVxuXG5mdW5jdGlvbiBvbmNlIChmbikge1xuICB2YXIgZiA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoZi5jYWxsZWQpIHJldHVybiBmLnZhbHVlXG4gICAgZi5jYWxsZWQgPSB0cnVlXG4gICAgcmV0dXJuIGYudmFsdWUgPSBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpXG4gIH1cbiAgZi5jYWxsZWQgPSBmYWxzZVxuICByZXR1cm4gZlxufVxuIiwiLypqc2hpbnQgbm9kZTp0cnVlICovXHJcblxyXG5cInVzZSBzdHJpY3RcIjtcclxuXHJcbnZhciB1dGlsID0gcmVxdWlyZSgndXRpbCcpO1xyXG52YXIgZXZlbnRzID0gcmVxdWlyZSgnZXZlbnRzJyk7XHJcbnZhciBFdmVudEVtaXR0ZXIgPSBldmVudHMuRXZlbnRFbWl0dGVyO1xyXG52YXIgcnVuVGFzayA9IHJlcXVpcmUoJy4vbGliL3J1blRhc2snKTtcclxuXHJcbnZhciBPcmNoZXN0cmF0b3IgPSBmdW5jdGlvbiAoKSB7XHJcblx0RXZlbnRFbWl0dGVyLmNhbGwodGhpcyk7XHJcblx0dGhpcy5kb25lQ2FsbGJhY2sgPSB1bmRlZmluZWQ7IC8vIGNhbGwgdGhpcyB3aGVuIGFsbCB0YXNrcyBpbiB0aGUgcXVldWUgYXJlIGRvbmVcclxuXHR0aGlzLnNlcSA9IFtdOyAvLyB0aGUgb3JkZXIgdG8gcnVuIHRoZSB0YXNrc1xyXG5cdHRoaXMudGFza3MgPSB7fTsgLy8gdGFzayBvYmplY3RzOiBuYW1lLCBkZXAgKGxpc3Qgb2YgbmFtZXMgb2YgZGVwZW5kZW5jaWVzKSwgZm4gKHRoZSB0YXNrIHRvIHJ1bilcclxuXHR0aGlzLmlzUnVubmluZyA9IGZhbHNlOyAvLyBpcyB0aGUgb3JjaGVzdHJhdG9yIHJ1bm5pbmcgdGFza3M/IC5zdGFydCgpIHRvIHN0YXJ0LCAuc3RvcCgpIHRvIHN0b3BcclxufTtcclxudXRpbC5pbmhlcml0cyhPcmNoZXN0cmF0b3IsIEV2ZW50RW1pdHRlcik7XHJcblxyXG5cdE9yY2hlc3RyYXRvci5wcm90b3R5cGUucmVzZXQgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRpZiAodGhpcy5pc1J1bm5pbmcpIHtcclxuXHRcdFx0dGhpcy5zdG9wKG51bGwpO1xyXG5cdFx0fVxyXG5cdFx0dGhpcy50YXNrcyA9IHt9O1xyXG5cdFx0dGhpcy5zZXEgPSBbXTtcclxuXHRcdHRoaXMuaXNSdW5uaW5nID0gZmFsc2U7XHJcblx0XHR0aGlzLmRvbmVDYWxsYmFjayA9IHVuZGVmaW5lZDtcclxuXHRcdHJldHVybiB0aGlzO1xyXG5cdH07XHJcblx0T3JjaGVzdHJhdG9yLnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbiAobmFtZSwgZGVwLCBmbikge1xyXG5cdFx0aWYgKCFmbiAmJiB0eXBlb2YgZGVwID09PSAnZnVuY3Rpb24nKSB7XHJcblx0XHRcdGZuID0gZGVwO1xyXG5cdFx0XHRkZXAgPSB1bmRlZmluZWQ7XHJcblx0XHR9XHJcblx0XHRkZXAgPSBkZXAgfHwgW107XHJcblx0XHRmbiA9IGZuIHx8IGZ1bmN0aW9uICgpIHt9OyAvLyBuby1vcFxyXG5cdFx0aWYgKCFuYW1lKSB7XHJcblx0XHRcdHRocm93IG5ldyBFcnJvcignVGFzayByZXF1aXJlcyBhIG5hbWUnKTtcclxuXHRcdH1cclxuXHRcdC8vIHZhbGlkYXRlIG5hbWUgaXMgYSBzdHJpbmcsIGRlcCBpcyBhbiBhcnJheSBvZiBzdHJpbmdzLCBhbmQgZm4gaXMgYSBmdW5jdGlvblxyXG5cdFx0aWYgKHR5cGVvZiBuYW1lICE9PSAnc3RyaW5nJykge1xyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ1Rhc2sgcmVxdWlyZXMgYSBuYW1lIHRoYXQgaXMgYSBzdHJpbmcnKTtcclxuXHRcdH1cclxuXHRcdGlmICh0eXBlb2YgZm4gIT09ICdmdW5jdGlvbicpIHtcclxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdUYXNrICcrbmFtZSsnIHJlcXVpcmVzIGEgZnVuY3Rpb24gdGhhdCBpcyBhIGZ1bmN0aW9uJyk7XHJcblx0XHR9XHJcblx0XHRpZiAoIUFycmF5LmlzQXJyYXkoZGVwKSkge1xyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ1Rhc2sgJytuYW1lKycgY2FuXFwndCBzdXBwb3J0IGRlcGVuZGVuY2llcyB0aGF0IGlzIG5vdCBhbiBhcnJheSBvZiBzdHJpbmdzJyk7XHJcblx0XHR9XHJcblx0XHRkZXAuZm9yRWFjaChmdW5jdGlvbiAoaXRlbSkge1xyXG5cdFx0XHRpZiAodHlwZW9mIGl0ZW0gIT09ICdzdHJpbmcnKSB7XHJcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKCdUYXNrICcrbmFtZSsnIGRlcGVuZGVuY3kgJytpdGVtKycgaXMgbm90IGEgc3RyaW5nJyk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cdFx0dGhpcy50YXNrc1tuYW1lXSA9IHtcclxuXHRcdFx0Zm46IGZuLFxyXG5cdFx0XHRkZXA6IGRlcCxcclxuXHRcdFx0bmFtZTogbmFtZVxyXG5cdFx0fTtcclxuXHRcdHJldHVybiB0aGlzO1xyXG5cdH07XHJcblx0T3JjaGVzdHJhdG9yLnByb3RvdHlwZS50YXNrID0gZnVuY3Rpb24gKG5hbWUsIGRlcCwgZm4pIHtcclxuXHRcdGlmIChkZXAgfHwgZm4pIHtcclxuXHRcdFx0Ly8gYWxpYXMgZm9yIGFkZCwgcmV0dXJuIG5vdGhpbmcgcmF0aGVyIHRoYW4gdGhpc1xyXG5cdFx0XHR0aGlzLmFkZChuYW1lLCBkZXAsIGZuKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHJldHVybiB0aGlzLnRhc2tzW25hbWVdO1xyXG5cdFx0fVxyXG5cdH07XHJcblx0T3JjaGVzdHJhdG9yLnByb3RvdHlwZS5oYXNUYXNrID0gZnVuY3Rpb24gKG5hbWUpIHtcclxuXHRcdHJldHVybiAhIXRoaXMudGFza3NbbmFtZV07XHJcblx0fTtcclxuXHQvLyB0YXNrcyBhbmQgb3B0aW9uYWxseSBhIGNhbGxiYWNrXHJcblx0T3JjaGVzdHJhdG9yLnByb3RvdHlwZS5zdGFydCA9IGZ1bmN0aW9uKCkge1xyXG5cdFx0dmFyIGFyZ3MsIGFyZywgbmFtZXMgPSBbXSwgbGFzdFRhc2ssIGksIHNlcSA9IFtdO1xyXG5cdFx0YXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCk7XHJcblx0XHRpZiAoYXJncy5sZW5ndGgpIHtcclxuXHRcdFx0bGFzdFRhc2sgPSBhcmdzW2FyZ3MubGVuZ3RoLTFdO1xyXG5cdFx0XHRpZiAodHlwZW9mIGxhc3RUYXNrID09PSAnZnVuY3Rpb24nKSB7XHJcblx0XHRcdFx0dGhpcy5kb25lQ2FsbGJhY2sgPSBsYXN0VGFzaztcclxuXHRcdFx0XHRhcmdzLnBvcCgpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGZvciAoaSA9IDA7IGkgPCBhcmdzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0YXJnID0gYXJnc1tpXTtcclxuXHRcdFx0XHRpZiAodHlwZW9mIGFyZyA9PT0gJ3N0cmluZycpIHtcclxuXHRcdFx0XHRcdG5hbWVzLnB1c2goYXJnKTtcclxuXHRcdFx0XHR9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkoYXJnKSkge1xyXG5cdFx0XHRcdFx0bmFtZXMgPSBuYW1lcy5jb25jYXQoYXJnKTsgLy8gRlJBR0lMRTogQVNTVU1FOiBpdCdzIGFuIGFycmF5IG9mIHN0cmluZ3NcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKCdwYXNzIHN0cmluZ3Mgb3IgYXJyYXlzIG9mIHN0cmluZ3MnKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdGlmICh0aGlzLmlzUnVubmluZykge1xyXG5cdFx0XHQvLyByZXNldCBzcGVjaWZpZWQgdGFza3MgKGFuZCBkZXBlbmRlbmNpZXMpIGFzIG5vdCBydW5cclxuXHRcdFx0dGhpcy5fcmVzZXRTcGVjaWZpY1Rhc2tzKG5hbWVzKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdC8vIHJlc2V0IGFsbCB0YXNrcyBhcyBub3QgcnVuXHJcblx0XHRcdHRoaXMuX3Jlc2V0QWxsVGFza3MoKTtcclxuXHRcdH1cclxuXHRcdGlmICh0aGlzLmlzUnVubmluZykge1xyXG5cdFx0XHQvLyBpZiB5b3UgY2FsbCBzdGFydCgpIGFnYWluIHdoaWxlIGEgcHJldmlvdXMgcnVuIGlzIHN0aWxsIGluIHBsYXlcclxuXHRcdFx0Ly8gcHJlcGVuZCB0aGUgbmV3IHRhc2tzIHRvIHRoZSBleGlzdGluZyB0YXNrIHF1ZXVlXHJcblx0XHRcdG5hbWVzID0gbmFtZXMuY29uY2F0KHRoaXMuc2VxKTtcclxuXHRcdH1cclxuXHRcdGlmIChuYW1lcy5sZW5ndGggPCAxKSB7XHJcblx0XHRcdC8vIHJ1biBhbGwgdGFza3NcclxuXHRcdFx0Zm9yIChpIGluIHRoaXMudGFza3MpIHtcclxuXHRcdFx0XHRpZiAodGhpcy50YXNrcy5oYXNPd25Qcm9wZXJ0eShpKSkge1xyXG5cdFx0XHRcdFx0bmFtZXMucHVzaCh0aGlzLnRhc2tzW2ldLm5hbWUpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0c2VxID0gW107XHJcblx0XHR0cnkge1xyXG5cdFx0XHR0aGlzLnNlcXVlbmNlKHRoaXMudGFza3MsIG5hbWVzLCBzZXEsIFtdKTtcclxuXHRcdH0gY2F0Y2ggKGVycikge1xyXG5cdFx0XHQvLyBJcyB0aGlzIGEga25vd24gZXJyb3I/XHJcblx0XHRcdGlmIChlcnIpIHtcclxuXHRcdFx0XHRpZiAoZXJyLm1pc3NpbmdUYXNrKSB7XHJcblx0XHRcdFx0XHR0aGlzLmVtaXQoJ3Rhc2tfbm90X2ZvdW5kJywge21lc3NhZ2U6IGVyci5tZXNzYWdlLCB0YXNrOmVyci5taXNzaW5nVGFzaywgZXJyOiBlcnJ9KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0aWYgKGVyci5yZWN1cnNpdmVUYXNrcykge1xyXG5cdFx0XHRcdFx0dGhpcy5lbWl0KCd0YXNrX3JlY3Vyc2lvbicsIHttZXNzYWdlOiBlcnIubWVzc2FnZSwgcmVjdXJzaXZlVGFza3M6ZXJyLnJlY3Vyc2l2ZVRhc2tzLCBlcnI6IGVycn0pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHR0aGlzLnN0b3AoZXJyKTtcclxuXHRcdFx0cmV0dXJuIHRoaXM7XHJcblx0XHR9XHJcblx0XHR0aGlzLnNlcSA9IHNlcTtcclxuXHRcdHRoaXMuZW1pdCgnc3RhcnQnLCB7bWVzc2FnZTonc2VxOiAnK3RoaXMuc2VxLmpvaW4oJywnKX0pO1xyXG5cdFx0aWYgKCF0aGlzLmlzUnVubmluZykge1xyXG5cdFx0XHR0aGlzLmlzUnVubmluZyA9IHRydWU7XHJcblx0XHR9XHJcblx0XHR0aGlzLl9ydW5TdGVwKCk7XHJcblx0XHRyZXR1cm4gdGhpcztcclxuXHR9O1xyXG5cdE9yY2hlc3RyYXRvci5wcm90b3R5cGUuc3RvcCA9IGZ1bmN0aW9uIChlcnIsIHN1Y2Nlc3NmdWxGaW5pc2gpIHtcclxuXHRcdHRoaXMuaXNSdW5uaW5nID0gZmFsc2U7XHJcblx0XHRpZiAoZXJyKSB7XHJcblx0XHRcdHRoaXMuZW1pdCgnZXJyJywge21lc3NhZ2U6J29yY2hlc3RyYXRpb24gZmFpbGVkJywgZXJyOmVycn0pO1xyXG5cdFx0fSBlbHNlIGlmIChzdWNjZXNzZnVsRmluaXNoKSB7XHJcblx0XHRcdHRoaXMuZW1pdCgnc3RvcCcsIHttZXNzYWdlOidvcmNoZXN0cmF0aW9uIHN1Y2NlZWRlZCd9KTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdC8vIEFTU1VNRVxyXG5cdFx0XHRlcnIgPSAnb3JjaGVzdHJhdGlvbiBhYm9ydGVkJztcclxuXHRcdFx0dGhpcy5lbWl0KCdlcnInLCB7bWVzc2FnZTonb3JjaGVzdHJhdGlvbiBhYm9ydGVkJywgZXJyOiBlcnJ9KTtcclxuXHRcdH1cclxuXHRcdGlmICh0aGlzLmRvbmVDYWxsYmFjaykge1xyXG5cdFx0XHQvLyBBdm9pZCBjYWxsaW5nIGl0IG11bHRpcGxlIHRpbWVzXHJcblx0XHRcdHRoaXMuZG9uZUNhbGxiYWNrKGVycik7XHJcblx0XHR9IGVsc2UgaWYgKGVyciAmJiAhdGhpcy5saXN0ZW5lcnMoJ2VycicpLmxlbmd0aCkge1xyXG5cdFx0XHQvLyBObyBvbmUgaXMgbGlzdGVuaW5nIGZvciB0aGUgZXJyb3Igc28gc3BlYWsgbG91ZGVyXHJcblx0XHRcdHRocm93IGVycjtcclxuXHRcdH1cclxuXHR9O1xyXG5cdE9yY2hlc3RyYXRvci5wcm90b3R5cGUuc2VxdWVuY2UgPSByZXF1aXJlKCdzZXF1ZW5jaWZ5Jyk7XHJcblx0T3JjaGVzdHJhdG9yLnByb3RvdHlwZS5hbGxEb25lID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0dmFyIGksIHRhc2ssIGFsbERvbmUgPSB0cnVlOyAvLyBub3RoaW5nIGRpc3B1dGVkIGl0IHlldFxyXG5cdFx0Zm9yIChpID0gMDsgaSA8IHRoaXMuc2VxLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdHRhc2sgPSB0aGlzLnRhc2tzW3RoaXMuc2VxW2ldXTtcclxuXHRcdFx0aWYgKCF0YXNrLmRvbmUpIHtcclxuXHRcdFx0XHRhbGxEb25lID0gZmFsc2U7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdHJldHVybiBhbGxEb25lO1xyXG5cdH07XHJcblx0T3JjaGVzdHJhdG9yLnByb3RvdHlwZS5fcmVzZXRUYXNrID0gZnVuY3Rpb24odGFzaykge1xyXG5cdFx0aWYgKHRhc2spIHtcclxuXHRcdFx0aWYgKHRhc2suZG9uZSkge1xyXG5cdFx0XHRcdHRhc2suZG9uZSA9IGZhbHNlO1xyXG5cdFx0XHR9XHJcblx0XHRcdGRlbGV0ZSB0YXNrLnN0YXJ0O1xyXG5cdFx0XHRkZWxldGUgdGFzay5zdG9wO1xyXG5cdFx0XHRkZWxldGUgdGFzay5kdXJhdGlvbjtcclxuXHRcdFx0ZGVsZXRlIHRhc2suaHJEdXJhdGlvbjtcclxuXHRcdFx0ZGVsZXRlIHRhc2suYXJncztcclxuXHRcdH1cclxuXHR9O1xyXG5cdE9yY2hlc3RyYXRvci5wcm90b3R5cGUuX3Jlc2V0QWxsVGFza3MgPSBmdW5jdGlvbigpIHtcclxuXHRcdHZhciB0YXNrO1xyXG5cdFx0Zm9yICh0YXNrIGluIHRoaXMudGFza3MpIHtcclxuXHRcdFx0aWYgKHRoaXMudGFza3MuaGFzT3duUHJvcGVydHkodGFzaykpIHtcclxuXHRcdFx0XHR0aGlzLl9yZXNldFRhc2sodGhpcy50YXNrc1t0YXNrXSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9O1xyXG5cdE9yY2hlc3RyYXRvci5wcm90b3R5cGUuX3Jlc2V0U3BlY2lmaWNUYXNrcyA9IGZ1bmN0aW9uIChuYW1lcykge1xyXG5cdFx0dmFyIGksIG5hbWUsIHQ7XHJcblxyXG5cdFx0aWYgKG5hbWVzICYmIG5hbWVzLmxlbmd0aCkge1xyXG5cdFx0XHRmb3IgKGkgPSAwOyBpIDwgbmFtZXMubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0XHRuYW1lID0gbmFtZXNbaV07XHJcblx0XHRcdFx0dCA9IHRoaXMudGFza3NbbmFtZV07XHJcblx0XHRcdFx0aWYgKHQpIHtcclxuXHRcdFx0XHRcdHRoaXMuX3Jlc2V0VGFzayh0KTtcclxuXHRcdFx0XHRcdGlmICh0LmRlcCAmJiB0LmRlcC5sZW5ndGgpIHtcclxuXHRcdFx0XHRcdFx0dGhpcy5fcmVzZXRTcGVjaWZpY1Rhc2tzKHQuZGVwKTsgLy8gcmVjdXJzZVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdC8vfSBlbHNlIHtcclxuXHRcdFx0XHRcdC8vIEZSQUdJTEU6IGlnbm9yZSB0aGF0IHRoZSB0YXNrIGRvZXNuJ3QgZXhpc3RcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9O1xyXG5cdE9yY2hlc3RyYXRvci5wcm90b3R5cGUuX3J1blN0ZXAgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHR2YXIgaSwgdGFzaztcclxuXHRcdGlmICghdGhpcy5pc1J1bm5pbmcpIHtcclxuXHRcdFx0cmV0dXJuOyAvLyB1c2VyIGFib3J0ZWQsIEFTU1VNRTogc3RvcCBjYWxsZWQgcHJldmlvdXNseVxyXG5cdFx0fVxyXG5cdFx0Zm9yIChpID0gMDsgaSA8IHRoaXMuc2VxLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdHRhc2sgPSB0aGlzLnRhc2tzW3RoaXMuc2VxW2ldXTtcclxuXHRcdFx0aWYgKCF0YXNrLmRvbmUgJiYgIXRhc2sucnVubmluZyAmJiB0aGlzLl9yZWFkeVRvUnVuVGFzayh0YXNrKSkge1xyXG5cdFx0XHRcdHRoaXMuX3J1blRhc2sodGFzayk7XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKCF0aGlzLmlzUnVubmluZykge1xyXG5cdFx0XHRcdHJldHVybjsgLy8gdGFzayBmYWlsZWQgb3IgdXNlciBhYm9ydGVkLCBBU1NVTUU6IHN0b3AgY2FsbGVkIHByZXZpb3VzbHlcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0aWYgKHRoaXMuYWxsRG9uZSgpKSB7XHJcblx0XHRcdHRoaXMuc3RvcChudWxsLCB0cnVlKTtcclxuXHRcdH1cclxuXHR9O1xyXG5cdE9yY2hlc3RyYXRvci5wcm90b3R5cGUuX3JlYWR5VG9SdW5UYXNrID0gZnVuY3Rpb24gKHRhc2spIHtcclxuXHRcdHZhciByZWFkeSA9IHRydWUsIC8vIG5vIG9uZSBkaXNwcm92ZWQgaXQgeWV0XHJcblx0XHRcdGksIG5hbWUsIHQ7XHJcblx0XHRpZiAodGFzay5kZXAubGVuZ3RoKSB7XHJcblx0XHRcdGZvciAoaSA9IDA7IGkgPCB0YXNrLmRlcC5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdG5hbWUgPSB0YXNrLmRlcFtpXTtcclxuXHRcdFx0XHR0ID0gdGhpcy50YXNrc1tuYW1lXTtcclxuXHRcdFx0XHRpZiAoIXQpIHtcclxuXHRcdFx0XHRcdC8vIEZSQUdJTEU6IHRoaXMgc2hvdWxkIG5ldmVyIGhhcHBlblxyXG5cdFx0XHRcdFx0dGhpcy5zdG9wKFwiY2FuJ3QgcnVuIFwiK3Rhc2submFtZStcIiBiZWNhdXNlIGl0IGRlcGVuZHMgb24gXCIrbmFtZStcIiB3aGljaCBkb2Vzbid0IGV4aXN0XCIpO1xyXG5cdFx0XHRcdFx0cmVhZHkgPSBmYWxzZTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRpZiAoIXQuZG9uZSkge1xyXG5cdFx0XHRcdFx0cmVhZHkgPSBmYWxzZTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHJlYWR5O1xyXG5cdH07XHJcblx0T3JjaGVzdHJhdG9yLnByb3RvdHlwZS5fc3RvcFRhc2sgPSBmdW5jdGlvbiAodGFzaywgbWV0YSkge1xyXG5cdFx0dGFzay5kdXJhdGlvbiA9IG1ldGEuZHVyYXRpb247XHJcblx0XHR0YXNrLmhyRHVyYXRpb24gPSBtZXRhLmhyRHVyYXRpb247XHJcblx0XHR0YXNrLnJ1bm5pbmcgPSBmYWxzZTtcclxuXHRcdHRhc2suZG9uZSA9IHRydWU7XHJcblx0fTtcclxuXHRPcmNoZXN0cmF0b3IucHJvdG90eXBlLl9lbWl0VGFza0RvbmUgPSBmdW5jdGlvbiAodGFzaywgbWVzc2FnZSwgZXJyKSB7XHJcblx0XHRpZiAoIXRhc2suYXJncykge1xyXG5cdFx0XHR0YXNrLmFyZ3MgPSB7dGFzazp0YXNrLm5hbWV9O1xyXG5cdFx0fVxyXG5cdFx0dGFzay5hcmdzLmR1cmF0aW9uID0gdGFzay5kdXJhdGlvbjtcclxuXHRcdHRhc2suYXJncy5ockR1cmF0aW9uID0gdGFzay5ockR1cmF0aW9uO1xyXG5cdFx0dGFzay5hcmdzLm1lc3NhZ2UgPSB0YXNrLm5hbWUrJyAnK21lc3NhZ2U7XHJcblx0XHR2YXIgZXZ0ID0gJ3N0b3AnO1xyXG5cdFx0aWYgKGVycikge1xyXG5cdFx0XHR0YXNrLmFyZ3MuZXJyID0gZXJyO1xyXG5cdFx0XHRldnQgPSAnZXJyJztcclxuXHRcdH1cclxuXHRcdC8vICd0YXNrX3N0b3AnIG9yICd0YXNrX2VycidcclxuXHRcdHRoaXMuZW1pdCgndGFza18nK2V2dCwgdGFzay5hcmdzKTtcclxuXHR9O1xyXG5cdE9yY2hlc3RyYXRvci5wcm90b3R5cGUuX3J1blRhc2sgPSBmdW5jdGlvbiAodGFzaykge1xyXG5cdFx0dmFyIHRoYXQgPSB0aGlzO1xyXG5cclxuXHRcdHRhc2suYXJncyA9IHt0YXNrOnRhc2submFtZSwgbWVzc2FnZTp0YXNrLm5hbWUrJyBzdGFydGVkJ307XHJcblx0XHR0aGlzLmVtaXQoJ3Rhc2tfc3RhcnQnLCB0YXNrLmFyZ3MpO1xyXG5cdFx0dGFzay5ydW5uaW5nID0gdHJ1ZTtcclxuXHJcblx0XHRydW5UYXNrKHRhc2suZm4uYmluZCh0aGlzKSwgZnVuY3Rpb24gKGVyciwgbWV0YSkge1xyXG5cdFx0XHR0aGF0Ll9zdG9wVGFzay5jYWxsKHRoYXQsIHRhc2ssIG1ldGEpO1xyXG5cdFx0XHR0aGF0Ll9lbWl0VGFza0RvbmUuY2FsbCh0aGF0LCB0YXNrLCBtZXRhLnJ1bk1ldGhvZCwgZXJyKTtcclxuXHRcdFx0aWYgKGVycikge1xyXG5cdFx0XHRcdHJldHVybiB0aGF0LnN0b3AuY2FsbCh0aGF0LCBlcnIpO1xyXG5cdFx0XHR9XHJcblx0XHRcdHRoYXQuX3J1blN0ZXAuY2FsbCh0aGF0KTtcclxuXHRcdH0pO1xyXG5cdH07XHJcblxyXG4vLyBGUkFHSUxFOiBBU1NVTUU6IHRoaXMgbGlzdCBpcyBhbiBleGhhdXN0aXZlIGxpc3Qgb2YgZXZlbnRzIGVtaXR0ZWRcclxudmFyIGV2ZW50cyA9IFsnc3RhcnQnLCdzdG9wJywnZXJyJywndGFza19zdGFydCcsJ3Rhc2tfc3RvcCcsJ3Rhc2tfZXJyJywndGFza19ub3RfZm91bmQnLCd0YXNrX3JlY3Vyc2lvbiddO1xyXG5cclxudmFyIGxpc3RlblRvRXZlbnQgPSBmdW5jdGlvbiAodGFyZ2V0LCBldmVudCwgY2FsbGJhY2spIHtcclxuXHR0YXJnZXQub24oZXZlbnQsIGZ1bmN0aW9uIChlKSB7XHJcblx0XHRlLnNyYyA9IGV2ZW50O1xyXG5cdFx0Y2FsbGJhY2soZSk7XHJcblx0fSk7XHJcbn07XHJcblxyXG5cdE9yY2hlc3RyYXRvci5wcm90b3R5cGUub25BbGwgPSBmdW5jdGlvbiAoY2FsbGJhY2spIHtcclxuXHRcdHZhciBpO1xyXG5cdFx0aWYgKHR5cGVvZiBjYWxsYmFjayAhPT0gJ2Z1bmN0aW9uJykge1xyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ05vIGNhbGxiYWNrIHNwZWNpZmllZCcpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGZvciAoaSA9IDA7IGkgPCBldmVudHMubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0bGlzdGVuVG9FdmVudCh0aGlzLCBldmVudHNbaV0sIGNhbGxiYWNrKTtcclxuXHRcdH1cclxuXHR9O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBPcmNoZXN0cmF0b3I7XHJcbiIsIi8qanNoaW50IG5vZGU6dHJ1ZSAqL1xyXG5cclxuXCJ1c2Ugc3RyaWN0XCI7XHJcblxyXG52YXIgZW9zID0gcmVxdWlyZSgnZW5kLW9mLXN0cmVhbScpO1xyXG52YXIgY29uc3VtZSA9IHJlcXVpcmUoJ3N0cmVhbS1jb25zdW1lJyk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICh0YXNrLCBkb25lKSB7XHJcblx0dmFyIHRoYXQgPSB0aGlzLCBmaW5pc2gsIGNiLCBpc0RvbmUgPSBmYWxzZSwgc3RhcnQsIHI7XHJcblxyXG5cdGZpbmlzaCA9IGZ1bmN0aW9uIChlcnIsIHJ1bk1ldGhvZCkge1xyXG5cdFx0dmFyIGhyRHVyYXRpb24gPSBwcm9jZXNzLmhydGltZShzdGFydCk7XHJcblxyXG5cdFx0aWYgKGlzRG9uZSAmJiAhZXJyKSB7XHJcblx0XHRcdGVyciA9IG5ldyBFcnJvcigndGFzayBjb21wbGV0aW9uIGNhbGxiYWNrIGNhbGxlZCB0b28gbWFueSB0aW1lcycpO1xyXG5cdFx0fVxyXG5cdFx0aXNEb25lID0gdHJ1ZTtcclxuXHJcblx0XHR2YXIgZHVyYXRpb24gPSBockR1cmF0aW9uWzBdICsgKGhyRHVyYXRpb25bMV0gLyAxZTkpOyAvLyBzZWNvbmRzXHJcblxyXG5cdFx0ZG9uZS5jYWxsKHRoYXQsIGVyciwge1xyXG5cdFx0XHRkdXJhdGlvbjogZHVyYXRpb24sIC8vIHNlY29uZHNcclxuXHRcdFx0aHJEdXJhdGlvbjogaHJEdXJhdGlvbiwgLy8gW3NlY29uZHMsbmFub3NlY29uZHNdXHJcblx0XHRcdHJ1bk1ldGhvZDogcnVuTWV0aG9kXHJcblx0XHR9KTtcclxuXHR9O1xyXG5cclxuXHRjYiA9IGZ1bmN0aW9uIChlcnIpIHtcclxuXHRcdGZpbmlzaChlcnIsICdjYWxsYmFjaycpO1xyXG5cdH07XHJcblxyXG5cdHRyeSB7XHJcblx0XHRzdGFydCA9IHByb2Nlc3MuaHJ0aW1lKCk7XHJcblx0XHRyID0gdGFzayhjYik7XHJcblx0fSBjYXRjaCAoZXJyKSB7XHJcblx0XHRyZXR1cm4gZmluaXNoKGVyciwgJ2NhdGNoJyk7XHJcblx0fVxyXG5cclxuXHRpZiAociAmJiB0eXBlb2Ygci50aGVuID09PSAnZnVuY3Rpb24nKSB7XHJcblx0XHQvLyB3YWl0IGZvciBwcm9taXNlIHRvIHJlc29sdmVcclxuXHRcdC8vIEZSQUdJTEU6IEFTU1VNRTogUHJvbWlzZXMvQSssIHNlZSBodHRwOi8vcHJvbWlzZXMtYXBsdXMuZ2l0aHViLmlvL3Byb21pc2VzLXNwZWMvXHJcblx0XHRyLnRoZW4oZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRmaW5pc2gobnVsbCwgJ3Byb21pc2UnKTtcclxuXHRcdH0sIGZ1bmN0aW9uKGVycikge1xyXG5cdFx0XHRmaW5pc2goZXJyLCAncHJvbWlzZScpO1xyXG5cdFx0fSk7XHJcblxyXG5cdH0gZWxzZSBpZiAociAmJiB0eXBlb2Ygci5waXBlID09PSAnZnVuY3Rpb24nKSB7XHJcblx0XHQvLyB3YWl0IGZvciBzdHJlYW0gdG8gZW5kXHJcblxyXG5cdFx0ZW9zKHIsIHsgZXJyb3I6IHRydWUsIHJlYWRhYmxlOiByLnJlYWRhYmxlLCB3cml0YWJsZTogci53cml0YWJsZSAmJiAhci5yZWFkYWJsZSB9LCBmdW5jdGlvbihlcnIpe1xyXG5cdFx0XHRmaW5pc2goZXJyLCAnc3RyZWFtJyk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBFbnN1cmUgdGhhdCB0aGUgc3RyZWFtIGNvbXBsZXRlc1xyXG4gICAgICAgIGNvbnN1bWUocik7XHJcblxyXG5cdH0gZWxzZSBpZiAodGFzay5sZW5ndGggPT09IDApIHtcclxuXHRcdC8vIHN5bmNocm9ub3VzLCBmdW5jdGlvbiB0b29rIGluIGFyZ3MubGVuZ3RoIHBhcmFtZXRlcnMsIGFuZCB0aGUgY2FsbGJhY2sgd2FzIGV4dHJhXHJcblx0XHRmaW5pc2gobnVsbCwgJ3N5bmMnKTtcclxuXHJcblx0Ly99IGVsc2Uge1xyXG5cdFx0Ly8gRlJBR0lMRTogQVNTVU1FOiBjYWxsYmFja1xyXG5cclxuXHR9XHJcbn07XHJcbiIsInZhciBvbmNlID0gcmVxdWlyZSgnb25jZScpO1xuXG52YXIgbm9vcCA9IGZ1bmN0aW9uKCkge307XG5cbnZhciBpc1JlcXVlc3QgPSBmdW5jdGlvbihzdHJlYW0pIHtcblx0cmV0dXJuIHN0cmVhbS5zZXRIZWFkZXIgJiYgdHlwZW9mIHN0cmVhbS5hYm9ydCA9PT0gJ2Z1bmN0aW9uJztcbn07XG5cbnZhciBlb3MgPSBmdW5jdGlvbihzdHJlYW0sIG9wdHMsIGNhbGxiYWNrKSB7XG5cdGlmICh0eXBlb2Ygb3B0cyA9PT0gJ2Z1bmN0aW9uJykgcmV0dXJuIGVvcyhzdHJlYW0sIG51bGwsIG9wdHMpO1xuXHRpZiAoIW9wdHMpIG9wdHMgPSB7fTtcblxuXHRjYWxsYmFjayA9IG9uY2UoY2FsbGJhY2sgfHwgbm9vcCk7XG5cblx0dmFyIHdzID0gc3RyZWFtLl93cml0YWJsZVN0YXRlO1xuXHR2YXIgcnMgPSBzdHJlYW0uX3JlYWRhYmxlU3RhdGU7XG5cdHZhciByZWFkYWJsZSA9IG9wdHMucmVhZGFibGUgfHwgKG9wdHMucmVhZGFibGUgIT09IGZhbHNlICYmIHN0cmVhbS5yZWFkYWJsZSk7XG5cdHZhciB3cml0YWJsZSA9IG9wdHMud3JpdGFibGUgfHwgKG9wdHMud3JpdGFibGUgIT09IGZhbHNlICYmIHN0cmVhbS53cml0YWJsZSk7XG5cblx0dmFyIG9ubGVnYWN5ZmluaXNoID0gZnVuY3Rpb24oKSB7XG5cdFx0aWYgKCFzdHJlYW0ud3JpdGFibGUpIG9uZmluaXNoKCk7XG5cdH07XG5cblx0dmFyIG9uZmluaXNoID0gZnVuY3Rpb24oKSB7XG5cdFx0d3JpdGFibGUgPSBmYWxzZTtcblx0XHRpZiAoIXJlYWRhYmxlKSBjYWxsYmFjaygpO1xuXHR9O1xuXG5cdHZhciBvbmVuZCA9IGZ1bmN0aW9uKCkge1xuXHRcdHJlYWRhYmxlID0gZmFsc2U7XG5cdFx0aWYgKCF3cml0YWJsZSkgY2FsbGJhY2soKTtcblx0fTtcblxuXHR2YXIgb25jbG9zZSA9IGZ1bmN0aW9uKCkge1xuXHRcdGlmIChyZWFkYWJsZSAmJiAhKHJzICYmIHJzLmVuZGVkKSkgcmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcigncHJlbWF0dXJlIGNsb3NlJykpO1xuXHRcdGlmICh3cml0YWJsZSAmJiAhKHdzICYmIHdzLmVuZGVkKSkgcmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcigncHJlbWF0dXJlIGNsb3NlJykpO1xuXHR9O1xuXG5cdHZhciBvbnJlcXVlc3QgPSBmdW5jdGlvbigpIHtcblx0XHRzdHJlYW0ucmVxLm9uKCdmaW5pc2gnLCBvbmZpbmlzaCk7XG5cdH07XG5cblx0aWYgKGlzUmVxdWVzdChzdHJlYW0pKSB7XG5cdFx0c3RyZWFtLm9uKCdjb21wbGV0ZScsIG9uZmluaXNoKTtcblx0XHRzdHJlYW0ub24oJ2Fib3J0Jywgb25jbG9zZSk7XG5cdFx0aWYgKHN0cmVhbS5yZXEpIG9ucmVxdWVzdCgpO1xuXHRcdGVsc2Ugc3RyZWFtLm9uKCdyZXF1ZXN0Jywgb25yZXF1ZXN0KTtcblx0fSBlbHNlIGlmICh3cml0YWJsZSAmJiAhd3MpIHsgLy8gbGVnYWN5IHN0cmVhbXNcblx0XHRzdHJlYW0ub24oJ2VuZCcsIG9ubGVnYWN5ZmluaXNoKTtcblx0XHRzdHJlYW0ub24oJ2Nsb3NlJywgb25sZWdhY3lmaW5pc2gpO1xuXHR9XG5cblx0c3RyZWFtLm9uKCdlbmQnLCBvbmVuZCk7XG5cdHN0cmVhbS5vbignZmluaXNoJywgb25maW5pc2gpO1xuXHRpZiAob3B0cy5lcnJvciAhPT0gZmFsc2UpIHN0cmVhbS5vbignZXJyb3InLCBjYWxsYmFjayk7XG5cdHN0cmVhbS5vbignY2xvc2UnLCBvbmNsb3NlKTtcblxuXHRyZXR1cm4gc3RyZWFtO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBlb3M7IiwiLyohXG4gKiBwYXJzZXVybFxuICogQ29weXJpZ2h0KGMpIDIwMTQgSm9uYXRoYW4gT25nXG4gKiBDb3B5cmlnaHQoYykgMjAxNCBEb3VnbGFzIENocmlzdG9waGVyIFdpbHNvblxuICogTUlUIExpY2Vuc2VkXG4gKi9cblxuJ3VzZSBzdHJpY3QnXG5cbi8qKlxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xuXG52YXIgdXJsID0gcmVxdWlyZSgndXJsJylcbnZhciBwYXJzZSA9IHVybC5wYXJzZVxudmFyIFVybCA9IHVybC5VcmxcblxuLyoqXG4gKiBQYXR0ZXJuIGZvciBhIHNpbXBsZSBwYXRoIGNhc2UuXG4gKiBTZWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9qb3llbnQvbm9kZS9wdWxsLzc4NzhcbiAqL1xuXG52YXIgc2ltcGxlUGF0aFJlZ0V4cCA9IC9eKFxcL1xcLz8oPyFcXC8pW15cXD8jXFxzXSopKFxcP1teI1xcc10qKT8kL1xuXG4vKipcbiAqIEV4cG9ydHMuXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBwYXJzZXVybFxubW9kdWxlLmV4cG9ydHMub3JpZ2luYWwgPSBvcmlnaW5hbHVybFxuXG4vKipcbiAqIFBhcnNlIHRoZSBgcmVxYCB1cmwgd2l0aCBtZW1vaXphdGlvbi5cbiAqXG4gKiBAcGFyYW0ge1NlcnZlclJlcXVlc3R9IHJlcVxuICogQHJldHVybiB7T2JqZWN0fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5mdW5jdGlvbiBwYXJzZXVybChyZXEpIHtcbiAgdmFyIHVybCA9IHJlcS51cmxcblxuICBpZiAodXJsID09PSB1bmRlZmluZWQpIHtcbiAgICAvLyBVUkwgaXMgdW5kZWZpbmVkXG4gICAgcmV0dXJuIHVuZGVmaW5lZFxuICB9XG5cbiAgdmFyIHBhcnNlZCA9IHJlcS5fcGFyc2VkVXJsXG5cbiAgaWYgKGZyZXNoKHVybCwgcGFyc2VkKSkge1xuICAgIC8vIFJldHVybiBjYWNoZWQgVVJMIHBhcnNlXG4gICAgcmV0dXJuIHBhcnNlZFxuICB9XG5cbiAgLy8gUGFyc2UgdGhlIFVSTFxuICBwYXJzZWQgPSBmYXN0cGFyc2UodXJsKVxuICBwYXJzZWQuX3JhdyA9IHVybFxuXG4gIHJldHVybiByZXEuX3BhcnNlZFVybCA9IHBhcnNlZFxufTtcblxuLyoqXG4gKiBQYXJzZSB0aGUgYHJlcWAgb3JpZ2luYWwgdXJsIHdpdGggZmFsbGJhY2sgYW5kIG1lbW9pemF0aW9uLlxuICpcbiAqIEBwYXJhbSB7U2VydmVyUmVxdWVzdH0gcmVxXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIG9yaWdpbmFsdXJsKHJlcSkge1xuICB2YXIgdXJsID0gcmVxLm9yaWdpbmFsVXJsXG5cbiAgaWYgKHR5cGVvZiB1cmwgIT09ICdzdHJpbmcnKSB7XG4gICAgLy8gRmFsbGJhY2tcbiAgICByZXR1cm4gcGFyc2V1cmwocmVxKVxuICB9XG5cbiAgdmFyIHBhcnNlZCA9IHJlcS5fcGFyc2VkT3JpZ2luYWxVcmxcblxuICBpZiAoZnJlc2godXJsLCBwYXJzZWQpKSB7XG4gICAgLy8gUmV0dXJuIGNhY2hlZCBVUkwgcGFyc2VcbiAgICByZXR1cm4gcGFyc2VkXG4gIH1cblxuICAvLyBQYXJzZSB0aGUgVVJMXG4gIHBhcnNlZCA9IGZhc3RwYXJzZSh1cmwpXG4gIHBhcnNlZC5fcmF3ID0gdXJsXG5cbiAgcmV0dXJuIHJlcS5fcGFyc2VkT3JpZ2luYWxVcmwgPSBwYXJzZWRcbn07XG5cbi8qKlxuICogUGFyc2UgdGhlIGBzdHJgIHVybCB3aXRoIGZhc3QtcGF0aCBzaG9ydC1jdXQuXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHN0clxuICogQHJldHVybiB7T2JqZWN0fVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gZmFzdHBhcnNlKHN0cikge1xuICAvLyBUcnkgZmFzdCBwYXRoIHJlZ2V4cFxuICAvLyBTZWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9qb3llbnQvbm9kZS9wdWxsLzc4NzhcbiAgdmFyIHNpbXBsZVBhdGggPSB0eXBlb2Ygc3RyID09PSAnc3RyaW5nJyAmJiBzaW1wbGVQYXRoUmVnRXhwLmV4ZWMoc3RyKVxuXG4gIC8vIENvbnN0cnVjdCBzaW1wbGUgVVJMXG4gIGlmIChzaW1wbGVQYXRoKSB7XG4gICAgdmFyIHBhdGhuYW1lID0gc2ltcGxlUGF0aFsxXVxuICAgIHZhciBzZWFyY2ggPSBzaW1wbGVQYXRoWzJdIHx8IG51bGxcbiAgICB2YXIgdXJsID0gVXJsICE9PSB1bmRlZmluZWRcbiAgICAgID8gbmV3IFVybCgpXG4gICAgICA6IHt9XG4gICAgdXJsLnBhdGggPSBzdHJcbiAgICB1cmwuaHJlZiA9IHN0clxuICAgIHVybC5wYXRobmFtZSA9IHBhdGhuYW1lXG4gICAgdXJsLnNlYXJjaCA9IHNlYXJjaFxuICAgIHVybC5xdWVyeSA9IHNlYXJjaCAmJiBzZWFyY2guc3Vic3RyKDEpXG5cbiAgICByZXR1cm4gdXJsXG4gIH1cblxuICByZXR1cm4gcGFyc2Uoc3RyKVxufVxuXG4vKipcbiAqIERldGVybWluZSBpZiBwYXJzZWQgaXMgc3RpbGwgZnJlc2ggZm9yIHVybC5cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gdXJsXG4gKiBAcGFyYW0ge29iamVjdH0gcGFyc2VkVXJsXG4gKiBAcmV0dXJuIHtib29sZWFufVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gZnJlc2godXJsLCBwYXJzZWRVcmwpIHtcbiAgcmV0dXJuIHR5cGVvZiBwYXJzZWRVcmwgPT09ICdvYmplY3QnXG4gICAgJiYgcGFyc2VkVXJsICE9PSBudWxsXG4gICAgJiYgKFVybCA9PT0gdW5kZWZpbmVkIHx8IHBhcnNlZFVybCBpbnN0YW5jZW9mIFVybClcbiAgICAmJiBwYXJzZWRVcmwuX3JhdyA9PT0gdXJsXG59XG4iLCIvKipcbiAqIEV4cG9zZSBgcGF0aHRvUmVnZXhwYC5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IHBhdGh0b1JlZ2V4cDtcblxuLyoqXG4gKiBNYXRjaCBtYXRjaGluZyBncm91cHMgaW4gYSByZWd1bGFyIGV4cHJlc3Npb24uXG4gKi9cbnZhciBNQVRDSElOR19HUk9VUF9SRUdFWFAgPSAvXFwoKD8hXFw/KS9nO1xuXG4vKipcbiAqIE5vcm1hbGl6ZSB0aGUgZ2l2ZW4gcGF0aCBzdHJpbmcsXG4gKiByZXR1cm5pbmcgYSByZWd1bGFyIGV4cHJlc3Npb24uXG4gKlxuICogQW4gZW1wdHkgYXJyYXkgc2hvdWxkIGJlIHBhc3NlZCxcbiAqIHdoaWNoIHdpbGwgY29udGFpbiB0aGUgcGxhY2Vob2xkZXJcbiAqIGtleSBuYW1lcy4gRm9yIGV4YW1wbGUgXCIvdXNlci86aWRcIiB3aWxsXG4gKiB0aGVuIGNvbnRhaW4gW1wiaWRcIl0uXG4gKlxuICogQHBhcmFtICB7U3RyaW5nfFJlZ0V4cHxBcnJheX0gcGF0aFxuICogQHBhcmFtICB7QXJyYXl9IGtleXNcbiAqIEBwYXJhbSAge09iamVjdH0gb3B0aW9uc1xuICogQHJldHVybiB7UmVnRXhwfVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gcGF0aHRvUmVnZXhwKHBhdGgsIGtleXMsIG9wdGlvbnMpIHtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIGtleXMgPSBrZXlzIHx8IFtdO1xuICB2YXIgc3RyaWN0ID0gb3B0aW9ucy5zdHJpY3Q7XG4gIHZhciBlbmQgPSBvcHRpb25zLmVuZCAhPT0gZmFsc2U7XG4gIHZhciBmbGFncyA9IG9wdGlvbnMuc2Vuc2l0aXZlID8gJycgOiAnaSc7XG4gIHZhciBleHRyYU9mZnNldCA9IDA7XG4gIHZhciBrZXlzT2Zmc2V0ID0ga2V5cy5sZW5ndGg7XG4gIHZhciBpID0gMDtcbiAgdmFyIG5hbWUgPSAwO1xuICB2YXIgbTtcblxuICBpZiAocGF0aCBpbnN0YW5jZW9mIFJlZ0V4cCkge1xuICAgIHdoaWxlIChtID0gTUFUQ0hJTkdfR1JPVVBfUkVHRVhQLmV4ZWMocGF0aC5zb3VyY2UpKSB7XG4gICAgICBrZXlzLnB1c2goe1xuICAgICAgICBuYW1lOiBuYW1lKyssXG4gICAgICAgIG9wdGlvbmFsOiBmYWxzZSxcbiAgICAgICAgb2Zmc2V0OiBtLmluZGV4XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gcGF0aDtcbiAgfVxuXG4gIGlmIChBcnJheS5pc0FycmF5KHBhdGgpKSB7XG4gICAgLy8gTWFwIGFycmF5IHBhcnRzIGludG8gcmVnZXhwcyBhbmQgcmV0dXJuIHRoZWlyIHNvdXJjZS4gV2UgYWxzbyBwYXNzXG4gICAgLy8gdGhlIHNhbWUga2V5cyBhbmQgb3B0aW9ucyBpbnN0YW5jZSBpbnRvIGV2ZXJ5IGdlbmVyYXRpb24gdG8gZ2V0XG4gICAgLy8gY29uc2lzdGVudCBtYXRjaGluZyBncm91cHMgYmVmb3JlIHdlIGpvaW4gdGhlIHNvdXJjZXMgdG9nZXRoZXIuXG4gICAgcGF0aCA9IHBhdGgubWFwKGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgcmV0dXJuIHBhdGh0b1JlZ2V4cCh2YWx1ZSwga2V5cywgb3B0aW9ucykuc291cmNlO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIG5ldyBSZWdFeHAoJyg/OicgKyBwYXRoLmpvaW4oJ3wnKSArICcpJywgZmxhZ3MpO1xuICB9XG5cbiAgcGF0aCA9ICgnXicgKyBwYXRoICsgKHN0cmljdCA/ICcnIDogcGF0aFtwYXRoLmxlbmd0aCAtIDFdID09PSAnLycgPyAnPycgOiAnLz8nKSlcbiAgICAucmVwbGFjZSgvXFwvXFwoL2csICcvKD86JylcbiAgICAucmVwbGFjZSgvKFtcXC9cXC5dKS9nLCAnXFxcXCQxJylcbiAgICAucmVwbGFjZSgvKFxcXFxcXC8pPyhcXFxcXFwuKT86KFxcdyspKFxcKC4qP1xcKSk/KFxcKik/KFxcPyk/L2csIGZ1bmN0aW9uIChtYXRjaCwgc2xhc2gsIGZvcm1hdCwga2V5LCBjYXB0dXJlLCBzdGFyLCBvcHRpb25hbCwgb2Zmc2V0KSB7XG4gICAgICBzbGFzaCA9IHNsYXNoIHx8ICcnO1xuICAgICAgZm9ybWF0ID0gZm9ybWF0IHx8ICcnO1xuICAgICAgY2FwdHVyZSA9IGNhcHR1cmUgfHwgJyhbXlxcXFwvJyArIGZvcm1hdCArICddKz8pJztcbiAgICAgIG9wdGlvbmFsID0gb3B0aW9uYWwgfHwgJyc7XG5cbiAgICAgIGtleXMucHVzaCh7XG4gICAgICAgIG5hbWU6IGtleSxcbiAgICAgICAgb3B0aW9uYWw6ICEhb3B0aW9uYWwsXG4gICAgICAgIG9mZnNldDogb2Zmc2V0ICsgZXh0cmFPZmZzZXRcbiAgICAgIH0pO1xuXG4gICAgICB2YXIgcmVzdWx0ID0gJydcbiAgICAgICAgKyAob3B0aW9uYWwgPyAnJyA6IHNsYXNoKVxuICAgICAgICArICcoPzonXG4gICAgICAgICsgZm9ybWF0ICsgKG9wdGlvbmFsID8gc2xhc2ggOiAnJykgKyBjYXB0dXJlXG4gICAgICAgICsgKHN0YXIgPyAnKCg/OltcXFxcLycgKyBmb3JtYXQgKyAnXS4rPyk/KScgOiAnJylcbiAgICAgICAgKyAnKSdcbiAgICAgICAgKyBvcHRpb25hbDtcblxuICAgICAgZXh0cmFPZmZzZXQgKz0gcmVzdWx0Lmxlbmd0aCAtIG1hdGNoLmxlbmd0aDtcblxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9KVxuICAgIC5yZXBsYWNlKC9cXCovZywgZnVuY3Rpb24gKHN0YXIsIGluZGV4KSB7XG4gICAgICB2YXIgbGVuID0ga2V5cy5sZW5ndGhcblxuICAgICAgd2hpbGUgKGxlbi0tID4ga2V5c09mZnNldCAmJiBrZXlzW2xlbl0ub2Zmc2V0ID4gaW5kZXgpIHtcbiAgICAgICAga2V5c1tsZW5dLm9mZnNldCArPSAzOyAvLyBSZXBsYWNlbWVudCBsZW5ndGggbWludXMgYXN0ZXJpc2sgbGVuZ3RoLlxuICAgICAgfVxuXG4gICAgICByZXR1cm4gJyguKiknO1xuICAgIH0pO1xuXG4gIC8vIFRoaXMgaXMgYSB3b3JrYXJvdW5kIGZvciBoYW5kbGluZyB1bm5hbWVkIG1hdGNoaW5nIGdyb3Vwcy5cbiAgd2hpbGUgKG0gPSBNQVRDSElOR19HUk9VUF9SRUdFWFAuZXhlYyhwYXRoKSkge1xuICAgIHZhciBlc2NhcGVDb3VudCA9IDA7XG4gICAgdmFyIGluZGV4ID0gbS5pbmRleDtcblxuICAgIHdoaWxlIChwYXRoLmNoYXJBdCgtLWluZGV4KSA9PT0gJ1xcXFwnKSB7XG4gICAgICBlc2NhcGVDb3VudCsrO1xuICAgIH1cblxuICAgIC8vIEl0J3MgcG9zc2libGUgdG8gZXNjYXBlIHRoZSBicmFja2V0LlxuICAgIGlmIChlc2NhcGVDb3VudCAlIDIgPT09IDEpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmIChrZXlzT2Zmc2V0ICsgaSA9PT0ga2V5cy5sZW5ndGggfHwga2V5c1trZXlzT2Zmc2V0ICsgaV0ub2Zmc2V0ID4gbS5pbmRleCkge1xuICAgICAga2V5cy5zcGxpY2Uoa2V5c09mZnNldCArIGksIDAsIHtcbiAgICAgICAgbmFtZTogbmFtZSsrLCAvLyBVbm5hbWVkIG1hdGNoaW5nIGdyb3VwcyBtdXN0IGJlIGNvbnNpc3RlbnRseSBsaW5lYXIuXG4gICAgICAgIG9wdGlvbmFsOiBmYWxzZSxcbiAgICAgICAgb2Zmc2V0OiBtLmluZGV4XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpKys7XG4gIH1cblxuICAvLyBJZiB0aGUgcGF0aCBpcyBub24tZW5kaW5nLCBtYXRjaCB1bnRpbCB0aGUgZW5kIG9yIGEgc2xhc2guXG4gIHBhdGggKz0gKGVuZCA/ICckJyA6IChwYXRoW3BhdGgubGVuZ3RoIC0gMV0gPT09ICcvJyA/ICcnIDogJyg/PVxcXFwvfCQpJykpO1xuXG4gIHJldHVybiBuZXcgUmVnRXhwKHBhdGgsIGZsYWdzKTtcbn07XG4iLCIvKmpzaGludCBub2RlOnRydWUgKi9cclxuXHJcblwidXNlIHN0cmljdFwiO1xyXG5cclxudmFyIHNlcXVlbmNlID0gZnVuY3Rpb24gKHRhc2tzLCBuYW1lcywgcmVzdWx0cywgbmVzdCkge1xyXG5cdHZhciBpLCBuYW1lLCBub2RlLCBlLCBqO1xyXG5cdG5lc3QgPSBuZXN0IHx8IFtdO1xyXG5cdGZvciAoaSA9IDA7IGkgPCBuYW1lcy5sZW5ndGg7IGkrKykge1xyXG5cdFx0bmFtZSA9IG5hbWVzW2ldO1xyXG5cdFx0Ly8gZGUtZHVwIHJlc3VsdHNcclxuXHRcdGlmIChyZXN1bHRzLmluZGV4T2YobmFtZSkgPT09IC0xKSB7XHJcblx0XHRcdG5vZGUgPSB0YXNrc1tuYW1lXTtcclxuXHRcdFx0aWYgKCFub2RlKSB7XHJcblx0XHRcdFx0ZSA9IG5ldyBFcnJvcigndGFzayBcIicrbmFtZSsnXCIgaXMgbm90IGRlZmluZWQnKTtcclxuXHRcdFx0XHRlLm1pc3NpbmdUYXNrID0gbmFtZTtcclxuXHRcdFx0XHRlLnRhc2tMaXN0ID0gW107XHJcblx0XHRcdFx0Zm9yIChqIGluIHRhc2tzKSB7XHJcblx0XHRcdFx0XHRpZiAodGFza3MuaGFzT3duUHJvcGVydHkoaikpIHtcclxuXHRcdFx0XHRcdFx0ZS50YXNrTGlzdC5wdXNoKHRhc2tzW2pdLm5hbWUpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHR0aHJvdyBlO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmIChuZXN0LmluZGV4T2YobmFtZSkgPiAtMSkge1xyXG5cdFx0XHRcdG5lc3QucHVzaChuYW1lKTtcclxuXHRcdFx0XHRlID0gbmV3IEVycm9yKCdSZWN1cnNpdmUgZGVwZW5kZW5jaWVzIGRldGVjdGVkOiAnK25lc3Quam9pbignIC0+ICcpKTtcclxuXHRcdFx0XHRlLnJlY3Vyc2l2ZVRhc2tzID0gbmVzdDtcclxuXHRcdFx0XHRlLnRhc2tMaXN0ID0gW107XHJcblx0XHRcdFx0Zm9yIChqIGluIHRhc2tzKSB7XHJcblx0XHRcdFx0XHRpZiAodGFza3MuaGFzT3duUHJvcGVydHkoaikpIHtcclxuXHRcdFx0XHRcdFx0ZS50YXNrTGlzdC5wdXNoKHRhc2tzW2pdLm5hbWUpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHR0aHJvdyBlO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmIChub2RlLmRlcC5sZW5ndGgpIHtcclxuXHRcdFx0XHRuZXN0LnB1c2gobmFtZSk7XHJcblx0XHRcdFx0c2VxdWVuY2UodGFza3MsIG5vZGUuZGVwLCByZXN1bHRzLCBuZXN0KTsgLy8gcmVjdXJzZVxyXG5cdFx0XHRcdG5lc3QucG9wKG5hbWUpO1xyXG5cdFx0XHR9XHJcblx0XHRcdHJlc3VsdHMucHVzaChuYW1lKTtcclxuXHRcdH1cclxuXHR9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHNlcXVlbmNlO1xyXG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHN0cmVhbSkge1xuICAgIGlmIChzdHJlYW0ucmVhZGFibGUgJiYgdHlwZW9mIHN0cmVhbS5yZXN1bWUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdmFyIHN0YXRlID0gc3RyZWFtLl9yZWFkYWJsZVN0YXRlO1xuICAgICAgICBpZiAoIXN0YXRlIHx8IHN0YXRlLnBpcGVzQ291bnQgPT09IDApIHtcbiAgICAgICAgICAgIC8vIEVpdGhlciBhIGNsYXNzaWMgc3RyZWFtIG9yIHN0cmVhbXMyIHRoYXQncyBub3QgcGlwZWQgdG8gYW5vdGhlciBkZXN0aW5hdGlvblxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBzdHJlYW0ucmVzdW1lKCk7XG4gICAgICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiR290IGVycm9yOiBcIiArIGVycik7XG4gICAgICAgICAgICAgICAgLy8gSWYgd2UgY2FuJ3QsIGl0J3Mgbm90IHdvcnRoIGR5aW5nIG92ZXJcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn07XG4iLCIvKipcbiAqIE1lcmdlIG9iamVjdCBiIHdpdGggb2JqZWN0IGEuXG4gKlxuICogICAgIHZhciBhID0geyBmb286ICdiYXInIH1cbiAqICAgICAgICwgYiA9IHsgYmFyOiAnYmF6JyB9O1xuICpcbiAqICAgICBtZXJnZShhLCBiKTtcbiAqICAgICAvLyA9PiB7IGZvbzogJ2JhcicsIGJhcjogJ2JheicgfVxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBhXG4gKiBAcGFyYW0ge09iamVjdH0gYlxuICogQHJldHVybiB7T2JqZWN0fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihhLCBiKXtcbiAgaWYgKGEgJiYgYikge1xuICAgIGZvciAodmFyIGtleSBpbiBiKSB7XG4gICAgICBhW2tleV0gPSBiW2tleV07XG4gICAgfVxuICB9XG4gIHJldHVybiBhO1xufTtcbiIsIi8vIFJldHVybnMgYSB3cmFwcGVyIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyBhIHdyYXBwZWQgY2FsbGJhY2tcbi8vIFRoZSB3cmFwcGVyIGZ1bmN0aW9uIHNob3VsZCBkbyBzb21lIHN0dWZmLCBhbmQgcmV0dXJuIGFcbi8vIHByZXN1bWFibHkgZGlmZmVyZW50IGNhbGxiYWNrIGZ1bmN0aW9uLlxuLy8gVGhpcyBtYWtlcyBzdXJlIHRoYXQgb3duIHByb3BlcnRpZXMgYXJlIHJldGFpbmVkLCBzbyB0aGF0XG4vLyBkZWNvcmF0aW9ucyBhbmQgc3VjaCBhcmUgbm90IGxvc3QgYWxvbmcgdGhlIHdheS5cbm1vZHVsZS5leHBvcnRzID0gd3JhcHB5XG5mdW5jdGlvbiB3cmFwcHkgKGZuLCBjYikge1xuICBpZiAoZm4gJiYgY2IpIHJldHVybiB3cmFwcHkoZm4pKGNiKVxuXG4gIGlmICh0eXBlb2YgZm4gIT09ICdmdW5jdGlvbicpXG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignbmVlZCB3cmFwcGVyIGZ1bmN0aW9uJylcblxuICBPYmplY3Qua2V5cyhmbikuZm9yRWFjaChmdW5jdGlvbiAoaykge1xuICAgIHdyYXBwZXJba10gPSBmbltrXVxuICB9KVxuXG4gIHJldHVybiB3cmFwcGVyXG5cbiAgZnVuY3Rpb24gd3JhcHBlcigpIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoKVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJncy5sZW5ndGg7IGkrKykge1xuICAgICAgYXJnc1tpXSA9IGFyZ3VtZW50c1tpXVxuICAgIH1cbiAgICB2YXIgcmV0ID0gZm4uYXBwbHkodGhpcywgYXJncylcbiAgICB2YXIgY2IgPSBhcmdzW2FyZ3MubGVuZ3RoLTFdXG4gICAgaWYgKHR5cGVvZiByZXQgPT09ICdmdW5jdGlvbicgJiYgcmV0ICE9PSBjYikge1xuICAgICAgT2JqZWN0LmtleXMoY2IpLmZvckVhY2goZnVuY3Rpb24gKGspIHtcbiAgICAgICAgcmV0W2tdID0gY2Jba11cbiAgICAgIH0pXG4gICAgfVxuICAgIHJldHVybiByZXRcbiAgfVxufVxuIl19
