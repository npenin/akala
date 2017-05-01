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
common_1.$$injector['load'] = load;
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
function load(...scripts) {
    var defer = new core_1.Deferred();
    var firstScriptTag = document.getElementsByTagName('script')[0]; // find the first script tag in the document
    core_1.eachAsync(scripts, function (script, i, next) {
        var scriptTag = document.createElement('script'); // create a script tag
        firstScriptTag.parentNode.insertBefore(scriptTag, firstScriptTag); // append the script to the DOM
        scriptTag.addEventListener('load', function (ev) {
            next();
        });
        scriptTag.src = script; // set the source of the script to your script
    }, function () {
        defer.resolve(null);
    });
    return defer;
}
exports.load = load;
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
$(document).on('click', '.tabs > ul > li', function () {
    $(this).siblings('.active').add($(this).closest('.tabs').find('.tab')).removeClass('active');
    $(this).add($(this).closest('.tabs').find($(this).find('a').attr('href'))).addClass('active');
    return false;
});

},{"./common":13,"./controls/controls":16,"./http":30,"./locationService":31,"./part":32,"./router":33,"./scope":34,"./template":35,"@akala/core":43}],13:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@akala/core");
exports.isPromiseLike = core_1.isPromiseLike;
exports.PromiseStatus = core_1.PromiseStatus;
require("@akala/core");
exports.$$injector = window['akala'] = core_1.module('akala', 'akala-services', 'controls');
exports.$$injector['promisify'] = core_1.Promisify;
exports.$$injector['isPromiseLike'] = core_1.isPromiseLike;
exports.$$injector['PromiseStatus'] = core_1.PromiseStatus;
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

},{"@akala/core":43}],14:[function(require,module,exports){
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

},{"./control":15,"@akala/core":43}],15:[function(require,module,exports){
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

},{"@akala/core":43}],16:[function(require,module,exports){
"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
__export(require("./click"));
__export(require("./control"));
__export(require("./cssClass"));
__export(require("./foreach"));
__export(require("./href"));
__export(require("./json"));
__export(require("./markdown"));
__export(require("./options"));
__export(require("./part"));
__export(require("./spinner"));
__export(require("./text"));
__export(require("./title"));
__export(require("./translate"));
__export(require("./value"));
__export(require("./visibility"));

},{"./click":14,"./control":15,"./cssClass":17,"./foreach":18,"./href":19,"./json":20,"./markdown":21,"./options":22,"./part":23,"./spinner":24,"./text":25,"./title":26,"./translate":27,"./value":28,"./visibility":29}],17:[function(require,module,exports){
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
            parameter = new core_1.ObservableArray(parameter);
        }
        if (parameter instanceof core_1.ObservableArray)
            parameter.on('collectionChanged', function (arg) {
                arg.newItems.forEach(function (item) {
                    if (typeof (item) == 'string')
                        element.addClass(item);
                    else {
                        if (item instanceof core_1.Binding) {
                            var oldValue = null;
                            item.onChanged(function (ev) {
                                if (oldValue)
                                    element.removeClass(oldValue);
                                element.addClass(ev.eventArgs.value);
                                oldValue = ev.eventArgs.value;
                            });
                        }
                        else
                            Object.keys(item).forEach(function (key) {
                                if (item[key] instanceof core_1.Binding) {
                                    item[key].onChanged(function (ev) {
                                        element.toggleClass(key, ev.eventArgs.value);
                                    });
                                }
                                else
                                    element.toggleClass(key, item[key]);
                            });
                    }
                });
            }).init();
        else {
            Object.keys(parameter).forEach(function (key) {
                if (parameter[key] instanceof core_1.Binding) {
                    parameter[key].onChanged(function (ev) {
                        element.toggleClass(key, ev.eventArgs.value);
                    });
                }
                else
                    element.toggleClass(key, parameter[key]);
            });
        }
    }
};
CssClass = __decorate([
    control_1.control()
], CssClass);
exports.CssClass = CssClass;

},{"./control":15,"@akala/core":43}],18:[function(require,module,exports){
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
    constructor(name) {
        super(name || 'each', 100);
    }
    instanciate(target, element, parameter) {
        if (typeof (parameter) == 'string')
            parameter = this.parse(parameter);
        var parsedParam = parameter;
        if (parameter.in instanceof Function)
            var sourceBinding = parameter.in(target, true);
        var self = this;
        var parent = element.parent();
        element.detach();
        // var newControls;
        function build(source) {
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
                            if (parsedParam.key)
                                scope[parsedParam.key] = source.length - 1;
                            if (parsedParam.value)
                                scope[parsedParam.value] = args.newItems[0];
                            parent.append(self.clone(element, scope, true));
                            break;
                        case 'unshift':
                            var scope = target.$new();
                            if (parsedParam.key)
                                scope[parsedParam.key] = 0;
                            if (parsedParam.value)
                                scope[parsedParam.value] = args.newItems[0];
                            parent.prepend(self.clone(element, scope, true));
                            break;
                        case 'replace':
                            var scope = target.$new();
                            if (parsedParam.key)
                                scope[parsedParam.key] = source.indexOf(args.newItems[0]);
                            if (parsedParam.value)
                                scope[parsedParam.value] = args.newItems[0];
                            parent.eq(source.indexOf(args.newItems[0])).replaceWith(self.clone(element, scope, true));
                            break;
                    }
                });
                source = source.array;
            }
            $.each(source, function (key, value) {
                var scope = target.$new();
                if (parsedParam.key)
                    scope[parsedParam.key] = key;
                if (parsedParam.value)
                    scope[parsedParam.value] = value;
                parent.append(self.clone(element, scope, true));
            });
            return result;
        }
        sourceBinding.onChanged(function (ev) {
            di.Promisify(ev.eventArgs.value).then(build);
        }, true);
        return di.Promisify(sourceBinding.getValue()).then(build);
    }
    parse(exp) {
        var result = ForEach_1.expRegex.exec(exp);
        return { in: di.Parser.evalAsFunction(exp.substring(result[0].length)), key: result[2] && result[1], value: result[2] || result[1] };
    }
};
ForEach.expRegex = /^\s*\(?(\w+)(?:,\s*(\w+))?\)?\s+in\s+/;
ForEach = ForEach_1 = __decorate([
    control_1.control()
], ForEach);
exports.ForEach = ForEach;
var ForEach_1;

},{"./control":15,"@akala/core":43}],19:[function(require,module,exports){
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const control_1 = require("./control");
const text_1 = require("./text");
let Href = class Href extends text_1.Text {
    constructor() {
        super('href');
    }
    setValue(element, value) {
        element.attr('href', value);
    }
};
Href = __decorate([
    control_1.control()
], Href);
exports.Href = Href;

},{"./control":15,"./text":25}],20:[function(require,module,exports){
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const control_1 = require("./control");
const text_1 = require("./text");
let Json = class Json extends text_1.Text {
    constructor() {
        super('json');
    }
    setValue(element, value) {
        element.text(JSON.stringify(value));
    }
};
Json = __decorate([
    control_1.control()
], Json);
exports.Json = Json;

},{"./control":15,"./text":25}],21:[function(require,module,exports){
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
const showdown = require("showdown");
const text_1 = require("./text");
let Markdown = class Markdown extends text_1.Text {
    constructor() {
        super('markdown');
        this.markdown = new showdown.Converter();
    }
    link(target, element, parameter) {
        if (parameter instanceof core_1.Binding) {
            parameter.formatter = this.markdown.makeHtml.bind(this.markdown);
        }
        super.link(target, element, parameter);
    }
    setValue(element, value) {
        element.html(this.markdown.makeHtml(value));
    }
};
Markdown = __decorate([
    control_1.control()
], Markdown);
exports.Markdown = Markdown;

},{"./control":15,"./text":25,"@akala/core":43,"showdown":71}],22:[function(require,module,exports){
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

},{"./control":15,"@akala/core":43}],23:[function(require,module,exports){
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
let Part = class Part extends control_1.BaseControl {
    constructor(partService) {
        super('part', 100);
        this.partService = partService;
    }
    link(target, element, parameter) {
        var partService = this.partService;
        if (typeof parameter != 'string') {
            if (parameter.template instanceof core_1.Binding)
                parameter.template.onChanged(function (ev) {
                    if (parameter.controller instanceof core_1.Binding)
                        partService.apply(function () { return { scope: target, element: element }; }, { controller: parameter.controller.getValue(), template: ev.eventArgs.value }, {}, $.noop);
                    else
                        partService.apply(function () { return { scope: target, element: element }; }, { controller: parameter.controller, template: ev.eventArgs.value }, {}, $.noop);
                });
            else if (parameter.controller instanceof core_1.Binding)
                partService.apply(function () { return { scope: target, element: element }; }, { controller: parameter.controller.getValue(), template: parameter.template }, {}, $.noop);
            else
                partService.apply(function () { return { scope: target, element: element }; }, { controller: parameter.controller, template: parameter.template }, {}, $.noop);
        }
        else
            partService.register(parameter, { scope: target, element: element });
    }
};
Part = __decorate([
    control_1.control("$part")
], Part);
exports.Part = Part;

},{"./control":15,"@akala/core":43}],24:[function(require,module,exports){
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
let Spinner = class Spinner extends control_1.Control {
    constructor() {
        super('spinner', 50);
    }
    instanciate(target, element, parameter) {
        var parent = element;
        var wrapped = this.wrap(element, target, true);
        var settings = {};
        if (parameter instanceof core_1.Binding) {
            parameter = parameter.getValue();
            if (di.isPromiseLike(parameter))
                wrapped = parameter;
        }
        if (parameter && parameter.promise instanceof core_1.Binding) {
            var promise = parameter.promise.getValue();
            if (di.isPromiseLike(promise))
                wrapped = promise;
        }
        if (Array.isArray(parameter))
            settings.classes = parameter;
        else
            settings.classes = parameter && parameter.classes || 'fa fa-spin fa-3x fa-circle-o-notch';
        if (wrapped != element && di.isPromiseLike(wrapped)) {
            var spinner;
            if (element[0].tagName.toLowerCase() == 'tr') {
                spinner = $('<tr class="spinner"><td colspan="99"></td></tr>').appendTo(element.parent());
                parent = spinner.find('td');
            }
            if (element[0].tagName.toLowerCase() == 'li') {
                spinner = $('<li class="spinner"></li>').appendTo(element.parent());
                parent = spinner;
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

},{"./control":15,"@akala/core":43}],25:[function(require,module,exports){
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
let Text = class Text extends control_1.BaseControl {
    constructor(name) {
        super(name || 'text', 400);
    }
    link(target, element, parameter) {
        var self = this;
        if (parameter instanceof core_1.Binding) {
            parameter.onChanged(function (ev) {
                if (di.isPromiseLike(ev.eventArgs.value))
                    ev.eventArgs.value.then(function (value) {
                        self.setValue(element, value);
                    });
                else
                    self.setValue(element, ev.eventArgs.value);
            });
        }
        else
            self.setValue(element, parameter);
    }
    setValue(element, value) {
        element.text(value);
    }
};
Text = __decorate([
    control_1.control()
], Text);
exports.Text = Text;

},{"./control":15,"@akala/core":43}],26:[function(require,module,exports){
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const control_1 = require("./control");
const text_1 = require("./text");
let Title = class Title extends text_1.Text {
    constructor() {
        super('title');
    }
    setValue(element, value) {
        element.attr('title', value);
    }
};
Title = __decorate([
    control_1.control()
], Title);
exports.Title = Title;

},{"./control":15,"./text":25}],27:[function(require,module,exports){
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
const text_1 = require("./text");
di.registerFactory('$translator', di.injectWithName(['$translations'], function (translations) {
    return function (key, ...parameters) {
        if (!parameters)
            return translations && translations[key] || key;
        return (translations && translations[key] || key).replace(/\{\d+\}/g, function (m) {
            return parameters[m];
        });
    };
}));
let Translate = class Translate extends text_1.Text {
    constructor(translator) {
        super('translate');
        this.translator = translator;
    }
    setValue(element, value) {
        element.text(this.translator(value));
    }
};
Translate = __decorate([
    control_1.control('$translator')
], Translate);
exports.Translate = Translate;

},{"./control":15,"./text":25,"@akala/core":43}],28:[function(require,module,exports){
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

},{"./control":15,"@akala/core":43}],29:[function(require,module,exports){
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
            element.toggle(!ev.eventArgs.value);
        });
    }
};
Hide = __decorate([
    control_1.control()
], Hide);
exports.Hide = Hide;
let Show = class Show extends control_1.BaseControl {
    constructor() {
        super('show', 400);
    }
    link(target, element, parameter) {
        parameter.onChanged(function (ev) {
            element.toggle(ev.eventArgs.value);
        });
    }
};
Show = __decorate([
    control_1.control()
], Show);
exports.Show = Show;

},{"./control":15}],30:[function(require,module,exports){
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
        var self = this;
        req.onreadystatechange = function (aEvt) {
            if (req.readyState == 4) {
                if (req.status == 301)
                    return self.call(method, req.getResponseHeader('location')).then(function (data) {
                        deferred.resolve(data);
                    }, function (data) {
                        deferred.reject(data);
                    });
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

},{"@akala/core":43,"url":7}],31:[function(require,module,exports){
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

},{"@akala/core":43,"events":1}],32:[function(require,module,exports){
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

},{"./common":13,"@akala/core":43,"events":1}],33:[function(require,module,exports){
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

},{"@akala/core":43,"debug":68,"url":7}],34:[function(require,module,exports){
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

},{"@akala/core":43}],35:[function(require,module,exports){
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

},{"./common":13,"./controls/controls":16,"./scope":34,"@akala/core":43}],36:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("./parser");
const events_1 = require("events");
const promiseHelpers_1 = require("./promiseHelpers");
const formatters = require("./formatters");
const eachAsync_1 = require("./eachAsync");
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
    onChanged(handler, doNotTriggerHandler) {
        this.on(Binding.ChangedFieldEventName, handler);
        if (!doNotTriggerHandler)
            handler({
                target: this.target,
                eventArgs: {
                    fieldName: this.expression,
                    value: this.getValue()
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
                if (!target.hasOwnProperty('$$watchers')) {
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
                    eachAsync_1.array(listeners, function (listener, i, next) {
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

},{"./eachAsync":37,"./formatters":41,"./parser":46,"./promiseHelpers":47,"events":1}],37:[function(require,module,exports){
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

},{}],38:[function(require,module,exports){
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

},{"./injector":44}],39:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function booleanize(a) {
    return !!a;
}
exports.booleanize = booleanize;

},{}],40:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function identity(a) {
    return a;
}
exports.identity = identity;

},{}],41:[function(require,module,exports){
"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
__export(require("./identity"));
__export(require("./negate"));
__export(require("./booleanize"));

},{"./booleanize":39,"./identity":40,"./negate":42}],42:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function negate(a) {
    return !a;
}
exports.negate = negate;

},{}],43:[function(require,module,exports){
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
const log = require("debug");
exports.log = log;
function extend(target, ...args) {
    args.forEach(function (arg) {
        Object.keys(arg).forEach(function (key) {
            var a = typeof (target[key]);
            switch (typeof (target[key])) {
                case 'object':
                    extend(target[key], arg[key]);
                    break;
                default:
                    target[key] = arg[key];
                    break;
            }
        });
    });
    return target;
}
exports.extend = extend;
function module(name, ...dependencies) {
    return new module_1.Module(name, dependencies);
}
exports.module = module;

},{"./binder":36,"./eachAsync":37,"./factory":38,"./injector":44,"./module":45,"./parser":46,"./promiseHelpers":47,"./router":49,"./service":52,"debug":55}],44:[function(require,module,exports){
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

},{"./reflect":48}],45:[function(require,module,exports){
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

},{"./injector":44,"_process":2,"browser-process-hrtime":54,"events":1,"orchestrator":59}],46:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const promiseHelpers_1 = require("./promiseHelpers");
const binder_1 = require("./binder");
const formatters = require("./formatters");
var jsonKeyRegex = /^ *(?:(?:"([^"]+)")|(?:'([^']+)')|(?:([^\: ]+)) *): */;
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
            if (operation.right instanceof Function && operation.right.$$ast) {
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
        if (expression[0] == '!') {
            formatter = formatters.booleanize;
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
        var length = 0;
        var formatter = formatters.identity;
        if (expression[0] == '!') {
            formatter = formatters.negate;
            expression = expression.substring(1);
            length++;
        }
        if (expression[0] == '!') {
            formatter = formatters.booleanize;
            expression = expression.substring(1);
            length++;
        }
        var item = /^[\w0-9\.\$]+/.exec(expression)[0];
        length += item.length;
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
        f.$$length = length;
        f = Parser.tryParseOperator(expression.substr(item.length), f);
        return f;
    }
    static tryParseOperator(expression, lhs) {
        var operator = /^ *([<>=!\+\-\/\*&\|]+) */.exec(expression);
        if (operator) {
            expression = expression.substring(operator[0].length);
            var rhs = Parser.parseAny(expression, false);
            var binary = new ParsedBinary(operator[1], lhs, rhs);
            binary.$$length = lhs.$$length + operator[0].length + rhs.$$length;
            return ParsedBinary.applyPrecedence(binary);
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
            results.$$length += item.$$length;
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
            var key = keyMatch[1] || keyMatch[2] || keyMatch[3];
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

},{"./binder":36,"./formatters":41,"./promiseHelpers":47}],47:[function(require,module,exports){
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

},{"events":1}],48:[function(require,module,exports){
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

},{}],49:[function(require,module,exports){
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

},{"./layer":50,"./route":51,"_process":2,"array-flatten":53,"debug":55,"parseurl":62,"utils-merge":66}],50:[function(require,module,exports){
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

},{"debug":55,"path-to-regexp":63}],51:[function(require,module,exports){
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

},{"./layer":50,"array-flatten":53,"debug":55}],52:[function(require,module,exports){
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

},{"./injector":44}],53:[function(require,module,exports){
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

},{}],54:[function(require,module,exports){
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

},{"_process":2}],55:[function(require,module,exports){

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

},{"./debug":56}],56:[function(require,module,exports){

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

},{"ms":57}],57:[function(require,module,exports){
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

},{}],58:[function(require,module,exports){
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

},{"wrappy":67}],59:[function(require,module,exports){
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

},{"./lib/runTask":60,"events":1,"sequencify":64,"util":11}],60:[function(require,module,exports){
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

},{"_process":2,"end-of-stream":61,"stream-consume":65}],61:[function(require,module,exports){
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
},{"once":58}],62:[function(require,module,exports){
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

},{"url":7}],63:[function(require,module,exports){
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

},{}],64:[function(require,module,exports){
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

},{}],65:[function(require,module,exports){
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

},{}],66:[function(require,module,exports){
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

},{}],67:[function(require,module,exports){
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

},{}],68:[function(require,module,exports){
arguments[4][55][0].apply(exports,arguments)
},{"./debug":69,"dup":55}],69:[function(require,module,exports){
arguments[4][56][0].apply(exports,arguments)
},{"dup":56,"ms":70}],70:[function(require,module,exports){
arguments[4][57][0].apply(exports,arguments)
},{"dup":57}],71:[function(require,module,exports){
;/*! showdown 06-02-2017 */
(function(){
/**
 * Created by Tivie on 13-07-2015.
 */

function getDefaultOpts (simple) {
  'use strict';

  var defaultOptions = {
    omitExtraWLInCodeBlocks: {
      defaultValue: false,
      describe: 'Omit the default extra whiteline added to code blocks',
      type: 'boolean'
    },
    noHeaderId: {
      defaultValue: false,
      describe: 'Turn on/off generated header id',
      type: 'boolean'
    },
    prefixHeaderId: {
      defaultValue: false,
      describe: 'Specify a prefix to generated header ids',
      type: 'string'
    },
    ghCompatibleHeaderId: {
      defaultValue: false,
      describe: 'Generate header ids compatible with github style (spaces are replaced with dashes, a bunch of non alphanumeric chars are removed)',
      type: 'boolean'
    },
    headerLevelStart: {
      defaultValue: false,
      describe: 'The header blocks level start',
      type: 'integer'
    },
    parseImgDimensions: {
      defaultValue: false,
      describe: 'Turn on/off image dimension parsing',
      type: 'boolean'
    },
    simplifiedAutoLink: {
      defaultValue: false,
      describe: 'Turn on/off GFM autolink style',
      type: 'boolean'
    },
    excludeTrailingPunctuationFromURLs: {
      defaultValue: false,
      describe: 'Excludes trailing punctuation from links generated with autoLinking',
      type: 'boolean'
    },
    literalMidWordUnderscores: {
      defaultValue: false,
      describe: 'Parse midword underscores as literal underscores',
      type: 'boolean'
    },
    strikethrough: {
      defaultValue: false,
      describe: 'Turn on/off strikethrough support',
      type: 'boolean'
    },
    tables: {
      defaultValue: false,
      describe: 'Turn on/off tables support',
      type: 'boolean'
    },
    tablesHeaderId: {
      defaultValue: false,
      describe: 'Add an id to table headers',
      type: 'boolean'
    },
    ghCodeBlocks: {
      defaultValue: true,
      describe: 'Turn on/off GFM fenced code blocks support',
      type: 'boolean'
    },
    tasklists: {
      defaultValue: false,
      describe: 'Turn on/off GFM tasklist support',
      type: 'boolean'
    },
    smoothLivePreview: {
      defaultValue: false,
      describe: 'Prevents weird effects in live previews due to incomplete input',
      type: 'boolean'
    },
    smartIndentationFix: {
      defaultValue: false,
      description: 'Tries to smartly fix indentation in es6 strings',
      type: 'boolean'
    },
    disableForced4SpacesIndentedSublists: {
      defaultValue: false,
      description: 'Disables the requirement of indenting nested sublists by 4 spaces',
      type: 'boolean'
    },
    simpleLineBreaks: {
      defaultValue: false,
      description: 'Parses simple line breaks as <br> (GFM Style)',
      type: 'boolean'
    },
    requireSpaceBeforeHeadingText: {
      defaultValue: false,
      description: 'Makes adding a space between `#` and the header text mandatory (GFM Style)',
      type: 'boolean'
    },
    ghMentions: {
      defaultValue: false,
      description: 'Enables github @mentions',
      type: 'boolean'
    },
    ghMentionsLink: {
      defaultValue: 'https://github.com/{u}',
      description: 'Changes the link generated by @mentions. Only applies if ghMentions option is enabled.',
      type: 'string'
    },
    encodeEmails: {
      defaultValue: true,
      description: 'Encode e-mail addresses through the use of Character Entities, transforming ASCII e-mail addresses into its equivalent decimal entities',
      type: 'boolean'
    }
  };
  if (simple === false) {
    return JSON.parse(JSON.stringify(defaultOptions));
  }
  var ret = {};
  for (var opt in defaultOptions) {
    if (defaultOptions.hasOwnProperty(opt)) {
      ret[opt] = defaultOptions[opt].defaultValue;
    }
  }
  return ret;
}

function allOptionsOn () {
  'use strict';
  var options = getDefaultOpts(true),
      ret = {};
  for (var opt in options) {
    if (options.hasOwnProperty(opt)) {
      ret[opt] = true;
    }
  }
  return ret;
}

/**
 * Created by Tivie on 06-01-2015.
 */

// Private properties
var showdown = {},
    parsers = {},
    extensions = {},
    globalOptions = getDefaultOpts(true),
    setFlavor = 'vanilla',
    flavor = {
      github: {
        omitExtraWLInCodeBlocks:              true,
        simplifiedAutoLink:                   true,
        excludeTrailingPunctuationFromURLs:   true,
        literalMidWordUnderscores:            true,
        strikethrough:                        true,
        tables:                               true,
        tablesHeaderId:                       true,
        ghCodeBlocks:                         true,
        tasklists:                            true,
        disableForced4SpacesIndentedSublists: true,
        simpleLineBreaks:                     true,
        requireSpaceBeforeHeadingText:        true,
        ghCompatibleHeaderId:                 true,
        ghMentions:                           true
      },
      original: {
        noHeaderId:                           true,
        ghCodeBlocks:                         false
      },
      ghost: {
        omitExtraWLInCodeBlocks:              true,
        parseImgDimensions:                   true,
        simplifiedAutoLink:                   true,
        excludeTrailingPunctuationFromURLs:   true,
        literalMidWordUnderscores:            true,
        strikethrough:                        true,
        tables:                               true,
        tablesHeaderId:                       true,
        ghCodeBlocks:                         true,
        tasklists:                            true,
        smoothLivePreview:                    true,
        simpleLineBreaks:                     true,
        requireSpaceBeforeHeadingText:        true,
        ghMentions:                           false,
        encodeEmails:                         true
      },
      vanilla: getDefaultOpts(true),
      allOn: allOptionsOn()
    };

/**
 * helper namespace
 * @type {{}}
 */
showdown.helper = {};

/**
 * TODO LEGACY SUPPORT CODE
 * @type {{}}
 */
showdown.extensions = {};

/**
 * Set a global option
 * @static
 * @param {string} key
 * @param {*} value
 * @returns {showdown}
 */
showdown.setOption = function (key, value) {
  'use strict';
  globalOptions[key] = value;
  return this;
};

/**
 * Get a global option
 * @static
 * @param {string} key
 * @returns {*}
 */
showdown.getOption = function (key) {
  'use strict';
  return globalOptions[key];
};

/**
 * Get the global options
 * @static
 * @returns {{}}
 */
showdown.getOptions = function () {
  'use strict';
  return globalOptions;
};

/**
 * Reset global options to the default values
 * @static
 */
showdown.resetOptions = function () {
  'use strict';
  globalOptions = getDefaultOpts(true);
};

/**
 * Set the flavor showdown should use as default
 * @param {string} name
 */
showdown.setFlavor = function (name) {
  'use strict';
  if (!flavor.hasOwnProperty(name)) {
    throw Error(name + ' flavor was not found');
  }
  var preset = flavor[name];
  setFlavor = name;
  for (var option in preset) {
    if (preset.hasOwnProperty(option)) {
      globalOptions[option] = preset[option];
    }
  }
};

/**
 * Get the currently set flavor
 * @returns {string}
 */
showdown.getFlavor = function () {
  'use strict';
  return setFlavor;
};

/**
 * Get the options of a specified flavor. Returns undefined if the flavor was not found
 * @param {string} name Name of the flavor
 * @returns {{}|undefined}
 */
showdown.getFlavorOptions = function (name) {
  'use strict';
  if (flavor.hasOwnProperty(name)) {
    return flavor[name];
  }
};

/**
 * Get the default options
 * @static
 * @param {boolean} [simple=true]
 * @returns {{}}
 */
showdown.getDefaultOptions = function (simple) {
  'use strict';
  return getDefaultOpts(simple);
};

/**
 * Get or set a subParser
 *
 * subParser(name)       - Get a registered subParser
 * subParser(name, func) - Register a subParser
 * @static
 * @param {string} name
 * @param {function} [func]
 * @returns {*}
 */
showdown.subParser = function (name, func) {
  'use strict';
  if (showdown.helper.isString(name)) {
    if (typeof func !== 'undefined') {
      parsers[name] = func;
    } else {
      if (parsers.hasOwnProperty(name)) {
        return parsers[name];
      } else {
        throw Error('SubParser named ' + name + ' not registered!');
      }
    }
  }
};

/**
 * Gets or registers an extension
 * @static
 * @param {string} name
 * @param {object|function=} ext
 * @returns {*}
 */
showdown.extension = function (name, ext) {
  'use strict';

  if (!showdown.helper.isString(name)) {
    throw Error('Extension \'name\' must be a string');
  }

  name = showdown.helper.stdExtName(name);

  // Getter
  if (showdown.helper.isUndefined(ext)) {
    if (!extensions.hasOwnProperty(name)) {
      throw Error('Extension named ' + name + ' is not registered!');
    }
    return extensions[name];

    // Setter
  } else {
    // Expand extension if it's wrapped in a function
    if (typeof ext === 'function') {
      ext = ext();
    }

    // Ensure extension is an array
    if (!showdown.helper.isArray(ext)) {
      ext = [ext];
    }

    var validExtension = validate(ext, name);

    if (validExtension.valid) {
      extensions[name] = ext;
    } else {
      throw Error(validExtension.error);
    }
  }
};

/**
 * Gets all extensions registered
 * @returns {{}}
 */
showdown.getAllExtensions = function () {
  'use strict';
  return extensions;
};

/**
 * Remove an extension
 * @param {string} name
 */
showdown.removeExtension = function (name) {
  'use strict';
  delete extensions[name];
};

/**
 * Removes all extensions
 */
showdown.resetExtensions = function () {
  'use strict';
  extensions = {};
};

/**
 * Validate extension
 * @param {array} extension
 * @param {string} name
 * @returns {{valid: boolean, error: string}}
 */
function validate (extension, name) {
  'use strict';

  var errMsg = (name) ? 'Error in ' + name + ' extension->' : 'Error in unnamed extension',
      ret = {
        valid: true,
        error: ''
      };

  if (!showdown.helper.isArray(extension)) {
    extension = [extension];
  }

  for (var i = 0; i < extension.length; ++i) {
    var baseMsg = errMsg + ' sub-extension ' + i + ': ',
        ext = extension[i];
    if (typeof ext !== 'object') {
      ret.valid = false;
      ret.error = baseMsg + 'must be an object, but ' + typeof ext + ' given';
      return ret;
    }

    if (!showdown.helper.isString(ext.type)) {
      ret.valid = false;
      ret.error = baseMsg + 'property "type" must be a string, but ' + typeof ext.type + ' given';
      return ret;
    }

    var type = ext.type = ext.type.toLowerCase();

    // normalize extension type
    if (type === 'language') {
      type = ext.type = 'lang';
    }

    if (type === 'html') {
      type = ext.type = 'output';
    }

    if (type !== 'lang' && type !== 'output' && type !== 'listener') {
      ret.valid = false;
      ret.error = baseMsg + 'type ' + type + ' is not recognized. Valid values: "lang/language", "output/html" or "listener"';
      return ret;
    }

    if (type === 'listener') {
      if (showdown.helper.isUndefined(ext.listeners)) {
        ret.valid = false;
        ret.error = baseMsg + '. Extensions of type "listener" must have a property called "listeners"';
        return ret;
      }
    } else {
      if (showdown.helper.isUndefined(ext.filter) && showdown.helper.isUndefined(ext.regex)) {
        ret.valid = false;
        ret.error = baseMsg + type + ' extensions must define either a "regex" property or a "filter" method';
        return ret;
      }
    }

    if (ext.listeners) {
      if (typeof ext.listeners !== 'object') {
        ret.valid = false;
        ret.error = baseMsg + '"listeners" property must be an object but ' + typeof ext.listeners + ' given';
        return ret;
      }
      for (var ln in ext.listeners) {
        if (ext.listeners.hasOwnProperty(ln)) {
          if (typeof ext.listeners[ln] !== 'function') {
            ret.valid = false;
            ret.error = baseMsg + '"listeners" property must be an hash of [event name]: [callback]. listeners.' + ln +
              ' must be a function but ' + typeof ext.listeners[ln] + ' given';
            return ret;
          }
        }
      }
    }

    if (ext.filter) {
      if (typeof ext.filter !== 'function') {
        ret.valid = false;
        ret.error = baseMsg + '"filter" must be a function, but ' + typeof ext.filter + ' given';
        return ret;
      }
    } else if (ext.regex) {
      if (showdown.helper.isString(ext.regex)) {
        ext.regex = new RegExp(ext.regex, 'g');
      }
      if (!(ext.regex instanceof RegExp)) {
        ret.valid = false;
        ret.error = baseMsg + '"regex" property must either be a string or a RegExp object, but ' + typeof ext.regex + ' given';
        return ret;
      }
      if (showdown.helper.isUndefined(ext.replace)) {
        ret.valid = false;
        ret.error = baseMsg + '"regex" extensions must implement a replace string or function';
        return ret;
      }
    }
  }
  return ret;
}

/**
 * Validate extension
 * @param {object} ext
 * @returns {boolean}
 */
showdown.validateExtension = function (ext) {
  'use strict';

  var validateExtension = validate(ext, null);
  if (!validateExtension.valid) {
    console.warn(validateExtension.error);
    return false;
  }
  return true;
};

/**
 * showdownjs helper functions
 */

if (!showdown.hasOwnProperty('helper')) {
  showdown.helper = {};
}

/**
 * Check if var is string
 * @static
 * @param {string} a
 * @returns {boolean}
 */
showdown.helper.isString = function (a) {
  'use strict';
  return (typeof a === 'string' || a instanceof String);
};

/**
 * Check if var is a function
 * @static
 * @param {*} a
 * @returns {boolean}
 */
showdown.helper.isFunction = function (a) {
  'use strict';
  var getType = {};
  return a && getType.toString.call(a) === '[object Function]';
};

/**
 * isArray helper function
 * @static
 * @param {*} a
 * @returns {boolean}
 */
showdown.helper.isArray = function (a) {
  'use strict';
  return a.constructor === Array;
};

/**
 * Check if value is undefined
 * @static
 * @param {*} value The value to check.
 * @returns {boolean} Returns `true` if `value` is `undefined`, else `false`.
 */
showdown.helper.isUndefined = function (value) {
  'use strict';
  return typeof value === 'undefined';
};

/**
 * ForEach helper function
 * Iterates over Arrays and Objects (own properties only)
 * @static
 * @param {*} obj
 * @param {function} callback Accepts 3 params: 1. value, 2. key, 3. the original array/object
 */
showdown.helper.forEach = function (obj, callback) {
  'use strict';
  // check if obj is defined
  if (showdown.helper.isUndefined(obj)) {
    throw new Error('obj param is required');
  }

  if (showdown.helper.isUndefined(callback)) {
    throw new Error('callback param is required');
  }

  if (!showdown.helper.isFunction(callback)) {
    throw new Error('callback param must be a function/closure');
  }

  if (typeof obj.forEach === 'function') {
    obj.forEach(callback);
  } else if (showdown.helper.isArray(obj)) {
    for (var i = 0; i < obj.length; i++) {
      callback(obj[i], i, obj);
    }
  } else if (typeof (obj) === 'object') {
    for (var prop in obj) {
      if (obj.hasOwnProperty(prop)) {
        callback(obj[prop], prop, obj);
      }
    }
  } else {
    throw new Error('obj does not seem to be an array or an iterable object');
  }
};

/**
 * Standardidize extension name
 * @static
 * @param {string} s extension name
 * @returns {string}
 */
showdown.helper.stdExtName = function (s) {
  'use strict';
  return s.replace(/[_?*+\/\\.^-]/g, '').replace(/\s/g, '').toLowerCase();
};

function escapeCharactersCallback (wholeMatch, m1) {
  'use strict';
  var charCodeToEscape = m1.charCodeAt(0);
  return '¨E' + charCodeToEscape + 'E';
}

/**
 * Callback used to escape characters when passing through String.replace
 * @static
 * @param {string} wholeMatch
 * @param {string} m1
 * @returns {string}
 */
showdown.helper.escapeCharactersCallback = escapeCharactersCallback;

/**
 * Escape characters in a string
 * @static
 * @param {string} text
 * @param {string} charsToEscape
 * @param {boolean} afterBackslash
 * @returns {XML|string|void|*}
 */
showdown.helper.escapeCharacters = function (text, charsToEscape, afterBackslash) {
  'use strict';
  // First we have to escape the escape characters so that
  // we can build a character class out of them
  var regexString = '([' + charsToEscape.replace(/([\[\]\\])/g, '\\$1') + '])';

  if (afterBackslash) {
    regexString = '\\\\' + regexString;
  }

  var regex = new RegExp(regexString, 'g');
  text = text.replace(regex, escapeCharactersCallback);

  return text;
};

var rgxFindMatchPos = function (str, left, right, flags) {
  'use strict';
  var f = flags || '',
      g = f.indexOf('g') > -1,
      x = new RegExp(left + '|' + right, 'g' + f.replace(/g/g, '')),
      l = new RegExp(left, f.replace(/g/g, '')),
      pos = [],
      t, s, m, start, end;

  do {
    t = 0;
    while ((m = x.exec(str))) {
      if (l.test(m[0])) {
        if (!(t++)) {
          s = x.lastIndex;
          start = s - m[0].length;
        }
      } else if (t) {
        if (!--t) {
          end = m.index + m[0].length;
          var obj = {
            left: {start: start, end: s},
            match: {start: s, end: m.index},
            right: {start: m.index, end: end},
            wholeMatch: {start: start, end: end}
          };
          pos.push(obj);
          if (!g) {
            return pos;
          }
        }
      }
    }
  } while (t && (x.lastIndex = s));

  return pos;
};

/**
 * matchRecursiveRegExp
 *
 * (c) 2007 Steven Levithan <stevenlevithan.com>
 * MIT License
 *
 * Accepts a string to search, a left and right format delimiter
 * as regex patterns, and optional regex flags. Returns an array
 * of matches, allowing nested instances of left/right delimiters.
 * Use the "g" flag to return all matches, otherwise only the
 * first is returned. Be careful to ensure that the left and
 * right format delimiters produce mutually exclusive matches.
 * Backreferences are not supported within the right delimiter
 * due to how it is internally combined with the left delimiter.
 * When matching strings whose format delimiters are unbalanced
 * to the left or right, the output is intentionally as a
 * conventional regex library with recursion support would
 * produce, e.g. "<<x>" and "<x>>" both produce ["x"] when using
 * "<" and ">" as the delimiters (both strings contain a single,
 * balanced instance of "<x>").
 *
 * examples:
 * matchRecursiveRegExp("test", "\\(", "\\)")
 * returns: []
 * matchRecursiveRegExp("<t<<e>><s>>t<>", "<", ">", "g")
 * returns: ["t<<e>><s>", ""]
 * matchRecursiveRegExp("<div id=\"x\">test</div>", "<div\\b[^>]*>", "</div>", "gi")
 * returns: ["test"]
 */
showdown.helper.matchRecursiveRegExp = function (str, left, right, flags) {
  'use strict';

  var matchPos = rgxFindMatchPos (str, left, right, flags),
      results = [];

  for (var i = 0; i < matchPos.length; ++i) {
    results.push([
      str.slice(matchPos[i].wholeMatch.start, matchPos[i].wholeMatch.end),
      str.slice(matchPos[i].match.start, matchPos[i].match.end),
      str.slice(matchPos[i].left.start, matchPos[i].left.end),
      str.slice(matchPos[i].right.start, matchPos[i].right.end)
    ]);
  }
  return results;
};

/**
 *
 * @param {string} str
 * @param {string|function} replacement
 * @param {string} left
 * @param {string} right
 * @param {string} flags
 * @returns {string}
 */
showdown.helper.replaceRecursiveRegExp = function (str, replacement, left, right, flags) {
  'use strict';

  if (!showdown.helper.isFunction(replacement)) {
    var repStr = replacement;
    replacement = function () {
      return repStr;
    };
  }

  var matchPos = rgxFindMatchPos(str, left, right, flags),
      finalStr = str,
      lng = matchPos.length;

  if (lng > 0) {
    var bits = [];
    if (matchPos[0].wholeMatch.start !== 0) {
      bits.push(str.slice(0, matchPos[0].wholeMatch.start));
    }
    for (var i = 0; i < lng; ++i) {
      bits.push(
        replacement(
          str.slice(matchPos[i].wholeMatch.start, matchPos[i].wholeMatch.end),
          str.slice(matchPos[i].match.start, matchPos[i].match.end),
          str.slice(matchPos[i].left.start, matchPos[i].left.end),
          str.slice(matchPos[i].right.start, matchPos[i].right.end)
        )
      );
      if (i < lng - 1) {
        bits.push(str.slice(matchPos[i].wholeMatch.end, matchPos[i + 1].wholeMatch.start));
      }
    }
    if (matchPos[lng - 1].wholeMatch.end < str.length) {
      bits.push(str.slice(matchPos[lng - 1].wholeMatch.end));
    }
    finalStr = bits.join('');
  }
  return finalStr;
};

/**
 * Obfuscate an e-mail address through the use of Character Entities,
 * transforming ASCII characters into their equivalent decimal or hex entities.
 *
 * Since it has a random component, subsequent calls to this function produce different results
 *
 * @param {string} mail
 * @returns {string}
 */
showdown.helper.encodeEmailAddress = function (mail) {
  'use strict';
  var encode = [
    function (ch) {
      return '&#' + ch.charCodeAt(0) + ';';
    },
    function (ch) {
      return '&#x' + ch.charCodeAt(0).toString(16) + ';';
    },
    function (ch) {
      return ch;
    }
  ];

  mail = mail.replace(/./g, function (ch) {
    if (ch === '@') {
      // this *must* be encoded. I insist.
      ch = encode[Math.floor(Math.random() * 2)](ch);
    } else {
      var r = Math.random();
      // roughly 10% raw, 45% hex, 45% dec
      ch = (
        r > 0.9 ? encode[2](ch) : r > 0.45 ? encode[1](ch) : encode[0](ch)
      );
    }
    return ch;
  });

  return mail;
};

/**
 * POLYFILLS
 */
// use this instead of builtin is undefined for IE8 compatibility
if (typeof(console) === 'undefined') {
  console = {
    warn: function (msg) {
      'use strict';
      alert(msg);
    },
    log: function (msg) {
      'use strict';
      alert(msg);
    },
    error: function (msg) {
      'use strict';
      throw msg;
    }
  };
}

/**
 * Common regexes.
 * We declare some common regexes to improve performance
 */
showdown.helper.regexes = {
  asteriskAndDash: /([*_])/g
};

/**
 * Created by Estevao on 31-05-2015.
 */

/**
 * Showdown Converter class
 * @class
 * @param {object} [converterOptions]
 * @returns {Converter}
 */
showdown.Converter = function (converterOptions) {
  'use strict';

  var
      /**
       * Options used by this converter
       * @private
       * @type {{}}
       */
      options = {},

      /**
       * Language extensions used by this converter
       * @private
       * @type {Array}
       */
      langExtensions = [],

      /**
       * Output modifiers extensions used by this converter
       * @private
       * @type {Array}
       */
      outputModifiers = [],

      /**
       * Event listeners
       * @private
       * @type {{}}
       */
      listeners = {},

      /**
       * The flavor set in this converter
       */
      setConvFlavor = setFlavor;

  _constructor();

  /**
   * Converter constructor
   * @private
   */
  function _constructor () {
    converterOptions = converterOptions || {};

    for (var gOpt in globalOptions) {
      if (globalOptions.hasOwnProperty(gOpt)) {
        options[gOpt] = globalOptions[gOpt];
      }
    }

    // Merge options
    if (typeof converterOptions === 'object') {
      for (var opt in converterOptions) {
        if (converterOptions.hasOwnProperty(opt)) {
          options[opt] = converterOptions[opt];
        }
      }
    } else {
      throw Error('Converter expects the passed parameter to be an object, but ' + typeof converterOptions +
      ' was passed instead.');
    }

    if (options.extensions) {
      showdown.helper.forEach(options.extensions, _parseExtension);
    }
  }

  /**
   * Parse extension
   * @param {*} ext
   * @param {string} [name='']
   * @private
   */
  function _parseExtension (ext, name) {

    name = name || null;
    // If it's a string, the extension was previously loaded
    if (showdown.helper.isString(ext)) {
      ext = showdown.helper.stdExtName(ext);
      name = ext;

      // LEGACY_SUPPORT CODE
      if (showdown.extensions[ext]) {
        console.warn('DEPRECATION WARNING: ' + ext + ' is an old extension that uses a deprecated loading method.' +
          'Please inform the developer that the extension should be updated!');
        legacyExtensionLoading(showdown.extensions[ext], ext);
        return;
      // END LEGACY SUPPORT CODE

      } else if (!showdown.helper.isUndefined(extensions[ext])) {
        ext = extensions[ext];

      } else {
        throw Error('Extension "' + ext + '" could not be loaded. It was either not found or is not a valid extension.');
      }
    }

    if (typeof ext === 'function') {
      ext = ext();
    }

    if (!showdown.helper.isArray(ext)) {
      ext = [ext];
    }

    var validExt = validate(ext, name);
    if (!validExt.valid) {
      throw Error(validExt.error);
    }

    for (var i = 0; i < ext.length; ++i) {
      switch (ext[i].type) {

        case 'lang':
          langExtensions.push(ext[i]);
          break;

        case 'output':
          outputModifiers.push(ext[i]);
          break;
      }
      if (ext[i].hasOwnProperty('listeners')) {
        for (var ln in ext[i].listeners) {
          if (ext[i].listeners.hasOwnProperty(ln)) {
            listen(ln, ext[i].listeners[ln]);
          }
        }
      }
    }

  }

  /**
   * LEGACY_SUPPORT
   * @param {*} ext
   * @param {string} name
   */
  function legacyExtensionLoading (ext, name) {
    if (typeof ext === 'function') {
      ext = ext(new showdown.Converter());
    }
    if (!showdown.helper.isArray(ext)) {
      ext = [ext];
    }
    var valid = validate(ext, name);

    if (!valid.valid) {
      throw Error(valid.error);
    }

    for (var i = 0; i < ext.length; ++i) {
      switch (ext[i].type) {
        case 'lang':
          langExtensions.push(ext[i]);
          break;
        case 'output':
          outputModifiers.push(ext[i]);
          break;
        default:// should never reach here
          throw Error('Extension loader error: Type unrecognized!!!');
      }
    }
  }

  /**
   * Listen to an event
   * @param {string} name
   * @param {function} callback
   */
  function listen (name, callback) {
    if (!showdown.helper.isString(name)) {
      throw Error('Invalid argument in converter.listen() method: name must be a string, but ' + typeof name + ' given');
    }

    if (typeof callback !== 'function') {
      throw Error('Invalid argument in converter.listen() method: callback must be a function, but ' + typeof callback + ' given');
    }

    if (!listeners.hasOwnProperty(name)) {
      listeners[name] = [];
    }
    listeners[name].push(callback);
  }

  function rTrimInputText (text) {
    var rsp = text.match(/^\s*/)[0].length,
        rgx = new RegExp('^\\s{0,' + rsp + '}', 'gm');
    return text.replace(rgx, '');
  }

  /**
   * Dispatch an event
   * @private
   * @param {string} evtName Event name
   * @param {string} text Text
   * @param {{}} options Converter Options
   * @param {{}} globals
   * @returns {string}
   */
  this._dispatch = function dispatch (evtName, text, options, globals) {
    if (listeners.hasOwnProperty(evtName)) {
      for (var ei = 0; ei < listeners[evtName].length; ++ei) {
        var nText = listeners[evtName][ei](evtName, text, this, options, globals);
        if (nText && typeof nText !== 'undefined') {
          text = nText;
        }
      }
    }
    return text;
  };

  /**
   * Listen to an event
   * @param {string} name
   * @param {function} callback
   * @returns {showdown.Converter}
   */
  this.listen = function (name, callback) {
    listen(name, callback);
    return this;
  };

  /**
   * Converts a markdown string into HTML
   * @param {string} text
   * @returns {*}
   */
  this.makeHtml = function (text) {
    //check if text is not falsy
    if (!text) {
      return text;
    }

    var globals = {
      gHtmlBlocks:     [],
      gHtmlMdBlocks:   [],
      gHtmlSpans:      [],
      gUrls:           {},
      gTitles:         {},
      gDimensions:     {},
      gListLevel:      0,
      hashLinkCounts:  {},
      langExtensions:  langExtensions,
      outputModifiers: outputModifiers,
      converter:       this,
      ghCodeBlocks:    []
    };

    // This lets us use ¨ trema as an escape char to avoid md5 hashes
    // The choice of character is arbitrary; anything that isn't
    // magic in Markdown will work.
    text = text.replace(/¨/g, '¨T');

    // Replace $ with ¨D
    // RegExp interprets $ as a special character
    // when it's in a replacement string
    text = text.replace(/\$/g, '¨D');

    // Standardize line endings
    text = text.replace(/\r\n/g, '\n'); // DOS to Unix
    text = text.replace(/\r/g, '\n'); // Mac to Unix

    // Stardardize line spaces (nbsp causes trouble in older browsers and some regex flavors)
    text = text.replace(/\u00A0/g, ' ');

    if (options.smartIndentationFix) {
      text = rTrimInputText(text);
    }

    // Make sure text begins and ends with a couple of newlines:
    text = '\n\n' + text + '\n\n';

    // detab
    text = showdown.subParser('detab')(text, options, globals);

    /**
     * Strip any lines consisting only of spaces and tabs.
     * This makes subsequent regexs easier to write, because we can
     * match consecutive blank lines with /\n+/ instead of something
     * contorted like /[ \t]*\n+/
     */
    text = text.replace(/^[ \t]+$/mg, '');

    //run languageExtensions
    showdown.helper.forEach(langExtensions, function (ext) {
      text = showdown.subParser('runExtension')(ext, text, options, globals);
    });

    // run the sub parsers
    text = showdown.subParser('hashPreCodeTags')(text, options, globals);
    text = showdown.subParser('githubCodeBlocks')(text, options, globals);
    text = showdown.subParser('hashHTMLBlocks')(text, options, globals);
    text = showdown.subParser('hashCodeTags')(text, options, globals);
    text = showdown.subParser('stripLinkDefinitions')(text, options, globals);
    text = showdown.subParser('blockGamut')(text, options, globals);
    text = showdown.subParser('unhashHTMLSpans')(text, options, globals);
    text = showdown.subParser('unescapeSpecialChars')(text, options, globals);

    // attacklab: Restore dollar signs
    text = text.replace(/¨D/g, '$$');

    // attacklab: Restore tremas
    text = text.replace(/¨T/g, '¨');

    // Run output modifiers
    showdown.helper.forEach(outputModifiers, function (ext) {
      text = showdown.subParser('runExtension')(ext, text, options, globals);
    });

    return text;
  };

  /**
   * Set an option of this Converter instance
   * @param {string} key
   * @param {*} value
   */
  this.setOption = function (key, value) {
    options[key] = value;
  };

  /**
   * Get the option of this Converter instance
   * @param {string} key
   * @returns {*}
   */
  this.getOption = function (key) {
    return options[key];
  };

  /**
   * Get the options of this Converter instance
   * @returns {{}}
   */
  this.getOptions = function () {
    return options;
  };

  /**
   * Add extension to THIS converter
   * @param {{}} extension
   * @param {string} [name=null]
   */
  this.addExtension = function (extension, name) {
    name = name || null;
    _parseExtension(extension, name);
  };

  /**
   * Use a global registered extension with THIS converter
   * @param {string} extensionName Name of the previously registered extension
   */
  this.useExtension = function (extensionName) {
    _parseExtension(extensionName);
  };

  /**
   * Set the flavor THIS converter should use
   * @param {string} name
   */
  this.setFlavor = function (name) {
    if (!flavor.hasOwnProperty(name)) {
      throw Error(name + ' flavor was not found');
    }
    var preset = flavor[name];
    setConvFlavor = name;
    for (var option in preset) {
      if (preset.hasOwnProperty(option)) {
        options[option] = preset[option];
      }
    }
  };

  /**
   * Get the currently set flavor of this converter
   * @returns {string}
   */
  this.getFlavor = function () {
    return setConvFlavor;
  };

  /**
   * Remove an extension from THIS converter.
   * Note: This is a costly operation. It's better to initialize a new converter
   * and specify the extensions you wish to use
   * @param {Array} extension
   */
  this.removeExtension = function (extension) {
    if (!showdown.helper.isArray(extension)) {
      extension = [extension];
    }
    for (var a = 0; a < extension.length; ++a) {
      var ext = extension[a];
      for (var i = 0; i < langExtensions.length; ++i) {
        if (langExtensions[i] === ext) {
          langExtensions[i].splice(i, 1);
        }
      }
      for (var ii = 0; ii < outputModifiers.length; ++i) {
        if (outputModifiers[ii] === ext) {
          outputModifiers[ii].splice(i, 1);
        }
      }
    }
  };

  /**
   * Get all extension of THIS converter
   * @returns {{language: Array, output: Array}}
   */
  this.getAllExtensions = function () {
    return {
      language: langExtensions,
      output: outputModifiers
    };
  };
};

/**
 * Turn Markdown link shortcuts into XHTML <a> tags.
 */
showdown.subParser('anchors', function (text, options, globals) {
  'use strict';

  text = globals.converter._dispatch('anchors.before', text, options, globals);

  var writeAnchorTag = function (wholeMatch, m1, m2, m3, m4, m5, m6, m7) {
    if (showdown.helper.isUndefined(m7)) {
      m7 = '';
    }
    wholeMatch = m1;
    var linkText = m2,
        linkId = m3.toLowerCase(),
        url = m4,
        title = m7;

    if (!url) {
      if (!linkId) {
        // lower-case and turn embedded newlines into spaces
        linkId = linkText.toLowerCase().replace(/ ?\n/g, ' ');
      }
      url = '#' + linkId;

      if (!showdown.helper.isUndefined(globals.gUrls[linkId])) {
        url = globals.gUrls[linkId];
        if (!showdown.helper.isUndefined(globals.gTitles[linkId])) {
          title = globals.gTitles[linkId];
        }
      } else {
        if (wholeMatch.search(/\(\s*\)$/m) > -1) {
          // Special case for explicit empty url
          url = '';
        } else {
          return wholeMatch;
        }
      }
    }

    //url = showdown.helper.escapeCharacters(url, '*_', false); // replaced line to improve performance
    url = url.replace(showdown.helper.regexes.asteriskAndDash, showdown.helper.escapeCharactersCallback);

    var result = '<a href="' + url + '"';

    if (title !== '' && title !== null) {
      title = title.replace(/"/g, '&quot;');
      //title = showdown.helper.escapeCharacters(title, '*_', false); // replaced line to improve performance
      title = title.replace(showdown.helper.regexes.asteriskAndDash, showdown.helper.escapeCharactersCallback);
      result += ' title="' + title + '"';
    }

    result += '>' + linkText + '</a>';

    return result;
  };

  // First, handle reference-style links: [link text] [id]
  text = text.replace(/(\[((?:\[[^\]]*]|[^\[\]])*)][ ]?(?:\n[ ]*)?\[(.*?)])()()()()/g, writeAnchorTag);

  // Next, inline-style links: [link text](url "optional title")
  text = text.replace(/(\[((?:\[[^\]]*]|[^\[\]])*)]\([ \t]*()<?(.*?(?:\(.*?\).*?)?)>?[ \t]*((['"])(.*?)\6[ \t]*)?\))/g,
                      writeAnchorTag);

  // handle reference-style shortcuts: [link text]
  // These must come last in case you've also got [link test][1]
  // or [link test](/foo)
  text = text.replace(/(\[([^\[\]]+)])()()()()()/g, writeAnchorTag);

  // Lastly handle GithubMentions if option is enabled
  if (options.ghMentions) {
    text = text.replace(/(^|\s)(\\)?(@([a-z\d\-]+))(?=[.!?;,[\]()]|\s|$)/gmi, function (wm, st, escape, mentions, username) {
      if (escape === '\\') {
        return st + mentions;
      }

      //check if options.ghMentionsLink is a string
      if (!showdown.helper.isString(options.ghMentionsLink)) {
        throw new Error('ghMentionsLink option must be a string');
      }
      var lnk = options.ghMentionsLink.replace(/\{u}/g, username);
      return st + '<a href="' + lnk + '">' + mentions + '</a>';
    });
  }

  text = globals.converter._dispatch('anchors.after', text, options, globals);
  return text;
});

showdown.subParser('autoLinks', function (text, options, globals) {
  'use strict';

  text = globals.converter._dispatch('autoLinks.before', text, options, globals);

  var simpleURLRegex  = /\b(((https?|ftp|dict):\/\/|www\.)[^'">\s]+\.[^'">\s]+)()(?=\s|$)(?!["<>])/gi,
      simpleURLRegex2 = /\b(((https?|ftp|dict):\/\/|www\.)[^'">\s]+\.[^'">\s]+?)([.!?()]?)(?=\s|$)(?!["<>])/gi,
      delimUrlRegex   = /<(((https?|ftp|dict):\/\/|www\.)[^'">\s]+)>/gi,
      simpleMailRegex = /(^|\s)(?:mailto:)?([A-Za-z0-9!#$%&'*+-/=?^_`{|}~.]+@[-a-z0-9]+(\.[-a-z0-9]+)*\.[a-z]+)(?=$|\s)/gmi,
      delimMailRegex  = /<()(?:mailto:)?([-.\w]+@[-a-z0-9]+(\.[-a-z0-9]+)*\.[a-z]+)>/gi;

  text = text.replace(delimUrlRegex, replaceLink);
  text = text.replace(delimMailRegex, replaceMail);
  // simpleURLRegex  = /\b(((https?|ftp|dict):\/\/|www\.)[-.+~:?#@!$&'()*,;=[\]\w]+)\b/gi,
  // Email addresses: <address@domain.foo>

  if (options.simplifiedAutoLink) {
    if (options.excludeTrailingPunctuationFromURLs) {
      text = text.replace(simpleURLRegex2, replaceLink);
    } else {
      text = text.replace(simpleURLRegex, replaceLink);
    }
    text = text.replace(simpleMailRegex, replaceMail);
  }

  function replaceLink (wm, link, m2, m3, trailingPunctuation) {
    var lnkTxt = link,
        append = '';
    if (/^www\./i.test(link)) {
      link = link.replace(/^www\./i, 'http://www.');
    }
    if (options.excludeTrailingPunctuationFromURLs && trailingPunctuation) {
      append = trailingPunctuation;
    }
    return '<a href="' + link + '">' + lnkTxt + '</a>' + append;
  }

  function replaceMail (wholeMatch, b, mail) {
    var href = 'mailto:';
    b = b || '';
    mail = showdown.subParser('unescapeSpecialChars')(mail, options, globals);
    if (options.encodeEmails) {
      href = showdown.helper.encodeEmailAddress(href + mail);
      mail = showdown.helper.encodeEmailAddress(mail);
    } else {
      href = href + mail;
    }
    return b + '<a href="' + href + '">' + mail + '</a>';
  }

  text = globals.converter._dispatch('autoLinks.after', text, options, globals);

  return text;
});

/**
 * These are all the transformations that form block-level
 * tags like paragraphs, headers, and list items.
 */
showdown.subParser('blockGamut', function (text, options, globals) {
  'use strict';

  text = globals.converter._dispatch('blockGamut.before', text, options, globals);

  // we parse blockquotes first so that we can have headings and hrs
  // inside blockquotes
  text = showdown.subParser('blockQuotes')(text, options, globals);
  text = showdown.subParser('headers')(text, options, globals);

  // Do Horizontal Rules:
  text = showdown.subParser('horizontalRule')(text, options, globals);

  text = showdown.subParser('lists')(text, options, globals);
  text = showdown.subParser('codeBlocks')(text, options, globals);
  text = showdown.subParser('tables')(text, options, globals);

  // We already ran _HashHTMLBlocks() before, in Markdown(), but that
  // was to escape raw HTML in the original Markdown source. This time,
  // we're escaping the markup we've just created, so that we don't wrap
  // <p> tags around block-level tags.
  text = showdown.subParser('hashHTMLBlocks')(text, options, globals);
  text = showdown.subParser('paragraphs')(text, options, globals);

  text = globals.converter._dispatch('blockGamut.after', text, options, globals);

  return text;
});

showdown.subParser('blockQuotes', function (text, options, globals) {
  'use strict';

  text = globals.converter._dispatch('blockQuotes.before', text, options, globals);

  text = text.replace(/((^ {0,3}>[ \t]?.+\n(.+\n)*\n*)+)/gm, function (wholeMatch, m1) {
    var bq = m1;

    // attacklab: hack around Konqueror 3.5.4 bug:
    // "----------bug".replace(/^-/g,"") == "bug"
    bq = bq.replace(/^[ \t]*>[ \t]?/gm, '¨0'); // trim one level of quoting

    // attacklab: clean up hack
    bq = bq.replace(/¨0/g, '');

    bq = bq.replace(/^[ \t]+$/gm, ''); // trim whitespace-only lines
    bq = showdown.subParser('githubCodeBlocks')(bq, options, globals);
    bq = showdown.subParser('blockGamut')(bq, options, globals); // recurse

    bq = bq.replace(/(^|\n)/g, '$1  ');
    // These leading spaces screw with <pre> content, so we need to fix that:
    bq = bq.replace(/(\s*<pre>[^\r]+?<\/pre>)/gm, function (wholeMatch, m1) {
      var pre = m1;
      // attacklab: hack around Konqueror 3.5.4 bug:
      pre = pre.replace(/^  /mg, '¨0');
      pre = pre.replace(/¨0/g, '');
      return pre;
    });

    return showdown.subParser('hashBlock')('<blockquote>\n' + bq + '\n</blockquote>', options, globals);
  });

  text = globals.converter._dispatch('blockQuotes.after', text, options, globals);
  return text;
});

/**
 * Process Markdown `<pre><code>` blocks.
 */
showdown.subParser('codeBlocks', function (text, options, globals) {
  'use strict';

  text = globals.converter._dispatch('codeBlocks.before', text, options, globals);

  // sentinel workarounds for lack of \A and \Z, safari\khtml bug
  text += '¨0';

  var pattern = /(?:\n\n|^)((?:(?:[ ]{4}|\t).*\n+)+)(\n*[ ]{0,3}[^ \t\n]|(?=¨0))/g;
  text = text.replace(pattern, function (wholeMatch, m1, m2) {
    var codeblock = m1,
        nextChar = m2,
        end = '\n';

    codeblock = showdown.subParser('outdent')(codeblock, options, globals);
    codeblock = showdown.subParser('encodeCode')(codeblock, options, globals);
    codeblock = showdown.subParser('detab')(codeblock, options, globals);
    codeblock = codeblock.replace(/^\n+/g, ''); // trim leading newlines
    codeblock = codeblock.replace(/\n+$/g, ''); // trim trailing newlines

    if (options.omitExtraWLInCodeBlocks) {
      end = '';
    }

    codeblock = '<pre><code>' + codeblock + end + '</code></pre>';

    return showdown.subParser('hashBlock')(codeblock, options, globals) + nextChar;
  });

  // strip sentinel
  text = text.replace(/¨0/, '');

  text = globals.converter._dispatch('codeBlocks.after', text, options, globals);
  return text;
});

/**
 *
 *   *  Backtick quotes are used for <code></code> spans.
 *
 *   *  You can use multiple backticks as the delimiters if you want to
 *     include literal backticks in the code span. So, this input:
 *
 *         Just type ``foo `bar` baz`` at the prompt.
 *
 *       Will translate to:
 *
 *         <p>Just type <code>foo `bar` baz</code> at the prompt.</p>
 *
 *    There's no arbitrary limit to the number of backticks you
 *    can use as delimters. If you need three consecutive backticks
 *    in your code, use four for delimiters, etc.
 *
 *  *  You can use spaces to get literal backticks at the edges:
 *
 *         ... type `` `bar` `` ...
 *
 *       Turns to:
 *
 *         ... type <code>`bar`</code> ...
 */
showdown.subParser('codeSpans', function (text, options, globals) {
  'use strict';

  text = globals.converter._dispatch('codeSpans.before', text, options, globals);

  if (typeof(text) === 'undefined') {
    text = '';
  }
  text = text.replace(/(^|[^\\])(`+)([^\r]*?[^`])\2(?!`)/gm,
    function (wholeMatch, m1, m2, m3) {
      var c = m3;
      c = c.replace(/^([ \t]*)/g, '');	// leading whitespace
      c = c.replace(/[ \t]*$/g, '');	// trailing whitespace
      c = showdown.subParser('encodeCode')(c, options, globals);
      return m1 + '<code>' + c + '</code>';
    }
  );

  text = globals.converter._dispatch('codeSpans.after', text, options, globals);
  return text;
});

/**
 * Convert all tabs to spaces
 */
showdown.subParser('detab', function (text, options, globals) {
  'use strict';
  text = globals.converter._dispatch('detab.before', text, options, globals);

  // expand first n-1 tabs
  text = text.replace(/\t(?=\t)/g, '    '); // g_tab_width

  // replace the nth with two sentinels
  text = text.replace(/\t/g, '¨A¨B');

  // use the sentinel to anchor our regex so it doesn't explode
  text = text.replace(/¨B(.+?)¨A/g, function (wholeMatch, m1) {
    var leadingText = m1,
        numSpaces = 4 - leadingText.length % 4;  // g_tab_width

    // there *must* be a better way to do this:
    for (var i = 0; i < numSpaces; i++) {
      leadingText += ' ';
    }

    return leadingText;
  });

  // clean up sentinels
  text = text.replace(/¨A/g, '    ');  // g_tab_width
  text = text.replace(/¨B/g, '');

  text = globals.converter._dispatch('detab.after', text, options, globals);
  return text;
});

/**
 * Smart processing for ampersands and angle brackets that need to be encoded.
 */
showdown.subParser('encodeAmpsAndAngles', function (text, options, globals) {
  'use strict';
  text = globals.converter._dispatch('encodeAmpsAndAngles.before', text, options, globals);

  // Ampersand-encoding based entirely on Nat Irons's Amputator MT plugin:
  // http://bumppo.net/projects/amputator/
  text = text.replace(/&(?!#?[xX]?(?:[0-9a-fA-F]+|\w+);)/g, '&amp;');

  // Encode naked <'s
  text = text.replace(/<(?![a-z\/?$!])/gi, '&lt;');

  // Encode <
  text = text.replace(/</g, '&lt;');

  // Encode >
  text = text.replace(/>/g, '&gt;');

  text = globals.converter._dispatch('encodeAmpsAndAngles.after', text, options, globals);
  return text;
});

/**
 * Returns the string, with after processing the following backslash escape sequences.
 *
 * attacklab: The polite way to do this is with the new escapeCharacters() function:
 *
 *    text = escapeCharacters(text,"\\",true);
 *    text = escapeCharacters(text,"`*_{}[]()>#+-.!",true);
 *
 * ...but we're sidestepping its use of the (slow) RegExp constructor
 * as an optimization for Firefox.  This function gets called a LOT.
 */
showdown.subParser('encodeBackslashEscapes', function (text, options, globals) {
  'use strict';
  text = globals.converter._dispatch('encodeBackslashEscapes.before', text, options, globals);

  text = text.replace(/\\(\\)/g, showdown.helper.escapeCharactersCallback);
  text = text.replace(/\\([`*_{}\[\]()>#+.!~=-])/g, showdown.helper.escapeCharactersCallback);

  text = globals.converter._dispatch('encodeBackslashEscapes.after', text, options, globals);
  return text;
});

/**
 * Encode/escape certain characters inside Markdown code runs.
 * The point is that in code, these characters are literals,
 * and lose their special Markdown meanings.
 */
showdown.subParser('encodeCode', function (text, options, globals) {
  'use strict';

  text = globals.converter._dispatch('encodeCode.before', text, options, globals);

  // Encode all ampersands; HTML entities are not
  // entities within a Markdown code span.
  text = text
    .replace(/&/g, '&amp;')
  // Do the angle bracket song and dance:
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  // Now, escape characters that are magic in Markdown:
    .replace(/([*_{}\[\]\\=~-])/g, showdown.helper.escapeCharactersCallback);

  text = globals.converter._dispatch('encodeCode.after', text, options, globals);
  return text;
});

/**
 * Within tags -- meaning between < and > -- encode [\ ` * _ ~ =] so they
 * don't conflict with their use in Markdown for code, italics and strong.
 */
showdown.subParser('escapeSpecialCharsWithinTagAttributes', function (text, options, globals) {
  'use strict';
  text = globals.converter._dispatch('escapeSpecialCharsWithinTagAttributes.before', text, options, globals);

  // Build a regex to find HTML tags and comments.  See Friedl's
  // "Mastering Regular Expressions", 2nd Ed., pp. 200-201.
  var regex = /(<[a-z\/!$]("[^"]*"|'[^']*'|[^'">])*>|<!(--.*?--\s*)+>)/gi;

  text = text.replace(regex, function (wholeMatch) {
    return wholeMatch
      .replace(/(.)<\/?code>(?=.)/g, '$1`')
      .replace(/([\\`*_~=])/g, showdown.helper.escapeCharactersCallback);
  });

  text = globals.converter._dispatch('escapeSpecialCharsWithinTagAttributes.after', text, options, globals);
  return text;
});

/**
 * Handle github codeblocks prior to running HashHTML so that
 * HTML contained within the codeblock gets escaped properly
 * Example:
 * ```ruby
 *     def hello_world(x)
 *       puts "Hello, #{x}"
 *     end
 * ```
 */
showdown.subParser('githubCodeBlocks', function (text, options, globals) {
  'use strict';

  // early exit if option is not enabled
  if (!options.ghCodeBlocks) {
    return text;
  }

  text = globals.converter._dispatch('githubCodeBlocks.before', text, options, globals);

  text += '¨0';

  text = text.replace(/(?:^|\n)```(.*)\n([\s\S]*?)\n```/g, function (wholeMatch, language, codeblock) {
    var end = (options.omitExtraWLInCodeBlocks) ? '' : '\n';

    // First parse the github code block
    codeblock = showdown.subParser('encodeCode')(codeblock, options, globals);
    codeblock = showdown.subParser('detab')(codeblock, options, globals);
    codeblock = codeblock.replace(/^\n+/g, ''); // trim leading newlines
    codeblock = codeblock.replace(/\n+$/g, ''); // trim trailing whitespace

    codeblock = '<pre><code' + (language ? ' class="' + language + ' language-' + language + '"' : '') + '>' + codeblock + end + '</code></pre>';

    codeblock = showdown.subParser('hashBlock')(codeblock, options, globals);

    // Since GHCodeblocks can be false positives, we need to
    // store the primitive text and the parsed text in a global var,
    // and then return a token
    return '\n\n¨G' + (globals.ghCodeBlocks.push({text: wholeMatch, codeblock: codeblock}) - 1) + 'G\n\n';
  });

  // attacklab: strip sentinel
  text = text.replace(/¨0/, '');

  return globals.converter._dispatch('githubCodeBlocks.after', text, options, globals);
});

showdown.subParser('hashBlock', function (text, options, globals) {
  'use strict';
  text = globals.converter._dispatch('hashBlock.before', text, options, globals);
  text = text.replace(/(^\n+|\n+$)/g, '');
  text = '\n\n¨K' + (globals.gHtmlBlocks.push(text) - 1) + 'K\n\n';
  text = globals.converter._dispatch('hashBlock.after', text, options, globals);
  return text;
});

/**
 * Hash and escape <code> elements that should not be parsed as markdown
 */
showdown.subParser('hashCodeTags', function (text, options, globals) {
  'use strict';
  text = globals.converter._dispatch('hashCodeTags.before', text, options, globals);

  var repFunc = function (wholeMatch, match, left, right) {
    var codeblock = left + showdown.subParser('encodeCode')(match, options, globals) + right;
    return '¨C' + (globals.gHtmlSpans.push(codeblock) - 1) + 'C';
  };

  // Hash naked <code>
  text = showdown.helper.replaceRecursiveRegExp(text, repFunc, '<code\\b[^>]*>', '</code>', 'gim');

  text = globals.converter._dispatch('hashCodeTags.after', text, options, globals);
  return text;
});

showdown.subParser('hashElement', function (text, options, globals) {
  'use strict';

  return function (wholeMatch, m1) {
    var blockText = m1;

    // Undo double lines
    blockText = blockText.replace(/\n\n/g, '\n');
    blockText = blockText.replace(/^\n/, '');

    // strip trailing blank lines
    blockText = blockText.replace(/\n+$/g, '');

    // Replace the element text with a marker ("¨KxK" where x is its key)
    blockText = '\n\n¨K' + (globals.gHtmlBlocks.push(blockText) - 1) + 'K\n\n';

    return blockText;
  };
});

showdown.subParser('hashHTMLBlocks', function (text, options, globals) {
  'use strict';
  text = globals.converter._dispatch('hashHTMLBlocks.before', text, options, globals);

  var blockTags = [
        'pre',
        'div',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'blockquote',
        'table',
        'dl',
        'ol',
        'ul',
        'script',
        'noscript',
        'form',
        'fieldset',
        'iframe',
        'math',
        'style',
        'section',
        'header',
        'footer',
        'nav',
        'article',
        'aside',
        'address',
        'audio',
        'canvas',
        'figure',
        'hgroup',
        'output',
        'video',
        'p'
      ],
      repFunc = function (wholeMatch, match, left, right) {
        var txt = wholeMatch;
        // check if this html element is marked as markdown
        // if so, it's contents should be parsed as markdown
        if (left.search(/\bmarkdown\b/) !== -1) {
          txt = left + globals.converter.makeHtml(match) + right;
        }
        return '\n\n¨K' + (globals.gHtmlBlocks.push(txt) - 1) + 'K\n\n';
      };

  for (var i = 0; i < blockTags.length; ++i) {
    text = showdown.helper.replaceRecursiveRegExp(text, repFunc, '^ {0,3}<' + blockTags[i] + '\\b[^>]*>', '</' + blockTags[i] + '>', 'gim');
  }

  // HR SPECIAL CASE
  text = text.replace(/(\n {0,3}(<(hr)\b([^<>])*?\/?>)[ \t]*(?=\n{2,}))/g,
    showdown.subParser('hashElement')(text, options, globals));

  // Special case for standalone HTML comments
  text = showdown.helper.replaceRecursiveRegExp(text, function (txt) {
    return '\n\n¨K' + (globals.gHtmlBlocks.push(txt) - 1) + 'K\n\n';
  }, '^ {0,3}<!--', '-->', 'gm');

  // PHP and ASP-style processor instructions (<?...?> and <%...%>)
  text = text.replace(/(?:\n\n)( {0,3}(?:<([?%])[^\r]*?\2>)[ \t]*(?=\n{2,}))/g,
    showdown.subParser('hashElement')(text, options, globals));

  text = globals.converter._dispatch('hashHTMLBlocks.after', text, options, globals);
  return text;
});

/**
 * Hash span elements that should not be parsed as markdown
 */
showdown.subParser('hashHTMLSpans', function (text, options, globals) {
  'use strict';
  text = globals.converter._dispatch('hashHTMLSpans.before', text, options, globals);

  function hashHTMLSpan (html) {
    return '¨C' + (globals.gHtmlSpans.push(html) - 1) + 'C';
  }

  // Hash Self Closing tags
  text = text.replace(/<[^>]+?\/>/gi, function (wm) {
    return hashHTMLSpan(wm);
  });

  // Hash tags without properties
  text = text.replace(/<([^>]+?)>[\s\S]*?<\/\1>/g, function (wm) {
    return hashHTMLSpan(wm);
  });

  // Hash tags with properties
  text = text.replace(/<([^>]+?)\s[^>]+?>[\s\S]*?<\/\1>/g, function (wm) {
    return hashHTMLSpan(wm);
  });

  // Hash self closing tags without />
  text = text.replace(/<[^>]+?>/gi, function (wm) {
    return hashHTMLSpan(wm);
  });

  /*showdown.helper.matchRecursiveRegExp(text, '<code\\b[^>]*>', '</code>', 'gi');*/

  text = globals.converter._dispatch('hashHTMLSpans.after', text, options, globals);
  return text;
});

/**
 * Unhash HTML spans
 */
showdown.subParser('unhashHTMLSpans', function (text, options, globals) {
  'use strict';
  text = globals.converter._dispatch('unhashHTMLSpans.before', text, options, globals);

  for (var i = 0; i < globals.gHtmlSpans.length; ++i) {
    var repText = globals.gHtmlSpans[i],
        // limiter to prevent infinite loop (assume 10 as limit for recurse)
        limit = 0;

    while (/¨C(\d+)C/.test(repText)) {
      var num = RegExp.$1;
      repText = repText.replace('¨C' + num + 'C', globals.gHtmlSpans[num]);
      if (limit === 10) {
        break;
      }
      ++limit;
    }
    text = text.replace('¨C' + i + 'C', repText);
  }

  text = globals.converter._dispatch('unhashHTMLSpans.after', text, options, globals);
  return text;
});

/**
 * Hash and escape <pre><code> elements that should not be parsed as markdown
 */
showdown.subParser('hashPreCodeTags', function (text, options, globals) {
  'use strict';
  text = globals.converter._dispatch('hashPreCodeTags.before', text, options, globals);

  var repFunc = function (wholeMatch, match, left, right) {
    // encode html entities
    var codeblock = left + showdown.subParser('encodeCode')(match, options, globals) + right;
    return '\n\n¨G' + (globals.ghCodeBlocks.push({text: wholeMatch, codeblock: codeblock}) - 1) + 'G\n\n';
  };

  // Hash <pre><code>
  text = showdown.helper.replaceRecursiveRegExp(text, repFunc, '^ {0,3}<pre\\b[^>]*>\\s*<code\\b[^>]*>', '^ {0,3}</code>\\s*</pre>', 'gim');

  text = globals.converter._dispatch('hashPreCodeTags.after', text, options, globals);
  return text;
});

showdown.subParser('headers', function (text, options, globals) {
  'use strict';

  text = globals.converter._dispatch('headers.before', text, options, globals);

  var headerLevelStart = (isNaN(parseInt(options.headerLevelStart))) ? 1 : parseInt(options.headerLevelStart),
      ghHeaderId = options.ghCompatibleHeaderId,

  // Set text-style headers:
  //	Header 1
  //	========
  //
  //	Header 2
  //	--------
  //
      setextRegexH1 = (options.smoothLivePreview) ? /^(.+)[ \t]*\n={2,}[ \t]*\n+/gm : /^(.+)[ \t]*\n=+[ \t]*\n+/gm,
      setextRegexH2 = (options.smoothLivePreview) ? /^(.+)[ \t]*\n-{2,}[ \t]*\n+/gm : /^(.+)[ \t]*\n-+[ \t]*\n+/gm;

  text = text.replace(setextRegexH1, function (wholeMatch, m1) {

    var spanGamut = showdown.subParser('spanGamut')(m1, options, globals),
        hID = (options.noHeaderId) ? '' : ' id="' + headerId(m1) + '"',
        hLevel = headerLevelStart,
        hashBlock = '<h' + hLevel + hID + '>' + spanGamut + '</h' + hLevel + '>';
    return showdown.subParser('hashBlock')(hashBlock, options, globals);
  });

  text = text.replace(setextRegexH2, function (matchFound, m1) {
    var spanGamut = showdown.subParser('spanGamut')(m1, options, globals),
        hID = (options.noHeaderId) ? '' : ' id="' + headerId(m1) + '"',
        hLevel = headerLevelStart + 1,
        hashBlock = '<h' + hLevel + hID + '>' + spanGamut + '</h' + hLevel + '>';
    return showdown.subParser('hashBlock')(hashBlock, options, globals);
  });

  // atx-style headers:
  //  # Header 1
  //  ## Header 2
  //  ## Header 2 with closing hashes ##
  //  ...
  //  ###### Header 6
  //
  var atxStyle = (options.requireSpaceBeforeHeadingText) ? /^(#{1,6})[ \t]+(.+?)[ \t]*#*\n+/gm : /^(#{1,6})[ \t]*(.+?)[ \t]*#*\n+/gm;

  text = text.replace(atxStyle, function (wholeMatch, m1, m2) {
    var span = showdown.subParser('spanGamut')(m2, options, globals),
        hID = (options.noHeaderId) ? '' : ' id="' + headerId(m2) + '"',
        hLevel = headerLevelStart - 1 + m1.length,
        header = '<h' + hLevel + hID + '>' + span + '</h' + hLevel + '>';

    return showdown.subParser('hashBlock')(header, options, globals);
  });

  function headerId (m) {
    var title;
    // Prefix id to prevent causing inadvertent pre-existing style matches.
    if (showdown.helper.isString(options.prefixHeaderId)) {
      title = options.prefixHeaderId + m;
    } else if (options.prefixHeaderId === true) {
      title = 'section ' + m;
    } else {
      title = m;
    }

    if (ghHeaderId) {
      title = title
        .replace(/ /g, '-')
        // replace previously escaped chars (&, ¨ and $)
        .replace(/&amp;/g, '')
        .replace(/¨T/g, '')
        .replace(/¨D/g, '')
        // replace rest of the chars (&~$ are repeated as they might have been escaped)
        // borrowed from github's redcarpet (some they should produce similar results)
        .replace(/[&+$,\/:;=?@"#{}|^¨~\[\]`\\*)(%.!'<>]/g, '')
        .toLowerCase();
    } else {
      title = title
        .replace(/[^\w]/g, '')
        .toLowerCase();
    }

    if (globals.hashLinkCounts[title]) {
      title = title + '-' + (globals.hashLinkCounts[title]++);
    } else {
      globals.hashLinkCounts[title] = 1;
    }
    return title;
  }

  text = globals.converter._dispatch('headers.after', text, options, globals);
  return text;
});

/**
 * Turn Markdown link shortcuts into XHTML <a> tags.
 */
showdown.subParser('horizontalRule', function (text, options, globals) {
  'use strict';
  text = globals.converter._dispatch('horizontalRule.before', text, options, globals);

  var key = showdown.subParser('hashBlock')('<hr />', options, globals);
  text = text.replace(/^ {0,2}( ?-){3,}[ \t]*$/gm, key);
  text = text.replace(/^ {0,2}( ?\*){3,}[ \t]*$/gm, key);
  text = text.replace(/^ {0,2}( ?_){3,}[ \t]*$/gm, key);

  text = globals.converter._dispatch('horizontalRule.after', text, options, globals);
  return text;
});

/**
 * Turn Markdown image shortcuts into <img> tags.
 */
showdown.subParser('images', function (text, options, globals) {
  'use strict';

  text = globals.converter._dispatch('images.before', text, options, globals);

  var inlineRegExp    = /!\[(.*?)]\s?\([ \t]*()<?(\S+?)>?(?: =([*\d]+[A-Za-z%]{0,4})x([*\d]+[A-Za-z%]{0,4}))?[ \t]*(?:(['"])(.*?)\6[ \t]*)?\)/g,
      referenceRegExp = /!\[([^\]]*?)] ?(?:\n *)?\[(.*?)]()()()()()/g;

  function writeImageTag (wholeMatch, altText, linkId, url, width, height, m5, title) {

    var gUrls   = globals.gUrls,
        gTitles = globals.gTitles,
        gDims   = globals.gDimensions;

    linkId = linkId.toLowerCase();

    if (!title) {
      title = '';
    }

    if (url === '' || url === null) {
      if (linkId === '' || linkId === null) {
        // lower-case and turn embedded newlines into spaces
        linkId = altText.toLowerCase().replace(/ ?\n/g, ' ');
      }
      url = '#' + linkId;

      if (!showdown.helper.isUndefined(gUrls[linkId])) {
        url = gUrls[linkId];
        if (!showdown.helper.isUndefined(gTitles[linkId])) {
          title = gTitles[linkId];
        }
        if (!showdown.helper.isUndefined(gDims[linkId])) {
          width = gDims[linkId].width;
          height = gDims[linkId].height;
        }
      } else {
        return wholeMatch;
      }
    }

    altText = altText
      .replace(/"/g, '&quot;')
    //altText = showdown.helper.escapeCharacters(altText, '*_', false);
      .replace(showdown.helper.regexes.asteriskAndDash, showdown.helper.escapeCharactersCallback);
    //url = showdown.helper.escapeCharacters(url, '*_', false);
    url = url.replace(showdown.helper.regexes.asteriskAndDash, showdown.helper.escapeCharactersCallback);
    var result = '<img src="' + url + '" alt="' + altText + '"';

    if (title) {
      title = title
        .replace(/"/g, '&quot;')
      //title = showdown.helper.escapeCharacters(title, '*_', false);
        .replace(showdown.helper.regexes.asteriskAndDash, showdown.helper.escapeCharactersCallback);
      result += ' title="' + title + '"';
    }

    if (width && height) {
      width  = (width === '*') ? 'auto' : width;
      height = (height === '*') ? 'auto' : height;

      result += ' width="' + width + '"';
      result += ' height="' + height + '"';
    }

    result += ' />';

    return result;
  }

  // First, handle reference-style labeled images: ![alt text][id]
  text = text.replace(referenceRegExp, writeImageTag);

  // Next, handle inline images:  ![alt text](url =<width>x<height> "optional title")
  text = text.replace(inlineRegExp, writeImageTag);

  text = globals.converter._dispatch('images.after', text, options, globals);
  return text;
});

showdown.subParser('italicsAndBold', function (text, options, globals) {
  'use strict';

  text = globals.converter._dispatch('italicsAndBold.before', text, options, globals);

  // it's faster to have 3 separate regexes for each case than have just one
  // because of backtracing, in some cases, it could lead to an exponential effect
  // called "catastrophic backtrace". Ominous!

  // Parse underscores
  if (options.literalMidWordUnderscores) {
    text = text.replace(/\b___(\S[\s\S]*)___\b/g, '<strong><em>$1</em></strong>');
    text = text.replace(/\b__(\S[\s\S]*)__\b/g, '<strong>$1</strong>');
    text = text.replace(/\b_(\S[\s\S]*?)_\b/g, '<em>$1</em>');
  } else {
    text = text.replace(/___(\S[\s\S]*?)___/g, function (wm, m) {
      return (/\S$/.test(m)) ? '<strong><em>' + m + '</em></strong>' : wm;
    });
    text = text.replace(/__(\S[\s\S]*?)__/g, function (wm, m) {
      return (/\S$/.test(m)) ? '<strong>' + m + '</strong>' : wm;
    });
    text = text.replace(/_([^\s_][\s\S]*?)_/g, function (wm, m) {
      // !/^_[^_]/.test(m) - test if it doesn't start with __ (since it seems redundant, we removed it)
      return (/\S$/.test(m)) ? '<em>' + m + '</em>' : wm;
    });
  }

  // Now parse asterisks
  text = text.replace(/\*\*\*(\S[\s\S]*?)\*\*\*/g, function (wm, m) {
    return (/\S$/.test(m)) ? '<strong><em>' + m + '</em></strong>' : wm;
  });
  text = text.replace(/\*\*(\S[\s\S]*?)\*\*/g, function (wm, m) {
    return (/\S$/.test(m)) ? '<strong>' + m + '</strong>' : wm;
  });
  text = text.replace(/\*([^\s*][\s\S]*?)\*/g, function (wm, m) {
    // !/^\*[^*]/.test(m) - test if it doesn't start with ** (since it seems redundant, we removed it)
    return (/\S$/.test(m)) ? '<em>' + m + '</em>' : wm;
  });

  text = globals.converter._dispatch('italicsAndBold.after', text, options, globals);
  return text;
});

/**
 * Form HTML ordered (numbered) and unordered (bulleted) lists.
 */
showdown.subParser('lists', function (text, options, globals) {
  'use strict';
  text = globals.converter._dispatch('lists.before', text, options, globals);

  /**
   * Process the contents of a single ordered or unordered list, splitting it
   * into individual list items.
   * @param {string} listStr
   * @param {boolean} trimTrailing
   * @returns {string}
   */
  function processListItems (listStr, trimTrailing) {
    // The $g_list_level global keeps track of when we're inside a list.
    // Each time we enter a list, we increment it; when we leave a list,
    // we decrement. If it's zero, we're not in a list anymore.
    //
    // We do this because when we're not inside a list, we want to treat
    // something like this:
    //
    //    I recommend upgrading to version
    //    8. Oops, now this line is treated
    //    as a sub-list.
    //
    // As a single paragraph, despite the fact that the second line starts
    // with a digit-period-space sequence.
    //
    // Whereas when we're inside a list (or sub-list), that line will be
    // treated as the start of a sub-list. What a kludge, huh? This is
    // an aspect of Markdown's syntax that's hard to parse perfectly
    // without resorting to mind-reading. Perhaps the solution is to
    // change the syntax rules such that sub-lists must start with a
    // starting cardinal number; e.g. "1." or "a.".
    globals.gListLevel++;

    // trim trailing blank lines:
    listStr = listStr.replace(/\n{2,}$/, '\n');

    // attacklab: add sentinel to emulate \z
    listStr += '¨0';

    var rgx = /(\n)?(^ {0,3})([*+-]|\d+[.])[ \t]+((\[(x|X| )?])?[ \t]*[^\r]+?(\n{1,2}))(?=\n*(¨0| {0,3}([*+-]|\d+[.])[ \t]+))/gm,
        isParagraphed = (/\n[ \t]*\n(?!¨0)/.test(listStr));

    // Since version 1.5, nesting sublists requires 4 spaces (or 1 tab) indentation,
    // which is a syntax breaking change
    // activating this option reverts to old behavior
    if (options.disableForced4SpacesIndentedSublists) {
      rgx = /(\n)?(^ {0,3})([*+-]|\d+[.])[ \t]+((\[(x|X| )?])?[ \t]*[^\r]+?(\n{1,2}))(?=\n*(¨0|\2([*+-]|\d+[.])[ \t]+))/gm;
    }

    listStr = listStr.replace(rgx, function (wholeMatch, m1, m2, m3, m4, taskbtn, checked) {
      checked = (checked && checked.trim() !== '');

      var item = showdown.subParser('outdent')(m4, options, globals),
          bulletStyle = '';

      // Support for github tasklists
      if (taskbtn && options.tasklists) {
        bulletStyle = ' class="task-list-item" style="list-style-type: none;"';
        item = item.replace(/^[ \t]*\[(x|X| )?]/m, function () {
          var otp = '<input type="checkbox" disabled style="margin: 0px 0.35em 0.25em -1.6em; vertical-align: middle;"';
          if (checked) {
            otp += ' checked';
          }
          otp += '>';
          return otp;
        });
      }

      // ISSUE #312
      // This input: - - - a
      // causes trouble to the parser, since it interprets it as:
      // <ul><li><li><li>a</li></li></li></ul>
      // instead of:
      // <ul><li>- - a</li></ul>
      // So, to prevent it, we will put a marker (¨A)in the beginning of the line
      // Kind of hackish/monkey patching, but seems more effective than overcomplicating the list parser
      item = item.replace(/^([-*+]|\d\.)[ \t]+[\S\n ]*/g, function (wm2) {
        return '¨A' + wm2;
      });

      // m1 - Leading line or
      // Has a double return (multi paragraph) or
      // Has sublist
      if (m1 || (item.search(/\n{2,}/) > -1)) {
        item = showdown.subParser('githubCodeBlocks')(item, options, globals);
        item = showdown.subParser('blockGamut')(item, options, globals);
      } else {
        // Recursion for sub-lists:
        item = showdown.subParser('lists')(item, options, globals);
        item = item.replace(/\n$/, ''); // chomp(item)
        item = showdown.subParser('hashHTMLBlocks')(item, options, globals);
        // Colapse double linebreaks
        item = item.replace(/\n\n+/g, '\n\n');
        // replace double linebreaks with a placeholder
        item = item.replace(/\n\n/g, '¨B');
        if (isParagraphed) {
          item = showdown.subParser('paragraphs')(item, options, globals);
        } else {
          item = showdown.subParser('spanGamut')(item, options, globals);
        }
        item = item.replace(/¨B/g, '\n\n');
      }

      // now we need to remove the marker (¨A)
      item = item.replace('¨A', '');
      // we can finally wrap the line in list item tags
      item =  '<li' + bulletStyle + '>' + item + '</li>\n';

      return item;
    });

    // attacklab: strip sentinel
    listStr = listStr.replace(/¨0/g, '');

    globals.gListLevel--;

    if (trimTrailing) {
      listStr = listStr.replace(/\s+$/, '');
    }

    return listStr;
  }

  /**
   * Check and parse consecutive lists (better fix for issue #142)
   * @param {string} list
   * @param {string} listType
   * @param {boolean} trimTrailing
   * @returns {string}
   */
  function parseConsecutiveLists (list, listType, trimTrailing) {
    // check if we caught 2 or more consecutive lists by mistake
    // we use the counterRgx, meaning if listType is UL we look for OL and vice versa
    var olRgx = (options.disableForced4SpacesIndentedSublists) ? /^ ?\d+\.[ \t]/gm : /^ {0,3}\d+\.[ \t]/gm,
        ulRgx = (options.disableForced4SpacesIndentedSublists) ? /^ ?[*+-][ \t]/gm : /^ {0,3}[*+-][ \t]/gm,
        counterRxg = (listType === 'ul') ? olRgx : ulRgx,
        result = '';

    if (list.search(counterRxg) !== -1) {
      (function parseCL (txt) {
        var pos = txt.search(counterRxg);
        if (pos !== -1) {
          // slice
          result += '\n<' + listType + '>\n' + processListItems(txt.slice(0, pos), !!trimTrailing) + '</' + listType + '>\n';

          // invert counterType and listType
          listType = (listType === 'ul') ? 'ol' : 'ul';
          counterRxg = (listType === 'ul') ? olRgx : ulRgx;

          //recurse
          parseCL(txt.slice(pos));
        } else {
          result += '\n<' + listType + '>\n' + processListItems(txt, !!trimTrailing) + '</' + listType + '>\n';
        }
      })(list);
    } else {
      result = '\n<' + listType + '>\n' + processListItems(list, !!trimTrailing) + '</' + listType + '>\n';
    }

    return result;
  }

  // add sentinel to hack around khtml/safari bug:
  // http://bugs.webkit.org/show_bug.cgi?id=11231
  text += '¨0';

  if (globals.gListLevel) {
    text = text.replace(/^(( {0,3}([*+-]|\d+[.])[ \t]+)[^\r]+?(¨0|\n{2,}(?=\S)(?![ \t]*(?:[*+-]|\d+[.])[ \t]+)))/gm,
      function (wholeMatch, list, m2) {
        var listType = (m2.search(/[*+-]/g) > -1) ? 'ul' : 'ol';
        return parseConsecutiveLists(list, listType, true);
      }
    );
  } else {
    text = text.replace(/(\n\n|^\n?)(( {0,3}([*+-]|\d+[.])[ \t]+)[^\r]+?(¨0|\n{2,}(?=\S)(?![ \t]*(?:[*+-]|\d+[.])[ \t]+)))/gm,
      function (wholeMatch, m1, list, m3) {
        var listType = (m3.search(/[*+-]/g) > -1) ? 'ul' : 'ol';
        return parseConsecutiveLists(list, listType, false);
      }
    );
  }

  // strip sentinel
  text = text.replace(/¨0/, '');
  text = globals.converter._dispatch('lists.after', text, options, globals);
  return text;
});

/**
 * Remove one level of line-leading tabs or spaces
 */
showdown.subParser('outdent', function (text, options, globals) {
  'use strict';
  text = globals.converter._dispatch('outdent.before', text, options, globals);

  // attacklab: hack around Konqueror 3.5.4 bug:
  // "----------bug".replace(/^-/g,"") == "bug"
  text = text.replace(/^(\t|[ ]{1,4})/gm, '¨0'); // attacklab: g_tab_width

  // attacklab: clean up hack
  text = text.replace(/¨0/g, '');

  text = globals.converter._dispatch('outdent.after', text, options, globals);
  return text;
});

/**
 *
 */
showdown.subParser('paragraphs', function (text, options, globals) {
  'use strict';

  text = globals.converter._dispatch('paragraphs.before', text, options, globals);
  // Strip leading and trailing lines:
  text = text.replace(/^\n+/g, '');
  text = text.replace(/\n+$/g, '');

  var grafs = text.split(/\n{2,}/g),
      grafsOut = [],
      end = grafs.length; // Wrap <p> tags

  for (var i = 0; i < end; i++) {
    var str = grafs[i];
    // if this is an HTML marker, copy it
    if (str.search(/¨(K|G)(\d+)\1/g) >= 0) {
      grafsOut.push(str);

    // test for presence of characters to prevent empty lines being parsed
    // as paragraphs (resulting in undesired extra empty paragraphs)
    } else if (str.search(/\S/) >= 0) {
      str = showdown.subParser('spanGamut')(str, options, globals);
      str = str.replace(/^([ \t]*)/g, '<p>');
      str += '</p>';
      grafsOut.push(str);
    }
  }

  /** Unhashify HTML blocks */
  end = grafsOut.length;
  for (i = 0; i < end; i++) {
    var blockText = '',
        grafsOutIt = grafsOut[i],
        codeFlag = false;
    // if this is a marker for an html block...
    // use RegExp.test instead of string.search because of QML bug
    while (/¨(K|G)(\d+)\1/.test(grafsOutIt)) {
      var delim = RegExp.$1,
          num   = RegExp.$2;

      if (delim === 'K') {
        blockText = globals.gHtmlBlocks[num];
      } else {
        // we need to check if ghBlock is a false positive
        if (codeFlag) {
          // use encoded version of all text
          blockText = showdown.subParser('encodeCode')(globals.ghCodeBlocks[num].text, options, globals);
        } else {
          blockText = globals.ghCodeBlocks[num].codeblock;
        }
      }
      blockText = blockText.replace(/\$/g, '$$$$'); // Escape any dollar signs

      grafsOutIt = grafsOutIt.replace(/(\n\n)?¨(K|G)\d+\2(\n\n)?/, blockText);
      // Check if grafsOutIt is a pre->code
      if (/^<pre\b[^>]*>\s*<code\b[^>]*>/.test(grafsOutIt)) {
        codeFlag = true;
      }
    }
    grafsOut[i] = grafsOutIt;
  }
  text = grafsOut.join('\n');
  // Strip leading and trailing lines:
  text = text.replace(/^\n+/g, '');
  text = text.replace(/\n+$/g, '');
  return globals.converter._dispatch('paragraphs.after', text, options, globals);
});

/**
 * Run extension
 */
showdown.subParser('runExtension', function (ext, text, options, globals) {
  'use strict';

  if (ext.filter) {
    text = ext.filter(text, globals.converter, options);

  } else if (ext.regex) {
    // TODO remove this when old extension loading mechanism is deprecated
    var re = ext.regex;
    if (!(re instanceof RegExp)) {
      re = new RegExp(re, 'g');
    }
    text = text.replace(re, ext.replace);
  }

  return text;
});

/**
 * These are all the transformations that occur *within* block-level
 * tags like paragraphs, headers, and list items.
 */
showdown.subParser('spanGamut', function (text, options, globals) {
  'use strict';

  text = globals.converter._dispatch('spanGamut.before', text, options, globals);
  text = showdown.subParser('codeSpans')(text, options, globals);
  text = showdown.subParser('escapeSpecialCharsWithinTagAttributes')(text, options, globals);
  text = showdown.subParser('encodeBackslashEscapes')(text, options, globals);

  // Process anchor and image tags. Images must come first,
  // because ![foo][f] looks like an anchor.
  text = showdown.subParser('images')(text, options, globals);
  text = showdown.subParser('anchors')(text, options, globals);

  // Make links out of things like `<http://example.com/>`
  // Must come after _DoAnchors(), because you can use < and >
  // delimiters in inline links like [this](<url>).
  text = showdown.subParser('autoLinks')(text, options, globals);
  text = showdown.subParser('italicsAndBold')(text, options, globals);
  text = showdown.subParser('strikethrough')(text, options, globals);

  // we need to hash HTML tags inside spans
  text = showdown.subParser('hashHTMLSpans')(text, options, globals);

  // now we encode amps and angles
  text = showdown.subParser('encodeAmpsAndAngles')(text, options, globals);

  // Do hard breaks
  if (options.simpleLineBreaks) {
    // GFM style hard breaks
    text = text.replace(/\n/g, '<br />\n');
  } else {
    // Vanilla hard breaks
    text = text.replace(/  +\n/g, '<br />\n');
  }

  text = globals.converter._dispatch('spanGamut.after', text, options, globals);
  return text;
});

showdown.subParser('strikethrough', function (text, options, globals) {
  'use strict';

  if (options.strikethrough) {
    text = globals.converter._dispatch('strikethrough.before', text, options, globals);
    text = text.replace(/(?:~){2}([\s\S]+?)(?:~){2}/g, '<del>$1</del>');
    text = globals.converter._dispatch('strikethrough.after', text, options, globals);
  }

  return text;
});

/**
 * Strips link definitions from text, stores the URLs and titles in
 * hash references.
 * Link defs are in the form: ^[id]: url "optional title"
 */
showdown.subParser('stripLinkDefinitions', function (text, options, globals) {
  'use strict';

  var regex = /^ {0,3}\[(.+)]:[ \t]*\n?[ \t]*<?(\S+?)>?(?: =([*\d]+[A-Za-z%]{0,4})x([*\d]+[A-Za-z%]{0,4}))?[ \t]*\n?[ \t]*(?:(\n*)["|'(](.+?)["|')][ \t]*)?(?:\n+|(?=¨0))/gm;

  // attacklab: sentinel workarounds for lack of \A and \Z, safari\khtml bug
  text += '¨0';

  text = text.replace(regex, function (wholeMatch, linkId, url, width, height, blankLines, title) {
    linkId = linkId.toLowerCase();
    globals.gUrls[linkId] = showdown.subParser('encodeAmpsAndAngles')(url, options, globals);  // Link IDs are case-insensitive

    if (blankLines) {
      // Oops, found blank lines, so it's not a title.
      // Put back the parenthetical statement we stole.
      return blankLines + title;

    } else {
      if (title) {
        globals.gTitles[linkId] = title.replace(/"|'/g, '&quot;');
      }
      if (options.parseImgDimensions && width && height) {
        globals.gDimensions[linkId] = {
          width:  width,
          height: height
        };
      }
    }
    // Completely remove the definition from the text
    return '';
  });

  // attacklab: strip sentinel
  text = text.replace(/¨0/, '');

  return text;
});

showdown.subParser('tables', function (text, options, globals) {
  'use strict';

  if (!options.tables) {
    return text;
  }

  var tableRgx = /^ {0,3}\|?.+\|.+\n[ \t]{0,3}\|?[ \t]*:?[ \t]*(?:-|=){2,}[ \t]*:?[ \t]*\|[ \t]*:?[ \t]*(?:-|=){2,}[\s\S]+?(?:\n\n|¨0)/gm;

  function parseStyles (sLine) {
    if (/^:[ \t]*--*$/.test(sLine)) {
      return ' style="text-align:left;"';
    } else if (/^--*[ \t]*:[ \t]*$/.test(sLine)) {
      return ' style="text-align:right;"';
    } else if (/^:[ \t]*--*[ \t]*:$/.test(sLine)) {
      return ' style="text-align:center;"';
    } else {
      return '';
    }
  }

  function parseHeaders (header, style) {
    var id = '';
    header = header.trim();
    if (options.tableHeaderId) {
      id = ' id="' + header.replace(/ /g, '_').toLowerCase() + '"';
    }
    header = showdown.subParser('spanGamut')(header, options, globals);

    return '<th' + id + style + '>' + header + '</th>\n';
  }

  function parseCells (cell, style) {
    var subText = showdown.subParser('spanGamut')(cell, options, globals);
    return '<td' + style + '>' + subText + '</td>\n';
  }

  function buildTable (headers, cells) {
    var tb = '<table>\n<thead>\n<tr>\n',
        tblLgn = headers.length;

    for (var i = 0; i < tblLgn; ++i) {
      tb += headers[i];
    }
    tb += '</tr>\n</thead>\n<tbody>\n';

    for (i = 0; i < cells.length; ++i) {
      tb += '<tr>\n';
      for (var ii = 0; ii < tblLgn; ++ii) {
        tb += cells[i][ii];
      }
      tb += '</tr>\n';
    }
    tb += '</tbody>\n</table>\n';
    return tb;
  }

  text = globals.converter._dispatch('tables.before', text, options, globals);

  text = text.replace(tableRgx, function (rawTable) {

    var i, tableLines = rawTable.split('\n');

    // strip wrong first and last column if wrapped tables are used
    for (i = 0; i < tableLines.length; ++i) {
      if (/^ {0,3}\|/.test(tableLines[i])) {
        tableLines[i] = tableLines[i].replace(/^ {0,3}\|/, '');
      }
      if (/\|[ \t]*$/.test(tableLines[i])) {
        tableLines[i] = tableLines[i].replace(/\|[ \t]*$/, '');
      }
    }

    var rawHeaders = tableLines[0].split('|').map(function (s) { return s.trim();}),
        rawStyles = tableLines[1].split('|').map(function (s) { return s.trim();}),
        rawCells = [],
        headers = [],
        styles = [],
        cells = [];

    tableLines.shift();
    tableLines.shift();

    for (i = 0; i < tableLines.length; ++i) {
      if (tableLines[i].trim() === '') {
        continue;
      }
      rawCells.push(
        tableLines[i]
          .split('|')
          .map(function (s) {
            return s.trim();
          })
      );
    }

    if (rawHeaders.length < rawStyles.length) {
      return rawTable;
    }

    for (i = 0; i < rawStyles.length; ++i) {
      styles.push(parseStyles(rawStyles[i]));
    }

    for (i = 0; i < rawHeaders.length; ++i) {
      if (showdown.helper.isUndefined(styles[i])) {
        styles[i] = '';
      }
      headers.push(parseHeaders(rawHeaders[i], styles[i]));
    }

    for (i = 0; i < rawCells.length; ++i) {
      var row = [];
      for (var ii = 0; ii < headers.length; ++ii) {
        if (showdown.helper.isUndefined(rawCells[i][ii])) {

        }
        row.push(parseCells(rawCells[i][ii], styles[ii]));
      }
      cells.push(row);
    }

    return buildTable(headers, cells);
  });

  text = globals.converter._dispatch('tables.after', text, options, globals);

  return text;
});

/**
 * Swap back in all the special characters we've hidden.
 */
showdown.subParser('unescapeSpecialChars', function (text, options, globals) {
  'use strict';
  text = globals.converter._dispatch('unescapeSpecialChars.before', text, options, globals);

  text = text.replace(/¨E(\d+)E/g, function (wholeMatch, m1) {
    var charCodeToReplace = parseInt(m1);
    return String.fromCharCode(charCodeToReplace);
  });

  text = globals.converter._dispatch('unescapeSpecialChars.after', text, options, globals);
  return text;
});

var root = this;

// CommonJS/nodeJS Loader
if (typeof module !== 'undefined' && module.exports) {
  module.exports = showdown;

// AMD Loader
} else if (typeof define === 'function' && define.amd) {
  define(function () {
    'use strict';
    return showdown;
  });

// Regular Browser loader
} else {
  root.showdown = showdown;
}
}).call(this);



},{}]},{},[12])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL2MvVXNlcnMvTmljb2xhcy9BcHBEYXRhL1JvYW1pbmcvbnBtL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIuLi8uLi8uLi8uLi8uLi8uLi9jL1VzZXJzL05pY29sYXMvQXBwRGF0YS9Sb2FtaW5nL25wbS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvZXZlbnRzL2V2ZW50cy5qcyIsIi4uLy4uLy4uLy4uLy4uLy4uL2MvVXNlcnMvTmljb2xhcy9BcHBEYXRhL1JvYW1pbmcvbnBtL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCIuLi8uLi8uLi8uLi8uLi8uLi9jL1VzZXJzL05pY29sYXMvQXBwRGF0YS9Sb2FtaW5nL25wbS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcHVueWNvZGUvcHVueWNvZGUuanMiLCIuLi8uLi8uLi8uLi8uLi8uLi9jL1VzZXJzL05pY29sYXMvQXBwRGF0YS9Sb2FtaW5nL25wbS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvcXVlcnlzdHJpbmctZXMzL2RlY29kZS5qcyIsIi4uLy4uLy4uLy4uLy4uLy4uL2MvVXNlcnMvTmljb2xhcy9BcHBEYXRhL1JvYW1pbmcvbnBtL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9xdWVyeXN0cmluZy1lczMvZW5jb2RlLmpzIiwiLi4vLi4vLi4vLi4vLi4vLi4vYy9Vc2Vycy9OaWNvbGFzL0FwcERhdGEvUm9hbWluZy9ucG0vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3F1ZXJ5c3RyaW5nLWVzMy9pbmRleC5qcyIsIi4uLy4uLy4uLy4uLy4uLy4uL2MvVXNlcnMvTmljb2xhcy9BcHBEYXRhL1JvYW1pbmcvbnBtL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy91cmwvdXJsLmpzIiwiLi4vLi4vLi4vLi4vLi4vLi4vYy9Vc2Vycy9OaWNvbGFzL0FwcERhdGEvUm9hbWluZy9ucG0vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3VybC91dGlsLmpzIiwiLi4vLi4vLi4vLi4vLi4vLi4vYy9Vc2Vycy9OaWNvbGFzL0FwcERhdGEvUm9hbWluZy9ucG0vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3V0aWwvbm9kZV9tb2R1bGVzL2luaGVyaXRzL2luaGVyaXRzX2Jyb3dzZXIuanMiLCIuLi8uLi8uLi8uLi8uLi8uLi9jL1VzZXJzL05pY29sYXMvQXBwRGF0YS9Sb2FtaW5nL25wbS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvdXRpbC9zdXBwb3J0L2lzQnVmZmVyQnJvd3Nlci5qcyIsIi4uLy4uLy4uLy4uLy4uLy4uL2MvVXNlcnMvTmljb2xhcy9BcHBEYXRhL1JvYW1pbmcvbnBtL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy91dGlsL3V0aWwuanMiLCJkaXN0L2NsaWVudGlmeS5qcyIsImRpc3QvY29tbW9uLmpzIiwiZGlzdC9jb250cm9scy9jbGljay5qcyIsImRpc3QvY29udHJvbHMvY29udHJvbC5qcyIsImRpc3QvY29udHJvbHMvY29udHJvbHMuanMiLCJkaXN0L2NvbnRyb2xzL2Nzc0NsYXNzLmpzIiwiZGlzdC9jb250cm9scy9mb3JlYWNoLmpzIiwiZGlzdC9jb250cm9scy9ocmVmLmpzIiwiZGlzdC9jb250cm9scy9qc29uLmpzIiwiZGlzdC9jb250cm9scy9tYXJrZG93bi5qcyIsImRpc3QvY29udHJvbHMvb3B0aW9ucy5qcyIsImRpc3QvY29udHJvbHMvcGFydC5qcyIsImRpc3QvY29udHJvbHMvc3Bpbm5lci5qcyIsImRpc3QvY29udHJvbHMvdGV4dC5qcyIsImRpc3QvY29udHJvbHMvdGl0bGUuanMiLCJkaXN0L2NvbnRyb2xzL3RyYW5zbGF0ZS5qcyIsImRpc3QvY29udHJvbHMvdmFsdWUuanMiLCJkaXN0L2NvbnRyb2xzL3Zpc2liaWxpdHkuanMiLCJkaXN0L2h0dHAuanMiLCJkaXN0L2xvY2F0aW9uU2VydmljZS5qcyIsImRpc3QvcGFydC5qcyIsImRpc3Qvcm91dGVyLmpzIiwiZGlzdC9zY29wZS5qcyIsImRpc3QvdGVtcGxhdGUuanMiLCJub2RlX21vZHVsZXMvQGFrYWxhL2NvcmUvZGlzdC9iaW5kZXIuanMiLCJub2RlX21vZHVsZXMvQGFrYWxhL2NvcmUvZGlzdC9lYWNoQXN5bmMuanMiLCJub2RlX21vZHVsZXMvQGFrYWxhL2NvcmUvZGlzdC9mYWN0b3J5LmpzIiwibm9kZV9tb2R1bGVzL0Bha2FsYS9jb3JlL2Rpc3QvZm9ybWF0dGVycy9ib29sZWFuaXplLmpzIiwibm9kZV9tb2R1bGVzL0Bha2FsYS9jb3JlL2Rpc3QvZm9ybWF0dGVycy9pZGVudGl0eS5qcyIsIm5vZGVfbW9kdWxlcy9AYWthbGEvY29yZS9kaXN0L2Zvcm1hdHRlcnMvaW5kZXguanMiLCJub2RlX21vZHVsZXMvQGFrYWxhL2NvcmUvZGlzdC9mb3JtYXR0ZXJzL25lZ2F0ZS5qcyIsIm5vZGVfbW9kdWxlcy9AYWthbGEvY29yZS9kaXN0L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL0Bha2FsYS9jb3JlL2Rpc3QvaW5qZWN0b3IuanMiLCJub2RlX21vZHVsZXMvQGFrYWxhL2NvcmUvZGlzdC9tb2R1bGUuanMiLCJub2RlX21vZHVsZXMvQGFrYWxhL2NvcmUvZGlzdC9wYXJzZXIuanMiLCJub2RlX21vZHVsZXMvQGFrYWxhL2NvcmUvZGlzdC9wcm9taXNlSGVscGVycy5qcyIsIm5vZGVfbW9kdWxlcy9AYWthbGEvY29yZS9kaXN0L3JlZmxlY3QuanMiLCJub2RlX21vZHVsZXMvQGFrYWxhL2NvcmUvZGlzdC9yb3V0ZXIvaW5kZXguanMiLCJub2RlX21vZHVsZXMvQGFrYWxhL2NvcmUvZGlzdC9yb3V0ZXIvbGF5ZXIuanMiLCJub2RlX21vZHVsZXMvQGFrYWxhL2NvcmUvZGlzdC9yb3V0ZXIvcm91dGUuanMiLCJub2RlX21vZHVsZXMvQGFrYWxhL2NvcmUvZGlzdC9zZXJ2aWNlLmpzIiwibm9kZV9tb2R1bGVzL0Bha2FsYS9jb3JlL25vZGVfbW9kdWxlcy9hcnJheS1mbGF0dGVuL2FycmF5LWZsYXR0ZW4uanMiLCJub2RlX21vZHVsZXMvQGFrYWxhL2NvcmUvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcHJvY2Vzcy1ocnRpbWUvaW5kZXguanMiLCJub2RlX21vZHVsZXMvQGFrYWxhL2NvcmUvbm9kZV9tb2R1bGVzL2RlYnVnL2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvQGFrYWxhL2NvcmUvbm9kZV9tb2R1bGVzL2RlYnVnL2RlYnVnLmpzIiwibm9kZV9tb2R1bGVzL0Bha2FsYS9jb3JlL25vZGVfbW9kdWxlcy9tcy9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9AYWthbGEvY29yZS9ub2RlX21vZHVsZXMvb25jZS9vbmNlLmpzIiwibm9kZV9tb2R1bGVzL0Bha2FsYS9jb3JlL25vZGVfbW9kdWxlcy9vcmNoZXN0cmF0b3IvaW5kZXguanMiLCJub2RlX21vZHVsZXMvQGFrYWxhL2NvcmUvbm9kZV9tb2R1bGVzL29yY2hlc3RyYXRvci9saWIvcnVuVGFzay5qcyIsIm5vZGVfbW9kdWxlcy9AYWthbGEvY29yZS9ub2RlX21vZHVsZXMvb3JjaGVzdHJhdG9yL25vZGVfbW9kdWxlcy9lbmQtb2Ytc3RyZWFtL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL0Bha2FsYS9jb3JlL25vZGVfbW9kdWxlcy9wYXJzZXVybC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9AYWthbGEvY29yZS9ub2RlX21vZHVsZXMvcGF0aC10by1yZWdleHAvaW5kZXguanMiLCJub2RlX21vZHVsZXMvQGFrYWxhL2NvcmUvbm9kZV9tb2R1bGVzL3NlcXVlbmNpZnkvaW5kZXguanMiLCJub2RlX21vZHVsZXMvQGFrYWxhL2NvcmUvbm9kZV9tb2R1bGVzL3N0cmVhbS1jb25zdW1lL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL0Bha2FsYS9jb3JlL25vZGVfbW9kdWxlcy91dGlscy1tZXJnZS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9AYWthbGEvY29yZS9ub2RlX21vZHVsZXMvd3JhcHB5L3dyYXBweS5qcyIsIm5vZGVfbW9kdWxlcy9zaG93ZG93bi9kaXN0L3Nob3dkb3duLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDcExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ3JoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNXRCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzFrQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDek1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZVQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNOQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUN0Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUM5SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUM3Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4YUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQ2hlQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQ2hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4S0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNoVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUNsRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7Ozs7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXIoKSB7XG4gIHRoaXMuX2V2ZW50cyA9IHRoaXMuX2V2ZW50cyB8fCB7fTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gdGhpcy5fbWF4TGlzdGVuZXJzIHx8IHVuZGVmaW5lZDtcbn1cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xuXG4vLyBCYWNrd2FyZHMtY29tcGF0IHdpdGggbm9kZSAwLjEwLnhcbkV2ZW50RW1pdHRlci5FdmVudEVtaXR0ZXIgPSBFdmVudEVtaXR0ZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX2V2ZW50cyA9IHVuZGVmaW5lZDtcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX21heExpc3RlbmVycyA9IHVuZGVmaW5lZDtcblxuLy8gQnkgZGVmYXVsdCBFdmVudEVtaXR0ZXJzIHdpbGwgcHJpbnQgYSB3YXJuaW5nIGlmIG1vcmUgdGhhbiAxMCBsaXN0ZW5lcnMgYXJlXG4vLyBhZGRlZCB0byBpdC4gVGhpcyBpcyBhIHVzZWZ1bCBkZWZhdWx0IHdoaWNoIGhlbHBzIGZpbmRpbmcgbWVtb3J5IGxlYWtzLlxuRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnMgPSAxMDtcblxuLy8gT2J2aW91c2x5IG5vdCBhbGwgRW1pdHRlcnMgc2hvdWxkIGJlIGxpbWl0ZWQgdG8gMTAuIFRoaXMgZnVuY3Rpb24gYWxsb3dzXG4vLyB0aGF0IHRvIGJlIGluY3JlYXNlZC4gU2V0IHRvIHplcm8gZm9yIHVubGltaXRlZC5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24obikge1xuICBpZiAoIWlzTnVtYmVyKG4pIHx8IG4gPCAwIHx8IGlzTmFOKG4pKVxuICAgIHRocm93IFR5cGVFcnJvcignbiBtdXN0IGJlIGEgcG9zaXRpdmUgbnVtYmVyJyk7XG4gIHRoaXMuX21heExpc3RlbmVycyA9IG47XG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgZXIsIGhhbmRsZXIsIGxlbiwgYXJncywgaSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIElmIHRoZXJlIGlzIG5vICdlcnJvcicgZXZlbnQgbGlzdGVuZXIgdGhlbiB0aHJvdy5cbiAgaWYgKHR5cGUgPT09ICdlcnJvcicpIHtcbiAgICBpZiAoIXRoaXMuX2V2ZW50cy5lcnJvciB8fFxuICAgICAgICAoaXNPYmplY3QodGhpcy5fZXZlbnRzLmVycm9yKSAmJiAhdGhpcy5fZXZlbnRzLmVycm9yLmxlbmd0aCkpIHtcbiAgICAgIGVyID0gYXJndW1lbnRzWzFdO1xuICAgICAgaWYgKGVyIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgdGhyb3cgZXI7IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBBdCBsZWFzdCBnaXZlIHNvbWUga2luZCBvZiBjb250ZXh0IHRvIHRoZSB1c2VyXG4gICAgICAgIHZhciBlcnIgPSBuZXcgRXJyb3IoJ1VuY2F1Z2h0LCB1bnNwZWNpZmllZCBcImVycm9yXCIgZXZlbnQuICgnICsgZXIgKyAnKScpO1xuICAgICAgICBlcnIuY29udGV4dCA9IGVyO1xuICAgICAgICB0aHJvdyBlcnI7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaGFuZGxlciA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNVbmRlZmluZWQoaGFuZGxlcikpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGhhbmRsZXIpKSB7XG4gICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAvLyBmYXN0IGNhc2VzXG4gICAgICBjYXNlIDE6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICAvLyBzbG93ZXJcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgICAgICBoYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH1cbiAgfSBlbHNlIGlmIChpc09iamVjdChoYW5kbGVyKSkge1xuICAgIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuICAgIGxpc3RlbmVycyA9IGhhbmRsZXIuc2xpY2UoKTtcbiAgICBsZW4gPSBsaXN0ZW5lcnMubGVuZ3RoO1xuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKylcbiAgICAgIGxpc3RlbmVyc1tpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBtO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBUbyBhdm9pZCByZWN1cnNpb24gaW4gdGhlIGNhc2UgdGhhdCB0eXBlID09PSBcIm5ld0xpc3RlbmVyXCIhIEJlZm9yZVxuICAvLyBhZGRpbmcgaXQgdG8gdGhlIGxpc3RlbmVycywgZmlyc3QgZW1pdCBcIm5ld0xpc3RlbmVyXCIuXG4gIGlmICh0aGlzLl9ldmVudHMubmV3TGlzdGVuZXIpXG4gICAgdGhpcy5lbWl0KCduZXdMaXN0ZW5lcicsIHR5cGUsXG4gICAgICAgICAgICAgIGlzRnVuY3Rpb24obGlzdGVuZXIubGlzdGVuZXIpID9cbiAgICAgICAgICAgICAgbGlzdGVuZXIubGlzdGVuZXIgOiBsaXN0ZW5lcik7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgLy8gT3B0aW1pemUgdGhlIGNhc2Ugb2Ygb25lIGxpc3RlbmVyLiBEb24ndCBuZWVkIHRoZSBleHRyYSBhcnJheSBvYmplY3QuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gbGlzdGVuZXI7XG4gIGVsc2UgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgLy8gSWYgd2UndmUgYWxyZWFkeSBnb3QgYW4gYXJyYXksIGp1c3QgYXBwZW5kLlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5wdXNoKGxpc3RlbmVyKTtcbiAgZWxzZVxuICAgIC8vIEFkZGluZyB0aGUgc2Vjb25kIGVsZW1lbnQsIG5lZWQgdG8gY2hhbmdlIHRvIGFycmF5LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV0sIGxpc3RlbmVyXTtcblxuICAvLyBDaGVjayBmb3IgbGlzdGVuZXIgbGVha1xuICBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSAmJiAhdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCkge1xuICAgIGlmICghaXNVbmRlZmluZWQodGhpcy5fbWF4TGlzdGVuZXJzKSkge1xuICAgICAgbSA9IHRoaXMuX21heExpc3RlbmVycztcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IEV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzO1xuICAgIH1cblxuICAgIGlmIChtICYmIG0gPiAwICYmIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGggPiBtKSB7XG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkID0gdHJ1ZTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJyhub2RlKSB3YXJuaW5nOiBwb3NzaWJsZSBFdmVudEVtaXR0ZXIgbWVtb3J5ICcgK1xuICAgICAgICAgICAgICAgICAgICAnbGVhayBkZXRlY3RlZC4gJWQgbGlzdGVuZXJzIGFkZGVkLiAnICtcbiAgICAgICAgICAgICAgICAgICAgJ1VzZSBlbWl0dGVyLnNldE1heExpc3RlbmVycygpIHRvIGluY3JlYXNlIGxpbWl0LicsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGgpO1xuICAgICAgaWYgKHR5cGVvZiBjb25zb2xlLnRyYWNlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIC8vIG5vdCBzdXBwb3J0ZWQgaW4gSUUgMTBcbiAgICAgICAgY29uc29sZS50cmFjZSgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICB2YXIgZmlyZWQgPSBmYWxzZTtcblxuICBmdW5jdGlvbiBnKCkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgZyk7XG5cbiAgICBpZiAoIWZpcmVkKSB7XG4gICAgICBmaXJlZCA9IHRydWU7XG4gICAgICBsaXN0ZW5lci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgfVxuXG4gIGcubGlzdGVuZXIgPSBsaXN0ZW5lcjtcbiAgdGhpcy5vbih0eXBlLCBnKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8vIGVtaXRzIGEgJ3JlbW92ZUxpc3RlbmVyJyBldmVudCBpZmYgdGhlIGxpc3RlbmVyIHdhcyByZW1vdmVkXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIGxpc3QsIHBvc2l0aW9uLCBsZW5ndGgsIGk7XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgbGlzdCA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgbGVuZ3RoID0gbGlzdC5sZW5ndGg7XG4gIHBvc2l0aW9uID0gLTE7XG5cbiAgaWYgKGxpc3QgPT09IGxpc3RlbmVyIHx8XG4gICAgICAoaXNGdW5jdGlvbihsaXN0Lmxpc3RlbmVyKSAmJiBsaXN0Lmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuXG4gIH0gZWxzZSBpZiAoaXNPYmplY3QobGlzdCkpIHtcbiAgICBmb3IgKGkgPSBsZW5ndGg7IGktLSA+IDA7KSB7XG4gICAgICBpZiAobGlzdFtpXSA9PT0gbGlzdGVuZXIgfHxcbiAgICAgICAgICAobGlzdFtpXS5saXN0ZW5lciAmJiBsaXN0W2ldLmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICAgICAgcG9zaXRpb24gPSBpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAocG9zaXRpb24gPCAwKVxuICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICBpZiAobGlzdC5sZW5ndGggPT09IDEpIHtcbiAgICAgIGxpc3QubGVuZ3RoID0gMDtcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgfSBlbHNlIHtcbiAgICAgIGxpc3Quc3BsaWNlKHBvc2l0aW9uLCAxKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBrZXksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICByZXR1cm4gdGhpcztcblxuICAvLyBub3QgbGlzdGVuaW5nIGZvciByZW1vdmVMaXN0ZW5lciwgbm8gbmVlZCB0byBlbWl0XG4gIGlmICghdGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApXG4gICAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICBlbHNlIGlmICh0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gZW1pdCByZW1vdmVMaXN0ZW5lciBmb3IgYWxsIGxpc3RlbmVycyBvbiBhbGwgZXZlbnRzXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgZm9yIChrZXkgaW4gdGhpcy5fZXZlbnRzKSB7XG4gICAgICBpZiAoa2V5ID09PSAncmVtb3ZlTGlzdGVuZXInKSBjb250aW51ZTtcbiAgICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKGtleSk7XG4gICAgfVxuICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKCdyZW1vdmVMaXN0ZW5lcicpO1xuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgbGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGxpc3RlbmVycykpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVycyk7XG4gIH0gZWxzZSBpZiAobGlzdGVuZXJzKSB7XG4gICAgLy8gTElGTyBvcmRlclxuICAgIHdoaWxlIChsaXN0ZW5lcnMubGVuZ3RoKVxuICAgICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnNbbGlzdGVuZXJzLmxlbmd0aCAtIDFdKTtcbiAgfVxuICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gW107XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24odGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSBbdGhpcy5fZXZlbnRzW3R5cGVdXTtcbiAgZWxzZVxuICAgIHJldCA9IHRoaXMuX2V2ZW50c1t0eXBlXS5zbGljZSgpO1xuICByZXR1cm4gcmV0O1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lckNvdW50ID0gZnVuY3Rpb24odHlwZSkge1xuICBpZiAodGhpcy5fZXZlbnRzKSB7XG4gICAgdmFyIGV2bGlzdGVuZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgICBpZiAoaXNGdW5jdGlvbihldmxpc3RlbmVyKSlcbiAgICAgIHJldHVybiAxO1xuICAgIGVsc2UgaWYgKGV2bGlzdGVuZXIpXG4gICAgICByZXR1cm4gZXZsaXN0ZW5lci5sZW5ndGg7XG4gIH1cbiAgcmV0dXJuIDA7XG59O1xuXG5FdmVudEVtaXR0ZXIubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKGVtaXR0ZXIsIHR5cGUpIHtcbiAgcmV0dXJuIGVtaXR0ZXIubGlzdGVuZXJDb3VudCh0eXBlKTtcbn07XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxudmFyIHByb2Nlc3MgPSBtb2R1bGUuZXhwb3J0cyA9IHt9O1xuXG4vLyBjYWNoZWQgZnJvbSB3aGF0ZXZlciBnbG9iYWwgaXMgcHJlc2VudCBzbyB0aGF0IHRlc3QgcnVubmVycyB0aGF0IHN0dWIgaXRcbi8vIGRvbid0IGJyZWFrIHRoaW5ncy4gIEJ1dCB3ZSBuZWVkIHRvIHdyYXAgaXQgaW4gYSB0cnkgY2F0Y2ggaW4gY2FzZSBpdCBpc1xuLy8gd3JhcHBlZCBpbiBzdHJpY3QgbW9kZSBjb2RlIHdoaWNoIGRvZXNuJ3QgZGVmaW5lIGFueSBnbG9iYWxzLiAgSXQncyBpbnNpZGUgYVxuLy8gZnVuY3Rpb24gYmVjYXVzZSB0cnkvY2F0Y2hlcyBkZW9wdGltaXplIGluIGNlcnRhaW4gZW5naW5lcy5cblxudmFyIGNhY2hlZFNldFRpbWVvdXQ7XG52YXIgY2FjaGVkQ2xlYXJUaW1lb3V0O1xuXG5mdW5jdGlvbiBkZWZhdWx0U2V0VGltb3V0KCkge1xuICAgIHRocm93IG5ldyBFcnJvcignc2V0VGltZW91dCBoYXMgbm90IGJlZW4gZGVmaW5lZCcpO1xufVxuZnVuY3Rpb24gZGVmYXVsdENsZWFyVGltZW91dCAoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdjbGVhclRpbWVvdXQgaGFzIG5vdCBiZWVuIGRlZmluZWQnKTtcbn1cbihmdW5jdGlvbiAoKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBzZXRUaW1lb3V0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gc2V0VGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBkZWZhdWx0U2V0VGltb3V0O1xuICAgICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjYWNoZWRTZXRUaW1lb3V0ID0gZGVmYXVsdFNldFRpbW91dDtcbiAgICB9XG4gICAgdHJ5IHtcbiAgICAgICAgaWYgKHR5cGVvZiBjbGVhclRpbWVvdXQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGNsZWFyVGltZW91dDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNhY2hlZENsZWFyVGltZW91dCA9IGRlZmF1bHRDbGVhclRpbWVvdXQ7XG4gICAgfVxufSAoKSlcbmZ1bmN0aW9uIHJ1blRpbWVvdXQoZnVuKSB7XG4gICAgaWYgKGNhY2hlZFNldFRpbWVvdXQgPT09IHNldFRpbWVvdXQpIHtcbiAgICAgICAgLy9ub3JtYWwgZW52aXJvbWVudHMgaW4gc2FuZSBzaXR1YXRpb25zXG4gICAgICAgIHJldHVybiBzZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfVxuICAgIC8vIGlmIHNldFRpbWVvdXQgd2Fzbid0IGF2YWlsYWJsZSBidXQgd2FzIGxhdHRlciBkZWZpbmVkXG4gICAgaWYgKChjYWNoZWRTZXRUaW1lb3V0ID09PSBkZWZhdWx0U2V0VGltb3V0IHx8ICFjYWNoZWRTZXRUaW1lb3V0KSAmJiBzZXRUaW1lb3V0KSB7XG4gICAgICAgIGNhY2hlZFNldFRpbWVvdXQgPSBzZXRUaW1lb3V0O1xuICAgICAgICByZXR1cm4gc2V0VGltZW91dChmdW4sIDApO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICAvLyB3aGVuIHdoZW4gc29tZWJvZHkgaGFzIHNjcmV3ZWQgd2l0aCBzZXRUaW1lb3V0IGJ1dCBubyBJLkUuIG1hZGRuZXNzXG4gICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0KGZ1biwgMCk7XG4gICAgfSBjYXRjaChlKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFdoZW4gd2UgYXJlIGluIEkuRS4gYnV0IHRoZSBzY3JpcHQgaGFzIGJlZW4gZXZhbGVkIHNvIEkuRS4gZG9lc24ndCB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZFNldFRpbWVvdXQuY2FsbChudWxsLCBmdW4sIDApO1xuICAgICAgICB9IGNhdGNoKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3JcbiAgICAgICAgICAgIHJldHVybiBjYWNoZWRTZXRUaW1lb3V0LmNhbGwodGhpcywgZnVuLCAwKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG59XG5mdW5jdGlvbiBydW5DbGVhclRpbWVvdXQobWFya2VyKSB7XG4gICAgaWYgKGNhY2hlZENsZWFyVGltZW91dCA9PT0gY2xlYXJUaW1lb3V0KSB7XG4gICAgICAgIC8vbm9ybWFsIGVudmlyb21lbnRzIGluIHNhbmUgc2l0dWF0aW9uc1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIC8vIGlmIGNsZWFyVGltZW91dCB3YXNuJ3QgYXZhaWxhYmxlIGJ1dCB3YXMgbGF0dGVyIGRlZmluZWRcbiAgICBpZiAoKGNhY2hlZENsZWFyVGltZW91dCA9PT0gZGVmYXVsdENsZWFyVGltZW91dCB8fCAhY2FjaGVkQ2xlYXJUaW1lb3V0KSAmJiBjbGVhclRpbWVvdXQpIHtcbiAgICAgICAgY2FjaGVkQ2xlYXJUaW1lb3V0ID0gY2xlYXJUaW1lb3V0O1xuICAgICAgICByZXR1cm4gY2xlYXJUaW1lb3V0KG1hcmtlcik7XG4gICAgfVxuICAgIHRyeSB7XG4gICAgICAgIC8vIHdoZW4gd2hlbiBzb21lYm9keSBoYXMgc2NyZXdlZCB3aXRoIHNldFRpbWVvdXQgYnV0IG5vIEkuRS4gbWFkZG5lc3NcbiAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dChtYXJrZXIpO1xuICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gV2hlbiB3ZSBhcmUgaW4gSS5FLiBidXQgdGhlIHNjcmlwdCBoYXMgYmVlbiBldmFsZWQgc28gSS5FLiBkb2Vzbid0ICB0cnVzdCB0aGUgZ2xvYmFsIG9iamVjdCB3aGVuIGNhbGxlZCBub3JtYWxseVxuICAgICAgICAgICAgcmV0dXJuIGNhY2hlZENsZWFyVGltZW91dC5jYWxsKG51bGwsIG1hcmtlcik7XG4gICAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICAgICAgLy8gc2FtZSBhcyBhYm92ZSBidXQgd2hlbiBpdCdzIGEgdmVyc2lvbiBvZiBJLkUuIHRoYXQgbXVzdCBoYXZlIHRoZSBnbG9iYWwgb2JqZWN0IGZvciAndGhpcycsIGhvcGZ1bGx5IG91ciBjb250ZXh0IGNvcnJlY3Qgb3RoZXJ3aXNlIGl0IHdpbGwgdGhyb3cgYSBnbG9iYWwgZXJyb3IuXG4gICAgICAgICAgICAvLyBTb21lIHZlcnNpb25zIG9mIEkuRS4gaGF2ZSBkaWZmZXJlbnQgcnVsZXMgZm9yIGNsZWFyVGltZW91dCB2cyBzZXRUaW1lb3V0XG4gICAgICAgICAgICByZXR1cm4gY2FjaGVkQ2xlYXJUaW1lb3V0LmNhbGwodGhpcywgbWFya2VyKTtcbiAgICAgICAgfVxuICAgIH1cblxuXG5cbn1cbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG52YXIgY3VycmVudFF1ZXVlO1xudmFyIHF1ZXVlSW5kZXggPSAtMTtcblxuZnVuY3Rpb24gY2xlYW5VcE5leHRUaWNrKCkge1xuICAgIGlmICghZHJhaW5pbmcgfHwgIWN1cnJlbnRRdWV1ZSkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGRyYWluaW5nID0gZmFsc2U7XG4gICAgaWYgKGN1cnJlbnRRdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgcXVldWUgPSBjdXJyZW50UXVldWUuY29uY2F0KHF1ZXVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgfVxuICAgIGlmIChxdWV1ZS5sZW5ndGgpIHtcbiAgICAgICAgZHJhaW5RdWV1ZSgpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gZHJhaW5RdWV1ZSgpIHtcbiAgICBpZiAoZHJhaW5pbmcpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB2YXIgdGltZW91dCA9IHJ1blRpbWVvdXQoY2xlYW5VcE5leHRUaWNrKTtcbiAgICBkcmFpbmluZyA9IHRydWU7XG5cbiAgICB2YXIgbGVuID0gcXVldWUubGVuZ3RoO1xuICAgIHdoaWxlKGxlbikge1xuICAgICAgICBjdXJyZW50UXVldWUgPSBxdWV1ZTtcbiAgICAgICAgcXVldWUgPSBbXTtcbiAgICAgICAgd2hpbGUgKCsrcXVldWVJbmRleCA8IGxlbikge1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRRdWV1ZSkge1xuICAgICAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtxdWV1ZUluZGV4XS5ydW4oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBxdWV1ZUluZGV4ID0gLTE7XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgY3VycmVudFF1ZXVlID0gbnVsbDtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIHJ1bkNsZWFyVGltZW91dCh0aW1lb3V0KTtcbn1cblxucHJvY2Vzcy5uZXh0VGljayA9IGZ1bmN0aW9uIChmdW4pIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoIC0gMSk7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBxdWV1ZS5wdXNoKG5ldyBJdGVtKGZ1biwgYXJncykpO1xuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDEgJiYgIWRyYWluaW5nKSB7XG4gICAgICAgIHJ1blRpbWVvdXQoZHJhaW5RdWV1ZSk7XG4gICAgfVxufTtcblxuLy8gdjggbGlrZXMgcHJlZGljdGlibGUgb2JqZWN0c1xuZnVuY3Rpb24gSXRlbShmdW4sIGFycmF5KSB7XG4gICAgdGhpcy5mdW4gPSBmdW47XG4gICAgdGhpcy5hcnJheSA9IGFycmF5O1xufVxuSXRlbS5wcm90b3R5cGUucnVuID0gZnVuY3Rpb24gKCkge1xuICAgIHRoaXMuZnVuLmFwcGx5KG51bGwsIHRoaXMuYXJyYXkpO1xufTtcbnByb2Nlc3MudGl0bGUgPSAnYnJvd3Nlcic7XG5wcm9jZXNzLmJyb3dzZXIgPSB0cnVlO1xucHJvY2Vzcy5lbnYgPSB7fTtcbnByb2Nlc3MuYXJndiA9IFtdO1xucHJvY2Vzcy52ZXJzaW9uID0gJyc7IC8vIGVtcHR5IHN0cmluZyB0byBhdm9pZCByZWdleHAgaXNzdWVzXG5wcm9jZXNzLnZlcnNpb25zID0ge307XG5cbmZ1bmN0aW9uIG5vb3AoKSB7fVxuXG5wcm9jZXNzLm9uID0gbm9vcDtcbnByb2Nlc3MuYWRkTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5vbmNlID0gbm9vcDtcbnByb2Nlc3Mub2ZmID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlTGlzdGVuZXIgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBub29wO1xucHJvY2Vzcy5lbWl0ID0gbm9vcDtcblxucHJvY2Vzcy5iaW5kaW5nID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuYmluZGluZyBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xuXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iLCIvKiEgaHR0cHM6Ly9tdGhzLmJlL3B1bnljb2RlIHYxLjQuMSBieSBAbWF0aGlhcyAqL1xuOyhmdW5jdGlvbihyb290KSB7XG5cblx0LyoqIERldGVjdCBmcmVlIHZhcmlhYmxlcyAqL1xuXHR2YXIgZnJlZUV4cG9ydHMgPSB0eXBlb2YgZXhwb3J0cyA9PSAnb2JqZWN0JyAmJiBleHBvcnRzICYmXG5cdFx0IWV4cG9ydHMubm9kZVR5cGUgJiYgZXhwb3J0cztcblx0dmFyIGZyZWVNb2R1bGUgPSB0eXBlb2YgbW9kdWxlID09ICdvYmplY3QnICYmIG1vZHVsZSAmJlxuXHRcdCFtb2R1bGUubm9kZVR5cGUgJiYgbW9kdWxlO1xuXHR2YXIgZnJlZUdsb2JhbCA9IHR5cGVvZiBnbG9iYWwgPT0gJ29iamVjdCcgJiYgZ2xvYmFsO1xuXHRpZiAoXG5cdFx0ZnJlZUdsb2JhbC5nbG9iYWwgPT09IGZyZWVHbG9iYWwgfHxcblx0XHRmcmVlR2xvYmFsLndpbmRvdyA9PT0gZnJlZUdsb2JhbCB8fFxuXHRcdGZyZWVHbG9iYWwuc2VsZiA9PT0gZnJlZUdsb2JhbFxuXHQpIHtcblx0XHRyb290ID0gZnJlZUdsb2JhbDtcblx0fVxuXG5cdC8qKlxuXHQgKiBUaGUgYHB1bnljb2RlYCBvYmplY3QuXG5cdCAqIEBuYW1lIHB1bnljb2RlXG5cdCAqIEB0eXBlIE9iamVjdFxuXHQgKi9cblx0dmFyIHB1bnljb2RlLFxuXG5cdC8qKiBIaWdoZXN0IHBvc2l0aXZlIHNpZ25lZCAzMi1iaXQgZmxvYXQgdmFsdWUgKi9cblx0bWF4SW50ID0gMjE0NzQ4MzY0NywgLy8gYWthLiAweDdGRkZGRkZGIG9yIDJeMzEtMVxuXG5cdC8qKiBCb290c3RyaW5nIHBhcmFtZXRlcnMgKi9cblx0YmFzZSA9IDM2LFxuXHR0TWluID0gMSxcblx0dE1heCA9IDI2LFxuXHRza2V3ID0gMzgsXG5cdGRhbXAgPSA3MDAsXG5cdGluaXRpYWxCaWFzID0gNzIsXG5cdGluaXRpYWxOID0gMTI4LCAvLyAweDgwXG5cdGRlbGltaXRlciA9ICctJywgLy8gJ1xceDJEJ1xuXG5cdC8qKiBSZWd1bGFyIGV4cHJlc3Npb25zICovXG5cdHJlZ2V4UHVueWNvZGUgPSAvXnhuLS0vLFxuXHRyZWdleE5vbkFTQ0lJID0gL1teXFx4MjAtXFx4N0VdLywgLy8gdW5wcmludGFibGUgQVNDSUkgY2hhcnMgKyBub24tQVNDSUkgY2hhcnNcblx0cmVnZXhTZXBhcmF0b3JzID0gL1tcXHgyRVxcdTMwMDJcXHVGRjBFXFx1RkY2MV0vZywgLy8gUkZDIDM0OTAgc2VwYXJhdG9yc1xuXG5cdC8qKiBFcnJvciBtZXNzYWdlcyAqL1xuXHRlcnJvcnMgPSB7XG5cdFx0J292ZXJmbG93JzogJ092ZXJmbG93OiBpbnB1dCBuZWVkcyB3aWRlciBpbnRlZ2VycyB0byBwcm9jZXNzJyxcblx0XHQnbm90LWJhc2ljJzogJ0lsbGVnYWwgaW5wdXQgPj0gMHg4MCAobm90IGEgYmFzaWMgY29kZSBwb2ludCknLFxuXHRcdCdpbnZhbGlkLWlucHV0JzogJ0ludmFsaWQgaW5wdXQnXG5cdH0sXG5cblx0LyoqIENvbnZlbmllbmNlIHNob3J0Y3V0cyAqL1xuXHRiYXNlTWludXNUTWluID0gYmFzZSAtIHRNaW4sXG5cdGZsb29yID0gTWF0aC5mbG9vcixcblx0c3RyaW5nRnJvbUNoYXJDb2RlID0gU3RyaW5nLmZyb21DaGFyQ29kZSxcblxuXHQvKiogVGVtcG9yYXJ5IHZhcmlhYmxlICovXG5cdGtleTtcblxuXHQvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cblxuXHQvKipcblx0ICogQSBnZW5lcmljIGVycm9yIHV0aWxpdHkgZnVuY3Rpb24uXG5cdCAqIEBwcml2YXRlXG5cdCAqIEBwYXJhbSB7U3RyaW5nfSB0eXBlIFRoZSBlcnJvciB0eXBlLlxuXHQgKiBAcmV0dXJucyB7RXJyb3J9IFRocm93cyBhIGBSYW5nZUVycm9yYCB3aXRoIHRoZSBhcHBsaWNhYmxlIGVycm9yIG1lc3NhZ2UuXG5cdCAqL1xuXHRmdW5jdGlvbiBlcnJvcih0eXBlKSB7XG5cdFx0dGhyb3cgbmV3IFJhbmdlRXJyb3IoZXJyb3JzW3R5cGVdKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBBIGdlbmVyaWMgYEFycmF5I21hcGAgdXRpbGl0eSBmdW5jdGlvbi5cblx0ICogQHByaXZhdGVcblx0ICogQHBhcmFtIHtBcnJheX0gYXJyYXkgVGhlIGFycmF5IHRvIGl0ZXJhdGUgb3Zlci5cblx0ICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgVGhlIGZ1bmN0aW9uIHRoYXQgZ2V0cyBjYWxsZWQgZm9yIGV2ZXJ5IGFycmF5XG5cdCAqIGl0ZW0uXG5cdCAqIEByZXR1cm5zIHtBcnJheX0gQSBuZXcgYXJyYXkgb2YgdmFsdWVzIHJldHVybmVkIGJ5IHRoZSBjYWxsYmFjayBmdW5jdGlvbi5cblx0ICovXG5cdGZ1bmN0aW9uIG1hcChhcnJheSwgZm4pIHtcblx0XHR2YXIgbGVuZ3RoID0gYXJyYXkubGVuZ3RoO1xuXHRcdHZhciByZXN1bHQgPSBbXTtcblx0XHR3aGlsZSAobGVuZ3RoLS0pIHtcblx0XHRcdHJlc3VsdFtsZW5ndGhdID0gZm4oYXJyYXlbbGVuZ3RoXSk7XG5cdFx0fVxuXHRcdHJldHVybiByZXN1bHQ7XG5cdH1cblxuXHQvKipcblx0ICogQSBzaW1wbGUgYEFycmF5I21hcGAtbGlrZSB3cmFwcGVyIHRvIHdvcmsgd2l0aCBkb21haW4gbmFtZSBzdHJpbmdzIG9yIGVtYWlsXG5cdCAqIGFkZHJlc3Nlcy5cblx0ICogQHByaXZhdGVcblx0ICogQHBhcmFtIHtTdHJpbmd9IGRvbWFpbiBUaGUgZG9tYWluIG5hbWUgb3IgZW1haWwgYWRkcmVzcy5cblx0ICogQHBhcmFtIHtGdW5jdGlvbn0gY2FsbGJhY2sgVGhlIGZ1bmN0aW9uIHRoYXQgZ2V0cyBjYWxsZWQgZm9yIGV2ZXJ5XG5cdCAqIGNoYXJhY3Rlci5cblx0ICogQHJldHVybnMge0FycmF5fSBBIG5ldyBzdHJpbmcgb2YgY2hhcmFjdGVycyByZXR1cm5lZCBieSB0aGUgY2FsbGJhY2tcblx0ICogZnVuY3Rpb24uXG5cdCAqL1xuXHRmdW5jdGlvbiBtYXBEb21haW4oc3RyaW5nLCBmbikge1xuXHRcdHZhciBwYXJ0cyA9IHN0cmluZy5zcGxpdCgnQCcpO1xuXHRcdHZhciByZXN1bHQgPSAnJztcblx0XHRpZiAocGFydHMubGVuZ3RoID4gMSkge1xuXHRcdFx0Ly8gSW4gZW1haWwgYWRkcmVzc2VzLCBvbmx5IHRoZSBkb21haW4gbmFtZSBzaG91bGQgYmUgcHVueWNvZGVkLiBMZWF2ZVxuXHRcdFx0Ly8gdGhlIGxvY2FsIHBhcnQgKGkuZS4gZXZlcnl0aGluZyB1cCB0byBgQGApIGludGFjdC5cblx0XHRcdHJlc3VsdCA9IHBhcnRzWzBdICsgJ0AnO1xuXHRcdFx0c3RyaW5nID0gcGFydHNbMV07XG5cdFx0fVxuXHRcdC8vIEF2b2lkIGBzcGxpdChyZWdleClgIGZvciBJRTggY29tcGF0aWJpbGl0eS4gU2VlICMxNy5cblx0XHRzdHJpbmcgPSBzdHJpbmcucmVwbGFjZShyZWdleFNlcGFyYXRvcnMsICdcXHgyRScpO1xuXHRcdHZhciBsYWJlbHMgPSBzdHJpbmcuc3BsaXQoJy4nKTtcblx0XHR2YXIgZW5jb2RlZCA9IG1hcChsYWJlbHMsIGZuKS5qb2luKCcuJyk7XG5cdFx0cmV0dXJuIHJlc3VsdCArIGVuY29kZWQ7XG5cdH1cblxuXHQvKipcblx0ICogQ3JlYXRlcyBhbiBhcnJheSBjb250YWluaW5nIHRoZSBudW1lcmljIGNvZGUgcG9pbnRzIG9mIGVhY2ggVW5pY29kZVxuXHQgKiBjaGFyYWN0ZXIgaW4gdGhlIHN0cmluZy4gV2hpbGUgSmF2YVNjcmlwdCB1c2VzIFVDUy0yIGludGVybmFsbHksXG5cdCAqIHRoaXMgZnVuY3Rpb24gd2lsbCBjb252ZXJ0IGEgcGFpciBvZiBzdXJyb2dhdGUgaGFsdmVzIChlYWNoIG9mIHdoaWNoXG5cdCAqIFVDUy0yIGV4cG9zZXMgYXMgc2VwYXJhdGUgY2hhcmFjdGVycykgaW50byBhIHNpbmdsZSBjb2RlIHBvaW50LFxuXHQgKiBtYXRjaGluZyBVVEYtMTYuXG5cdCAqIEBzZWUgYHB1bnljb2RlLnVjczIuZW5jb2RlYFxuXHQgKiBAc2VlIDxodHRwczovL21hdGhpYXNieW5lbnMuYmUvbm90ZXMvamF2YXNjcmlwdC1lbmNvZGluZz5cblx0ICogQG1lbWJlck9mIHB1bnljb2RlLnVjczJcblx0ICogQG5hbWUgZGVjb2RlXG5cdCAqIEBwYXJhbSB7U3RyaW5nfSBzdHJpbmcgVGhlIFVuaWNvZGUgaW5wdXQgc3RyaW5nIChVQ1MtMikuXG5cdCAqIEByZXR1cm5zIHtBcnJheX0gVGhlIG5ldyBhcnJheSBvZiBjb2RlIHBvaW50cy5cblx0ICovXG5cdGZ1bmN0aW9uIHVjczJkZWNvZGUoc3RyaW5nKSB7XG5cdFx0dmFyIG91dHB1dCA9IFtdLFxuXHRcdCAgICBjb3VudGVyID0gMCxcblx0XHQgICAgbGVuZ3RoID0gc3RyaW5nLmxlbmd0aCxcblx0XHQgICAgdmFsdWUsXG5cdFx0ICAgIGV4dHJhO1xuXHRcdHdoaWxlIChjb3VudGVyIDwgbGVuZ3RoKSB7XG5cdFx0XHR2YWx1ZSA9IHN0cmluZy5jaGFyQ29kZUF0KGNvdW50ZXIrKyk7XG5cdFx0XHRpZiAodmFsdWUgPj0gMHhEODAwICYmIHZhbHVlIDw9IDB4REJGRiAmJiBjb3VudGVyIDwgbGVuZ3RoKSB7XG5cdFx0XHRcdC8vIGhpZ2ggc3Vycm9nYXRlLCBhbmQgdGhlcmUgaXMgYSBuZXh0IGNoYXJhY3RlclxuXHRcdFx0XHRleHRyYSA9IHN0cmluZy5jaGFyQ29kZUF0KGNvdW50ZXIrKyk7XG5cdFx0XHRcdGlmICgoZXh0cmEgJiAweEZDMDApID09IDB4REMwMCkgeyAvLyBsb3cgc3Vycm9nYXRlXG5cdFx0XHRcdFx0b3V0cHV0LnB1c2goKCh2YWx1ZSAmIDB4M0ZGKSA8PCAxMCkgKyAoZXh0cmEgJiAweDNGRikgKyAweDEwMDAwKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQvLyB1bm1hdGNoZWQgc3Vycm9nYXRlOyBvbmx5IGFwcGVuZCB0aGlzIGNvZGUgdW5pdCwgaW4gY2FzZSB0aGUgbmV4dFxuXHRcdFx0XHRcdC8vIGNvZGUgdW5pdCBpcyB0aGUgaGlnaCBzdXJyb2dhdGUgb2YgYSBzdXJyb2dhdGUgcGFpclxuXHRcdFx0XHRcdG91dHB1dC5wdXNoKHZhbHVlKTtcblx0XHRcdFx0XHRjb3VudGVyLS07XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdG91dHB1dC5wdXNoKHZhbHVlKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIG91dHB1dDtcblx0fVxuXG5cdC8qKlxuXHQgKiBDcmVhdGVzIGEgc3RyaW5nIGJhc2VkIG9uIGFuIGFycmF5IG9mIG51bWVyaWMgY29kZSBwb2ludHMuXG5cdCAqIEBzZWUgYHB1bnljb2RlLnVjczIuZGVjb2RlYFxuXHQgKiBAbWVtYmVyT2YgcHVueWNvZGUudWNzMlxuXHQgKiBAbmFtZSBlbmNvZGVcblx0ICogQHBhcmFtIHtBcnJheX0gY29kZVBvaW50cyBUaGUgYXJyYXkgb2YgbnVtZXJpYyBjb2RlIHBvaW50cy5cblx0ICogQHJldHVybnMge1N0cmluZ30gVGhlIG5ldyBVbmljb2RlIHN0cmluZyAoVUNTLTIpLlxuXHQgKi9cblx0ZnVuY3Rpb24gdWNzMmVuY29kZShhcnJheSkge1xuXHRcdHJldHVybiBtYXAoYXJyYXksIGZ1bmN0aW9uKHZhbHVlKSB7XG5cdFx0XHR2YXIgb3V0cHV0ID0gJyc7XG5cdFx0XHRpZiAodmFsdWUgPiAweEZGRkYpIHtcblx0XHRcdFx0dmFsdWUgLT0gMHgxMDAwMDtcblx0XHRcdFx0b3V0cHV0ICs9IHN0cmluZ0Zyb21DaGFyQ29kZSh2YWx1ZSA+Pj4gMTAgJiAweDNGRiB8IDB4RDgwMCk7XG5cdFx0XHRcdHZhbHVlID0gMHhEQzAwIHwgdmFsdWUgJiAweDNGRjtcblx0XHRcdH1cblx0XHRcdG91dHB1dCArPSBzdHJpbmdGcm9tQ2hhckNvZGUodmFsdWUpO1xuXHRcdFx0cmV0dXJuIG91dHB1dDtcblx0XHR9KS5qb2luKCcnKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBDb252ZXJ0cyBhIGJhc2ljIGNvZGUgcG9pbnQgaW50byBhIGRpZ2l0L2ludGVnZXIuXG5cdCAqIEBzZWUgYGRpZ2l0VG9CYXNpYygpYFxuXHQgKiBAcHJpdmF0ZVxuXHQgKiBAcGFyYW0ge051bWJlcn0gY29kZVBvaW50IFRoZSBiYXNpYyBudW1lcmljIGNvZGUgcG9pbnQgdmFsdWUuXG5cdCAqIEByZXR1cm5zIHtOdW1iZXJ9IFRoZSBudW1lcmljIHZhbHVlIG9mIGEgYmFzaWMgY29kZSBwb2ludCAoZm9yIHVzZSBpblxuXHQgKiByZXByZXNlbnRpbmcgaW50ZWdlcnMpIGluIHRoZSByYW5nZSBgMGAgdG8gYGJhc2UgLSAxYCwgb3IgYGJhc2VgIGlmXG5cdCAqIHRoZSBjb2RlIHBvaW50IGRvZXMgbm90IHJlcHJlc2VudCBhIHZhbHVlLlxuXHQgKi9cblx0ZnVuY3Rpb24gYmFzaWNUb0RpZ2l0KGNvZGVQb2ludCkge1xuXHRcdGlmIChjb2RlUG9pbnQgLSA0OCA8IDEwKSB7XG5cdFx0XHRyZXR1cm4gY29kZVBvaW50IC0gMjI7XG5cdFx0fVxuXHRcdGlmIChjb2RlUG9pbnQgLSA2NSA8IDI2KSB7XG5cdFx0XHRyZXR1cm4gY29kZVBvaW50IC0gNjU7XG5cdFx0fVxuXHRcdGlmIChjb2RlUG9pbnQgLSA5NyA8IDI2KSB7XG5cdFx0XHRyZXR1cm4gY29kZVBvaW50IC0gOTc7XG5cdFx0fVxuXHRcdHJldHVybiBiYXNlO1xuXHR9XG5cblx0LyoqXG5cdCAqIENvbnZlcnRzIGEgZGlnaXQvaW50ZWdlciBpbnRvIGEgYmFzaWMgY29kZSBwb2ludC5cblx0ICogQHNlZSBgYmFzaWNUb0RpZ2l0KClgXG5cdCAqIEBwcml2YXRlXG5cdCAqIEBwYXJhbSB7TnVtYmVyfSBkaWdpdCBUaGUgbnVtZXJpYyB2YWx1ZSBvZiBhIGJhc2ljIGNvZGUgcG9pbnQuXG5cdCAqIEByZXR1cm5zIHtOdW1iZXJ9IFRoZSBiYXNpYyBjb2RlIHBvaW50IHdob3NlIHZhbHVlICh3aGVuIHVzZWQgZm9yXG5cdCAqIHJlcHJlc2VudGluZyBpbnRlZ2VycykgaXMgYGRpZ2l0YCwgd2hpY2ggbmVlZHMgdG8gYmUgaW4gdGhlIHJhbmdlXG5cdCAqIGAwYCB0byBgYmFzZSAtIDFgLiBJZiBgZmxhZ2AgaXMgbm9uLXplcm8sIHRoZSB1cHBlcmNhc2UgZm9ybSBpc1xuXHQgKiB1c2VkOyBlbHNlLCB0aGUgbG93ZXJjYXNlIGZvcm0gaXMgdXNlZC4gVGhlIGJlaGF2aW9yIGlzIHVuZGVmaW5lZFxuXHQgKiBpZiBgZmxhZ2AgaXMgbm9uLXplcm8gYW5kIGBkaWdpdGAgaGFzIG5vIHVwcGVyY2FzZSBmb3JtLlxuXHQgKi9cblx0ZnVuY3Rpb24gZGlnaXRUb0Jhc2ljKGRpZ2l0LCBmbGFnKSB7XG5cdFx0Ly8gIDAuLjI1IG1hcCB0byBBU0NJSSBhLi56IG9yIEEuLlpcblx0XHQvLyAyNi4uMzUgbWFwIHRvIEFTQ0lJIDAuLjlcblx0XHRyZXR1cm4gZGlnaXQgKyAyMiArIDc1ICogKGRpZ2l0IDwgMjYpIC0gKChmbGFnICE9IDApIDw8IDUpO1xuXHR9XG5cblx0LyoqXG5cdCAqIEJpYXMgYWRhcHRhdGlvbiBmdW5jdGlvbiBhcyBwZXIgc2VjdGlvbiAzLjQgb2YgUkZDIDM0OTIuXG5cdCAqIGh0dHBzOi8vdG9vbHMuaWV0Zi5vcmcvaHRtbC9yZmMzNDkyI3NlY3Rpb24tMy40XG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXHRmdW5jdGlvbiBhZGFwdChkZWx0YSwgbnVtUG9pbnRzLCBmaXJzdFRpbWUpIHtcblx0XHR2YXIgayA9IDA7XG5cdFx0ZGVsdGEgPSBmaXJzdFRpbWUgPyBmbG9vcihkZWx0YSAvIGRhbXApIDogZGVsdGEgPj4gMTtcblx0XHRkZWx0YSArPSBmbG9vcihkZWx0YSAvIG51bVBvaW50cyk7XG5cdFx0Zm9yICgvKiBubyBpbml0aWFsaXphdGlvbiAqLzsgZGVsdGEgPiBiYXNlTWludXNUTWluICogdE1heCA+PiAxOyBrICs9IGJhc2UpIHtcblx0XHRcdGRlbHRhID0gZmxvb3IoZGVsdGEgLyBiYXNlTWludXNUTWluKTtcblx0XHR9XG5cdFx0cmV0dXJuIGZsb29yKGsgKyAoYmFzZU1pbnVzVE1pbiArIDEpICogZGVsdGEgLyAoZGVsdGEgKyBza2V3KSk7XG5cdH1cblxuXHQvKipcblx0ICogQ29udmVydHMgYSBQdW55Y29kZSBzdHJpbmcgb2YgQVNDSUktb25seSBzeW1ib2xzIHRvIGEgc3RyaW5nIG9mIFVuaWNvZGVcblx0ICogc3ltYm9scy5cblx0ICogQG1lbWJlck9mIHB1bnljb2RlXG5cdCAqIEBwYXJhbSB7U3RyaW5nfSBpbnB1dCBUaGUgUHVueWNvZGUgc3RyaW5nIG9mIEFTQ0lJLW9ubHkgc3ltYm9scy5cblx0ICogQHJldHVybnMge1N0cmluZ30gVGhlIHJlc3VsdGluZyBzdHJpbmcgb2YgVW5pY29kZSBzeW1ib2xzLlxuXHQgKi9cblx0ZnVuY3Rpb24gZGVjb2RlKGlucHV0KSB7XG5cdFx0Ly8gRG9uJ3QgdXNlIFVDUy0yXG5cdFx0dmFyIG91dHB1dCA9IFtdLFxuXHRcdCAgICBpbnB1dExlbmd0aCA9IGlucHV0Lmxlbmd0aCxcblx0XHQgICAgb3V0LFxuXHRcdCAgICBpID0gMCxcblx0XHQgICAgbiA9IGluaXRpYWxOLFxuXHRcdCAgICBiaWFzID0gaW5pdGlhbEJpYXMsXG5cdFx0ICAgIGJhc2ljLFxuXHRcdCAgICBqLFxuXHRcdCAgICBpbmRleCxcblx0XHQgICAgb2xkaSxcblx0XHQgICAgdyxcblx0XHQgICAgayxcblx0XHQgICAgZGlnaXQsXG5cdFx0ICAgIHQsXG5cdFx0ICAgIC8qKiBDYWNoZWQgY2FsY3VsYXRpb24gcmVzdWx0cyAqL1xuXHRcdCAgICBiYXNlTWludXNUO1xuXG5cdFx0Ly8gSGFuZGxlIHRoZSBiYXNpYyBjb2RlIHBvaW50czogbGV0IGBiYXNpY2AgYmUgdGhlIG51bWJlciBvZiBpbnB1dCBjb2RlXG5cdFx0Ly8gcG9pbnRzIGJlZm9yZSB0aGUgbGFzdCBkZWxpbWl0ZXIsIG9yIGAwYCBpZiB0aGVyZSBpcyBub25lLCB0aGVuIGNvcHlcblx0XHQvLyB0aGUgZmlyc3QgYmFzaWMgY29kZSBwb2ludHMgdG8gdGhlIG91dHB1dC5cblxuXHRcdGJhc2ljID0gaW5wdXQubGFzdEluZGV4T2YoZGVsaW1pdGVyKTtcblx0XHRpZiAoYmFzaWMgPCAwKSB7XG5cdFx0XHRiYXNpYyA9IDA7XG5cdFx0fVxuXG5cdFx0Zm9yIChqID0gMDsgaiA8IGJhc2ljOyArK2opIHtcblx0XHRcdC8vIGlmIGl0J3Mgbm90IGEgYmFzaWMgY29kZSBwb2ludFxuXHRcdFx0aWYgKGlucHV0LmNoYXJDb2RlQXQoaikgPj0gMHg4MCkge1xuXHRcdFx0XHRlcnJvcignbm90LWJhc2ljJyk7XG5cdFx0XHR9XG5cdFx0XHRvdXRwdXQucHVzaChpbnB1dC5jaGFyQ29kZUF0KGopKTtcblx0XHR9XG5cblx0XHQvLyBNYWluIGRlY29kaW5nIGxvb3A6IHN0YXJ0IGp1c3QgYWZ0ZXIgdGhlIGxhc3QgZGVsaW1pdGVyIGlmIGFueSBiYXNpYyBjb2RlXG5cdFx0Ly8gcG9pbnRzIHdlcmUgY29waWVkOyBzdGFydCBhdCB0aGUgYmVnaW5uaW5nIG90aGVyd2lzZS5cblxuXHRcdGZvciAoaW5kZXggPSBiYXNpYyA+IDAgPyBiYXNpYyArIDEgOiAwOyBpbmRleCA8IGlucHV0TGVuZ3RoOyAvKiBubyBmaW5hbCBleHByZXNzaW9uICovKSB7XG5cblx0XHRcdC8vIGBpbmRleGAgaXMgdGhlIGluZGV4IG9mIHRoZSBuZXh0IGNoYXJhY3RlciB0byBiZSBjb25zdW1lZC5cblx0XHRcdC8vIERlY29kZSBhIGdlbmVyYWxpemVkIHZhcmlhYmxlLWxlbmd0aCBpbnRlZ2VyIGludG8gYGRlbHRhYCxcblx0XHRcdC8vIHdoaWNoIGdldHMgYWRkZWQgdG8gYGlgLiBUaGUgb3ZlcmZsb3cgY2hlY2tpbmcgaXMgZWFzaWVyXG5cdFx0XHQvLyBpZiB3ZSBpbmNyZWFzZSBgaWAgYXMgd2UgZ28sIHRoZW4gc3VidHJhY3Qgb2ZmIGl0cyBzdGFydGluZ1xuXHRcdFx0Ly8gdmFsdWUgYXQgdGhlIGVuZCB0byBvYnRhaW4gYGRlbHRhYC5cblx0XHRcdGZvciAob2xkaSA9IGksIHcgPSAxLCBrID0gYmFzZTsgLyogbm8gY29uZGl0aW9uICovOyBrICs9IGJhc2UpIHtcblxuXHRcdFx0XHRpZiAoaW5kZXggPj0gaW5wdXRMZW5ndGgpIHtcblx0XHRcdFx0XHRlcnJvcignaW52YWxpZC1pbnB1dCcpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0ZGlnaXQgPSBiYXNpY1RvRGlnaXQoaW5wdXQuY2hhckNvZGVBdChpbmRleCsrKSk7XG5cblx0XHRcdFx0aWYgKGRpZ2l0ID49IGJhc2UgfHwgZGlnaXQgPiBmbG9vcigobWF4SW50IC0gaSkgLyB3KSkge1xuXHRcdFx0XHRcdGVycm9yKCdvdmVyZmxvdycpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0aSArPSBkaWdpdCAqIHc7XG5cdFx0XHRcdHQgPSBrIDw9IGJpYXMgPyB0TWluIDogKGsgPj0gYmlhcyArIHRNYXggPyB0TWF4IDogayAtIGJpYXMpO1xuXG5cdFx0XHRcdGlmIChkaWdpdCA8IHQpIHtcblx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGJhc2VNaW51c1QgPSBiYXNlIC0gdDtcblx0XHRcdFx0aWYgKHcgPiBmbG9vcihtYXhJbnQgLyBiYXNlTWludXNUKSkge1xuXHRcdFx0XHRcdGVycm9yKCdvdmVyZmxvdycpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0dyAqPSBiYXNlTWludXNUO1xuXG5cdFx0XHR9XG5cblx0XHRcdG91dCA9IG91dHB1dC5sZW5ndGggKyAxO1xuXHRcdFx0YmlhcyA9IGFkYXB0KGkgLSBvbGRpLCBvdXQsIG9sZGkgPT0gMCk7XG5cblx0XHRcdC8vIGBpYCB3YXMgc3VwcG9zZWQgdG8gd3JhcCBhcm91bmQgZnJvbSBgb3V0YCB0byBgMGAsXG5cdFx0XHQvLyBpbmNyZW1lbnRpbmcgYG5gIGVhY2ggdGltZSwgc28gd2UnbGwgZml4IHRoYXQgbm93OlxuXHRcdFx0aWYgKGZsb29yKGkgLyBvdXQpID4gbWF4SW50IC0gbikge1xuXHRcdFx0XHRlcnJvcignb3ZlcmZsb3cnKTtcblx0XHRcdH1cblxuXHRcdFx0biArPSBmbG9vcihpIC8gb3V0KTtcblx0XHRcdGkgJT0gb3V0O1xuXG5cdFx0XHQvLyBJbnNlcnQgYG5gIGF0IHBvc2l0aW9uIGBpYCBvZiB0aGUgb3V0cHV0XG5cdFx0XHRvdXRwdXQuc3BsaWNlKGkrKywgMCwgbik7XG5cblx0XHR9XG5cblx0XHRyZXR1cm4gdWNzMmVuY29kZShvdXRwdXQpO1xuXHR9XG5cblx0LyoqXG5cdCAqIENvbnZlcnRzIGEgc3RyaW5nIG9mIFVuaWNvZGUgc3ltYm9scyAoZS5nLiBhIGRvbWFpbiBuYW1lIGxhYmVsKSB0byBhXG5cdCAqIFB1bnljb2RlIHN0cmluZyBvZiBBU0NJSS1vbmx5IHN5bWJvbHMuXG5cdCAqIEBtZW1iZXJPZiBwdW55Y29kZVxuXHQgKiBAcGFyYW0ge1N0cmluZ30gaW5wdXQgVGhlIHN0cmluZyBvZiBVbmljb2RlIHN5bWJvbHMuXG5cdCAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSByZXN1bHRpbmcgUHVueWNvZGUgc3RyaW5nIG9mIEFTQ0lJLW9ubHkgc3ltYm9scy5cblx0ICovXG5cdGZ1bmN0aW9uIGVuY29kZShpbnB1dCkge1xuXHRcdHZhciBuLFxuXHRcdCAgICBkZWx0YSxcblx0XHQgICAgaGFuZGxlZENQQ291bnQsXG5cdFx0ICAgIGJhc2ljTGVuZ3RoLFxuXHRcdCAgICBiaWFzLFxuXHRcdCAgICBqLFxuXHRcdCAgICBtLFxuXHRcdCAgICBxLFxuXHRcdCAgICBrLFxuXHRcdCAgICB0LFxuXHRcdCAgICBjdXJyZW50VmFsdWUsXG5cdFx0ICAgIG91dHB1dCA9IFtdLFxuXHRcdCAgICAvKiogYGlucHV0TGVuZ3RoYCB3aWxsIGhvbGQgdGhlIG51bWJlciBvZiBjb2RlIHBvaW50cyBpbiBgaW5wdXRgLiAqL1xuXHRcdCAgICBpbnB1dExlbmd0aCxcblx0XHQgICAgLyoqIENhY2hlZCBjYWxjdWxhdGlvbiByZXN1bHRzICovXG5cdFx0ICAgIGhhbmRsZWRDUENvdW50UGx1c09uZSxcblx0XHQgICAgYmFzZU1pbnVzVCxcblx0XHQgICAgcU1pbnVzVDtcblxuXHRcdC8vIENvbnZlcnQgdGhlIGlucHV0IGluIFVDUy0yIHRvIFVuaWNvZGVcblx0XHRpbnB1dCA9IHVjczJkZWNvZGUoaW5wdXQpO1xuXG5cdFx0Ly8gQ2FjaGUgdGhlIGxlbmd0aFxuXHRcdGlucHV0TGVuZ3RoID0gaW5wdXQubGVuZ3RoO1xuXG5cdFx0Ly8gSW5pdGlhbGl6ZSB0aGUgc3RhdGVcblx0XHRuID0gaW5pdGlhbE47XG5cdFx0ZGVsdGEgPSAwO1xuXHRcdGJpYXMgPSBpbml0aWFsQmlhcztcblxuXHRcdC8vIEhhbmRsZSB0aGUgYmFzaWMgY29kZSBwb2ludHNcblx0XHRmb3IgKGogPSAwOyBqIDwgaW5wdXRMZW5ndGg7ICsraikge1xuXHRcdFx0Y3VycmVudFZhbHVlID0gaW5wdXRbal07XG5cdFx0XHRpZiAoY3VycmVudFZhbHVlIDwgMHg4MCkge1xuXHRcdFx0XHRvdXRwdXQucHVzaChzdHJpbmdGcm9tQ2hhckNvZGUoY3VycmVudFZhbHVlKSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aGFuZGxlZENQQ291bnQgPSBiYXNpY0xlbmd0aCA9IG91dHB1dC5sZW5ndGg7XG5cblx0XHQvLyBgaGFuZGxlZENQQ291bnRgIGlzIHRoZSBudW1iZXIgb2YgY29kZSBwb2ludHMgdGhhdCBoYXZlIGJlZW4gaGFuZGxlZDtcblx0XHQvLyBgYmFzaWNMZW5ndGhgIGlzIHRoZSBudW1iZXIgb2YgYmFzaWMgY29kZSBwb2ludHMuXG5cblx0XHQvLyBGaW5pc2ggdGhlIGJhc2ljIHN0cmluZyAtIGlmIGl0IGlzIG5vdCBlbXB0eSAtIHdpdGggYSBkZWxpbWl0ZXJcblx0XHRpZiAoYmFzaWNMZW5ndGgpIHtcblx0XHRcdG91dHB1dC5wdXNoKGRlbGltaXRlcik7XG5cdFx0fVxuXG5cdFx0Ly8gTWFpbiBlbmNvZGluZyBsb29wOlxuXHRcdHdoaWxlIChoYW5kbGVkQ1BDb3VudCA8IGlucHV0TGVuZ3RoKSB7XG5cblx0XHRcdC8vIEFsbCBub24tYmFzaWMgY29kZSBwb2ludHMgPCBuIGhhdmUgYmVlbiBoYW5kbGVkIGFscmVhZHkuIEZpbmQgdGhlIG5leHRcblx0XHRcdC8vIGxhcmdlciBvbmU6XG5cdFx0XHRmb3IgKG0gPSBtYXhJbnQsIGogPSAwOyBqIDwgaW5wdXRMZW5ndGg7ICsraikge1xuXHRcdFx0XHRjdXJyZW50VmFsdWUgPSBpbnB1dFtqXTtcblx0XHRcdFx0aWYgKGN1cnJlbnRWYWx1ZSA+PSBuICYmIGN1cnJlbnRWYWx1ZSA8IG0pIHtcblx0XHRcdFx0XHRtID0gY3VycmVudFZhbHVlO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdC8vIEluY3JlYXNlIGBkZWx0YWAgZW5vdWdoIHRvIGFkdmFuY2UgdGhlIGRlY29kZXIncyA8bixpPiBzdGF0ZSB0byA8bSwwPixcblx0XHRcdC8vIGJ1dCBndWFyZCBhZ2FpbnN0IG92ZXJmbG93XG5cdFx0XHRoYW5kbGVkQ1BDb3VudFBsdXNPbmUgPSBoYW5kbGVkQ1BDb3VudCArIDE7XG5cdFx0XHRpZiAobSAtIG4gPiBmbG9vcigobWF4SW50IC0gZGVsdGEpIC8gaGFuZGxlZENQQ291bnRQbHVzT25lKSkge1xuXHRcdFx0XHRlcnJvcignb3ZlcmZsb3cnKTtcblx0XHRcdH1cblxuXHRcdFx0ZGVsdGEgKz0gKG0gLSBuKSAqIGhhbmRsZWRDUENvdW50UGx1c09uZTtcblx0XHRcdG4gPSBtO1xuXG5cdFx0XHRmb3IgKGogPSAwOyBqIDwgaW5wdXRMZW5ndGg7ICsraikge1xuXHRcdFx0XHRjdXJyZW50VmFsdWUgPSBpbnB1dFtqXTtcblxuXHRcdFx0XHRpZiAoY3VycmVudFZhbHVlIDwgbiAmJiArK2RlbHRhID4gbWF4SW50KSB7XG5cdFx0XHRcdFx0ZXJyb3IoJ292ZXJmbG93Jyk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRpZiAoY3VycmVudFZhbHVlID09IG4pIHtcblx0XHRcdFx0XHQvLyBSZXByZXNlbnQgZGVsdGEgYXMgYSBnZW5lcmFsaXplZCB2YXJpYWJsZS1sZW5ndGggaW50ZWdlclxuXHRcdFx0XHRcdGZvciAocSA9IGRlbHRhLCBrID0gYmFzZTsgLyogbm8gY29uZGl0aW9uICovOyBrICs9IGJhc2UpIHtcblx0XHRcdFx0XHRcdHQgPSBrIDw9IGJpYXMgPyB0TWluIDogKGsgPj0gYmlhcyArIHRNYXggPyB0TWF4IDogayAtIGJpYXMpO1xuXHRcdFx0XHRcdFx0aWYgKHEgPCB0KSB7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0cU1pbnVzVCA9IHEgLSB0O1xuXHRcdFx0XHRcdFx0YmFzZU1pbnVzVCA9IGJhc2UgLSB0O1xuXHRcdFx0XHRcdFx0b3V0cHV0LnB1c2goXG5cdFx0XHRcdFx0XHRcdHN0cmluZ0Zyb21DaGFyQ29kZShkaWdpdFRvQmFzaWModCArIHFNaW51c1QgJSBiYXNlTWludXNULCAwKSlcblx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0XHRxID0gZmxvb3IocU1pbnVzVCAvIGJhc2VNaW51c1QpO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdG91dHB1dC5wdXNoKHN0cmluZ0Zyb21DaGFyQ29kZShkaWdpdFRvQmFzaWMocSwgMCkpKTtcblx0XHRcdFx0XHRiaWFzID0gYWRhcHQoZGVsdGEsIGhhbmRsZWRDUENvdW50UGx1c09uZSwgaGFuZGxlZENQQ291bnQgPT0gYmFzaWNMZW5ndGgpO1xuXHRcdFx0XHRcdGRlbHRhID0gMDtcblx0XHRcdFx0XHQrK2hhbmRsZWRDUENvdW50O1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdCsrZGVsdGE7XG5cdFx0XHQrK247XG5cblx0XHR9XG5cdFx0cmV0dXJuIG91dHB1dC5qb2luKCcnKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBDb252ZXJ0cyBhIFB1bnljb2RlIHN0cmluZyByZXByZXNlbnRpbmcgYSBkb21haW4gbmFtZSBvciBhbiBlbWFpbCBhZGRyZXNzXG5cdCAqIHRvIFVuaWNvZGUuIE9ubHkgdGhlIFB1bnljb2RlZCBwYXJ0cyBvZiB0aGUgaW5wdXQgd2lsbCBiZSBjb252ZXJ0ZWQsIGkuZS5cblx0ICogaXQgZG9lc24ndCBtYXR0ZXIgaWYgeW91IGNhbGwgaXQgb24gYSBzdHJpbmcgdGhhdCBoYXMgYWxyZWFkeSBiZWVuXG5cdCAqIGNvbnZlcnRlZCB0byBVbmljb2RlLlxuXHQgKiBAbWVtYmVyT2YgcHVueWNvZGVcblx0ICogQHBhcmFtIHtTdHJpbmd9IGlucHV0IFRoZSBQdW55Y29kZWQgZG9tYWluIG5hbWUgb3IgZW1haWwgYWRkcmVzcyB0b1xuXHQgKiBjb252ZXJ0IHRvIFVuaWNvZGUuXG5cdCAqIEByZXR1cm5zIHtTdHJpbmd9IFRoZSBVbmljb2RlIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBnaXZlbiBQdW55Y29kZVxuXHQgKiBzdHJpbmcuXG5cdCAqL1xuXHRmdW5jdGlvbiB0b1VuaWNvZGUoaW5wdXQpIHtcblx0XHRyZXR1cm4gbWFwRG9tYWluKGlucHV0LCBmdW5jdGlvbihzdHJpbmcpIHtcblx0XHRcdHJldHVybiByZWdleFB1bnljb2RlLnRlc3Qoc3RyaW5nKVxuXHRcdFx0XHQ/IGRlY29kZShzdHJpbmcuc2xpY2UoNCkudG9Mb3dlckNhc2UoKSlcblx0XHRcdFx0OiBzdHJpbmc7XG5cdFx0fSk7XG5cdH1cblxuXHQvKipcblx0ICogQ29udmVydHMgYSBVbmljb2RlIHN0cmluZyByZXByZXNlbnRpbmcgYSBkb21haW4gbmFtZSBvciBhbiBlbWFpbCBhZGRyZXNzIHRvXG5cdCAqIFB1bnljb2RlLiBPbmx5IHRoZSBub24tQVNDSUkgcGFydHMgb2YgdGhlIGRvbWFpbiBuYW1lIHdpbGwgYmUgY29udmVydGVkLFxuXHQgKiBpLmUuIGl0IGRvZXNuJ3QgbWF0dGVyIGlmIHlvdSBjYWxsIGl0IHdpdGggYSBkb21haW4gdGhhdCdzIGFscmVhZHkgaW5cblx0ICogQVNDSUkuXG5cdCAqIEBtZW1iZXJPZiBwdW55Y29kZVxuXHQgKiBAcGFyYW0ge1N0cmluZ30gaW5wdXQgVGhlIGRvbWFpbiBuYW1lIG9yIGVtYWlsIGFkZHJlc3MgdG8gY29udmVydCwgYXMgYVxuXHQgKiBVbmljb2RlIHN0cmluZy5cblx0ICogQHJldHVybnMge1N0cmluZ30gVGhlIFB1bnljb2RlIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBnaXZlbiBkb21haW4gbmFtZSBvclxuXHQgKiBlbWFpbCBhZGRyZXNzLlxuXHQgKi9cblx0ZnVuY3Rpb24gdG9BU0NJSShpbnB1dCkge1xuXHRcdHJldHVybiBtYXBEb21haW4oaW5wdXQsIGZ1bmN0aW9uKHN0cmluZykge1xuXHRcdFx0cmV0dXJuIHJlZ2V4Tm9uQVNDSUkudGVzdChzdHJpbmcpXG5cdFx0XHRcdD8gJ3huLS0nICsgZW5jb2RlKHN0cmluZylcblx0XHRcdFx0OiBzdHJpbmc7XG5cdFx0fSk7XG5cdH1cblxuXHQvKi0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tKi9cblxuXHQvKiogRGVmaW5lIHRoZSBwdWJsaWMgQVBJICovXG5cdHB1bnljb2RlID0ge1xuXHRcdC8qKlxuXHRcdCAqIEEgc3RyaW5nIHJlcHJlc2VudGluZyB0aGUgY3VycmVudCBQdW55Y29kZS5qcyB2ZXJzaW9uIG51bWJlci5cblx0XHQgKiBAbWVtYmVyT2YgcHVueWNvZGVcblx0XHQgKiBAdHlwZSBTdHJpbmdcblx0XHQgKi9cblx0XHQndmVyc2lvbic6ICcxLjQuMScsXG5cdFx0LyoqXG5cdFx0ICogQW4gb2JqZWN0IG9mIG1ldGhvZHMgdG8gY29udmVydCBmcm9tIEphdmFTY3JpcHQncyBpbnRlcm5hbCBjaGFyYWN0ZXJcblx0XHQgKiByZXByZXNlbnRhdGlvbiAoVUNTLTIpIHRvIFVuaWNvZGUgY29kZSBwb2ludHMsIGFuZCBiYWNrLlxuXHRcdCAqIEBzZWUgPGh0dHBzOi8vbWF0aGlhc2J5bmVucy5iZS9ub3Rlcy9qYXZhc2NyaXB0LWVuY29kaW5nPlxuXHRcdCAqIEBtZW1iZXJPZiBwdW55Y29kZVxuXHRcdCAqIEB0eXBlIE9iamVjdFxuXHRcdCAqL1xuXHRcdCd1Y3MyJzoge1xuXHRcdFx0J2RlY29kZSc6IHVjczJkZWNvZGUsXG5cdFx0XHQnZW5jb2RlJzogdWNzMmVuY29kZVxuXHRcdH0sXG5cdFx0J2RlY29kZSc6IGRlY29kZSxcblx0XHQnZW5jb2RlJzogZW5jb2RlLFxuXHRcdCd0b0FTQ0lJJzogdG9BU0NJSSxcblx0XHQndG9Vbmljb2RlJzogdG9Vbmljb2RlXG5cdH07XG5cblx0LyoqIEV4cG9zZSBgcHVueWNvZGVgICovXG5cdC8vIFNvbWUgQU1EIGJ1aWxkIG9wdGltaXplcnMsIGxpa2Ugci5qcywgY2hlY2sgZm9yIHNwZWNpZmljIGNvbmRpdGlvbiBwYXR0ZXJuc1xuXHQvLyBsaWtlIHRoZSBmb2xsb3dpbmc6XG5cdGlmIChcblx0XHR0eXBlb2YgZGVmaW5lID09ICdmdW5jdGlvbicgJiZcblx0XHR0eXBlb2YgZGVmaW5lLmFtZCA9PSAnb2JqZWN0JyAmJlxuXHRcdGRlZmluZS5hbWRcblx0KSB7XG5cdFx0ZGVmaW5lKCdwdW55Y29kZScsIGZ1bmN0aW9uKCkge1xuXHRcdFx0cmV0dXJuIHB1bnljb2RlO1xuXHRcdH0pO1xuXHR9IGVsc2UgaWYgKGZyZWVFeHBvcnRzICYmIGZyZWVNb2R1bGUpIHtcblx0XHRpZiAobW9kdWxlLmV4cG9ydHMgPT0gZnJlZUV4cG9ydHMpIHtcblx0XHRcdC8vIGluIE5vZGUuanMsIGlvLmpzLCBvciBSaW5nb0pTIHYwLjguMCtcblx0XHRcdGZyZWVNb2R1bGUuZXhwb3J0cyA9IHB1bnljb2RlO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQvLyBpbiBOYXJ3aGFsIG9yIFJpbmdvSlMgdjAuNy4wLVxuXHRcdFx0Zm9yIChrZXkgaW4gcHVueWNvZGUpIHtcblx0XHRcdFx0cHVueWNvZGUuaGFzT3duUHJvcGVydHkoa2V5KSAmJiAoZnJlZUV4cG9ydHNba2V5XSA9IHB1bnljb2RlW2tleV0pO1xuXHRcdFx0fVxuXHRcdH1cblx0fSBlbHNlIHtcblx0XHQvLyBpbiBSaGlubyBvciBhIHdlYiBicm93c2VyXG5cdFx0cm9vdC5wdW55Y29kZSA9IHB1bnljb2RlO1xuXHR9XG5cbn0odGhpcykpO1xuIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbid1c2Ugc3RyaWN0JztcblxuLy8gSWYgb2JqLmhhc093blByb3BlcnR5IGhhcyBiZWVuIG92ZXJyaWRkZW4sIHRoZW4gY2FsbGluZ1xuLy8gb2JqLmhhc093blByb3BlcnR5KHByb3ApIHdpbGwgYnJlYWsuXG4vLyBTZWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9qb3llbnQvbm9kZS9pc3N1ZXMvMTcwN1xuZnVuY3Rpb24gaGFzT3duUHJvcGVydHkob2JqLCBwcm9wKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihxcywgc2VwLCBlcSwgb3B0aW9ucykge1xuICBzZXAgPSBzZXAgfHwgJyYnO1xuICBlcSA9IGVxIHx8ICc9JztcbiAgdmFyIG9iaiA9IHt9O1xuXG4gIGlmICh0eXBlb2YgcXMgIT09ICdzdHJpbmcnIHx8IHFzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiBvYmo7XG4gIH1cblxuICB2YXIgcmVnZXhwID0gL1xcKy9nO1xuICBxcyA9IHFzLnNwbGl0KHNlcCk7XG5cbiAgdmFyIG1heEtleXMgPSAxMDAwO1xuICBpZiAob3B0aW9ucyAmJiB0eXBlb2Ygb3B0aW9ucy5tYXhLZXlzID09PSAnbnVtYmVyJykge1xuICAgIG1heEtleXMgPSBvcHRpb25zLm1heEtleXM7XG4gIH1cblxuICB2YXIgbGVuID0gcXMubGVuZ3RoO1xuICAvLyBtYXhLZXlzIDw9IDAgbWVhbnMgdGhhdCB3ZSBzaG91bGQgbm90IGxpbWl0IGtleXMgY291bnRcbiAgaWYgKG1heEtleXMgPiAwICYmIGxlbiA+IG1heEtleXMpIHtcbiAgICBsZW4gPSBtYXhLZXlzO1xuICB9XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47ICsraSkge1xuICAgIHZhciB4ID0gcXNbaV0ucmVwbGFjZShyZWdleHAsICclMjAnKSxcbiAgICAgICAgaWR4ID0geC5pbmRleE9mKGVxKSxcbiAgICAgICAga3N0ciwgdnN0ciwgaywgdjtcblxuICAgIGlmIChpZHggPj0gMCkge1xuICAgICAga3N0ciA9IHguc3Vic3RyKDAsIGlkeCk7XG4gICAgICB2c3RyID0geC5zdWJzdHIoaWR4ICsgMSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGtzdHIgPSB4O1xuICAgICAgdnN0ciA9ICcnO1xuICAgIH1cblxuICAgIGsgPSBkZWNvZGVVUklDb21wb25lbnQoa3N0cik7XG4gICAgdiA9IGRlY29kZVVSSUNvbXBvbmVudCh2c3RyKTtcblxuICAgIGlmICghaGFzT3duUHJvcGVydHkob2JqLCBrKSkge1xuICAgICAgb2JqW2tdID0gdjtcbiAgICB9IGVsc2UgaWYgKGlzQXJyYXkob2JqW2tdKSkge1xuICAgICAgb2JqW2tdLnB1c2godik7XG4gICAgfSBlbHNlIHtcbiAgICAgIG9ialtrXSA9IFtvYmpba10sIHZdO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBvYmo7XG59O1xuXG52YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkgfHwgZnVuY3Rpb24gKHhzKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoeHMpID09PSAnW29iamVjdCBBcnJheV0nO1xufTtcbiIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG4ndXNlIHN0cmljdCc7XG5cbnZhciBzdHJpbmdpZnlQcmltaXRpdmUgPSBmdW5jdGlvbih2KSB7XG4gIHN3aXRjaCAodHlwZW9mIHYpIHtcbiAgICBjYXNlICdzdHJpbmcnOlxuICAgICAgcmV0dXJuIHY7XG5cbiAgICBjYXNlICdib29sZWFuJzpcbiAgICAgIHJldHVybiB2ID8gJ3RydWUnIDogJ2ZhbHNlJztcblxuICAgIGNhc2UgJ251bWJlcic6XG4gICAgICByZXR1cm4gaXNGaW5pdGUodikgPyB2IDogJyc7XG5cbiAgICBkZWZhdWx0OlxuICAgICAgcmV0dXJuICcnO1xuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKG9iaiwgc2VwLCBlcSwgbmFtZSkge1xuICBzZXAgPSBzZXAgfHwgJyYnO1xuICBlcSA9IGVxIHx8ICc9JztcbiAgaWYgKG9iaiA9PT0gbnVsbCkge1xuICAgIG9iaiA9IHVuZGVmaW5lZDtcbiAgfVxuXG4gIGlmICh0eXBlb2Ygb2JqID09PSAnb2JqZWN0Jykge1xuICAgIHJldHVybiBtYXAob2JqZWN0S2V5cyhvYmopLCBmdW5jdGlvbihrKSB7XG4gICAgICB2YXIga3MgPSBlbmNvZGVVUklDb21wb25lbnQoc3RyaW5naWZ5UHJpbWl0aXZlKGspKSArIGVxO1xuICAgICAgaWYgKGlzQXJyYXkob2JqW2tdKSkge1xuICAgICAgICByZXR1cm4gbWFwKG9ialtrXSwgZnVuY3Rpb24odikge1xuICAgICAgICAgIHJldHVybiBrcyArIGVuY29kZVVSSUNvbXBvbmVudChzdHJpbmdpZnlQcmltaXRpdmUodikpO1xuICAgICAgICB9KS5qb2luKHNlcCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4ga3MgKyBlbmNvZGVVUklDb21wb25lbnQoc3RyaW5naWZ5UHJpbWl0aXZlKG9ialtrXSkpO1xuICAgICAgfVxuICAgIH0pLmpvaW4oc2VwKTtcblxuICB9XG5cbiAgaWYgKCFuYW1lKSByZXR1cm4gJyc7XG4gIHJldHVybiBlbmNvZGVVUklDb21wb25lbnQoc3RyaW5naWZ5UHJpbWl0aXZlKG5hbWUpKSArIGVxICtcbiAgICAgICAgIGVuY29kZVVSSUNvbXBvbmVudChzdHJpbmdpZnlQcmltaXRpdmUob2JqKSk7XG59O1xuXG52YXIgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkgfHwgZnVuY3Rpb24gKHhzKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwoeHMpID09PSAnW29iamVjdCBBcnJheV0nO1xufTtcblxuZnVuY3Rpb24gbWFwICh4cywgZikge1xuICBpZiAoeHMubWFwKSByZXR1cm4geHMubWFwKGYpO1xuICB2YXIgcmVzID0gW107XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgeHMubGVuZ3RoOyBpKyspIHtcbiAgICByZXMucHVzaChmKHhzW2ldLCBpKSk7XG4gIH1cbiAgcmV0dXJuIHJlcztcbn1cblxudmFyIG9iamVjdEtleXMgPSBPYmplY3Qua2V5cyB8fCBmdW5jdGlvbiAob2JqKSB7XG4gIHZhciByZXMgPSBbXTtcbiAgZm9yICh2YXIga2V5IGluIG9iaikge1xuICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBrZXkpKSByZXMucHVzaChrZXkpO1xuICB9XG4gIHJldHVybiByZXM7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5leHBvcnRzLmRlY29kZSA9IGV4cG9ydHMucGFyc2UgPSByZXF1aXJlKCcuL2RlY29kZScpO1xuZXhwb3J0cy5lbmNvZGUgPSBleHBvcnRzLnN0cmluZ2lmeSA9IHJlcXVpcmUoJy4vZW5jb2RlJyk7XG4iLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgcHVueWNvZGUgPSByZXF1aXJlKCdwdW55Y29kZScpO1xudmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcblxuZXhwb3J0cy5wYXJzZSA9IHVybFBhcnNlO1xuZXhwb3J0cy5yZXNvbHZlID0gdXJsUmVzb2x2ZTtcbmV4cG9ydHMucmVzb2x2ZU9iamVjdCA9IHVybFJlc29sdmVPYmplY3Q7XG5leHBvcnRzLmZvcm1hdCA9IHVybEZvcm1hdDtcblxuZXhwb3J0cy5VcmwgPSBVcmw7XG5cbmZ1bmN0aW9uIFVybCgpIHtcbiAgdGhpcy5wcm90b2NvbCA9IG51bGw7XG4gIHRoaXMuc2xhc2hlcyA9IG51bGw7XG4gIHRoaXMuYXV0aCA9IG51bGw7XG4gIHRoaXMuaG9zdCA9IG51bGw7XG4gIHRoaXMucG9ydCA9IG51bGw7XG4gIHRoaXMuaG9zdG5hbWUgPSBudWxsO1xuICB0aGlzLmhhc2ggPSBudWxsO1xuICB0aGlzLnNlYXJjaCA9IG51bGw7XG4gIHRoaXMucXVlcnkgPSBudWxsO1xuICB0aGlzLnBhdGhuYW1lID0gbnVsbDtcbiAgdGhpcy5wYXRoID0gbnVsbDtcbiAgdGhpcy5ocmVmID0gbnVsbDtcbn1cblxuLy8gUmVmZXJlbmNlOiBSRkMgMzk4NiwgUkZDIDE4MDgsIFJGQyAyMzk2XG5cbi8vIGRlZmluZSB0aGVzZSBoZXJlIHNvIGF0IGxlYXN0IHRoZXkgb25seSBoYXZlIHRvIGJlXG4vLyBjb21waWxlZCBvbmNlIG9uIHRoZSBmaXJzdCBtb2R1bGUgbG9hZC5cbnZhciBwcm90b2NvbFBhdHRlcm4gPSAvXihbYS16MC05ListXSs6KS9pLFxuICAgIHBvcnRQYXR0ZXJuID0gLzpbMC05XSokLyxcblxuICAgIC8vIFNwZWNpYWwgY2FzZSBmb3IgYSBzaW1wbGUgcGF0aCBVUkxcbiAgICBzaW1wbGVQYXRoUGF0dGVybiA9IC9eKFxcL1xcLz8oPyFcXC8pW15cXD9cXHNdKikoXFw/W15cXHNdKik/JC8sXG5cbiAgICAvLyBSRkMgMjM5NjogY2hhcmFjdGVycyByZXNlcnZlZCBmb3IgZGVsaW1pdGluZyBVUkxzLlxuICAgIC8vIFdlIGFjdHVhbGx5IGp1c3QgYXV0by1lc2NhcGUgdGhlc2UuXG4gICAgZGVsaW1zID0gWyc8JywgJz4nLCAnXCInLCAnYCcsICcgJywgJ1xccicsICdcXG4nLCAnXFx0J10sXG5cbiAgICAvLyBSRkMgMjM5NjogY2hhcmFjdGVycyBub3QgYWxsb3dlZCBmb3IgdmFyaW91cyByZWFzb25zLlxuICAgIHVud2lzZSA9IFsneycsICd9JywgJ3wnLCAnXFxcXCcsICdeJywgJ2AnXS5jb25jYXQoZGVsaW1zKSxcblxuICAgIC8vIEFsbG93ZWQgYnkgUkZDcywgYnV0IGNhdXNlIG9mIFhTUyBhdHRhY2tzLiAgQWx3YXlzIGVzY2FwZSB0aGVzZS5cbiAgICBhdXRvRXNjYXBlID0gWydcXCcnXS5jb25jYXQodW53aXNlKSxcbiAgICAvLyBDaGFyYWN0ZXJzIHRoYXQgYXJlIG5ldmVyIGV2ZXIgYWxsb3dlZCBpbiBhIGhvc3RuYW1lLlxuICAgIC8vIE5vdGUgdGhhdCBhbnkgaW52YWxpZCBjaGFycyBhcmUgYWxzbyBoYW5kbGVkLCBidXQgdGhlc2VcbiAgICAvLyBhcmUgdGhlIG9uZXMgdGhhdCBhcmUgKmV4cGVjdGVkKiB0byBiZSBzZWVuLCBzbyB3ZSBmYXN0LXBhdGhcbiAgICAvLyB0aGVtLlxuICAgIG5vbkhvc3RDaGFycyA9IFsnJScsICcvJywgJz8nLCAnOycsICcjJ10uY29uY2F0KGF1dG9Fc2NhcGUpLFxuICAgIGhvc3RFbmRpbmdDaGFycyA9IFsnLycsICc/JywgJyMnXSxcbiAgICBob3N0bmFtZU1heExlbiA9IDI1NSxcbiAgICBob3N0bmFtZVBhcnRQYXR0ZXJuID0gL15bK2EtejAtOUEtWl8tXXswLDYzfSQvLFxuICAgIGhvc3RuYW1lUGFydFN0YXJ0ID0gL14oWythLXowLTlBLVpfLV17MCw2M30pKC4qKSQvLFxuICAgIC8vIHByb3RvY29scyB0aGF0IGNhbiBhbGxvdyBcInVuc2FmZVwiIGFuZCBcInVud2lzZVwiIGNoYXJzLlxuICAgIHVuc2FmZVByb3RvY29sID0ge1xuICAgICAgJ2phdmFzY3JpcHQnOiB0cnVlLFxuICAgICAgJ2phdmFzY3JpcHQ6JzogdHJ1ZVxuICAgIH0sXG4gICAgLy8gcHJvdG9jb2xzIHRoYXQgbmV2ZXIgaGF2ZSBhIGhvc3RuYW1lLlxuICAgIGhvc3RsZXNzUHJvdG9jb2wgPSB7XG4gICAgICAnamF2YXNjcmlwdCc6IHRydWUsXG4gICAgICAnamF2YXNjcmlwdDonOiB0cnVlXG4gICAgfSxcbiAgICAvLyBwcm90b2NvbHMgdGhhdCBhbHdheXMgY29udGFpbiBhIC8vIGJpdC5cbiAgICBzbGFzaGVkUHJvdG9jb2wgPSB7XG4gICAgICAnaHR0cCc6IHRydWUsXG4gICAgICAnaHR0cHMnOiB0cnVlLFxuICAgICAgJ2Z0cCc6IHRydWUsXG4gICAgICAnZ29waGVyJzogdHJ1ZSxcbiAgICAgICdmaWxlJzogdHJ1ZSxcbiAgICAgICdodHRwOic6IHRydWUsXG4gICAgICAnaHR0cHM6JzogdHJ1ZSxcbiAgICAgICdmdHA6JzogdHJ1ZSxcbiAgICAgICdnb3BoZXI6JzogdHJ1ZSxcbiAgICAgICdmaWxlOic6IHRydWVcbiAgICB9LFxuICAgIHF1ZXJ5c3RyaW5nID0gcmVxdWlyZSgncXVlcnlzdHJpbmcnKTtcblxuZnVuY3Rpb24gdXJsUGFyc2UodXJsLCBwYXJzZVF1ZXJ5U3RyaW5nLCBzbGFzaGVzRGVub3RlSG9zdCkge1xuICBpZiAodXJsICYmIHV0aWwuaXNPYmplY3QodXJsKSAmJiB1cmwgaW5zdGFuY2VvZiBVcmwpIHJldHVybiB1cmw7XG5cbiAgdmFyIHUgPSBuZXcgVXJsO1xuICB1LnBhcnNlKHVybCwgcGFyc2VRdWVyeVN0cmluZywgc2xhc2hlc0Rlbm90ZUhvc3QpO1xuICByZXR1cm4gdTtcbn1cblxuVXJsLnByb3RvdHlwZS5wYXJzZSA9IGZ1bmN0aW9uKHVybCwgcGFyc2VRdWVyeVN0cmluZywgc2xhc2hlc0Rlbm90ZUhvc3QpIHtcbiAgaWYgKCF1dGlsLmlzU3RyaW5nKHVybCkpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiUGFyYW1ldGVyICd1cmwnIG11c3QgYmUgYSBzdHJpbmcsIG5vdCBcIiArIHR5cGVvZiB1cmwpO1xuICB9XG5cbiAgLy8gQ29weSBjaHJvbWUsIElFLCBvcGVyYSBiYWNrc2xhc2gtaGFuZGxpbmcgYmVoYXZpb3IuXG4gIC8vIEJhY2sgc2xhc2hlcyBiZWZvcmUgdGhlIHF1ZXJ5IHN0cmluZyBnZXQgY29udmVydGVkIHRvIGZvcndhcmQgc2xhc2hlc1xuICAvLyBTZWU6IGh0dHBzOi8vY29kZS5nb29nbGUuY29tL3AvY2hyb21pdW0vaXNzdWVzL2RldGFpbD9pZD0yNTkxNlxuICB2YXIgcXVlcnlJbmRleCA9IHVybC5pbmRleE9mKCc/JyksXG4gICAgICBzcGxpdHRlciA9XG4gICAgICAgICAgKHF1ZXJ5SW5kZXggIT09IC0xICYmIHF1ZXJ5SW5kZXggPCB1cmwuaW5kZXhPZignIycpKSA/ICc/JyA6ICcjJyxcbiAgICAgIHVTcGxpdCA9IHVybC5zcGxpdChzcGxpdHRlciksXG4gICAgICBzbGFzaFJlZ2V4ID0gL1xcXFwvZztcbiAgdVNwbGl0WzBdID0gdVNwbGl0WzBdLnJlcGxhY2Uoc2xhc2hSZWdleCwgJy8nKTtcbiAgdXJsID0gdVNwbGl0LmpvaW4oc3BsaXR0ZXIpO1xuXG4gIHZhciByZXN0ID0gdXJsO1xuXG4gIC8vIHRyaW0gYmVmb3JlIHByb2NlZWRpbmcuXG4gIC8vIFRoaXMgaXMgdG8gc3VwcG9ydCBwYXJzZSBzdHVmZiBsaWtlIFwiICBodHRwOi8vZm9vLmNvbSAgXFxuXCJcbiAgcmVzdCA9IHJlc3QudHJpbSgpO1xuXG4gIGlmICghc2xhc2hlc0Rlbm90ZUhvc3QgJiYgdXJsLnNwbGl0KCcjJykubGVuZ3RoID09PSAxKSB7XG4gICAgLy8gVHJ5IGZhc3QgcGF0aCByZWdleHBcbiAgICB2YXIgc2ltcGxlUGF0aCA9IHNpbXBsZVBhdGhQYXR0ZXJuLmV4ZWMocmVzdCk7XG4gICAgaWYgKHNpbXBsZVBhdGgpIHtcbiAgICAgIHRoaXMucGF0aCA9IHJlc3Q7XG4gICAgICB0aGlzLmhyZWYgPSByZXN0O1xuICAgICAgdGhpcy5wYXRobmFtZSA9IHNpbXBsZVBhdGhbMV07XG4gICAgICBpZiAoc2ltcGxlUGF0aFsyXSkge1xuICAgICAgICB0aGlzLnNlYXJjaCA9IHNpbXBsZVBhdGhbMl07XG4gICAgICAgIGlmIChwYXJzZVF1ZXJ5U3RyaW5nKSB7XG4gICAgICAgICAgdGhpcy5xdWVyeSA9IHF1ZXJ5c3RyaW5nLnBhcnNlKHRoaXMuc2VhcmNoLnN1YnN0cigxKSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhpcy5xdWVyeSA9IHRoaXMuc2VhcmNoLnN1YnN0cigxKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmIChwYXJzZVF1ZXJ5U3RyaW5nKSB7XG4gICAgICAgIHRoaXMuc2VhcmNoID0gJyc7XG4gICAgICAgIHRoaXMucXVlcnkgPSB7fTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cbiAgfVxuXG4gIHZhciBwcm90byA9IHByb3RvY29sUGF0dGVybi5leGVjKHJlc3QpO1xuICBpZiAocHJvdG8pIHtcbiAgICBwcm90byA9IHByb3RvWzBdO1xuICAgIHZhciBsb3dlclByb3RvID0gcHJvdG8udG9Mb3dlckNhc2UoKTtcbiAgICB0aGlzLnByb3RvY29sID0gbG93ZXJQcm90bztcbiAgICByZXN0ID0gcmVzdC5zdWJzdHIocHJvdG8ubGVuZ3RoKTtcbiAgfVxuXG4gIC8vIGZpZ3VyZSBvdXQgaWYgaXQncyBnb3QgYSBob3N0XG4gIC8vIHVzZXJAc2VydmVyIGlzICphbHdheXMqIGludGVycHJldGVkIGFzIGEgaG9zdG5hbWUsIGFuZCB1cmxcbiAgLy8gcmVzb2x1dGlvbiB3aWxsIHRyZWF0IC8vZm9vL2JhciBhcyBob3N0PWZvbyxwYXRoPWJhciBiZWNhdXNlIHRoYXQnc1xuICAvLyBob3cgdGhlIGJyb3dzZXIgcmVzb2x2ZXMgcmVsYXRpdmUgVVJMcy5cbiAgaWYgKHNsYXNoZXNEZW5vdGVIb3N0IHx8IHByb3RvIHx8IHJlc3QubWF0Y2goL15cXC9cXC9bXkBcXC9dK0BbXkBcXC9dKy8pKSB7XG4gICAgdmFyIHNsYXNoZXMgPSByZXN0LnN1YnN0cigwLCAyKSA9PT0gJy8vJztcbiAgICBpZiAoc2xhc2hlcyAmJiAhKHByb3RvICYmIGhvc3RsZXNzUHJvdG9jb2xbcHJvdG9dKSkge1xuICAgICAgcmVzdCA9IHJlc3Quc3Vic3RyKDIpO1xuICAgICAgdGhpcy5zbGFzaGVzID0gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICBpZiAoIWhvc3RsZXNzUHJvdG9jb2xbcHJvdG9dICYmXG4gICAgICAoc2xhc2hlcyB8fCAocHJvdG8gJiYgIXNsYXNoZWRQcm90b2NvbFtwcm90b10pKSkge1xuXG4gICAgLy8gdGhlcmUncyBhIGhvc3RuYW1lLlxuICAgIC8vIHRoZSBmaXJzdCBpbnN0YW5jZSBvZiAvLCA/LCA7LCBvciAjIGVuZHMgdGhlIGhvc3QuXG4gICAgLy9cbiAgICAvLyBJZiB0aGVyZSBpcyBhbiBAIGluIHRoZSBob3N0bmFtZSwgdGhlbiBub24taG9zdCBjaGFycyAqYXJlKiBhbGxvd2VkXG4gICAgLy8gdG8gdGhlIGxlZnQgb2YgdGhlIGxhc3QgQCBzaWduLCB1bmxlc3Mgc29tZSBob3N0LWVuZGluZyBjaGFyYWN0ZXJcbiAgICAvLyBjb21lcyAqYmVmb3JlKiB0aGUgQC1zaWduLlxuICAgIC8vIFVSTHMgYXJlIG9ibm94aW91cy5cbiAgICAvL1xuICAgIC8vIGV4OlxuICAgIC8vIGh0dHA6Ly9hQGJAYy8gPT4gdXNlcjphQGIgaG9zdDpjXG4gICAgLy8gaHR0cDovL2FAYj9AYyA9PiB1c2VyOmEgaG9zdDpjIHBhdGg6Lz9AY1xuXG4gICAgLy8gdjAuMTIgVE9ETyhpc2FhY3MpOiBUaGlzIGlzIG5vdCBxdWl0ZSBob3cgQ2hyb21lIGRvZXMgdGhpbmdzLlxuICAgIC8vIFJldmlldyBvdXIgdGVzdCBjYXNlIGFnYWluc3QgYnJvd3NlcnMgbW9yZSBjb21wcmVoZW5zaXZlbHkuXG5cbiAgICAvLyBmaW5kIHRoZSBmaXJzdCBpbnN0YW5jZSBvZiBhbnkgaG9zdEVuZGluZ0NoYXJzXG4gICAgdmFyIGhvc3RFbmQgPSAtMTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGhvc3RFbmRpbmdDaGFycy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGhlYyA9IHJlc3QuaW5kZXhPZihob3N0RW5kaW5nQ2hhcnNbaV0pO1xuICAgICAgaWYgKGhlYyAhPT0gLTEgJiYgKGhvc3RFbmQgPT09IC0xIHx8IGhlYyA8IGhvc3RFbmQpKVxuICAgICAgICBob3N0RW5kID0gaGVjO1xuICAgIH1cblxuICAgIC8vIGF0IHRoaXMgcG9pbnQsIGVpdGhlciB3ZSBoYXZlIGFuIGV4cGxpY2l0IHBvaW50IHdoZXJlIHRoZVxuICAgIC8vIGF1dGggcG9ydGlvbiBjYW5ub3QgZ28gcGFzdCwgb3IgdGhlIGxhc3QgQCBjaGFyIGlzIHRoZSBkZWNpZGVyLlxuICAgIHZhciBhdXRoLCBhdFNpZ247XG4gICAgaWYgKGhvc3RFbmQgPT09IC0xKSB7XG4gICAgICAvLyBhdFNpZ24gY2FuIGJlIGFueXdoZXJlLlxuICAgICAgYXRTaWduID0gcmVzdC5sYXN0SW5kZXhPZignQCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBhdFNpZ24gbXVzdCBiZSBpbiBhdXRoIHBvcnRpb24uXG4gICAgICAvLyBodHRwOi8vYUBiL2NAZCA9PiBob3N0OmIgYXV0aDphIHBhdGg6L2NAZFxuICAgICAgYXRTaWduID0gcmVzdC5sYXN0SW5kZXhPZignQCcsIGhvc3RFbmQpO1xuICAgIH1cblxuICAgIC8vIE5vdyB3ZSBoYXZlIGEgcG9ydGlvbiB3aGljaCBpcyBkZWZpbml0ZWx5IHRoZSBhdXRoLlxuICAgIC8vIFB1bGwgdGhhdCBvZmYuXG4gICAgaWYgKGF0U2lnbiAhPT0gLTEpIHtcbiAgICAgIGF1dGggPSByZXN0LnNsaWNlKDAsIGF0U2lnbik7XG4gICAgICByZXN0ID0gcmVzdC5zbGljZShhdFNpZ24gKyAxKTtcbiAgICAgIHRoaXMuYXV0aCA9IGRlY29kZVVSSUNvbXBvbmVudChhdXRoKTtcbiAgICB9XG5cbiAgICAvLyB0aGUgaG9zdCBpcyB0aGUgcmVtYWluaW5nIHRvIHRoZSBsZWZ0IG9mIHRoZSBmaXJzdCBub24taG9zdCBjaGFyXG4gICAgaG9zdEVuZCA9IC0xO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbm9uSG9zdENoYXJzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgaGVjID0gcmVzdC5pbmRleE9mKG5vbkhvc3RDaGFyc1tpXSk7XG4gICAgICBpZiAoaGVjICE9PSAtMSAmJiAoaG9zdEVuZCA9PT0gLTEgfHwgaGVjIDwgaG9zdEVuZCkpXG4gICAgICAgIGhvc3RFbmQgPSBoZWM7XG4gICAgfVxuICAgIC8vIGlmIHdlIHN0aWxsIGhhdmUgbm90IGhpdCBpdCwgdGhlbiB0aGUgZW50aXJlIHRoaW5nIGlzIGEgaG9zdC5cbiAgICBpZiAoaG9zdEVuZCA9PT0gLTEpXG4gICAgICBob3N0RW5kID0gcmVzdC5sZW5ndGg7XG5cbiAgICB0aGlzLmhvc3QgPSByZXN0LnNsaWNlKDAsIGhvc3RFbmQpO1xuICAgIHJlc3QgPSByZXN0LnNsaWNlKGhvc3RFbmQpO1xuXG4gICAgLy8gcHVsbCBvdXQgcG9ydC5cbiAgICB0aGlzLnBhcnNlSG9zdCgpO1xuXG4gICAgLy8gd2UndmUgaW5kaWNhdGVkIHRoYXQgdGhlcmUgaXMgYSBob3N0bmFtZSxcbiAgICAvLyBzbyBldmVuIGlmIGl0J3MgZW1wdHksIGl0IGhhcyB0byBiZSBwcmVzZW50LlxuICAgIHRoaXMuaG9zdG5hbWUgPSB0aGlzLmhvc3RuYW1lIHx8ICcnO1xuXG4gICAgLy8gaWYgaG9zdG5hbWUgYmVnaW5zIHdpdGggWyBhbmQgZW5kcyB3aXRoIF1cbiAgICAvLyBhc3N1bWUgdGhhdCBpdCdzIGFuIElQdjYgYWRkcmVzcy5cbiAgICB2YXIgaXB2Nkhvc3RuYW1lID0gdGhpcy5ob3N0bmFtZVswXSA9PT0gJ1snICYmXG4gICAgICAgIHRoaXMuaG9zdG5hbWVbdGhpcy5ob3N0bmFtZS5sZW5ndGggLSAxXSA9PT0gJ10nO1xuXG4gICAgLy8gdmFsaWRhdGUgYSBsaXR0bGUuXG4gICAgaWYgKCFpcHY2SG9zdG5hbWUpIHtcbiAgICAgIHZhciBob3N0cGFydHMgPSB0aGlzLmhvc3RuYW1lLnNwbGl0KC9cXC4vKTtcbiAgICAgIGZvciAodmFyIGkgPSAwLCBsID0gaG9zdHBhcnRzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgICAgICB2YXIgcGFydCA9IGhvc3RwYXJ0c1tpXTtcbiAgICAgICAgaWYgKCFwYXJ0KSBjb250aW51ZTtcbiAgICAgICAgaWYgKCFwYXJ0Lm1hdGNoKGhvc3RuYW1lUGFydFBhdHRlcm4pKSB7XG4gICAgICAgICAgdmFyIG5ld3BhcnQgPSAnJztcbiAgICAgICAgICBmb3IgKHZhciBqID0gMCwgayA9IHBhcnQubGVuZ3RoOyBqIDwgazsgaisrKSB7XG4gICAgICAgICAgICBpZiAocGFydC5jaGFyQ29kZUF0KGopID4gMTI3KSB7XG4gICAgICAgICAgICAgIC8vIHdlIHJlcGxhY2Ugbm9uLUFTQ0lJIGNoYXIgd2l0aCBhIHRlbXBvcmFyeSBwbGFjZWhvbGRlclxuICAgICAgICAgICAgICAvLyB3ZSBuZWVkIHRoaXMgdG8gbWFrZSBzdXJlIHNpemUgb2YgaG9zdG5hbWUgaXMgbm90XG4gICAgICAgICAgICAgIC8vIGJyb2tlbiBieSByZXBsYWNpbmcgbm9uLUFTQ0lJIGJ5IG5vdGhpbmdcbiAgICAgICAgICAgICAgbmV3cGFydCArPSAneCc7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBuZXdwYXJ0ICs9IHBhcnRbal07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIHdlIHRlc3QgYWdhaW4gd2l0aCBBU0NJSSBjaGFyIG9ubHlcbiAgICAgICAgICBpZiAoIW5ld3BhcnQubWF0Y2goaG9zdG5hbWVQYXJ0UGF0dGVybikpIHtcbiAgICAgICAgICAgIHZhciB2YWxpZFBhcnRzID0gaG9zdHBhcnRzLnNsaWNlKDAsIGkpO1xuICAgICAgICAgICAgdmFyIG5vdEhvc3QgPSBob3N0cGFydHMuc2xpY2UoaSArIDEpO1xuICAgICAgICAgICAgdmFyIGJpdCA9IHBhcnQubWF0Y2goaG9zdG5hbWVQYXJ0U3RhcnQpO1xuICAgICAgICAgICAgaWYgKGJpdCkge1xuICAgICAgICAgICAgICB2YWxpZFBhcnRzLnB1c2goYml0WzFdKTtcbiAgICAgICAgICAgICAgbm90SG9zdC51bnNoaWZ0KGJpdFsyXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobm90SG9zdC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgcmVzdCA9ICcvJyArIG5vdEhvc3Quam9pbignLicpICsgcmVzdDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuaG9zdG5hbWUgPSB2YWxpZFBhcnRzLmpvaW4oJy4nKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0aGlzLmhvc3RuYW1lLmxlbmd0aCA+IGhvc3RuYW1lTWF4TGVuKSB7XG4gICAgICB0aGlzLmhvc3RuYW1lID0gJyc7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIGhvc3RuYW1lcyBhcmUgYWx3YXlzIGxvd2VyIGNhc2UuXG4gICAgICB0aGlzLmhvc3RuYW1lID0gdGhpcy5ob3N0bmFtZS50b0xvd2VyQ2FzZSgpO1xuICAgIH1cblxuICAgIGlmICghaXB2Nkhvc3RuYW1lKSB7XG4gICAgICAvLyBJRE5BIFN1cHBvcnQ6IFJldHVybnMgYSBwdW55Y29kZWQgcmVwcmVzZW50YXRpb24gb2YgXCJkb21haW5cIi5cbiAgICAgIC8vIEl0IG9ubHkgY29udmVydHMgcGFydHMgb2YgdGhlIGRvbWFpbiBuYW1lIHRoYXRcbiAgICAgIC8vIGhhdmUgbm9uLUFTQ0lJIGNoYXJhY3RlcnMsIGkuZS4gaXQgZG9lc24ndCBtYXR0ZXIgaWZcbiAgICAgIC8vIHlvdSBjYWxsIGl0IHdpdGggYSBkb21haW4gdGhhdCBhbHJlYWR5IGlzIEFTQ0lJLW9ubHkuXG4gICAgICB0aGlzLmhvc3RuYW1lID0gcHVueWNvZGUudG9BU0NJSSh0aGlzLmhvc3RuYW1lKTtcbiAgICB9XG5cbiAgICB2YXIgcCA9IHRoaXMucG9ydCA/ICc6JyArIHRoaXMucG9ydCA6ICcnO1xuICAgIHZhciBoID0gdGhpcy5ob3N0bmFtZSB8fCAnJztcbiAgICB0aGlzLmhvc3QgPSBoICsgcDtcbiAgICB0aGlzLmhyZWYgKz0gdGhpcy5ob3N0O1xuXG4gICAgLy8gc3RyaXAgWyBhbmQgXSBmcm9tIHRoZSBob3N0bmFtZVxuICAgIC8vIHRoZSBob3N0IGZpZWxkIHN0aWxsIHJldGFpbnMgdGhlbSwgdGhvdWdoXG4gICAgaWYgKGlwdjZIb3N0bmFtZSkge1xuICAgICAgdGhpcy5ob3N0bmFtZSA9IHRoaXMuaG9zdG5hbWUuc3Vic3RyKDEsIHRoaXMuaG9zdG5hbWUubGVuZ3RoIC0gMik7XG4gICAgICBpZiAocmVzdFswXSAhPT0gJy8nKSB7XG4gICAgICAgIHJlc3QgPSAnLycgKyByZXN0O1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIG5vdyByZXN0IGlzIHNldCB0byB0aGUgcG9zdC1ob3N0IHN0dWZmLlxuICAvLyBjaG9wIG9mZiBhbnkgZGVsaW0gY2hhcnMuXG4gIGlmICghdW5zYWZlUHJvdG9jb2xbbG93ZXJQcm90b10pIHtcblxuICAgIC8vIEZpcnN0LCBtYWtlIDEwMCUgc3VyZSB0aGF0IGFueSBcImF1dG9Fc2NhcGVcIiBjaGFycyBnZXRcbiAgICAvLyBlc2NhcGVkLCBldmVuIGlmIGVuY29kZVVSSUNvbXBvbmVudCBkb2Vzbid0IHRoaW5rIHRoZXlcbiAgICAvLyBuZWVkIHRvIGJlLlxuICAgIGZvciAodmFyIGkgPSAwLCBsID0gYXV0b0VzY2FwZS5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICAgIHZhciBhZSA9IGF1dG9Fc2NhcGVbaV07XG4gICAgICBpZiAocmVzdC5pbmRleE9mKGFlKSA9PT0gLTEpXG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgdmFyIGVzYyA9IGVuY29kZVVSSUNvbXBvbmVudChhZSk7XG4gICAgICBpZiAoZXNjID09PSBhZSkge1xuICAgICAgICBlc2MgPSBlc2NhcGUoYWUpO1xuICAgICAgfVxuICAgICAgcmVzdCA9IHJlc3Quc3BsaXQoYWUpLmpvaW4oZXNjKTtcbiAgICB9XG4gIH1cblxuXG4gIC8vIGNob3Agb2ZmIGZyb20gdGhlIHRhaWwgZmlyc3QuXG4gIHZhciBoYXNoID0gcmVzdC5pbmRleE9mKCcjJyk7XG4gIGlmIChoYXNoICE9PSAtMSkge1xuICAgIC8vIGdvdCBhIGZyYWdtZW50IHN0cmluZy5cbiAgICB0aGlzLmhhc2ggPSByZXN0LnN1YnN0cihoYXNoKTtcbiAgICByZXN0ID0gcmVzdC5zbGljZSgwLCBoYXNoKTtcbiAgfVxuICB2YXIgcW0gPSByZXN0LmluZGV4T2YoJz8nKTtcbiAgaWYgKHFtICE9PSAtMSkge1xuICAgIHRoaXMuc2VhcmNoID0gcmVzdC5zdWJzdHIocW0pO1xuICAgIHRoaXMucXVlcnkgPSByZXN0LnN1YnN0cihxbSArIDEpO1xuICAgIGlmIChwYXJzZVF1ZXJ5U3RyaW5nKSB7XG4gICAgICB0aGlzLnF1ZXJ5ID0gcXVlcnlzdHJpbmcucGFyc2UodGhpcy5xdWVyeSk7XG4gICAgfVxuICAgIHJlc3QgPSByZXN0LnNsaWNlKDAsIHFtKTtcbiAgfSBlbHNlIGlmIChwYXJzZVF1ZXJ5U3RyaW5nKSB7XG4gICAgLy8gbm8gcXVlcnkgc3RyaW5nLCBidXQgcGFyc2VRdWVyeVN0cmluZyBzdGlsbCByZXF1ZXN0ZWRcbiAgICB0aGlzLnNlYXJjaCA9ICcnO1xuICAgIHRoaXMucXVlcnkgPSB7fTtcbiAgfVxuICBpZiAocmVzdCkgdGhpcy5wYXRobmFtZSA9IHJlc3Q7XG4gIGlmIChzbGFzaGVkUHJvdG9jb2xbbG93ZXJQcm90b10gJiZcbiAgICAgIHRoaXMuaG9zdG5hbWUgJiYgIXRoaXMucGF0aG5hbWUpIHtcbiAgICB0aGlzLnBhdGhuYW1lID0gJy8nO1xuICB9XG5cbiAgLy90byBzdXBwb3J0IGh0dHAucmVxdWVzdFxuICBpZiAodGhpcy5wYXRobmFtZSB8fCB0aGlzLnNlYXJjaCkge1xuICAgIHZhciBwID0gdGhpcy5wYXRobmFtZSB8fCAnJztcbiAgICB2YXIgcyA9IHRoaXMuc2VhcmNoIHx8ICcnO1xuICAgIHRoaXMucGF0aCA9IHAgKyBzO1xuICB9XG5cbiAgLy8gZmluYWxseSwgcmVjb25zdHJ1Y3QgdGhlIGhyZWYgYmFzZWQgb24gd2hhdCBoYXMgYmVlbiB2YWxpZGF0ZWQuXG4gIHRoaXMuaHJlZiA9IHRoaXMuZm9ybWF0KCk7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLy8gZm9ybWF0IGEgcGFyc2VkIG9iamVjdCBpbnRvIGEgdXJsIHN0cmluZ1xuZnVuY3Rpb24gdXJsRm9ybWF0KG9iaikge1xuICAvLyBlbnN1cmUgaXQncyBhbiBvYmplY3QsIGFuZCBub3QgYSBzdHJpbmcgdXJsLlxuICAvLyBJZiBpdCdzIGFuIG9iaiwgdGhpcyBpcyBhIG5vLW9wLlxuICAvLyB0aGlzIHdheSwgeW91IGNhbiBjYWxsIHVybF9mb3JtYXQoKSBvbiBzdHJpbmdzXG4gIC8vIHRvIGNsZWFuIHVwIHBvdGVudGlhbGx5IHdvbmt5IHVybHMuXG4gIGlmICh1dGlsLmlzU3RyaW5nKG9iaikpIG9iaiA9IHVybFBhcnNlKG9iaik7XG4gIGlmICghKG9iaiBpbnN0YW5jZW9mIFVybCkpIHJldHVybiBVcmwucHJvdG90eXBlLmZvcm1hdC5jYWxsKG9iaik7XG4gIHJldHVybiBvYmouZm9ybWF0KCk7XG59XG5cblVybC5wcm90b3R5cGUuZm9ybWF0ID0gZnVuY3Rpb24oKSB7XG4gIHZhciBhdXRoID0gdGhpcy5hdXRoIHx8ICcnO1xuICBpZiAoYXV0aCkge1xuICAgIGF1dGggPSBlbmNvZGVVUklDb21wb25lbnQoYXV0aCk7XG4gICAgYXV0aCA9IGF1dGgucmVwbGFjZSgvJTNBL2ksICc6Jyk7XG4gICAgYXV0aCArPSAnQCc7XG4gIH1cblxuICB2YXIgcHJvdG9jb2wgPSB0aGlzLnByb3RvY29sIHx8ICcnLFxuICAgICAgcGF0aG5hbWUgPSB0aGlzLnBhdGhuYW1lIHx8ICcnLFxuICAgICAgaGFzaCA9IHRoaXMuaGFzaCB8fCAnJyxcbiAgICAgIGhvc3QgPSBmYWxzZSxcbiAgICAgIHF1ZXJ5ID0gJyc7XG5cbiAgaWYgKHRoaXMuaG9zdCkge1xuICAgIGhvc3QgPSBhdXRoICsgdGhpcy5ob3N0O1xuICB9IGVsc2UgaWYgKHRoaXMuaG9zdG5hbWUpIHtcbiAgICBob3N0ID0gYXV0aCArICh0aGlzLmhvc3RuYW1lLmluZGV4T2YoJzonKSA9PT0gLTEgP1xuICAgICAgICB0aGlzLmhvc3RuYW1lIDpcbiAgICAgICAgJ1snICsgdGhpcy5ob3N0bmFtZSArICddJyk7XG4gICAgaWYgKHRoaXMucG9ydCkge1xuICAgICAgaG9zdCArPSAnOicgKyB0aGlzLnBvcnQ7XG4gICAgfVxuICB9XG5cbiAgaWYgKHRoaXMucXVlcnkgJiZcbiAgICAgIHV0aWwuaXNPYmplY3QodGhpcy5xdWVyeSkgJiZcbiAgICAgIE9iamVjdC5rZXlzKHRoaXMucXVlcnkpLmxlbmd0aCkge1xuICAgIHF1ZXJ5ID0gcXVlcnlzdHJpbmcuc3RyaW5naWZ5KHRoaXMucXVlcnkpO1xuICB9XG5cbiAgdmFyIHNlYXJjaCA9IHRoaXMuc2VhcmNoIHx8IChxdWVyeSAmJiAoJz8nICsgcXVlcnkpKSB8fCAnJztcblxuICBpZiAocHJvdG9jb2wgJiYgcHJvdG9jb2wuc3Vic3RyKC0xKSAhPT0gJzonKSBwcm90b2NvbCArPSAnOic7XG5cbiAgLy8gb25seSB0aGUgc2xhc2hlZFByb3RvY29scyBnZXQgdGhlIC8vLiAgTm90IG1haWx0bzosIHhtcHA6LCBldGMuXG4gIC8vIHVubGVzcyB0aGV5IGhhZCB0aGVtIHRvIGJlZ2luIHdpdGguXG4gIGlmICh0aGlzLnNsYXNoZXMgfHxcbiAgICAgICghcHJvdG9jb2wgfHwgc2xhc2hlZFByb3RvY29sW3Byb3RvY29sXSkgJiYgaG9zdCAhPT0gZmFsc2UpIHtcbiAgICBob3N0ID0gJy8vJyArIChob3N0IHx8ICcnKTtcbiAgICBpZiAocGF0aG5hbWUgJiYgcGF0aG5hbWUuY2hhckF0KDApICE9PSAnLycpIHBhdGhuYW1lID0gJy8nICsgcGF0aG5hbWU7XG4gIH0gZWxzZSBpZiAoIWhvc3QpIHtcbiAgICBob3N0ID0gJyc7XG4gIH1cblxuICBpZiAoaGFzaCAmJiBoYXNoLmNoYXJBdCgwKSAhPT0gJyMnKSBoYXNoID0gJyMnICsgaGFzaDtcbiAgaWYgKHNlYXJjaCAmJiBzZWFyY2guY2hhckF0KDApICE9PSAnPycpIHNlYXJjaCA9ICc/JyArIHNlYXJjaDtcblxuICBwYXRobmFtZSA9IHBhdGhuYW1lLnJlcGxhY2UoL1s/I10vZywgZnVuY3Rpb24obWF0Y2gpIHtcbiAgICByZXR1cm4gZW5jb2RlVVJJQ29tcG9uZW50KG1hdGNoKTtcbiAgfSk7XG4gIHNlYXJjaCA9IHNlYXJjaC5yZXBsYWNlKCcjJywgJyUyMycpO1xuXG4gIHJldHVybiBwcm90b2NvbCArIGhvc3QgKyBwYXRobmFtZSArIHNlYXJjaCArIGhhc2g7XG59O1xuXG5mdW5jdGlvbiB1cmxSZXNvbHZlKHNvdXJjZSwgcmVsYXRpdmUpIHtcbiAgcmV0dXJuIHVybFBhcnNlKHNvdXJjZSwgZmFsc2UsIHRydWUpLnJlc29sdmUocmVsYXRpdmUpO1xufVxuXG5VcmwucHJvdG90eXBlLnJlc29sdmUgPSBmdW5jdGlvbihyZWxhdGl2ZSkge1xuICByZXR1cm4gdGhpcy5yZXNvbHZlT2JqZWN0KHVybFBhcnNlKHJlbGF0aXZlLCBmYWxzZSwgdHJ1ZSkpLmZvcm1hdCgpO1xufTtcblxuZnVuY3Rpb24gdXJsUmVzb2x2ZU9iamVjdChzb3VyY2UsIHJlbGF0aXZlKSB7XG4gIGlmICghc291cmNlKSByZXR1cm4gcmVsYXRpdmU7XG4gIHJldHVybiB1cmxQYXJzZShzb3VyY2UsIGZhbHNlLCB0cnVlKS5yZXNvbHZlT2JqZWN0KHJlbGF0aXZlKTtcbn1cblxuVXJsLnByb3RvdHlwZS5yZXNvbHZlT2JqZWN0ID0gZnVuY3Rpb24ocmVsYXRpdmUpIHtcbiAgaWYgKHV0aWwuaXNTdHJpbmcocmVsYXRpdmUpKSB7XG4gICAgdmFyIHJlbCA9IG5ldyBVcmwoKTtcbiAgICByZWwucGFyc2UocmVsYXRpdmUsIGZhbHNlLCB0cnVlKTtcbiAgICByZWxhdGl2ZSA9IHJlbDtcbiAgfVxuXG4gIHZhciByZXN1bHQgPSBuZXcgVXJsKCk7XG4gIHZhciB0a2V5cyA9IE9iamVjdC5rZXlzKHRoaXMpO1xuICBmb3IgKHZhciB0ayA9IDA7IHRrIDwgdGtleXMubGVuZ3RoOyB0aysrKSB7XG4gICAgdmFyIHRrZXkgPSB0a2V5c1t0a107XG4gICAgcmVzdWx0W3RrZXldID0gdGhpc1t0a2V5XTtcbiAgfVxuXG4gIC8vIGhhc2ggaXMgYWx3YXlzIG92ZXJyaWRkZW4sIG5vIG1hdHRlciB3aGF0LlxuICAvLyBldmVuIGhyZWY9XCJcIiB3aWxsIHJlbW92ZSBpdC5cbiAgcmVzdWx0Lmhhc2ggPSByZWxhdGl2ZS5oYXNoO1xuXG4gIC8vIGlmIHRoZSByZWxhdGl2ZSB1cmwgaXMgZW1wdHksIHRoZW4gdGhlcmUncyBub3RoaW5nIGxlZnQgdG8gZG8gaGVyZS5cbiAgaWYgKHJlbGF0aXZlLmhyZWYgPT09ICcnKSB7XG4gICAgcmVzdWx0LmhyZWYgPSByZXN1bHQuZm9ybWF0KCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8vIGhyZWZzIGxpa2UgLy9mb28vYmFyIGFsd2F5cyBjdXQgdG8gdGhlIHByb3RvY29sLlxuICBpZiAocmVsYXRpdmUuc2xhc2hlcyAmJiAhcmVsYXRpdmUucHJvdG9jb2wpIHtcbiAgICAvLyB0YWtlIGV2ZXJ5dGhpbmcgZXhjZXB0IHRoZSBwcm90b2NvbCBmcm9tIHJlbGF0aXZlXG4gICAgdmFyIHJrZXlzID0gT2JqZWN0LmtleXMocmVsYXRpdmUpO1xuICAgIGZvciAodmFyIHJrID0gMDsgcmsgPCBya2V5cy5sZW5ndGg7IHJrKyspIHtcbiAgICAgIHZhciBya2V5ID0gcmtleXNbcmtdO1xuICAgICAgaWYgKHJrZXkgIT09ICdwcm90b2NvbCcpXG4gICAgICAgIHJlc3VsdFtya2V5XSA9IHJlbGF0aXZlW3JrZXldO1xuICAgIH1cblxuICAgIC8vdXJsUGFyc2UgYXBwZW5kcyB0cmFpbGluZyAvIHRvIHVybHMgbGlrZSBodHRwOi8vd3d3LmV4YW1wbGUuY29tXG4gICAgaWYgKHNsYXNoZWRQcm90b2NvbFtyZXN1bHQucHJvdG9jb2xdICYmXG4gICAgICAgIHJlc3VsdC5ob3N0bmFtZSAmJiAhcmVzdWx0LnBhdGhuYW1lKSB7XG4gICAgICByZXN1bHQucGF0aCA9IHJlc3VsdC5wYXRobmFtZSA9ICcvJztcbiAgICB9XG5cbiAgICByZXN1bHQuaHJlZiA9IHJlc3VsdC5mb3JtYXQoKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgaWYgKHJlbGF0aXZlLnByb3RvY29sICYmIHJlbGF0aXZlLnByb3RvY29sICE9PSByZXN1bHQucHJvdG9jb2wpIHtcbiAgICAvLyBpZiBpdCdzIGEga25vd24gdXJsIHByb3RvY29sLCB0aGVuIGNoYW5naW5nXG4gICAgLy8gdGhlIHByb3RvY29sIGRvZXMgd2VpcmQgdGhpbmdzXG4gICAgLy8gZmlyc3QsIGlmIGl0J3Mgbm90IGZpbGU6LCB0aGVuIHdlIE1VU1QgaGF2ZSBhIGhvc3QsXG4gICAgLy8gYW5kIGlmIHRoZXJlIHdhcyBhIHBhdGhcbiAgICAvLyB0byBiZWdpbiB3aXRoLCB0aGVuIHdlIE1VU1QgaGF2ZSBhIHBhdGguXG4gICAgLy8gaWYgaXQgaXMgZmlsZTosIHRoZW4gdGhlIGhvc3QgaXMgZHJvcHBlZCxcbiAgICAvLyBiZWNhdXNlIHRoYXQncyBrbm93biB0byBiZSBob3N0bGVzcy5cbiAgICAvLyBhbnl0aGluZyBlbHNlIGlzIGFzc3VtZWQgdG8gYmUgYWJzb2x1dGUuXG4gICAgaWYgKCFzbGFzaGVkUHJvdG9jb2xbcmVsYXRpdmUucHJvdG9jb2xdKSB7XG4gICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHJlbGF0aXZlKTtcbiAgICAgIGZvciAodmFyIHYgPSAwOyB2IDwga2V5cy5sZW5ndGg7IHYrKykge1xuICAgICAgICB2YXIgayA9IGtleXNbdl07XG4gICAgICAgIHJlc3VsdFtrXSA9IHJlbGF0aXZlW2tdO1xuICAgICAgfVxuICAgICAgcmVzdWx0LmhyZWYgPSByZXN1bHQuZm9ybWF0KCk7XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIHJlc3VsdC5wcm90b2NvbCA9IHJlbGF0aXZlLnByb3RvY29sO1xuICAgIGlmICghcmVsYXRpdmUuaG9zdCAmJiAhaG9zdGxlc3NQcm90b2NvbFtyZWxhdGl2ZS5wcm90b2NvbF0pIHtcbiAgICAgIHZhciByZWxQYXRoID0gKHJlbGF0aXZlLnBhdGhuYW1lIHx8ICcnKS5zcGxpdCgnLycpO1xuICAgICAgd2hpbGUgKHJlbFBhdGgubGVuZ3RoICYmICEocmVsYXRpdmUuaG9zdCA9IHJlbFBhdGguc2hpZnQoKSkpO1xuICAgICAgaWYgKCFyZWxhdGl2ZS5ob3N0KSByZWxhdGl2ZS5ob3N0ID0gJyc7XG4gICAgICBpZiAoIXJlbGF0aXZlLmhvc3RuYW1lKSByZWxhdGl2ZS5ob3N0bmFtZSA9ICcnO1xuICAgICAgaWYgKHJlbFBhdGhbMF0gIT09ICcnKSByZWxQYXRoLnVuc2hpZnQoJycpO1xuICAgICAgaWYgKHJlbFBhdGgubGVuZ3RoIDwgMikgcmVsUGF0aC51bnNoaWZ0KCcnKTtcbiAgICAgIHJlc3VsdC5wYXRobmFtZSA9IHJlbFBhdGguam9pbignLycpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXN1bHQucGF0aG5hbWUgPSByZWxhdGl2ZS5wYXRobmFtZTtcbiAgICB9XG4gICAgcmVzdWx0LnNlYXJjaCA9IHJlbGF0aXZlLnNlYXJjaDtcbiAgICByZXN1bHQucXVlcnkgPSByZWxhdGl2ZS5xdWVyeTtcbiAgICByZXN1bHQuaG9zdCA9IHJlbGF0aXZlLmhvc3QgfHwgJyc7XG4gICAgcmVzdWx0LmF1dGggPSByZWxhdGl2ZS5hdXRoO1xuICAgIHJlc3VsdC5ob3N0bmFtZSA9IHJlbGF0aXZlLmhvc3RuYW1lIHx8IHJlbGF0aXZlLmhvc3Q7XG4gICAgcmVzdWx0LnBvcnQgPSByZWxhdGl2ZS5wb3J0O1xuICAgIC8vIHRvIHN1cHBvcnQgaHR0cC5yZXF1ZXN0XG4gICAgaWYgKHJlc3VsdC5wYXRobmFtZSB8fCByZXN1bHQuc2VhcmNoKSB7XG4gICAgICB2YXIgcCA9IHJlc3VsdC5wYXRobmFtZSB8fCAnJztcbiAgICAgIHZhciBzID0gcmVzdWx0LnNlYXJjaCB8fCAnJztcbiAgICAgIHJlc3VsdC5wYXRoID0gcCArIHM7XG4gICAgfVxuICAgIHJlc3VsdC5zbGFzaGVzID0gcmVzdWx0LnNsYXNoZXMgfHwgcmVsYXRpdmUuc2xhc2hlcztcbiAgICByZXN1bHQuaHJlZiA9IHJlc3VsdC5mb3JtYXQoKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgdmFyIGlzU291cmNlQWJzID0gKHJlc3VsdC5wYXRobmFtZSAmJiByZXN1bHQucGF0aG5hbWUuY2hhckF0KDApID09PSAnLycpLFxuICAgICAgaXNSZWxBYnMgPSAoXG4gICAgICAgICAgcmVsYXRpdmUuaG9zdCB8fFxuICAgICAgICAgIHJlbGF0aXZlLnBhdGhuYW1lICYmIHJlbGF0aXZlLnBhdGhuYW1lLmNoYXJBdCgwKSA9PT0gJy8nXG4gICAgICApLFxuICAgICAgbXVzdEVuZEFicyA9IChpc1JlbEFicyB8fCBpc1NvdXJjZUFicyB8fFxuICAgICAgICAgICAgICAgICAgICAocmVzdWx0Lmhvc3QgJiYgcmVsYXRpdmUucGF0aG5hbWUpKSxcbiAgICAgIHJlbW92ZUFsbERvdHMgPSBtdXN0RW5kQWJzLFxuICAgICAgc3JjUGF0aCA9IHJlc3VsdC5wYXRobmFtZSAmJiByZXN1bHQucGF0aG5hbWUuc3BsaXQoJy8nKSB8fCBbXSxcbiAgICAgIHJlbFBhdGggPSByZWxhdGl2ZS5wYXRobmFtZSAmJiByZWxhdGl2ZS5wYXRobmFtZS5zcGxpdCgnLycpIHx8IFtdLFxuICAgICAgcHN5Y2hvdGljID0gcmVzdWx0LnByb3RvY29sICYmICFzbGFzaGVkUHJvdG9jb2xbcmVzdWx0LnByb3RvY29sXTtcblxuICAvLyBpZiB0aGUgdXJsIGlzIGEgbm9uLXNsYXNoZWQgdXJsLCB0aGVuIHJlbGF0aXZlXG4gIC8vIGxpbmtzIGxpa2UgLi4vLi4gc2hvdWxkIGJlIGFibGVcbiAgLy8gdG8gY3Jhd2wgdXAgdG8gdGhlIGhvc3RuYW1lLCBhcyB3ZWxsLiAgVGhpcyBpcyBzdHJhbmdlLlxuICAvLyByZXN1bHQucHJvdG9jb2wgaGFzIGFscmVhZHkgYmVlbiBzZXQgYnkgbm93LlxuICAvLyBMYXRlciBvbiwgcHV0IHRoZSBmaXJzdCBwYXRoIHBhcnQgaW50byB0aGUgaG9zdCBmaWVsZC5cbiAgaWYgKHBzeWNob3RpYykge1xuICAgIHJlc3VsdC5ob3N0bmFtZSA9ICcnO1xuICAgIHJlc3VsdC5wb3J0ID0gbnVsbDtcbiAgICBpZiAocmVzdWx0Lmhvc3QpIHtcbiAgICAgIGlmIChzcmNQYXRoWzBdID09PSAnJykgc3JjUGF0aFswXSA9IHJlc3VsdC5ob3N0O1xuICAgICAgZWxzZSBzcmNQYXRoLnVuc2hpZnQocmVzdWx0Lmhvc3QpO1xuICAgIH1cbiAgICByZXN1bHQuaG9zdCA9ICcnO1xuICAgIGlmIChyZWxhdGl2ZS5wcm90b2NvbCkge1xuICAgICAgcmVsYXRpdmUuaG9zdG5hbWUgPSBudWxsO1xuICAgICAgcmVsYXRpdmUucG9ydCA9IG51bGw7XG4gICAgICBpZiAocmVsYXRpdmUuaG9zdCkge1xuICAgICAgICBpZiAocmVsUGF0aFswXSA9PT0gJycpIHJlbFBhdGhbMF0gPSByZWxhdGl2ZS5ob3N0O1xuICAgICAgICBlbHNlIHJlbFBhdGgudW5zaGlmdChyZWxhdGl2ZS5ob3N0KTtcbiAgICAgIH1cbiAgICAgIHJlbGF0aXZlLmhvc3QgPSBudWxsO1xuICAgIH1cbiAgICBtdXN0RW5kQWJzID0gbXVzdEVuZEFicyAmJiAocmVsUGF0aFswXSA9PT0gJycgfHwgc3JjUGF0aFswXSA9PT0gJycpO1xuICB9XG5cbiAgaWYgKGlzUmVsQWJzKSB7XG4gICAgLy8gaXQncyBhYnNvbHV0ZS5cbiAgICByZXN1bHQuaG9zdCA9IChyZWxhdGl2ZS5ob3N0IHx8IHJlbGF0aXZlLmhvc3QgPT09ICcnKSA/XG4gICAgICAgICAgICAgICAgICByZWxhdGl2ZS5ob3N0IDogcmVzdWx0Lmhvc3Q7XG4gICAgcmVzdWx0Lmhvc3RuYW1lID0gKHJlbGF0aXZlLmhvc3RuYW1lIHx8IHJlbGF0aXZlLmhvc3RuYW1lID09PSAnJykgP1xuICAgICAgICAgICAgICAgICAgICAgIHJlbGF0aXZlLmhvc3RuYW1lIDogcmVzdWx0Lmhvc3RuYW1lO1xuICAgIHJlc3VsdC5zZWFyY2ggPSByZWxhdGl2ZS5zZWFyY2g7XG4gICAgcmVzdWx0LnF1ZXJ5ID0gcmVsYXRpdmUucXVlcnk7XG4gICAgc3JjUGF0aCA9IHJlbFBhdGg7XG4gICAgLy8gZmFsbCB0aHJvdWdoIHRvIHRoZSBkb3QtaGFuZGxpbmcgYmVsb3cuXG4gIH0gZWxzZSBpZiAocmVsUGF0aC5sZW5ndGgpIHtcbiAgICAvLyBpdCdzIHJlbGF0aXZlXG4gICAgLy8gdGhyb3cgYXdheSB0aGUgZXhpc3RpbmcgZmlsZSwgYW5kIHRha2UgdGhlIG5ldyBwYXRoIGluc3RlYWQuXG4gICAgaWYgKCFzcmNQYXRoKSBzcmNQYXRoID0gW107XG4gICAgc3JjUGF0aC5wb3AoKTtcbiAgICBzcmNQYXRoID0gc3JjUGF0aC5jb25jYXQocmVsUGF0aCk7XG4gICAgcmVzdWx0LnNlYXJjaCA9IHJlbGF0aXZlLnNlYXJjaDtcbiAgICByZXN1bHQucXVlcnkgPSByZWxhdGl2ZS5xdWVyeTtcbiAgfSBlbHNlIGlmICghdXRpbC5pc051bGxPclVuZGVmaW5lZChyZWxhdGl2ZS5zZWFyY2gpKSB7XG4gICAgLy8ganVzdCBwdWxsIG91dCB0aGUgc2VhcmNoLlxuICAgIC8vIGxpa2UgaHJlZj0nP2ZvbycuXG4gICAgLy8gUHV0IHRoaXMgYWZ0ZXIgdGhlIG90aGVyIHR3byBjYXNlcyBiZWNhdXNlIGl0IHNpbXBsaWZpZXMgdGhlIGJvb2xlYW5zXG4gICAgaWYgKHBzeWNob3RpYykge1xuICAgICAgcmVzdWx0Lmhvc3RuYW1lID0gcmVzdWx0Lmhvc3QgPSBzcmNQYXRoLnNoaWZ0KCk7XG4gICAgICAvL29jY2F0aW9uYWx5IHRoZSBhdXRoIGNhbiBnZXQgc3R1Y2sgb25seSBpbiBob3N0XG4gICAgICAvL3RoaXMgZXNwZWNpYWxseSBoYXBwZW5zIGluIGNhc2VzIGxpa2VcbiAgICAgIC8vdXJsLnJlc29sdmVPYmplY3QoJ21haWx0bzpsb2NhbDFAZG9tYWluMScsICdsb2NhbDJAZG9tYWluMicpXG4gICAgICB2YXIgYXV0aEluSG9zdCA9IHJlc3VsdC5ob3N0ICYmIHJlc3VsdC5ob3N0LmluZGV4T2YoJ0AnKSA+IDAgP1xuICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQuaG9zdC5zcGxpdCgnQCcpIDogZmFsc2U7XG4gICAgICBpZiAoYXV0aEluSG9zdCkge1xuICAgICAgICByZXN1bHQuYXV0aCA9IGF1dGhJbkhvc3Quc2hpZnQoKTtcbiAgICAgICAgcmVzdWx0Lmhvc3QgPSByZXN1bHQuaG9zdG5hbWUgPSBhdXRoSW5Ib3N0LnNoaWZ0KCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJlc3VsdC5zZWFyY2ggPSByZWxhdGl2ZS5zZWFyY2g7XG4gICAgcmVzdWx0LnF1ZXJ5ID0gcmVsYXRpdmUucXVlcnk7XG4gICAgLy90byBzdXBwb3J0IGh0dHAucmVxdWVzdFxuICAgIGlmICghdXRpbC5pc051bGwocmVzdWx0LnBhdGhuYW1lKSB8fCAhdXRpbC5pc051bGwocmVzdWx0LnNlYXJjaCkpIHtcbiAgICAgIHJlc3VsdC5wYXRoID0gKHJlc3VsdC5wYXRobmFtZSA/IHJlc3VsdC5wYXRobmFtZSA6ICcnKSArXG4gICAgICAgICAgICAgICAgICAgIChyZXN1bHQuc2VhcmNoID8gcmVzdWx0LnNlYXJjaCA6ICcnKTtcbiAgICB9XG4gICAgcmVzdWx0LmhyZWYgPSByZXN1bHQuZm9ybWF0KCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGlmICghc3JjUGF0aC5sZW5ndGgpIHtcbiAgICAvLyBubyBwYXRoIGF0IGFsbC4gIGVhc3kuXG4gICAgLy8gd2UndmUgYWxyZWFkeSBoYW5kbGVkIHRoZSBvdGhlciBzdHVmZiBhYm92ZS5cbiAgICByZXN1bHQucGF0aG5hbWUgPSBudWxsO1xuICAgIC8vdG8gc3VwcG9ydCBodHRwLnJlcXVlc3RcbiAgICBpZiAocmVzdWx0LnNlYXJjaCkge1xuICAgICAgcmVzdWx0LnBhdGggPSAnLycgKyByZXN1bHQuc2VhcmNoO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXN1bHQucGF0aCA9IG51bGw7XG4gICAgfVxuICAgIHJlc3VsdC5ocmVmID0gcmVzdWx0LmZvcm1hdCgpO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvLyBpZiBhIHVybCBFTkRzIGluIC4gb3IgLi4sIHRoZW4gaXQgbXVzdCBnZXQgYSB0cmFpbGluZyBzbGFzaC5cbiAgLy8gaG93ZXZlciwgaWYgaXQgZW5kcyBpbiBhbnl0aGluZyBlbHNlIG5vbi1zbGFzaHksXG4gIC8vIHRoZW4gaXQgbXVzdCBOT1QgZ2V0IGEgdHJhaWxpbmcgc2xhc2guXG4gIHZhciBsYXN0ID0gc3JjUGF0aC5zbGljZSgtMSlbMF07XG4gIHZhciBoYXNUcmFpbGluZ1NsYXNoID0gKFxuICAgICAgKHJlc3VsdC5ob3N0IHx8IHJlbGF0aXZlLmhvc3QgfHwgc3JjUGF0aC5sZW5ndGggPiAxKSAmJlxuICAgICAgKGxhc3QgPT09ICcuJyB8fCBsYXN0ID09PSAnLi4nKSB8fCBsYXN0ID09PSAnJyk7XG5cbiAgLy8gc3RyaXAgc2luZ2xlIGRvdHMsIHJlc29sdmUgZG91YmxlIGRvdHMgdG8gcGFyZW50IGRpclxuICAvLyBpZiB0aGUgcGF0aCB0cmllcyB0byBnbyBhYm92ZSB0aGUgcm9vdCwgYHVwYCBlbmRzIHVwID4gMFxuICB2YXIgdXAgPSAwO1xuICBmb3IgKHZhciBpID0gc3JjUGF0aC5sZW5ndGg7IGkgPj0gMDsgaS0tKSB7XG4gICAgbGFzdCA9IHNyY1BhdGhbaV07XG4gICAgaWYgKGxhc3QgPT09ICcuJykge1xuICAgICAgc3JjUGF0aC5zcGxpY2UoaSwgMSk7XG4gICAgfSBlbHNlIGlmIChsYXN0ID09PSAnLi4nKSB7XG4gICAgICBzcmNQYXRoLnNwbGljZShpLCAxKTtcbiAgICAgIHVwKys7XG4gICAgfSBlbHNlIGlmICh1cCkge1xuICAgICAgc3JjUGF0aC5zcGxpY2UoaSwgMSk7XG4gICAgICB1cC0tO1xuICAgIH1cbiAgfVxuXG4gIC8vIGlmIHRoZSBwYXRoIGlzIGFsbG93ZWQgdG8gZ28gYWJvdmUgdGhlIHJvb3QsIHJlc3RvcmUgbGVhZGluZyAuLnNcbiAgaWYgKCFtdXN0RW5kQWJzICYmICFyZW1vdmVBbGxEb3RzKSB7XG4gICAgZm9yICg7IHVwLS07IHVwKSB7XG4gICAgICBzcmNQYXRoLnVuc2hpZnQoJy4uJyk7XG4gICAgfVxuICB9XG5cbiAgaWYgKG11c3RFbmRBYnMgJiYgc3JjUGF0aFswXSAhPT0gJycgJiZcbiAgICAgICghc3JjUGF0aFswXSB8fCBzcmNQYXRoWzBdLmNoYXJBdCgwKSAhPT0gJy8nKSkge1xuICAgIHNyY1BhdGgudW5zaGlmdCgnJyk7XG4gIH1cblxuICBpZiAoaGFzVHJhaWxpbmdTbGFzaCAmJiAoc3JjUGF0aC5qb2luKCcvJykuc3Vic3RyKC0xKSAhPT0gJy8nKSkge1xuICAgIHNyY1BhdGgucHVzaCgnJyk7XG4gIH1cblxuICB2YXIgaXNBYnNvbHV0ZSA9IHNyY1BhdGhbMF0gPT09ICcnIHx8XG4gICAgICAoc3JjUGF0aFswXSAmJiBzcmNQYXRoWzBdLmNoYXJBdCgwKSA9PT0gJy8nKTtcblxuICAvLyBwdXQgdGhlIGhvc3QgYmFja1xuICBpZiAocHN5Y2hvdGljKSB7XG4gICAgcmVzdWx0Lmhvc3RuYW1lID0gcmVzdWx0Lmhvc3QgPSBpc0Fic29sdXRlID8gJycgOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3JjUGF0aC5sZW5ndGggPyBzcmNQYXRoLnNoaWZ0KCkgOiAnJztcbiAgICAvL29jY2F0aW9uYWx5IHRoZSBhdXRoIGNhbiBnZXQgc3R1Y2sgb25seSBpbiBob3N0XG4gICAgLy90aGlzIGVzcGVjaWFsbHkgaGFwcGVucyBpbiBjYXNlcyBsaWtlXG4gICAgLy91cmwucmVzb2x2ZU9iamVjdCgnbWFpbHRvOmxvY2FsMUBkb21haW4xJywgJ2xvY2FsMkBkb21haW4yJylcbiAgICB2YXIgYXV0aEluSG9zdCA9IHJlc3VsdC5ob3N0ICYmIHJlc3VsdC5ob3N0LmluZGV4T2YoJ0AnKSA+IDAgP1xuICAgICAgICAgICAgICAgICAgICAgcmVzdWx0Lmhvc3Quc3BsaXQoJ0AnKSA6IGZhbHNlO1xuICAgIGlmIChhdXRoSW5Ib3N0KSB7XG4gICAgICByZXN1bHQuYXV0aCA9IGF1dGhJbkhvc3Quc2hpZnQoKTtcbiAgICAgIHJlc3VsdC5ob3N0ID0gcmVzdWx0Lmhvc3RuYW1lID0gYXV0aEluSG9zdC5zaGlmdCgpO1xuICAgIH1cbiAgfVxuXG4gIG11c3RFbmRBYnMgPSBtdXN0RW5kQWJzIHx8IChyZXN1bHQuaG9zdCAmJiBzcmNQYXRoLmxlbmd0aCk7XG5cbiAgaWYgKG11c3RFbmRBYnMgJiYgIWlzQWJzb2x1dGUpIHtcbiAgICBzcmNQYXRoLnVuc2hpZnQoJycpO1xuICB9XG5cbiAgaWYgKCFzcmNQYXRoLmxlbmd0aCkge1xuICAgIHJlc3VsdC5wYXRobmFtZSA9IG51bGw7XG4gICAgcmVzdWx0LnBhdGggPSBudWxsO1xuICB9IGVsc2Uge1xuICAgIHJlc3VsdC5wYXRobmFtZSA9IHNyY1BhdGguam9pbignLycpO1xuICB9XG5cbiAgLy90byBzdXBwb3J0IHJlcXVlc3QuaHR0cFxuICBpZiAoIXV0aWwuaXNOdWxsKHJlc3VsdC5wYXRobmFtZSkgfHwgIXV0aWwuaXNOdWxsKHJlc3VsdC5zZWFyY2gpKSB7XG4gICAgcmVzdWx0LnBhdGggPSAocmVzdWx0LnBhdGhuYW1lID8gcmVzdWx0LnBhdGhuYW1lIDogJycpICtcbiAgICAgICAgICAgICAgICAgIChyZXN1bHQuc2VhcmNoID8gcmVzdWx0LnNlYXJjaCA6ICcnKTtcbiAgfVxuICByZXN1bHQuYXV0aCA9IHJlbGF0aXZlLmF1dGggfHwgcmVzdWx0LmF1dGg7XG4gIHJlc3VsdC5zbGFzaGVzID0gcmVzdWx0LnNsYXNoZXMgfHwgcmVsYXRpdmUuc2xhc2hlcztcbiAgcmVzdWx0LmhyZWYgPSByZXN1bHQuZm9ybWF0KCk7XG4gIHJldHVybiByZXN1bHQ7XG59O1xuXG5VcmwucHJvdG90eXBlLnBhcnNlSG9zdCA9IGZ1bmN0aW9uKCkge1xuICB2YXIgaG9zdCA9IHRoaXMuaG9zdDtcbiAgdmFyIHBvcnQgPSBwb3J0UGF0dGVybi5leGVjKGhvc3QpO1xuICBpZiAocG9ydCkge1xuICAgIHBvcnQgPSBwb3J0WzBdO1xuICAgIGlmIChwb3J0ICE9PSAnOicpIHtcbiAgICAgIHRoaXMucG9ydCA9IHBvcnQuc3Vic3RyKDEpO1xuICAgIH1cbiAgICBob3N0ID0gaG9zdC5zdWJzdHIoMCwgaG9zdC5sZW5ndGggLSBwb3J0Lmxlbmd0aCk7XG4gIH1cbiAgaWYgKGhvc3QpIHRoaXMuaG9zdG5hbWUgPSBob3N0O1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGlzU3RyaW5nOiBmdW5jdGlvbihhcmcpIHtcbiAgICByZXR1cm4gdHlwZW9mKGFyZykgPT09ICdzdHJpbmcnO1xuICB9LFxuICBpc09iamVjdDogZnVuY3Rpb24oYXJnKSB7XG4gICAgcmV0dXJuIHR5cGVvZihhcmcpID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG4gIH0sXG4gIGlzTnVsbDogZnVuY3Rpb24oYXJnKSB7XG4gICAgcmV0dXJuIGFyZyA9PT0gbnVsbDtcbiAgfSxcbiAgaXNOdWxsT3JVbmRlZmluZWQ6IGZ1bmN0aW9uKGFyZykge1xuICAgIHJldHVybiBhcmcgPT0gbnVsbDtcbiAgfVxufTtcbiIsImlmICh0eXBlb2YgT2JqZWN0LmNyZWF0ZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAvLyBpbXBsZW1lbnRhdGlvbiBmcm9tIHN0YW5kYXJkIG5vZGUuanMgJ3V0aWwnIG1vZHVsZVxuICBtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGluaGVyaXRzKGN0b3IsIHN1cGVyQ3Rvcikge1xuICAgIGN0b3Iuc3VwZXJfID0gc3VwZXJDdG9yXG4gICAgY3Rvci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKHN1cGVyQ3Rvci5wcm90b3R5cGUsIHtcbiAgICAgIGNvbnN0cnVjdG9yOiB7XG4gICAgICAgIHZhbHVlOiBjdG9yLFxuICAgICAgICBlbnVtZXJhYmxlOiBmYWxzZSxcbiAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgICAgfVxuICAgIH0pO1xuICB9O1xufSBlbHNlIHtcbiAgLy8gb2xkIHNjaG9vbCBzaGltIGZvciBvbGQgYnJvd3NlcnNcbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmhlcml0cyhjdG9yLCBzdXBlckN0b3IpIHtcbiAgICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvclxuICAgIHZhciBUZW1wQ3RvciA9IGZ1bmN0aW9uICgpIHt9XG4gICAgVGVtcEN0b3IucHJvdG90eXBlID0gc3VwZXJDdG9yLnByb3RvdHlwZVxuICAgIGN0b3IucHJvdG90eXBlID0gbmV3IFRlbXBDdG9yKClcbiAgICBjdG9yLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IGN0b3JcbiAgfVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpc0J1ZmZlcihhcmcpIHtcbiAgcmV0dXJuIGFyZyAmJiB0eXBlb2YgYXJnID09PSAnb2JqZWN0J1xuICAgICYmIHR5cGVvZiBhcmcuY29weSA9PT0gJ2Z1bmN0aW9uJ1xuICAgICYmIHR5cGVvZiBhcmcuZmlsbCA9PT0gJ2Z1bmN0aW9uJ1xuICAgICYmIHR5cGVvZiBhcmcucmVhZFVJbnQ4ID09PSAnZnVuY3Rpb24nO1xufSIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG52YXIgZm9ybWF0UmVnRXhwID0gLyVbc2RqJV0vZztcbmV4cG9ydHMuZm9ybWF0ID0gZnVuY3Rpb24oZikge1xuICBpZiAoIWlzU3RyaW5nKGYpKSB7XG4gICAgdmFyIG9iamVjdHMgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgb2JqZWN0cy5wdXNoKGluc3BlY3QoYXJndW1lbnRzW2ldKSk7XG4gICAgfVxuICAgIHJldHVybiBvYmplY3RzLmpvaW4oJyAnKTtcbiAgfVxuXG4gIHZhciBpID0gMTtcbiAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XG4gIHZhciBsZW4gPSBhcmdzLmxlbmd0aDtcbiAgdmFyIHN0ciA9IFN0cmluZyhmKS5yZXBsYWNlKGZvcm1hdFJlZ0V4cCwgZnVuY3Rpb24oeCkge1xuICAgIGlmICh4ID09PSAnJSUnKSByZXR1cm4gJyUnO1xuICAgIGlmIChpID49IGxlbikgcmV0dXJuIHg7XG4gICAgc3dpdGNoICh4KSB7XG4gICAgICBjYXNlICclcyc6IHJldHVybiBTdHJpbmcoYXJnc1tpKytdKTtcbiAgICAgIGNhc2UgJyVkJzogcmV0dXJuIE51bWJlcihhcmdzW2krK10pO1xuICAgICAgY2FzZSAnJWonOlxuICAgICAgICB0cnkge1xuICAgICAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShhcmdzW2krK10pO1xuICAgICAgICB9IGNhdGNoIChfKSB7XG4gICAgICAgICAgcmV0dXJuICdbQ2lyY3VsYXJdJztcbiAgICAgICAgfVxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIHg7XG4gICAgfVxuICB9KTtcbiAgZm9yICh2YXIgeCA9IGFyZ3NbaV07IGkgPCBsZW47IHggPSBhcmdzWysraV0pIHtcbiAgICBpZiAoaXNOdWxsKHgpIHx8ICFpc09iamVjdCh4KSkge1xuICAgICAgc3RyICs9ICcgJyArIHg7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciArPSAnICcgKyBpbnNwZWN0KHgpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gc3RyO1xufTtcblxuXG4vLyBNYXJrIHRoYXQgYSBtZXRob2Qgc2hvdWxkIG5vdCBiZSB1c2VkLlxuLy8gUmV0dXJucyBhIG1vZGlmaWVkIGZ1bmN0aW9uIHdoaWNoIHdhcm5zIG9uY2UgYnkgZGVmYXVsdC5cbi8vIElmIC0tbm8tZGVwcmVjYXRpb24gaXMgc2V0LCB0aGVuIGl0IGlzIGEgbm8tb3AuXG5leHBvcnRzLmRlcHJlY2F0ZSA9IGZ1bmN0aW9uKGZuLCBtc2cpIHtcbiAgLy8gQWxsb3cgZm9yIGRlcHJlY2F0aW5nIHRoaW5ncyBpbiB0aGUgcHJvY2VzcyBvZiBzdGFydGluZyB1cC5cbiAgaWYgKGlzVW5kZWZpbmVkKGdsb2JhbC5wcm9jZXNzKSkge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBleHBvcnRzLmRlcHJlY2F0ZShmbiwgbXNnKS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH07XG4gIH1cblxuICBpZiAocHJvY2Vzcy5ub0RlcHJlY2F0aW9uID09PSB0cnVlKSB7XG4gICAgcmV0dXJuIGZuO1xuICB9XG5cbiAgdmFyIHdhcm5lZCA9IGZhbHNlO1xuICBmdW5jdGlvbiBkZXByZWNhdGVkKCkge1xuICAgIGlmICghd2FybmVkKSB7XG4gICAgICBpZiAocHJvY2Vzcy50aHJvd0RlcHJlY2F0aW9uKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihtc2cpO1xuICAgICAgfSBlbHNlIGlmIChwcm9jZXNzLnRyYWNlRGVwcmVjYXRpb24pIHtcbiAgICAgICAgY29uc29sZS50cmFjZShtc2cpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihtc2cpO1xuICAgICAgfVxuICAgICAgd2FybmVkID0gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH1cblxuICByZXR1cm4gZGVwcmVjYXRlZDtcbn07XG5cblxudmFyIGRlYnVncyA9IHt9O1xudmFyIGRlYnVnRW52aXJvbjtcbmV4cG9ydHMuZGVidWdsb2cgPSBmdW5jdGlvbihzZXQpIHtcbiAgaWYgKGlzVW5kZWZpbmVkKGRlYnVnRW52aXJvbikpXG4gICAgZGVidWdFbnZpcm9uID0gcHJvY2Vzcy5lbnYuTk9ERV9ERUJVRyB8fCAnJztcbiAgc2V0ID0gc2V0LnRvVXBwZXJDYXNlKCk7XG4gIGlmICghZGVidWdzW3NldF0pIHtcbiAgICBpZiAobmV3IFJlZ0V4cCgnXFxcXGInICsgc2V0ICsgJ1xcXFxiJywgJ2knKS50ZXN0KGRlYnVnRW52aXJvbikpIHtcbiAgICAgIHZhciBwaWQgPSBwcm9jZXNzLnBpZDtcbiAgICAgIGRlYnVnc1tzZXRdID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBtc2cgPSBleHBvcnRzLmZvcm1hdC5hcHBseShleHBvcnRzLCBhcmd1bWVudHMpO1xuICAgICAgICBjb25zb2xlLmVycm9yKCclcyAlZDogJXMnLCBzZXQsIHBpZCwgbXNnKTtcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIGRlYnVnc1tzZXRdID0gZnVuY3Rpb24oKSB7fTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGRlYnVnc1tzZXRdO1xufTtcblxuXG4vKipcbiAqIEVjaG9zIHRoZSB2YWx1ZSBvZiBhIHZhbHVlLiBUcnlzIHRvIHByaW50IHRoZSB2YWx1ZSBvdXRcbiAqIGluIHRoZSBiZXN0IHdheSBwb3NzaWJsZSBnaXZlbiB0aGUgZGlmZmVyZW50IHR5cGVzLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmogVGhlIG9iamVjdCB0byBwcmludCBvdXQuXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0cyBPcHRpb25hbCBvcHRpb25zIG9iamVjdCB0aGF0IGFsdGVycyB0aGUgb3V0cHV0LlxuICovXG4vKiBsZWdhY3k6IG9iaiwgc2hvd0hpZGRlbiwgZGVwdGgsIGNvbG9ycyovXG5mdW5jdGlvbiBpbnNwZWN0KG9iaiwgb3B0cykge1xuICAvLyBkZWZhdWx0IG9wdGlvbnNcbiAgdmFyIGN0eCA9IHtcbiAgICBzZWVuOiBbXSxcbiAgICBzdHlsaXplOiBzdHlsaXplTm9Db2xvclxuICB9O1xuICAvLyBsZWdhY3kuLi5cbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPj0gMykgY3R4LmRlcHRoID0gYXJndW1lbnRzWzJdO1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+PSA0KSBjdHguY29sb3JzID0gYXJndW1lbnRzWzNdO1xuICBpZiAoaXNCb29sZWFuKG9wdHMpKSB7XG4gICAgLy8gbGVnYWN5Li4uXG4gICAgY3R4LnNob3dIaWRkZW4gPSBvcHRzO1xuICB9IGVsc2UgaWYgKG9wdHMpIHtcbiAgICAvLyBnb3QgYW4gXCJvcHRpb25zXCIgb2JqZWN0XG4gICAgZXhwb3J0cy5fZXh0ZW5kKGN0eCwgb3B0cyk7XG4gIH1cbiAgLy8gc2V0IGRlZmF1bHQgb3B0aW9uc1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LnNob3dIaWRkZW4pKSBjdHguc2hvd0hpZGRlbiA9IGZhbHNlO1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LmRlcHRoKSkgY3R4LmRlcHRoID0gMjtcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5jb2xvcnMpKSBjdHguY29sb3JzID0gZmFsc2U7XG4gIGlmIChpc1VuZGVmaW5lZChjdHguY3VzdG9tSW5zcGVjdCkpIGN0eC5jdXN0b21JbnNwZWN0ID0gdHJ1ZTtcbiAgaWYgKGN0eC5jb2xvcnMpIGN0eC5zdHlsaXplID0gc3R5bGl6ZVdpdGhDb2xvcjtcbiAgcmV0dXJuIGZvcm1hdFZhbHVlKGN0eCwgb2JqLCBjdHguZGVwdGgpO1xufVxuZXhwb3J0cy5pbnNwZWN0ID0gaW5zcGVjdDtcblxuXG4vLyBodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0FOU0lfZXNjYXBlX2NvZGUjZ3JhcGhpY3Ncbmluc3BlY3QuY29sb3JzID0ge1xuICAnYm9sZCcgOiBbMSwgMjJdLFxuICAnaXRhbGljJyA6IFszLCAyM10sXG4gICd1bmRlcmxpbmUnIDogWzQsIDI0XSxcbiAgJ2ludmVyc2UnIDogWzcsIDI3XSxcbiAgJ3doaXRlJyA6IFszNywgMzldLFxuICAnZ3JleScgOiBbOTAsIDM5XSxcbiAgJ2JsYWNrJyA6IFszMCwgMzldLFxuICAnYmx1ZScgOiBbMzQsIDM5XSxcbiAgJ2N5YW4nIDogWzM2LCAzOV0sXG4gICdncmVlbicgOiBbMzIsIDM5XSxcbiAgJ21hZ2VudGEnIDogWzM1LCAzOV0sXG4gICdyZWQnIDogWzMxLCAzOV0sXG4gICd5ZWxsb3cnIDogWzMzLCAzOV1cbn07XG5cbi8vIERvbid0IHVzZSAnYmx1ZScgbm90IHZpc2libGUgb24gY21kLmV4ZVxuaW5zcGVjdC5zdHlsZXMgPSB7XG4gICdzcGVjaWFsJzogJ2N5YW4nLFxuICAnbnVtYmVyJzogJ3llbGxvdycsXG4gICdib29sZWFuJzogJ3llbGxvdycsXG4gICd1bmRlZmluZWQnOiAnZ3JleScsXG4gICdudWxsJzogJ2JvbGQnLFxuICAnc3RyaW5nJzogJ2dyZWVuJyxcbiAgJ2RhdGUnOiAnbWFnZW50YScsXG4gIC8vIFwibmFtZVwiOiBpbnRlbnRpb25hbGx5IG5vdCBzdHlsaW5nXG4gICdyZWdleHAnOiAncmVkJ1xufTtcblxuXG5mdW5jdGlvbiBzdHlsaXplV2l0aENvbG9yKHN0ciwgc3R5bGVUeXBlKSB7XG4gIHZhciBzdHlsZSA9IGluc3BlY3Quc3R5bGVzW3N0eWxlVHlwZV07XG5cbiAgaWYgKHN0eWxlKSB7XG4gICAgcmV0dXJuICdcXHUwMDFiWycgKyBpbnNwZWN0LmNvbG9yc1tzdHlsZV1bMF0gKyAnbScgKyBzdHIgK1xuICAgICAgICAgICAnXFx1MDAxYlsnICsgaW5zcGVjdC5jb2xvcnNbc3R5bGVdWzFdICsgJ20nO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBzdHI7XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBzdHlsaXplTm9Db2xvcihzdHIsIHN0eWxlVHlwZSkge1xuICByZXR1cm4gc3RyO1xufVxuXG5cbmZ1bmN0aW9uIGFycmF5VG9IYXNoKGFycmF5KSB7XG4gIHZhciBoYXNoID0ge307XG5cbiAgYXJyYXkuZm9yRWFjaChmdW5jdGlvbih2YWwsIGlkeCkge1xuICAgIGhhc2hbdmFsXSA9IHRydWU7XG4gIH0pO1xuXG4gIHJldHVybiBoYXNoO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdFZhbHVlKGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcykge1xuICAvLyBQcm92aWRlIGEgaG9vayBmb3IgdXNlci1zcGVjaWZpZWQgaW5zcGVjdCBmdW5jdGlvbnMuXG4gIC8vIENoZWNrIHRoYXQgdmFsdWUgaXMgYW4gb2JqZWN0IHdpdGggYW4gaW5zcGVjdCBmdW5jdGlvbiBvbiBpdFxuICBpZiAoY3R4LmN1c3RvbUluc3BlY3QgJiZcbiAgICAgIHZhbHVlICYmXG4gICAgICBpc0Z1bmN0aW9uKHZhbHVlLmluc3BlY3QpICYmXG4gICAgICAvLyBGaWx0ZXIgb3V0IHRoZSB1dGlsIG1vZHVsZSwgaXQncyBpbnNwZWN0IGZ1bmN0aW9uIGlzIHNwZWNpYWxcbiAgICAgIHZhbHVlLmluc3BlY3QgIT09IGV4cG9ydHMuaW5zcGVjdCAmJlxuICAgICAgLy8gQWxzbyBmaWx0ZXIgb3V0IGFueSBwcm90b3R5cGUgb2JqZWN0cyB1c2luZyB0aGUgY2lyY3VsYXIgY2hlY2suXG4gICAgICAhKHZhbHVlLmNvbnN0cnVjdG9yICYmIHZhbHVlLmNvbnN0cnVjdG9yLnByb3RvdHlwZSA9PT0gdmFsdWUpKSB7XG4gICAgdmFyIHJldCA9IHZhbHVlLmluc3BlY3QocmVjdXJzZVRpbWVzLCBjdHgpO1xuICAgIGlmICghaXNTdHJpbmcocmV0KSkge1xuICAgICAgcmV0ID0gZm9ybWF0VmFsdWUoY3R4LCByZXQsIHJlY3Vyc2VUaW1lcyk7XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG4gIH1cblxuICAvLyBQcmltaXRpdmUgdHlwZXMgY2Fubm90IGhhdmUgcHJvcGVydGllc1xuICB2YXIgcHJpbWl0aXZlID0gZm9ybWF0UHJpbWl0aXZlKGN0eCwgdmFsdWUpO1xuICBpZiAocHJpbWl0aXZlKSB7XG4gICAgcmV0dXJuIHByaW1pdGl2ZTtcbiAgfVxuXG4gIC8vIExvb2sgdXAgdGhlIGtleXMgb2YgdGhlIG9iamVjdC5cbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh2YWx1ZSk7XG4gIHZhciB2aXNpYmxlS2V5cyA9IGFycmF5VG9IYXNoKGtleXMpO1xuXG4gIGlmIChjdHguc2hvd0hpZGRlbikge1xuICAgIGtleXMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyh2YWx1ZSk7XG4gIH1cblxuICAvLyBJRSBkb2Vzbid0IG1ha2UgZXJyb3IgZmllbGRzIG5vbi1lbnVtZXJhYmxlXG4gIC8vIGh0dHA6Ly9tc2RuLm1pY3Jvc29mdC5jb20vZW4tdXMvbGlicmFyeS9pZS9kd3c1MnNidCh2PXZzLjk0KS5hc3B4XG4gIGlmIChpc0Vycm9yKHZhbHVlKVxuICAgICAgJiYgKGtleXMuaW5kZXhPZignbWVzc2FnZScpID49IDAgfHwga2V5cy5pbmRleE9mKCdkZXNjcmlwdGlvbicpID49IDApKSB7XG4gICAgcmV0dXJuIGZvcm1hdEVycm9yKHZhbHVlKTtcbiAgfVxuXG4gIC8vIFNvbWUgdHlwZSBvZiBvYmplY3Qgd2l0aG91dCBwcm9wZXJ0aWVzIGNhbiBiZSBzaG9ydGN1dHRlZC5cbiAgaWYgKGtleXMubGVuZ3RoID09PSAwKSB7XG4gICAgaWYgKGlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgICB2YXIgbmFtZSA9IHZhbHVlLm5hbWUgPyAnOiAnICsgdmFsdWUubmFtZSA6ICcnO1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKCdbRnVuY3Rpb24nICsgbmFtZSArICddJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gICAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksICdyZWdleHAnKTtcbiAgICB9XG4gICAgaWYgKGlzRGF0ZSh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZShEYXRlLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSwgJ2RhdGUnKTtcbiAgICB9XG4gICAgaWYgKGlzRXJyb3IodmFsdWUpKSB7XG4gICAgICByZXR1cm4gZm9ybWF0RXJyb3IodmFsdWUpO1xuICAgIH1cbiAgfVxuXG4gIHZhciBiYXNlID0gJycsIGFycmF5ID0gZmFsc2UsIGJyYWNlcyA9IFsneycsICd9J107XG5cbiAgLy8gTWFrZSBBcnJheSBzYXkgdGhhdCB0aGV5IGFyZSBBcnJheVxuICBpZiAoaXNBcnJheSh2YWx1ZSkpIHtcbiAgICBhcnJheSA9IHRydWU7XG4gICAgYnJhY2VzID0gWydbJywgJ10nXTtcbiAgfVxuXG4gIC8vIE1ha2UgZnVuY3Rpb25zIHNheSB0aGF0IHRoZXkgYXJlIGZ1bmN0aW9uc1xuICBpZiAoaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICB2YXIgbiA9IHZhbHVlLm5hbWUgPyAnOiAnICsgdmFsdWUubmFtZSA6ICcnO1xuICAgIGJhc2UgPSAnIFtGdW5jdGlvbicgKyBuICsgJ10nO1xuICB9XG5cbiAgLy8gTWFrZSBSZWdFeHBzIHNheSB0aGF0IHRoZXkgYXJlIFJlZ0V4cHNcbiAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgIGJhc2UgPSAnICcgKyBSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpO1xuICB9XG5cbiAgLy8gTWFrZSBkYXRlcyB3aXRoIHByb3BlcnRpZXMgZmlyc3Qgc2F5IHRoZSBkYXRlXG4gIGlmIChpc0RhdGUodmFsdWUpKSB7XG4gICAgYmFzZSA9ICcgJyArIERhdGUucHJvdG90eXBlLnRvVVRDU3RyaW5nLmNhbGwodmFsdWUpO1xuICB9XG5cbiAgLy8gTWFrZSBlcnJvciB3aXRoIG1lc3NhZ2UgZmlyc3Qgc2F5IHRoZSBlcnJvclxuICBpZiAoaXNFcnJvcih2YWx1ZSkpIHtcbiAgICBiYXNlID0gJyAnICsgZm9ybWF0RXJyb3IodmFsdWUpO1xuICB9XG5cbiAgaWYgKGtleXMubGVuZ3RoID09PSAwICYmICghYXJyYXkgfHwgdmFsdWUubGVuZ3RoID09IDApKSB7XG4gICAgcmV0dXJuIGJyYWNlc1swXSArIGJhc2UgKyBicmFjZXNbMV07XG4gIH1cblxuICBpZiAocmVjdXJzZVRpbWVzIDwgMCkge1xuICAgIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZShSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCAncmVnZXhwJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZSgnW09iamVjdF0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfVxuXG4gIGN0eC5zZWVuLnB1c2godmFsdWUpO1xuXG4gIHZhciBvdXRwdXQ7XG4gIGlmIChhcnJheSkge1xuICAgIG91dHB1dCA9IGZvcm1hdEFycmF5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleXMpO1xuICB9IGVsc2Uge1xuICAgIG91dHB1dCA9IGtleXMubWFwKGZ1bmN0aW9uKGtleSkge1xuICAgICAgcmV0dXJuIGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleSwgYXJyYXkpO1xuICAgIH0pO1xuICB9XG5cbiAgY3R4LnNlZW4ucG9wKCk7XG5cbiAgcmV0dXJuIHJlZHVjZVRvU2luZ2xlU3RyaW5nKG91dHB1dCwgYmFzZSwgYnJhY2VzKTtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRQcmltaXRpdmUoY3R4LCB2YWx1ZSkge1xuICBpZiAoaXNVbmRlZmluZWQodmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgndW5kZWZpbmVkJywgJ3VuZGVmaW5lZCcpO1xuICBpZiAoaXNTdHJpbmcodmFsdWUpKSB7XG4gICAgdmFyIHNpbXBsZSA9ICdcXCcnICsgSlNPTi5zdHJpbmdpZnkodmFsdWUpLnJlcGxhY2UoL15cInxcIiQvZywgJycpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvJy9nLCBcIlxcXFwnXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFxcXFwiL2csICdcIicpICsgJ1xcJyc7XG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKHNpbXBsZSwgJ3N0cmluZycpO1xuICB9XG4gIGlmIChpc051bWJlcih2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCcnICsgdmFsdWUsICdudW1iZXInKTtcbiAgaWYgKGlzQm9vbGVhbih2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCcnICsgdmFsdWUsICdib29sZWFuJyk7XG4gIC8vIEZvciBzb21lIHJlYXNvbiB0eXBlb2YgbnVsbCBpcyBcIm9iamVjdFwiLCBzbyBzcGVjaWFsIGNhc2UgaGVyZS5cbiAgaWYgKGlzTnVsbCh2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCdudWxsJywgJ251bGwnKTtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRFcnJvcih2YWx1ZSkge1xuICByZXR1cm4gJ1snICsgRXJyb3IucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpICsgJ10nO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdEFycmF5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleXMpIHtcbiAgdmFyIG91dHB1dCA9IFtdO1xuICBmb3IgKHZhciBpID0gMCwgbCA9IHZhbHVlLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIGlmIChoYXNPd25Qcm9wZXJ0eSh2YWx1ZSwgU3RyaW5nKGkpKSkge1xuICAgICAgb3V0cHV0LnB1c2goZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cyxcbiAgICAgICAgICBTdHJpbmcoaSksIHRydWUpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0cHV0LnB1c2goJycpO1xuICAgIH1cbiAgfVxuICBrZXlzLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgaWYgKCFrZXkubWF0Y2goL15cXGQrJC8pKSB7XG4gICAgICBvdXRwdXQucHVzaChmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLFxuICAgICAgICAgIGtleSwgdHJ1ZSkpO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBvdXRwdXQ7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5LCBhcnJheSkge1xuICB2YXIgbmFtZSwgc3RyLCBkZXNjO1xuICBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih2YWx1ZSwga2V5KSB8fCB7IHZhbHVlOiB2YWx1ZVtrZXldIH07XG4gIGlmIChkZXNjLmdldCkge1xuICAgIGlmIChkZXNjLnNldCkge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tHZXR0ZXIvU2V0dGVyXScsICdzcGVjaWFsJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbR2V0dGVyXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGlmIChkZXNjLnNldCkge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tTZXR0ZXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH1cbiAgaWYgKCFoYXNPd25Qcm9wZXJ0eSh2aXNpYmxlS2V5cywga2V5KSkge1xuICAgIG5hbWUgPSAnWycgKyBrZXkgKyAnXSc7XG4gIH1cbiAgaWYgKCFzdHIpIHtcbiAgICBpZiAoY3R4LnNlZW4uaW5kZXhPZihkZXNjLnZhbHVlKSA8IDApIHtcbiAgICAgIGlmIChpc051bGwocmVjdXJzZVRpbWVzKSkge1xuICAgICAgICBzdHIgPSBmb3JtYXRWYWx1ZShjdHgsIGRlc2MudmFsdWUsIG51bGwpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3RyID0gZm9ybWF0VmFsdWUoY3R4LCBkZXNjLnZhbHVlLCByZWN1cnNlVGltZXMgLSAxKTtcbiAgICAgIH1cbiAgICAgIGlmIChzdHIuaW5kZXhPZignXFxuJykgPiAtMSkge1xuICAgICAgICBpZiAoYXJyYXkpIHtcbiAgICAgICAgICBzdHIgPSBzdHIuc3BsaXQoJ1xcbicpLm1hcChmdW5jdGlvbihsaW5lKSB7XG4gICAgICAgICAgICByZXR1cm4gJyAgJyArIGxpbmU7XG4gICAgICAgICAgfSkuam9pbignXFxuJykuc3Vic3RyKDIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHN0ciA9ICdcXG4nICsgc3RyLnNwbGl0KCdcXG4nKS5tYXAoZnVuY3Rpb24obGluZSkge1xuICAgICAgICAgICAgcmV0dXJuICcgICAnICsgbGluZTtcbiAgICAgICAgICB9KS5qb2luKCdcXG4nKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW0NpcmN1bGFyXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9XG4gIGlmIChpc1VuZGVmaW5lZChuYW1lKSkge1xuICAgIGlmIChhcnJheSAmJiBrZXkubWF0Y2goL15cXGQrJC8pKSB7XG4gICAgICByZXR1cm4gc3RyO1xuICAgIH1cbiAgICBuYW1lID0gSlNPTi5zdHJpbmdpZnkoJycgKyBrZXkpO1xuICAgIGlmIChuYW1lLm1hdGNoKC9eXCIoW2EtekEtWl9dW2EtekEtWl8wLTldKilcIiQvKSkge1xuICAgICAgbmFtZSA9IG5hbWUuc3Vic3RyKDEsIG5hbWUubGVuZ3RoIC0gMik7XG4gICAgICBuYW1lID0gY3R4LnN0eWxpemUobmFtZSwgJ25hbWUnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbmFtZSA9IG5hbWUucmVwbGFjZSgvJy9nLCBcIlxcXFwnXCIpXG4gICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXFxcXCIvZywgJ1wiJylcbiAgICAgICAgICAgICAgICAgLnJlcGxhY2UoLyheXCJ8XCIkKS9nLCBcIidcIik7XG4gICAgICBuYW1lID0gY3R4LnN0eWxpemUobmFtZSwgJ3N0cmluZycpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBuYW1lICsgJzogJyArIHN0cjtcbn1cblxuXG5mdW5jdGlvbiByZWR1Y2VUb1NpbmdsZVN0cmluZyhvdXRwdXQsIGJhc2UsIGJyYWNlcykge1xuICB2YXIgbnVtTGluZXNFc3QgPSAwO1xuICB2YXIgbGVuZ3RoID0gb3V0cHV0LnJlZHVjZShmdW5jdGlvbihwcmV2LCBjdXIpIHtcbiAgICBudW1MaW5lc0VzdCsrO1xuICAgIGlmIChjdXIuaW5kZXhPZignXFxuJykgPj0gMCkgbnVtTGluZXNFc3QrKztcbiAgICByZXR1cm4gcHJldiArIGN1ci5yZXBsYWNlKC9cXHUwMDFiXFxbXFxkXFxkP20vZywgJycpLmxlbmd0aCArIDE7XG4gIH0sIDApO1xuXG4gIGlmIChsZW5ndGggPiA2MCkge1xuICAgIHJldHVybiBicmFjZXNbMF0gK1xuICAgICAgICAgICAoYmFzZSA9PT0gJycgPyAnJyA6IGJhc2UgKyAnXFxuICcpICtcbiAgICAgICAgICAgJyAnICtcbiAgICAgICAgICAgb3V0cHV0LmpvaW4oJyxcXG4gICcpICtcbiAgICAgICAgICAgJyAnICtcbiAgICAgICAgICAgYnJhY2VzWzFdO1xuICB9XG5cbiAgcmV0dXJuIGJyYWNlc1swXSArIGJhc2UgKyAnICcgKyBvdXRwdXQuam9pbignLCAnKSArICcgJyArIGJyYWNlc1sxXTtcbn1cblxuXG4vLyBOT1RFOiBUaGVzZSB0eXBlIGNoZWNraW5nIGZ1bmN0aW9ucyBpbnRlbnRpb25hbGx5IGRvbid0IHVzZSBgaW5zdGFuY2VvZmBcbi8vIGJlY2F1c2UgaXQgaXMgZnJhZ2lsZSBhbmQgY2FuIGJlIGVhc2lseSBmYWtlZCB3aXRoIGBPYmplY3QuY3JlYXRlKClgLlxuZnVuY3Rpb24gaXNBcnJheShhcikge1xuICByZXR1cm4gQXJyYXkuaXNBcnJheShhcik7XG59XG5leHBvcnRzLmlzQXJyYXkgPSBpc0FycmF5O1xuXG5mdW5jdGlvbiBpc0Jvb2xlYW4oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnYm9vbGVhbic7XG59XG5leHBvcnRzLmlzQm9vbGVhbiA9IGlzQm9vbGVhbjtcblxuZnVuY3Rpb24gaXNOdWxsKGFyZykge1xuICByZXR1cm4gYXJnID09PSBudWxsO1xufVxuZXhwb3J0cy5pc051bGwgPSBpc051bGw7XG5cbmZ1bmN0aW9uIGlzTnVsbE9yVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09IG51bGw7XG59XG5leHBvcnRzLmlzTnVsbE9yVW5kZWZpbmVkID0gaXNOdWxsT3JVbmRlZmluZWQ7XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ251bWJlcic7XG59XG5leHBvcnRzLmlzTnVtYmVyID0gaXNOdW1iZXI7XG5cbmZ1bmN0aW9uIGlzU3RyaW5nKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ3N0cmluZyc7XG59XG5leHBvcnRzLmlzU3RyaW5nID0gaXNTdHJpbmc7XG5cbmZ1bmN0aW9uIGlzU3ltYm9sKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ3N5bWJvbCc7XG59XG5leHBvcnRzLmlzU3ltYm9sID0gaXNTeW1ib2w7XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG5leHBvcnRzLmlzVW5kZWZpbmVkID0gaXNVbmRlZmluZWQ7XG5cbmZ1bmN0aW9uIGlzUmVnRXhwKHJlKSB7XG4gIHJldHVybiBpc09iamVjdChyZSkgJiYgb2JqZWN0VG9TdHJpbmcocmUpID09PSAnW29iamVjdCBSZWdFeHBdJztcbn1cbmV4cG9ydHMuaXNSZWdFeHAgPSBpc1JlZ0V4cDtcblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5leHBvcnRzLmlzT2JqZWN0ID0gaXNPYmplY3Q7XG5cbmZ1bmN0aW9uIGlzRGF0ZShkKSB7XG4gIHJldHVybiBpc09iamVjdChkKSAmJiBvYmplY3RUb1N0cmluZyhkKSA9PT0gJ1tvYmplY3QgRGF0ZV0nO1xufVxuZXhwb3J0cy5pc0RhdGUgPSBpc0RhdGU7XG5cbmZ1bmN0aW9uIGlzRXJyb3IoZSkge1xuICByZXR1cm4gaXNPYmplY3QoZSkgJiZcbiAgICAgIChvYmplY3RUb1N0cmluZyhlKSA9PT0gJ1tvYmplY3QgRXJyb3JdJyB8fCBlIGluc3RhbmNlb2YgRXJyb3IpO1xufVxuZXhwb3J0cy5pc0Vycm9yID0gaXNFcnJvcjtcblxuZnVuY3Rpb24gaXNGdW5jdGlvbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbic7XG59XG5leHBvcnRzLmlzRnVuY3Rpb24gPSBpc0Z1bmN0aW9uO1xuXG5mdW5jdGlvbiBpc1ByaW1pdGl2ZShhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gbnVsbCB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ2Jvb2xlYW4nIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnbnVtYmVyJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3N0cmluZycgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdzeW1ib2wnIHx8ICAvLyBFUzYgc3ltYm9sXG4gICAgICAgICB0eXBlb2YgYXJnID09PSAndW5kZWZpbmVkJztcbn1cbmV4cG9ydHMuaXNQcmltaXRpdmUgPSBpc1ByaW1pdGl2ZTtcblxuZXhwb3J0cy5pc0J1ZmZlciA9IHJlcXVpcmUoJy4vc3VwcG9ydC9pc0J1ZmZlcicpO1xuXG5mdW5jdGlvbiBvYmplY3RUb1N0cmluZyhvKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobyk7XG59XG5cblxuZnVuY3Rpb24gcGFkKG4pIHtcbiAgcmV0dXJuIG4gPCAxMCA/ICcwJyArIG4udG9TdHJpbmcoMTApIDogbi50b1N0cmluZygxMCk7XG59XG5cblxudmFyIG1vbnRocyA9IFsnSmFuJywgJ0ZlYicsICdNYXInLCAnQXByJywgJ01heScsICdKdW4nLCAnSnVsJywgJ0F1ZycsICdTZXAnLFxuICAgICAgICAgICAgICAnT2N0JywgJ05vdicsICdEZWMnXTtcblxuLy8gMjYgRmViIDE2OjE5OjM0XG5mdW5jdGlvbiB0aW1lc3RhbXAoKSB7XG4gIHZhciBkID0gbmV3IERhdGUoKTtcbiAgdmFyIHRpbWUgPSBbcGFkKGQuZ2V0SG91cnMoKSksXG4gICAgICAgICAgICAgIHBhZChkLmdldE1pbnV0ZXMoKSksXG4gICAgICAgICAgICAgIHBhZChkLmdldFNlY29uZHMoKSldLmpvaW4oJzonKTtcbiAgcmV0dXJuIFtkLmdldERhdGUoKSwgbW9udGhzW2QuZ2V0TW9udGgoKV0sIHRpbWVdLmpvaW4oJyAnKTtcbn1cblxuXG4vLyBsb2cgaXMganVzdCBhIHRoaW4gd3JhcHBlciB0byBjb25zb2xlLmxvZyB0aGF0IHByZXBlbmRzIGEgdGltZXN0YW1wXG5leHBvcnRzLmxvZyA9IGZ1bmN0aW9uKCkge1xuICBjb25zb2xlLmxvZygnJXMgLSAlcycsIHRpbWVzdGFtcCgpLCBleHBvcnRzLmZvcm1hdC5hcHBseShleHBvcnRzLCBhcmd1bWVudHMpKTtcbn07XG5cblxuLyoqXG4gKiBJbmhlcml0IHRoZSBwcm90b3R5cGUgbWV0aG9kcyBmcm9tIG9uZSBjb25zdHJ1Y3RvciBpbnRvIGFub3RoZXIuXG4gKlxuICogVGhlIEZ1bmN0aW9uLnByb3RvdHlwZS5pbmhlcml0cyBmcm9tIGxhbmcuanMgcmV3cml0dGVuIGFzIGEgc3RhbmRhbG9uZVxuICogZnVuY3Rpb24gKG5vdCBvbiBGdW5jdGlvbi5wcm90b3R5cGUpLiBOT1RFOiBJZiB0aGlzIGZpbGUgaXMgdG8gYmUgbG9hZGVkXG4gKiBkdXJpbmcgYm9vdHN0cmFwcGluZyB0aGlzIGZ1bmN0aW9uIG5lZWRzIHRvIGJlIHJld3JpdHRlbiB1c2luZyBzb21lIG5hdGl2ZVxuICogZnVuY3Rpb25zIGFzIHByb3RvdHlwZSBzZXR1cCB1c2luZyBub3JtYWwgSmF2YVNjcmlwdCBkb2VzIG5vdCB3b3JrIGFzXG4gKiBleHBlY3RlZCBkdXJpbmcgYm9vdHN0cmFwcGluZyAoc2VlIG1pcnJvci5qcyBpbiByMTE0OTAzKS5cbiAqXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjdG9yIENvbnN0cnVjdG9yIGZ1bmN0aW9uIHdoaWNoIG5lZWRzIHRvIGluaGVyaXQgdGhlXG4gKiAgICAgcHJvdG90eXBlLlxuICogQHBhcmFtIHtmdW5jdGlvbn0gc3VwZXJDdG9yIENvbnN0cnVjdG9yIGZ1bmN0aW9uIHRvIGluaGVyaXQgcHJvdG90eXBlIGZyb20uXG4gKi9cbmV4cG9ydHMuaW5oZXJpdHMgPSByZXF1aXJlKCdpbmhlcml0cycpO1xuXG5leHBvcnRzLl9leHRlbmQgPSBmdW5jdGlvbihvcmlnaW4sIGFkZCkge1xuICAvLyBEb24ndCBkbyBhbnl0aGluZyBpZiBhZGQgaXNuJ3QgYW4gb2JqZWN0XG4gIGlmICghYWRkIHx8ICFpc09iamVjdChhZGQpKSByZXR1cm4gb3JpZ2luO1xuXG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMoYWRkKTtcbiAgdmFyIGkgPSBrZXlzLmxlbmd0aDtcbiAgd2hpbGUgKGktLSkge1xuICAgIG9yaWdpbltrZXlzW2ldXSA9IGFkZFtrZXlzW2ldXTtcbiAgfVxuICByZXR1cm4gb3JpZ2luO1xufTtcblxuZnVuY3Rpb24gaGFzT3duUHJvcGVydHkob2JqLCBwcm9wKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKTtcbn1cbiIsIlwidXNlIHN0cmljdFwiO1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbmNvbnN0IGNvbW1vbl8xID0gcmVxdWlyZShcIi4vY29tbW9uXCIpO1xyXG5leHBvcnRzLnNlcnZpY2VNb2R1bGUgPSBjb21tb25fMS5zZXJ2aWNlTW9kdWxlO1xyXG5jb25zdCByb3V0ZXJfMSA9IHJlcXVpcmUoXCIuL3JvdXRlclwiKTtcclxuZXhwb3J0cy5Sb3V0ZXIgPSByb3V0ZXJfMS5Sb3V0ZXI7XHJcbmNvbnN0IGxvY2F0aW9uU2VydmljZV8xID0gcmVxdWlyZShcIi4vbG9jYXRpb25TZXJ2aWNlXCIpO1xyXG5leHBvcnRzLkxvY2F0aW9uU2VydmljZSA9IGxvY2F0aW9uU2VydmljZV8xLkxvY2F0aW9uU2VydmljZTtcclxuY29uc3QgY29yZV8xID0gcmVxdWlyZShcIkBha2FsYS9jb3JlXCIpO1xyXG5leHBvcnRzLk9ic2VydmFibGVBcnJheSA9IGNvcmVfMS5PYnNlcnZhYmxlQXJyYXk7XHJcbmNvbnN0IGh0dHBfMSA9IHJlcXVpcmUoXCIuL2h0dHBcIik7XHJcbmNvbnN0IHRlbXBsYXRlXzEgPSByZXF1aXJlKFwiLi90ZW1wbGF0ZVwiKTtcclxuZXhwb3J0cy5UZW1wbGF0ZSA9IHRlbXBsYXRlXzEuVGVtcGxhdGU7XHJcbmNvbnN0IHBhcnRfMSA9IHJlcXVpcmUoXCIuL3BhcnRcIik7XHJcbmV4cG9ydHMuUGFydCA9IHBhcnRfMS5QYXJ0O1xyXG5jb25zdCBzY29wZV8xID0gcmVxdWlyZShcIi4vc2NvcGVcIik7XHJcbmNvbnN0IGNvbnRyb2xzXzEgPSByZXF1aXJlKFwiLi9jb250cm9scy9jb250cm9sc1wiKTtcclxuZXhwb3J0cy5CYXNlQ29udHJvbCA9IGNvbnRyb2xzXzEuQmFzZUNvbnRyb2w7XHJcbmV4cG9ydHMuQ29udHJvbCA9IGNvbnRyb2xzXzEuQ29udHJvbDtcclxuZXhwb3J0cy5jb250cm9sID0gY29udHJvbHNfMS5jb250cm9sO1xyXG5jb21tb25fMS4kJGluamVjdG9yWydyb3V0ZXInXSA9IHJvdXRlcl8xLnJvdXRlcjtcclxuY29tbW9uXzEuJCRpbmplY3RvclsnQmFzZUNvbnRyb2wnXSA9IGNvbnRyb2xzXzEuQmFzZUNvbnRyb2w7XHJcbmNvbW1vbl8xLiQkaW5qZWN0b3JbJ0NvbnRyb2wnXSA9IGNvbnRyb2xzXzEuQ29udHJvbDtcclxuY29tbW9uXzEuJCRpbmplY3RvclsnY29udHJvbCddID0gY29udHJvbHNfMS5jb250cm9sO1xyXG5jb21tb25fMS4kJGluamVjdG9yWydsb2FkJ10gPSBsb2FkO1xyXG52YXIgbWFpblJvdXRlciA9IHJvdXRlcl8xLnJvdXRlcigpO1xyXG5tYWluUm91dGVyLnVzZShjb21tb25fMS5zZXJ2aWNlTW9kdWxlLnJlZ2lzdGVyKCckcHJlUm91dGVyJywgcm91dGVyXzEucm91dGVyKCkpLnJvdXRlcik7XHJcbm1haW5Sb3V0ZXIudXNlKGNvbW1vbl8xLnNlcnZpY2VNb2R1bGUucmVnaXN0ZXIoJyRyb3V0ZXInLCByb3V0ZXJfMS5yb3V0ZXIoKSkucm91dGVyKTtcclxubWFpblJvdXRlci51c2UoZnVuY3Rpb24gKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcclxufSk7XHJcbmNvbW1vbl8xLnNlcnZpY2VNb2R1bGUucmVnaXN0ZXIoJyRodHRwJywgbmV3IGh0dHBfMS5IdHRwKCkpO1xyXG5jb21tb25fMS5zZXJ2aWNlTW9kdWxlLnJlZ2lzdGVyKCckbG9jYXRpb24nLCBuZXcgbG9jYXRpb25TZXJ2aWNlXzEuTG9jYXRpb25TZXJ2aWNlKCkpO1xyXG5jb21tb25fMS5zZXJ2aWNlTW9kdWxlLnJlZ2lzdGVyKCdwcm9taXNpZnknLCBjb3JlXzEuUHJvbWlzaWZ5KTtcclxuY29tbW9uXzEuc2VydmljZU1vZHVsZS5yZWdpc3RlcignJGRlZmVyJywgY29yZV8xLkRlZmVycmVkKTtcclxuLy8gZXhwb3J0IHsgUHJvbWlzaWZ5LCBEZWZlcnJlZCB9O1xyXG5leHBvcnRzLnJ1biA9IGNvbW1vbl8xLiQkaW5qZWN0b3IucnVuLmJpbmQoY29tbW9uXzEuJCRpbmplY3Rvcik7XHJcbmNvbW1vbl8xLiQkaW5qZWN0b3IuaW5pdChbXSwgZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHJvb3RTY29wZSA9IGNvbW1vbl8xLiQkaW5qZWN0b3IucmVnaXN0ZXIoJyRyb290U2NvcGUnLCBuZXcgc2NvcGVfMS5TY29wZSgpKTtcclxuICAgICQoZG9jdW1lbnQpLmFwcGx5VGVtcGxhdGUocm9vdFNjb3BlKTtcclxufSk7XHJcbmZ1bmN0aW9uIGxvYWQoLi4uc2NyaXB0cykge1xyXG4gICAgdmFyIGRlZmVyID0gbmV3IGNvcmVfMS5EZWZlcnJlZCgpO1xyXG4gICAgdmFyIGZpcnN0U2NyaXB0VGFnID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ3NjcmlwdCcpWzBdOyAvLyBmaW5kIHRoZSBmaXJzdCBzY3JpcHQgdGFnIGluIHRoZSBkb2N1bWVudFxyXG4gICAgY29yZV8xLmVhY2hBc3luYyhzY3JpcHRzLCBmdW5jdGlvbiAoc2NyaXB0LCBpLCBuZXh0KSB7XHJcbiAgICAgICAgdmFyIHNjcmlwdFRhZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NjcmlwdCcpOyAvLyBjcmVhdGUgYSBzY3JpcHQgdGFnXHJcbiAgICAgICAgZmlyc3RTY3JpcHRUYWcucGFyZW50Tm9kZS5pbnNlcnRCZWZvcmUoc2NyaXB0VGFnLCBmaXJzdFNjcmlwdFRhZyk7IC8vIGFwcGVuZCB0aGUgc2NyaXB0IHRvIHRoZSBET01cclxuICAgICAgICBzY3JpcHRUYWcuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsIGZ1bmN0aW9uIChldikge1xyXG4gICAgICAgICAgICBuZXh0KCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgc2NyaXB0VGFnLnNyYyA9IHNjcmlwdDsgLy8gc2V0IHRoZSBzb3VyY2Ugb2YgdGhlIHNjcmlwdCB0byB5b3VyIHNjcmlwdFxyXG4gICAgfSwgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIGRlZmVyLnJlc29sdmUobnVsbCk7XHJcbiAgICB9KTtcclxuICAgIHJldHVybiBkZWZlcjtcclxufVxyXG5leHBvcnRzLmxvYWQgPSBsb2FkO1xyXG5jb21tb25fMS4kJGluamVjdG9yLnN0YXJ0KFsnJGxvY2F0aW9uJ10sIGZ1bmN0aW9uICgkbG9jYXRpb24pIHtcclxuICAgIHZhciBzdGFydGVkID0gZmFsc2U7XHJcbiAgICAkbG9jYXRpb24ub24oJ2NoYW5nZScsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICBpZiAoc3RhcnRlZClcclxuICAgICAgICAgICAgbWFpblJvdXRlci5oYW5kbGUobmV3IHJvdXRlcl8xLlJlcXVlc3QobG9jYXRpb24pLCBmdW5jdGlvbiAoZXJyKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoZXJyKVxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoZXJyKTtcclxuICAgICAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ2RlYWRlbmQnKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICB9KTtcclxuICAgICRsb2NhdGlvbi5zdGFydCh7IGhhc2hiYW5nOiB0cnVlIH0pO1xyXG4gICAgc3RhcnRlZCA9IHRydWU7XHJcbn0pO1xyXG4kKGZ1bmN0aW9uICgpIHtcclxuICAgIGNvbW1vbl8xLiQkaW5qZWN0b3Iuc3RhcnQoKTtcclxufSk7XHJcbiQoZG9jdW1lbnQpLm9uKCdjbGljaycsICcudGFicyA+IHVsID4gbGknLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAkKHRoaXMpLnNpYmxpbmdzKCcuYWN0aXZlJykuYWRkKCQodGhpcykuY2xvc2VzdCgnLnRhYnMnKS5maW5kKCcudGFiJykpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcclxuICAgICQodGhpcykuYWRkKCQodGhpcykuY2xvc2VzdCgnLnRhYnMnKS5maW5kKCQodGhpcykuZmluZCgnYScpLmF0dHIoJ2hyZWYnKSkpLmFkZENsYXNzKCdhY3RpdmUnKTtcclxuICAgIHJldHVybiBmYWxzZTtcclxufSk7XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWNsaWVudGlmeS5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5jb25zdCBjb3JlXzEgPSByZXF1aXJlKFwiQGFrYWxhL2NvcmVcIik7XHJcbmV4cG9ydHMuaXNQcm9taXNlTGlrZSA9IGNvcmVfMS5pc1Byb21pc2VMaWtlO1xyXG5leHBvcnRzLlByb21pc2VTdGF0dXMgPSBjb3JlXzEuUHJvbWlzZVN0YXR1cztcclxucmVxdWlyZShcIkBha2FsYS9jb3JlXCIpO1xyXG5leHBvcnRzLiQkaW5qZWN0b3IgPSB3aW5kb3dbJ2FrYWxhJ10gPSBjb3JlXzEubW9kdWxlKCdha2FsYScsICdha2FsYS1zZXJ2aWNlcycsICdjb250cm9scycpO1xyXG5leHBvcnRzLiQkaW5qZWN0b3JbJ3Byb21pc2lmeSddID0gY29yZV8xLlByb21pc2lmeTtcclxuZXhwb3J0cy4kJGluamVjdG9yWydpc1Byb21pc2VMaWtlJ10gPSBjb3JlXzEuaXNQcm9taXNlTGlrZTtcclxuZXhwb3J0cy4kJGluamVjdG9yWydQcm9taXNlU3RhdHVzJ10gPSBjb3JlXzEuUHJvbWlzZVN0YXR1cztcclxuZXhwb3J0cy4kJGluamVjdG9yWydkZWZlciddID0gY29yZV8xLkRlZmVycmVkO1xyXG5leHBvcnRzLiQkaW5qZWN0b3JbJ0JpbmRpbmcnXSA9IGNvcmVfMS5CaW5kaW5nO1xyXG5leHBvcnRzLiQkaW5qZWN0b3JbJ09ic2VydmFibGVBcnJheSddID0gY29yZV8xLk9ic2VydmFibGVBcnJheTtcclxuZXhwb3J0cy5zZXJ2aWNlTW9kdWxlID0gY29yZV8xLm1vZHVsZSgnYWthbGEtc2VydmljZXMnKTtcclxuZnVuY3Rpb24gc2VydmljZShuYW1lLCAuLi50b0luamVjdCkge1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uICh0YXJnZXQpIHtcclxuICAgICAgICB2YXIgaW5zdGFuY2UgPSBudWxsO1xyXG4gICAgICAgIGlmICh0b0luamVjdCA9PSBudWxsIHx8IHRvSW5qZWN0Lmxlbmd0aCA9PSAwICYmIHRhcmdldC5sZW5ndGggPiAwKVxyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ21pc3NpbmcgaW5qZWN0IG5hbWVzJyk7XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICBleHBvcnRzLnNlcnZpY2VNb2R1bGUucmVnaXN0ZXJGYWN0b3J5KG5hbWUsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBpbnN0YW5jZSB8fCBleHBvcnRzLnNlcnZpY2VNb2R1bGUuaW5qZWN0V2l0aE5hbWUodG9JbmplY3QsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgYXJncyA9IFtudWxsXTtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKylcclxuICAgICAgICAgICAgICAgICAgICAgICAgYXJnc1tpICsgMV0gPSBhcmd1bWVudHNbaV07XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGluc3RhbmNlID0gbmV3IChGdW5jdGlvbi5wcm90b3R5cGUuYmluZC5hcHBseSh0YXJnZXQsIGFyZ3MpKTtcclxuICAgICAgICAgICAgICAgIH0pKCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgfTtcclxufVxyXG5leHBvcnRzLnNlcnZpY2UgPSBzZXJ2aWNlO1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1jb21tb24uanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbnZhciBfX2RlY29yYXRlID0gKHRoaXMgJiYgdGhpcy5fX2RlY29yYXRlKSB8fCBmdW5jdGlvbiAoZGVjb3JhdG9ycywgdGFyZ2V0LCBrZXksIGRlc2MpIHtcclxuICAgIHZhciBjID0gYXJndW1lbnRzLmxlbmd0aCwgciA9IGMgPCAzID8gdGFyZ2V0IDogZGVzYyA9PT0gbnVsbCA/IGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRhcmdldCwga2V5KSA6IGRlc2MsIGQ7XHJcbiAgICBpZiAodHlwZW9mIFJlZmxlY3QgPT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIFJlZmxlY3QuZGVjb3JhdGUgPT09IFwiZnVuY3Rpb25cIikgciA9IFJlZmxlY3QuZGVjb3JhdGUoZGVjb3JhdG9ycywgdGFyZ2V0LCBrZXksIGRlc2MpO1xyXG4gICAgZWxzZSBmb3IgKHZhciBpID0gZGVjb3JhdG9ycy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkgaWYgKGQgPSBkZWNvcmF0b3JzW2ldKSByID0gKGMgPCAzID8gZChyKSA6IGMgPiAzID8gZCh0YXJnZXQsIGtleSwgcikgOiBkKHRhcmdldCwga2V5KSkgfHwgcjtcclxuICAgIHJldHVybiBjID4gMyAmJiByICYmIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGtleSwgciksIHI7XHJcbn07XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxuY29uc3QgY29udHJvbF8xID0gcmVxdWlyZShcIi4vY29udHJvbFwiKTtcclxuY29uc3QgY29yZV8xID0gcmVxdWlyZShcIkBha2FsYS9jb3JlXCIpO1xyXG5sZXQgQ2xpY2sgPSBjbGFzcyBDbGljayBleHRlbmRzIGNvbnRyb2xfMS5CYXNlQ29udHJvbCB7XHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICBzdXBlcignY2xpY2snLCA0MDApO1xyXG4gICAgfVxyXG4gICAgbGluayhzY29wZSwgZWxlbWVudCwgcGFyYW1ldGVyKSB7XHJcbiAgICAgICAgZWxlbWVudC5jbGljayhmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIGlmIChwYXJhbWV0ZXIgaW5zdGFuY2VvZiBjb3JlXzEuQmluZGluZykge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHNjb3BlLiRpbmplY3QocGFyYW1ldGVyLmdldFZhbHVlKCkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgICAgIHJldHVybiBzY29wZS4kaW5qZWN0KHBhcmFtZXRlcik7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbn07XHJcbkNsaWNrID0gX19kZWNvcmF0ZShbXHJcbiAgICBjb250cm9sXzEuY29udHJvbCgpXHJcbl0sIENsaWNrKTtcclxuZXhwb3J0cy5DbGljayA9IENsaWNrO1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1jbGljay5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5jb25zdCBkaSA9IHJlcXVpcmUoXCJAYWthbGEvY29yZVwiKTtcclxudmFyIHJlZ2lzdGVyZWRDb250cm9scyA9IFtdO1xyXG5mdW5jdGlvbiBjb250cm9sKC4uLnRvSW5qZWN0KSB7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24gKGN0cmwpIHtcclxuICAgICAgICBpZiAocmVnaXN0ZXJlZENvbnRyb2xzLmxlbmd0aCA9PSAwKVxyXG4gICAgICAgICAgICBDb250cm9sLmluamVjdG9yLmluaXQoW10sIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHJlZ2lzdGVyZWRDb250cm9scy5mb3JFYWNoKGZ1bmN0aW9uIChjdHJsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZGkuaW5qZWN0TmV3V2l0aE5hbWUoY3RybFswXSwgY3RybFsxXSkoKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICByZWdpc3RlcmVkQ29udHJvbHMucHVzaChbdG9JbmplY3QsIGN0cmxdKTtcclxuICAgIH07XHJcbn1cclxuZXhwb3J0cy5jb250cm9sID0gY29udHJvbDtcclxuY2xhc3MgQ29udHJvbCB7XHJcbiAgICBjb25zdHJ1Y3RvcigkJG5hbWUsIHByaW9yaXR5ID0gNTAwKSB7XHJcbiAgICAgICAgdGhpcy4kJG5hbWUgPSAkJG5hbWU7XHJcbiAgICAgICAgdGhpcy5wcmlvcml0eSA9IHByaW9yaXR5O1xyXG4gICAgICAgIENvbnRyb2wuaW5qZWN0b3IucmVnaXN0ZXIoJCRuYW1lLCB0aGlzKTtcclxuICAgIH1cclxuICAgIHN0YXRpYyBhcHBseShjb250cm9scywgZWxlbWVudCwgc2NvcGUpIHtcclxuICAgICAgICB2YXIgYXBwbGljYWJsZUNvbnRyb2xzID0gW107XHJcbiAgICAgICAgdmFyIHJlcXVpcmVzTmV3U2NvcGUgPSBmYWxzZTtcclxuICAgICAgICBPYmplY3Qua2V5cyhjb250cm9scykuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XHJcbiAgICAgICAgICAgIHZhciBjb250cm9sO1xyXG4gICAgICAgICAgICBhcHBsaWNhYmxlQ29udHJvbHMucHVzaChjb250cm9sID0gQ29udHJvbC5pbmplY3Rvci5yZXNvbHZlKGtleSkpO1xyXG4gICAgICAgICAgICBpZiAoY29udHJvbC5zY29wZSlcclxuICAgICAgICAgICAgICAgIHJlcXVpcmVzTmV3U2NvcGUgPSB0cnVlO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGFwcGxpY2FibGVDb250cm9scy5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7IHJldHVybiBhLnByaW9yaXR5IC0gYi5wcmlvcml0eTsgfSk7XHJcbiAgICAgICAgaWYgKCFzY29wZSlcclxuICAgICAgICAgICAgc2NvcGUgPSBlbGVtZW50LmRhdGEoJyRzY29wZScpO1xyXG4gICAgICAgIGlmIChyZXF1aXJlc05ld1Njb3BlKSB7XHJcbiAgICAgICAgICAgIHNjb3BlID0gc2NvcGUuJG5ldygpO1xyXG4gICAgICAgICAgICBlbGVtZW50LmRhdGEoJyRzY29wZScsIHNjb3BlKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZm9yICh2YXIgY29udHJvbCBvZiBhcHBsaWNhYmxlQ29udHJvbHMpIHtcclxuICAgICAgICAgICAgdmFyIGNvbnRyb2xTZXR0aW5ncyA9IGNvbnRyb2xzW2NvbnRyb2wuJCRuYW1lXTtcclxuICAgICAgICAgICAgaWYgKGNvbnRyb2xTZXR0aW5ncyBpbnN0YW5jZW9mIEZ1bmN0aW9uKVxyXG4gICAgICAgICAgICAgICAgY29udHJvbFNldHRpbmdzID0gY29udHJvbFNldHRpbmdzKHNjb3BlLCB0cnVlKTtcclxuICAgICAgICAgICAgdmFyIG5ld0VsZW0gPSBjb250cm9sLmluc3RhbmNpYXRlKHNjb3BlLCBlbGVtZW50LCBjb250cm9sU2V0dGluZ3MsIGNvbnRyb2xzKTtcclxuICAgICAgICAgICAgaWYgKG5ld0VsZW0pIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBuZXdFbGVtO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIDtcclxuICAgICAgICBlbGVtZW50LmZpbmQoJ1tkYXRhLWJpbmRdJykuZWFjaChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIGlmICgkKHRoaXMpLnBhcmVudCgpLmNsb3Nlc3QoJ1tkYXRhLWJpbmRdJylbMF0gPT0gZWxlbWVudFswXSlcclxuICAgICAgICAgICAgICAgICQodGhpcykuYXBwbHlUZW1wbGF0ZShzY29wZSwgZWxlbWVudCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgcmV0dXJuIGVsZW1lbnQ7XHJcbiAgICB9XHJcbiAgICB3cmFwKGVsZW1lbnQsIHNjb3BlLCBuZXdDb250cm9scykge1xyXG4gICAgICAgIGlmIChuZXdDb250cm9scykge1xyXG4gICAgICAgICAgICB2YXIgY29udHJvbHMgPSBkaS5QYXJzZXIucGFyc2UoZWxlbWVudC5hdHRyKCdkYXRhLWJpbmQnKSwgdHJ1ZSk7XHJcbiAgICAgICAgICAgIHZhciBhcHBsaWNhYmxlQ29udHJvbHMgPSBbXTtcclxuICAgICAgICAgICAgT2JqZWN0LmtleXMoY29udHJvbHMpLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xyXG4gICAgICAgICAgICAgICAgYXBwbGljYWJsZUNvbnRyb2xzLnB1c2goQ29udHJvbC5pbmplY3Rvci5yZXNvbHZlKGtleSkpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgYXBwbGljYWJsZUNvbnRyb2xzLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHsgcmV0dXJuIGEucHJpb3JpdHkgLSBiLnByaW9yaXR5OyB9KTtcclxuICAgICAgICAgICAgYXBwbGljYWJsZUNvbnRyb2xzID0gYXBwbGljYWJsZUNvbnRyb2xzLnNsaWNlKGFwcGxpY2FibGVDb250cm9scy5pbmRleE9mKHRoaXMpICsgMSk7XHJcbiAgICAgICAgICAgIG5ld0NvbnRyb2xzID0ge307XHJcbiAgICAgICAgICAgIGFwcGxpY2FibGVDb250cm9scy5mb3JFYWNoKGZ1bmN0aW9uIChjb250cm9sKSB7XHJcbiAgICAgICAgICAgICAgICBuZXdDb250cm9sc1tjb250cm9sLiQkbmFtZV0gPSBjb250cm9sc1tjb250cm9sLiQkbmFtZV07XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gQ29udHJvbC5hcHBseShuZXdDb250cm9scywgZWxlbWVudCwgc2NvcGUpO1xyXG4gICAgfVxyXG4gICAgY2xvbmUoZWxlbWVudCwgc2NvcGUsIG5ld0NvbnRyb2xzKSB7XHJcbiAgICAgICAgdmFyIGNsb25lID0gZWxlbWVudC5jbG9uZSgpO1xyXG4gICAgICAgIGNsb25lLmRhdGEoJyRzY29wZScsIHNjb3BlKTtcclxuICAgICAgICB0aGlzLndyYXAoY2xvbmUsIHNjb3BlLCBuZXdDb250cm9scyk7XHJcbiAgICAgICAgcmV0dXJuIGNsb25lO1xyXG4gICAgfVxyXG59XHJcbkNvbnRyb2wuaW5qZWN0b3IgPSBkaS5tb2R1bGUoJ2NvbnRyb2xzJywgJ2FrYWxhLXNlcnZpY2VzJyk7XHJcbmV4cG9ydHMuQ29udHJvbCA9IENvbnRyb2w7XHJcbmNsYXNzIEJhc2VDb250cm9sIGV4dGVuZHMgQ29udHJvbCB7XHJcbiAgICBjb25zdHJ1Y3RvcihuYW1lLCBwcmlvcml0eSkge1xyXG4gICAgICAgIHN1cGVyKG5hbWUsIHByaW9yaXR5KTtcclxuICAgIH1cclxuICAgIGluc3RhbmNpYXRlKHNjb3BlLCBlbGVtZW50LCBwYXJhbWV0ZXIpIHtcclxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICAgICAgZGkuUHJvbWlzaWZ5KHNjb3BlKS50aGVuKGZ1bmN0aW9uIChzY29wZSkge1xyXG4gICAgICAgICAgICBkaS5Qcm9taXNpZnkocGFyYW1ldGVyKS50aGVuKGZ1bmN0aW9uIChwYXJhbWV0ZXIpIHtcclxuICAgICAgICAgICAgICAgIHNlbGYubGluayhzY29wZSwgZWxlbWVudCwgcGFyYW1ldGVyKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbn1cclxuZXhwb3J0cy5CYXNlQ29udHJvbCA9IEJhc2VDb250cm9sO1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1jb250cm9sLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xyXG5mdW5jdGlvbiBfX2V4cG9ydChtKSB7XHJcbiAgICBmb3IgKHZhciBwIGluIG0pIGlmICghZXhwb3J0cy5oYXNPd25Qcm9wZXJ0eShwKSkgZXhwb3J0c1twXSA9IG1bcF07XHJcbn1cclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5fX2V4cG9ydChyZXF1aXJlKFwiLi9jbGlja1wiKSk7XHJcbl9fZXhwb3J0KHJlcXVpcmUoXCIuL2NvbnRyb2xcIikpO1xyXG5fX2V4cG9ydChyZXF1aXJlKFwiLi9jc3NDbGFzc1wiKSk7XHJcbl9fZXhwb3J0KHJlcXVpcmUoXCIuL2ZvcmVhY2hcIikpO1xyXG5fX2V4cG9ydChyZXF1aXJlKFwiLi9ocmVmXCIpKTtcclxuX19leHBvcnQocmVxdWlyZShcIi4vanNvblwiKSk7XHJcbl9fZXhwb3J0KHJlcXVpcmUoXCIuL21hcmtkb3duXCIpKTtcclxuX19leHBvcnQocmVxdWlyZShcIi4vb3B0aW9uc1wiKSk7XHJcbl9fZXhwb3J0KHJlcXVpcmUoXCIuL3BhcnRcIikpO1xyXG5fX2V4cG9ydChyZXF1aXJlKFwiLi9zcGlubmVyXCIpKTtcclxuX19leHBvcnQocmVxdWlyZShcIi4vdGV4dFwiKSk7XHJcbl9fZXhwb3J0KHJlcXVpcmUoXCIuL3RpdGxlXCIpKTtcclxuX19leHBvcnQocmVxdWlyZShcIi4vdHJhbnNsYXRlXCIpKTtcclxuX19leHBvcnQocmVxdWlyZShcIi4vdmFsdWVcIikpO1xyXG5fX2V4cG9ydChyZXF1aXJlKFwiLi92aXNpYmlsaXR5XCIpKTtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9Y29udHJvbHMuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbnZhciBfX2RlY29yYXRlID0gKHRoaXMgJiYgdGhpcy5fX2RlY29yYXRlKSB8fCBmdW5jdGlvbiAoZGVjb3JhdG9ycywgdGFyZ2V0LCBrZXksIGRlc2MpIHtcclxuICAgIHZhciBjID0gYXJndW1lbnRzLmxlbmd0aCwgciA9IGMgPCAzID8gdGFyZ2V0IDogZGVzYyA9PT0gbnVsbCA/IGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRhcmdldCwga2V5KSA6IGRlc2MsIGQ7XHJcbiAgICBpZiAodHlwZW9mIFJlZmxlY3QgPT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIFJlZmxlY3QuZGVjb3JhdGUgPT09IFwiZnVuY3Rpb25cIikgciA9IFJlZmxlY3QuZGVjb3JhdGUoZGVjb3JhdG9ycywgdGFyZ2V0LCBrZXksIGRlc2MpO1xyXG4gICAgZWxzZSBmb3IgKHZhciBpID0gZGVjb3JhdG9ycy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkgaWYgKGQgPSBkZWNvcmF0b3JzW2ldKSByID0gKGMgPCAzID8gZChyKSA6IGMgPiAzID8gZCh0YXJnZXQsIGtleSwgcikgOiBkKHRhcmdldCwga2V5KSkgfHwgcjtcclxuICAgIHJldHVybiBjID4gMyAmJiByICYmIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGtleSwgciksIHI7XHJcbn07XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxuY29uc3QgY29udHJvbF8xID0gcmVxdWlyZShcIi4vY29udHJvbFwiKTtcclxuY29uc3QgY29yZV8xID0gcmVxdWlyZShcIkBha2FsYS9jb3JlXCIpO1xyXG5sZXQgQ3NzQ2xhc3MgPSBjbGFzcyBDc3NDbGFzcyBleHRlbmRzIGNvbnRyb2xfMS5CYXNlQ29udHJvbCB7XHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICBzdXBlcignY2xhc3MnLCA0MDApO1xyXG4gICAgfVxyXG4gICAgbGluayh0YXJnZXQsIGVsZW1lbnQsIHBhcmFtZXRlcikge1xyXG4gICAgICAgIGlmIChwYXJhbWV0ZXIgaW5zdGFuY2VvZiBBcnJheSkge1xyXG4gICAgICAgICAgICBwYXJhbWV0ZXIgPSBuZXcgY29yZV8xLk9ic2VydmFibGVBcnJheShwYXJhbWV0ZXIpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAocGFyYW1ldGVyIGluc3RhbmNlb2YgY29yZV8xLk9ic2VydmFibGVBcnJheSlcclxuICAgICAgICAgICAgcGFyYW1ldGVyLm9uKCdjb2xsZWN0aW9uQ2hhbmdlZCcsIGZ1bmN0aW9uIChhcmcpIHtcclxuICAgICAgICAgICAgICAgIGFyZy5uZXdJdGVtcy5mb3JFYWNoKGZ1bmN0aW9uIChpdGVtKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiAoaXRlbSkgPT0gJ3N0cmluZycpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuYWRkQ2xhc3MoaXRlbSk7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpdGVtIGluc3RhbmNlb2YgY29yZV8xLkJpbmRpbmcpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBvbGRWYWx1ZSA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtLm9uQ2hhbmdlZChmdW5jdGlvbiAoZXYpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAob2xkVmFsdWUpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQucmVtb3ZlQ2xhc3Mob2xkVmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuYWRkQ2xhc3MoZXYuZXZlbnRBcmdzLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbGRWYWx1ZSA9IGV2LmV2ZW50QXJncy52YWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIE9iamVjdC5rZXlzKGl0ZW0pLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpdGVtW2tleV0gaW5zdGFuY2VvZiBjb3JlXzEuQmluZGluZykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtW2tleV0ub25DaGFuZ2VkKGZ1bmN0aW9uIChldikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC50b2dnbGVDbGFzcyhrZXksIGV2LmV2ZW50QXJncy52YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQudG9nZ2xlQ2xhc3Moa2V5LCBpdGVtW2tleV0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0pLmluaXQoKTtcclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgT2JqZWN0LmtleXMocGFyYW1ldGVyKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcclxuICAgICAgICAgICAgICAgIGlmIChwYXJhbWV0ZXJba2V5XSBpbnN0YW5jZW9mIGNvcmVfMS5CaW5kaW5nKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcGFyYW1ldGVyW2tleV0ub25DaGFuZ2VkKGZ1bmN0aW9uIChldikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50LnRvZ2dsZUNsYXNzKGtleSwgZXYuZXZlbnRBcmdzLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgICAgICAgICBlbGVtZW50LnRvZ2dsZUNsYXNzKGtleSwgcGFyYW1ldGVyW2tleV0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn07XHJcbkNzc0NsYXNzID0gX19kZWNvcmF0ZShbXHJcbiAgICBjb250cm9sXzEuY29udHJvbCgpXHJcbl0sIENzc0NsYXNzKTtcclxuZXhwb3J0cy5Dc3NDbGFzcyA9IENzc0NsYXNzO1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1jc3NDbGFzcy5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcclxudmFyIF9fZGVjb3JhdGUgPSAodGhpcyAmJiB0aGlzLl9fZGVjb3JhdGUpIHx8IGZ1bmN0aW9uIChkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYykge1xyXG4gICAgdmFyIGMgPSBhcmd1bWVudHMubGVuZ3RoLCByID0gYyA8IDMgPyB0YXJnZXQgOiBkZXNjID09PSBudWxsID8gZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBrZXkpIDogZGVzYywgZDtcclxuICAgIGlmICh0eXBlb2YgUmVmbGVjdCA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgUmVmbGVjdC5kZWNvcmF0ZSA9PT0gXCJmdW5jdGlvblwiKSByID0gUmVmbGVjdC5kZWNvcmF0ZShkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYyk7XHJcbiAgICBlbHNlIGZvciAodmFyIGkgPSBkZWNvcmF0b3JzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSBpZiAoZCA9IGRlY29yYXRvcnNbaV0pIHIgPSAoYyA8IDMgPyBkKHIpIDogYyA+IDMgPyBkKHRhcmdldCwga2V5LCByKSA6IGQodGFyZ2V0LCBrZXkpKSB8fCByO1xyXG4gICAgcmV0dXJuIGMgPiAzICYmIHIgJiYgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwga2V5LCByKSwgcjtcclxufTtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5jb25zdCBkaSA9IHJlcXVpcmUoXCJAYWthbGEvY29yZVwiKTtcclxuY29uc3QgY29udHJvbF8xID0gcmVxdWlyZShcIi4vY29udHJvbFwiKTtcclxubGV0IEZvckVhY2ggPSBGb3JFYWNoXzEgPSBjbGFzcyBGb3JFYWNoIGV4dGVuZHMgY29udHJvbF8xLkNvbnRyb2wge1xyXG4gICAgY29uc3RydWN0b3IobmFtZSkge1xyXG4gICAgICAgIHN1cGVyKG5hbWUgfHwgJ2VhY2gnLCAxMDApO1xyXG4gICAgfVxyXG4gICAgaW5zdGFuY2lhdGUodGFyZ2V0LCBlbGVtZW50LCBwYXJhbWV0ZXIpIHtcclxuICAgICAgICBpZiAodHlwZW9mIChwYXJhbWV0ZXIpID09ICdzdHJpbmcnKVxyXG4gICAgICAgICAgICBwYXJhbWV0ZXIgPSB0aGlzLnBhcnNlKHBhcmFtZXRlcik7XHJcbiAgICAgICAgdmFyIHBhcnNlZFBhcmFtID0gcGFyYW1ldGVyO1xyXG4gICAgICAgIGlmIChwYXJhbWV0ZXIuaW4gaW5zdGFuY2VvZiBGdW5jdGlvbilcclxuICAgICAgICAgICAgdmFyIHNvdXJjZUJpbmRpbmcgPSBwYXJhbWV0ZXIuaW4odGFyZ2V0LCB0cnVlKTtcclxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICAgICAgdmFyIHBhcmVudCA9IGVsZW1lbnQucGFyZW50KCk7XHJcbiAgICAgICAgZWxlbWVudC5kZXRhY2goKTtcclxuICAgICAgICAvLyB2YXIgbmV3Q29udHJvbHM7XHJcbiAgICAgICAgZnVuY3Rpb24gYnVpbGQoc291cmNlKSB7XHJcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSAkKCk7XHJcbiAgICAgICAgICAgIGlmIChzb3VyY2UgaW5zdGFuY2VvZiBkaS5PYnNlcnZhYmxlQXJyYXkpIHtcclxuICAgICAgICAgICAgICAgIHNvdXJjZS5vbignY29sbGVjdGlvbkNoYW5nZWQnLCBmdW5jdGlvbiAoYXJncykge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBrZXkgPSAtMTtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgaXNBZGRlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaCAoYXJncy5hY3Rpb24pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAnaW5pdCc6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAnc2hpZnQnOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50LmVxKDApLnJlbW92ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ3BvcCc6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJlbnQuZXEoc291cmNlLmxlbmd0aCkucmVtb3ZlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAncHVzaCc6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgc2NvcGUgPSB0YXJnZXQuJG5ldygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBhcnNlZFBhcmFtLmtleSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY29wZVtwYXJzZWRQYXJhbS5rZXldID0gc291cmNlLmxlbmd0aCAtIDE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocGFyc2VkUGFyYW0udmFsdWUpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGVbcGFyc2VkUGFyYW0udmFsdWVdID0gYXJncy5uZXdJdGVtc1swXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudC5hcHBlbmQoc2VsZi5jbG9uZShlbGVtZW50LCBzY29wZSwgdHJ1ZSkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgJ3Vuc2hpZnQnOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdmFyIHNjb3BlID0gdGFyZ2V0LiRuZXcoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwYXJzZWRQYXJhbS5rZXkpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGVbcGFyc2VkUGFyYW0ua2V5XSA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocGFyc2VkUGFyYW0udmFsdWUpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGVbcGFyc2VkUGFyYW0udmFsdWVdID0gYXJncy5uZXdJdGVtc1swXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudC5wcmVwZW5kKHNlbGYuY2xvbmUoZWxlbWVudCwgc2NvcGUsIHRydWUpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdyZXBsYWNlJzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBzY29wZSA9IHRhcmdldC4kbmV3KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocGFyc2VkUGFyYW0ua2V5KVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlW3BhcnNlZFBhcmFtLmtleV0gPSBzb3VyY2UuaW5kZXhPZihhcmdzLm5ld0l0ZW1zWzBdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwYXJzZWRQYXJhbS52YWx1ZSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY29wZVtwYXJzZWRQYXJhbS52YWx1ZV0gPSBhcmdzLm5ld0l0ZW1zWzBdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50LmVxKHNvdXJjZS5pbmRleE9mKGFyZ3MubmV3SXRlbXNbMF0pKS5yZXBsYWNlV2l0aChzZWxmLmNsb25lKGVsZW1lbnQsIHNjb3BlLCB0cnVlKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIHNvdXJjZSA9IHNvdXJjZS5hcnJheTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAkLmVhY2goc291cmNlLCBmdW5jdGlvbiAoa2V5LCB2YWx1ZSkge1xyXG4gICAgICAgICAgICAgICAgdmFyIHNjb3BlID0gdGFyZ2V0LiRuZXcoKTtcclxuICAgICAgICAgICAgICAgIGlmIChwYXJzZWRQYXJhbS5rZXkpXHJcbiAgICAgICAgICAgICAgICAgICAgc2NvcGVbcGFyc2VkUGFyYW0ua2V5XSA9IGtleTtcclxuICAgICAgICAgICAgICAgIGlmIChwYXJzZWRQYXJhbS52YWx1ZSlcclxuICAgICAgICAgICAgICAgICAgICBzY29wZVtwYXJzZWRQYXJhbS52YWx1ZV0gPSB2YWx1ZTtcclxuICAgICAgICAgICAgICAgIHBhcmVudC5hcHBlbmQoc2VsZi5jbG9uZShlbGVtZW50LCBzY29wZSwgdHJ1ZSkpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgICAgICB9XHJcbiAgICAgICAgc291cmNlQmluZGluZy5vbkNoYW5nZWQoZnVuY3Rpb24gKGV2KSB7XHJcbiAgICAgICAgICAgIGRpLlByb21pc2lmeShldi5ldmVudEFyZ3MudmFsdWUpLnRoZW4oYnVpbGQpO1xyXG4gICAgICAgIH0sIHRydWUpO1xyXG4gICAgICAgIHJldHVybiBkaS5Qcm9taXNpZnkoc291cmNlQmluZGluZy5nZXRWYWx1ZSgpKS50aGVuKGJ1aWxkKTtcclxuICAgIH1cclxuICAgIHBhcnNlKGV4cCkge1xyXG4gICAgICAgIHZhciByZXN1bHQgPSBGb3JFYWNoXzEuZXhwUmVnZXguZXhlYyhleHApO1xyXG4gICAgICAgIHJldHVybiB7IGluOiBkaS5QYXJzZXIuZXZhbEFzRnVuY3Rpb24oZXhwLnN1YnN0cmluZyhyZXN1bHRbMF0ubGVuZ3RoKSksIGtleTogcmVzdWx0WzJdICYmIHJlc3VsdFsxXSwgdmFsdWU6IHJlc3VsdFsyXSB8fCByZXN1bHRbMV0gfTtcclxuICAgIH1cclxufTtcclxuRm9yRWFjaC5leHBSZWdleCA9IC9eXFxzKlxcKD8oXFx3KykoPzosXFxzKihcXHcrKSk/XFwpP1xccytpblxccysvO1xyXG5Gb3JFYWNoID0gRm9yRWFjaF8xID0gX19kZWNvcmF0ZShbXHJcbiAgICBjb250cm9sXzEuY29udHJvbCgpXHJcbl0sIEZvckVhY2gpO1xyXG5leHBvcnRzLkZvckVhY2ggPSBGb3JFYWNoO1xyXG52YXIgRm9yRWFjaF8xO1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1mb3JlYWNoLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xyXG52YXIgX19kZWNvcmF0ZSA9ICh0aGlzICYmIHRoaXMuX19kZWNvcmF0ZSkgfHwgZnVuY3Rpb24gKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKSB7XHJcbiAgICB2YXIgYyA9IGFyZ3VtZW50cy5sZW5ndGgsIHIgPSBjIDwgMyA/IHRhcmdldCA6IGRlc2MgPT09IG51bGwgPyBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIGtleSkgOiBkZXNjLCBkO1xyXG4gICAgaWYgKHR5cGVvZiBSZWZsZWN0ID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiBSZWZsZWN0LmRlY29yYXRlID09PSBcImZ1bmN0aW9uXCIpIHIgPSBSZWZsZWN0LmRlY29yYXRlKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKTtcclxuICAgIGVsc2UgZm9yICh2YXIgaSA9IGRlY29yYXRvcnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIGlmIChkID0gZGVjb3JhdG9yc1tpXSkgciA9IChjIDwgMyA/IGQocikgOiBjID4gMyA/IGQodGFyZ2V0LCBrZXksIHIpIDogZCh0YXJnZXQsIGtleSkpIHx8IHI7XHJcbiAgICByZXR1cm4gYyA+IDMgJiYgciAmJiBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBrZXksIHIpLCByO1xyXG59O1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbmNvbnN0IGNvbnRyb2xfMSA9IHJlcXVpcmUoXCIuL2NvbnRyb2xcIik7XHJcbmNvbnN0IHRleHRfMSA9IHJlcXVpcmUoXCIuL3RleHRcIik7XHJcbmxldCBIcmVmID0gY2xhc3MgSHJlZiBleHRlbmRzIHRleHRfMS5UZXh0IHtcclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHN1cGVyKCdocmVmJyk7XHJcbiAgICB9XHJcbiAgICBzZXRWYWx1ZShlbGVtZW50LCB2YWx1ZSkge1xyXG4gICAgICAgIGVsZW1lbnQuYXR0cignaHJlZicsIHZhbHVlKTtcclxuICAgIH1cclxufTtcclxuSHJlZiA9IF9fZGVjb3JhdGUoW1xyXG4gICAgY29udHJvbF8xLmNvbnRyb2woKVxyXG5dLCBIcmVmKTtcclxuZXhwb3J0cy5IcmVmID0gSHJlZjtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9aHJlZi5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcclxudmFyIF9fZGVjb3JhdGUgPSAodGhpcyAmJiB0aGlzLl9fZGVjb3JhdGUpIHx8IGZ1bmN0aW9uIChkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYykge1xyXG4gICAgdmFyIGMgPSBhcmd1bWVudHMubGVuZ3RoLCByID0gYyA8IDMgPyB0YXJnZXQgOiBkZXNjID09PSBudWxsID8gZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBrZXkpIDogZGVzYywgZDtcclxuICAgIGlmICh0eXBlb2YgUmVmbGVjdCA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgUmVmbGVjdC5kZWNvcmF0ZSA9PT0gXCJmdW5jdGlvblwiKSByID0gUmVmbGVjdC5kZWNvcmF0ZShkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYyk7XHJcbiAgICBlbHNlIGZvciAodmFyIGkgPSBkZWNvcmF0b3JzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSBpZiAoZCA9IGRlY29yYXRvcnNbaV0pIHIgPSAoYyA8IDMgPyBkKHIpIDogYyA+IDMgPyBkKHRhcmdldCwga2V5LCByKSA6IGQodGFyZ2V0LCBrZXkpKSB8fCByO1xyXG4gICAgcmV0dXJuIGMgPiAzICYmIHIgJiYgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwga2V5LCByKSwgcjtcclxufTtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5jb25zdCBjb250cm9sXzEgPSByZXF1aXJlKFwiLi9jb250cm9sXCIpO1xyXG5jb25zdCB0ZXh0XzEgPSByZXF1aXJlKFwiLi90ZXh0XCIpO1xyXG5sZXQgSnNvbiA9IGNsYXNzIEpzb24gZXh0ZW5kcyB0ZXh0XzEuVGV4dCB7XHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICBzdXBlcignanNvbicpO1xyXG4gICAgfVxyXG4gICAgc2V0VmFsdWUoZWxlbWVudCwgdmFsdWUpIHtcclxuICAgICAgICBlbGVtZW50LnRleHQoSlNPTi5zdHJpbmdpZnkodmFsdWUpKTtcclxuICAgIH1cclxufTtcclxuSnNvbiA9IF9fZGVjb3JhdGUoW1xyXG4gICAgY29udHJvbF8xLmNvbnRyb2woKVxyXG5dLCBKc29uKTtcclxuZXhwb3J0cy5Kc29uID0gSnNvbjtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9anNvbi5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcclxudmFyIF9fZGVjb3JhdGUgPSAodGhpcyAmJiB0aGlzLl9fZGVjb3JhdGUpIHx8IGZ1bmN0aW9uIChkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYykge1xyXG4gICAgdmFyIGMgPSBhcmd1bWVudHMubGVuZ3RoLCByID0gYyA8IDMgPyB0YXJnZXQgOiBkZXNjID09PSBudWxsID8gZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBrZXkpIDogZGVzYywgZDtcclxuICAgIGlmICh0eXBlb2YgUmVmbGVjdCA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgUmVmbGVjdC5kZWNvcmF0ZSA9PT0gXCJmdW5jdGlvblwiKSByID0gUmVmbGVjdC5kZWNvcmF0ZShkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYyk7XHJcbiAgICBlbHNlIGZvciAodmFyIGkgPSBkZWNvcmF0b3JzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSBpZiAoZCA9IGRlY29yYXRvcnNbaV0pIHIgPSAoYyA8IDMgPyBkKHIpIDogYyA+IDMgPyBkKHRhcmdldCwga2V5LCByKSA6IGQodGFyZ2V0LCBrZXkpKSB8fCByO1xyXG4gICAgcmV0dXJuIGMgPiAzICYmIHIgJiYgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwga2V5LCByKSwgcjtcclxufTtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5jb25zdCBjb250cm9sXzEgPSByZXF1aXJlKFwiLi9jb250cm9sXCIpO1xyXG5jb25zdCBjb3JlXzEgPSByZXF1aXJlKFwiQGFrYWxhL2NvcmVcIik7XHJcbmNvbnN0IHNob3dkb3duID0gcmVxdWlyZShcInNob3dkb3duXCIpO1xyXG5jb25zdCB0ZXh0XzEgPSByZXF1aXJlKFwiLi90ZXh0XCIpO1xyXG5sZXQgTWFya2Rvd24gPSBjbGFzcyBNYXJrZG93biBleHRlbmRzIHRleHRfMS5UZXh0IHtcclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHN1cGVyKCdtYXJrZG93bicpO1xyXG4gICAgICAgIHRoaXMubWFya2Rvd24gPSBuZXcgc2hvd2Rvd24uQ29udmVydGVyKCk7XHJcbiAgICB9XHJcbiAgICBsaW5rKHRhcmdldCwgZWxlbWVudCwgcGFyYW1ldGVyKSB7XHJcbiAgICAgICAgaWYgKHBhcmFtZXRlciBpbnN0YW5jZW9mIGNvcmVfMS5CaW5kaW5nKSB7XHJcbiAgICAgICAgICAgIHBhcmFtZXRlci5mb3JtYXR0ZXIgPSB0aGlzLm1hcmtkb3duLm1ha2VIdG1sLmJpbmQodGhpcy5tYXJrZG93bik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHN1cGVyLmxpbmsodGFyZ2V0LCBlbGVtZW50LCBwYXJhbWV0ZXIpO1xyXG4gICAgfVxyXG4gICAgc2V0VmFsdWUoZWxlbWVudCwgdmFsdWUpIHtcclxuICAgICAgICBlbGVtZW50Lmh0bWwodGhpcy5tYXJrZG93bi5tYWtlSHRtbCh2YWx1ZSkpO1xyXG4gICAgfVxyXG59O1xyXG5NYXJrZG93biA9IF9fZGVjb3JhdGUoW1xyXG4gICAgY29udHJvbF8xLmNvbnRyb2woKVxyXG5dLCBNYXJrZG93bik7XHJcbmV4cG9ydHMuTWFya2Rvd24gPSBNYXJrZG93bjtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9bWFya2Rvd24uanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbnZhciBfX2RlY29yYXRlID0gKHRoaXMgJiYgdGhpcy5fX2RlY29yYXRlKSB8fCBmdW5jdGlvbiAoZGVjb3JhdG9ycywgdGFyZ2V0LCBrZXksIGRlc2MpIHtcclxuICAgIHZhciBjID0gYXJndW1lbnRzLmxlbmd0aCwgciA9IGMgPCAzID8gdGFyZ2V0IDogZGVzYyA9PT0gbnVsbCA/IGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRhcmdldCwga2V5KSA6IGRlc2MsIGQ7XHJcbiAgICBpZiAodHlwZW9mIFJlZmxlY3QgPT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIFJlZmxlY3QuZGVjb3JhdGUgPT09IFwiZnVuY3Rpb25cIikgciA9IFJlZmxlY3QuZGVjb3JhdGUoZGVjb3JhdG9ycywgdGFyZ2V0LCBrZXksIGRlc2MpO1xyXG4gICAgZWxzZSBmb3IgKHZhciBpID0gZGVjb3JhdG9ycy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkgaWYgKGQgPSBkZWNvcmF0b3JzW2ldKSByID0gKGMgPCAzID8gZChyKSA6IGMgPiAzID8gZCh0YXJnZXQsIGtleSwgcikgOiBkKHRhcmdldCwga2V5KSkgfHwgcjtcclxuICAgIHJldHVybiBjID4gMyAmJiByICYmIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGtleSwgciksIHI7XHJcbn07XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxuY29uc3QgZGkgPSByZXF1aXJlKFwiQGFrYWxhL2NvcmVcIik7XHJcbmNvbnN0IGNvbnRyb2xfMSA9IHJlcXVpcmUoXCIuL2NvbnRyb2xcIik7XHJcbmxldCBPcHRpb25zID0gY2xhc3MgT3B0aW9ucyBleHRlbmRzIGNvbnRyb2xfMS5Db250cm9sIHtcclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHN1cGVyKCdvcHRpb25zJywgMzUwKTtcclxuICAgIH1cclxuICAgIGluc3RhbmNpYXRlKHRhcmdldCwgZWxlbWVudCwgcGFyYW1ldGVyLCBjb250cm9scykge1xyXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgICB2YXIgdmFsdWUgPSBjb250cm9scy52YWx1ZTtcclxuICAgICAgICBpZiAoY29udHJvbHMudmFsdWUgaW5zdGFuY2VvZiBGdW5jdGlvbilcclxuICAgICAgICAgICAgdmFsdWUgPSBjb250cm9scy52YWx1ZSh0YXJnZXQsIHRydWUpO1xyXG4gICAgICAgIGRlbGV0ZSBjb250cm9scy52YWx1ZTtcclxuICAgICAgICAvLyB2YXIgbmV3Q29udHJvbHM7XHJcbiAgICAgICAgZGkuUHJvbWlzaWZ5KHBhcmFtZXRlci5pbikudGhlbihmdW5jdGlvbiAoc291cmNlKSB7XHJcbiAgICAgICAgICAgIHZhciBhcnJheTtcclxuICAgICAgICAgICAgaWYgKHNvdXJjZSBpbnN0YW5jZW9mIGRpLkJpbmRpbmcpXHJcbiAgICAgICAgICAgICAgICBhcnJheSA9IHNvdXJjZSA9IHNvdXJjZS5nZXRWYWx1ZSgpO1xyXG4gICAgICAgICAgICBpZiAocGFyYW1ldGVyLnRleHQgaW5zdGFuY2VvZiBkaS5CaW5kaW5nKVxyXG4gICAgICAgICAgICAgICAgcGFyYW1ldGVyLnRleHQgPSBwYXJhbWV0ZXIudGV4dC5leHByZXNzaW9uO1xyXG4gICAgICAgICAgICBpZiAocGFyYW1ldGVyLnZhbHVlIGluc3RhbmNlb2YgZGkuQmluZGluZylcclxuICAgICAgICAgICAgICAgIHBhcmFtZXRlci52YWx1ZSA9IHBhcmFtZXRlci52YWx1ZS5leHByZXNzaW9uO1xyXG4gICAgICAgICAgICBpZiAocGFyYW1ldGVyLnRleHRbMF0gIT0gJyQnKVxyXG4gICAgICAgICAgICAgICAgcGFyYW1ldGVyLnRleHQgPSAnJGl0ZW0uJyArIHBhcmFtZXRlci50ZXh0O1xyXG4gICAgICAgICAgICBpZiAocGFyYW1ldGVyLnZhbHVlWzBdICE9ICckJylcclxuICAgICAgICAgICAgICAgIHBhcmFtZXRlci52YWx1ZSA9ICckaXRlbS4nICsgcGFyYW1ldGVyLnZhbHVlO1xyXG4gICAgICAgICAgICBpZiAoc291cmNlIGluc3RhbmNlb2YgZGkuT2JzZXJ2YWJsZUFycmF5KSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgb2Zmc2V0ID0gZWxlbWVudC5jaGlsZHJlbigpLmxlbmd0aDtcclxuICAgICAgICAgICAgICAgIHNvdXJjZS5vbignY29sbGVjdGlvbkNoYW5nZWQnLCBmdW5jdGlvbiAoYXJncykge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBrZXkgPSAtMTtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgaXNBZGRlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaCAoYXJncy5hY3Rpb24pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAnaW5pdCc6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAnc2hpZnQnOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5jaGlsZHJlbigpLmVxKG9mZnNldCkucmVtb3ZlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAncG9wJzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuY2hpbGRyZW4oKS5lcSh0aGlzLmxlbmd0aCkucmVtb3ZlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAncHVzaCc6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgc2NvcGUgPSB0YXJnZXQuJG5ldygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGVbJyRrZXknXSA9IHRoaXMubGVuZ3RoIC0gMTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlWyckdmFsdWUnXSA9IGFyZ3MubmV3SXRlbXNbMF07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50LmFwcGVuZChzZWxmLmNsb25lKCQoJzxvcHRpb24gZGF0YS1iaW5kPVwie3ZhbHVlOiAnICsgcGFyYW1ldGVyLnZhbHVlICsgJywgdGV4dDonICsgcGFyYW1ldGVyLnRleHQgKyAnfVwiIC8+JyksIHNjb3BlLCB0cnVlKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAndW5zaGlmdCc6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgc2NvcGUgPSB0YXJnZXQuJG5ldygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGVbJyRrZXknXSA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY29wZVsnJHZhbHVlJ10gPSBhcmdzLm5ld0l0ZW1zWzBdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC5wcmVwZW5kKHNlbGYuY2xvbmUoJCgnPG9wdGlvbiBkYXRhLWJpbmQ9XCJ7dmFsdWU6ICcgKyBwYXJhbWV0ZXIudmFsdWUgKyAnLCB0ZXh0OicgKyBwYXJhbWV0ZXIudGV4dCArICd9XCIgLz4nKSwgc2NvcGUsIHRydWUpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlICdyZXBsYWNlJzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZhciBzY29wZSA9IHRhcmdldC4kbmV3KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzY29wZVsnJGtleSddID0gdGhpcy5pbmRleE9mKGFyZ3MubmV3SXRlbXNbMF0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGVbJyR2YWx1ZSddID0gYXJncy5uZXdJdGVtc1swXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuZXEob2Zmc2V0ICsgdGhpcy5pbmRleE9mKGFyZ3MubmV3SXRlbXNbMF0pKS5yZXBsYWNlV2l0aChzZWxmLmNsb25lKCQoJzxvcHRpb24gZGF0YS1iaW5kPVwie3ZhbHVlOiAnICsgcGFyYW1ldGVyLnZhbHVlICsgJywgdGV4dDonICsgcGFyYW1ldGVyLnRleHQgKyAnfVwiIC8+JyksIHNjb3BlLCB0cnVlKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIGFycmF5ID0gc291cmNlLmFycmF5O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2YgKGFycmF5KSA9PSAndW5kZWZpbmVkJylcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignaW52YWxpZCBhcnJheSB0eXBlJyk7XHJcbiAgICAgICAgICAgICQuZWFjaChhcnJheSwgZnVuY3Rpb24gKGtleSwgdmFsdWUpIHtcclxuICAgICAgICAgICAgICAgIHZhciBzY29wZSA9IHRhcmdldC4kbmV3KCk7XHJcbiAgICAgICAgICAgICAgICBzY29wZVsnJGtleSddID0ga2V5O1xyXG4gICAgICAgICAgICAgICAgc2NvcGVbJyRpdGVtJ10gPSB2YWx1ZTtcclxuICAgICAgICAgICAgICAgIGVsZW1lbnQuYXBwZW5kKHNlbGYuY2xvbmUoJCgnPG9wdGlvbiBkYXRhLWJpbmQ9XCJ7dmFsdWU6ICcgKyBwYXJhbWV0ZXIudmFsdWUgKyAnLCB0ZXh0OicgKyBwYXJhbWV0ZXIudGV4dCArICd9XCIgLz4nKSwgc2NvcGUsIHRydWUpKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIGVsZW1lbnQuY2hhbmdlKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHZhciB2YWwgPSBlbGVtZW50LnZhbCgpO1xyXG4gICAgICAgICAgICAgICAgdmFyIG1vZGVsID0gJC5ncmVwKGFycmF5LCBmdW5jdGlvbiAoaXQsIGkpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdmFsID09IGRpLlBhcnNlci5ldmFsKHBhcmFtZXRlci52YWx1ZSwgeyAkaXRlbTogaXQsICRrZXk6IGkgfSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIGlmIChtb2RlbC5sZW5ndGggPT0gMClcclxuICAgICAgICAgICAgICAgICAgICB2YWx1ZS5zZXRWYWx1ZSh2YWwsIHZhbHVlKTtcclxuICAgICAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgICAgICAgICB2YWx1ZS5zZXRWYWx1ZShtb2RlbFswXSwgdmFsdWUpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgdmFsdWUub25DaGFuZ2VkKGZ1bmN0aW9uIChldikge1xyXG4gICAgICAgICAgICAgICAgaWYgKHZhbHVlICE9PSBldi5zb3VyY2UpXHJcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudC52YWwoZGkuUGFyc2VyLmV2YWwocGFyYW1ldGVyLnZhbHVlLCBldi5ldmVudEFyZ3MudmFsdWUpKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbn07XHJcbk9wdGlvbnMgPSBfX2RlY29yYXRlKFtcclxuICAgIGNvbnRyb2xfMS5jb250cm9sKClcclxuXSwgT3B0aW9ucyk7XHJcbmV4cG9ydHMuT3B0aW9ucyA9IE9wdGlvbnM7XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPW9wdGlvbnMuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbnZhciBfX2RlY29yYXRlID0gKHRoaXMgJiYgdGhpcy5fX2RlY29yYXRlKSB8fCBmdW5jdGlvbiAoZGVjb3JhdG9ycywgdGFyZ2V0LCBrZXksIGRlc2MpIHtcclxuICAgIHZhciBjID0gYXJndW1lbnRzLmxlbmd0aCwgciA9IGMgPCAzID8gdGFyZ2V0IDogZGVzYyA9PT0gbnVsbCA/IGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRhcmdldCwga2V5KSA6IGRlc2MsIGQ7XHJcbiAgICBpZiAodHlwZW9mIFJlZmxlY3QgPT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIFJlZmxlY3QuZGVjb3JhdGUgPT09IFwiZnVuY3Rpb25cIikgciA9IFJlZmxlY3QuZGVjb3JhdGUoZGVjb3JhdG9ycywgdGFyZ2V0LCBrZXksIGRlc2MpO1xyXG4gICAgZWxzZSBmb3IgKHZhciBpID0gZGVjb3JhdG9ycy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkgaWYgKGQgPSBkZWNvcmF0b3JzW2ldKSByID0gKGMgPCAzID8gZChyKSA6IGMgPiAzID8gZCh0YXJnZXQsIGtleSwgcikgOiBkKHRhcmdldCwga2V5KSkgfHwgcjtcclxuICAgIHJldHVybiBjID4gMyAmJiByICYmIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGtleSwgciksIHI7XHJcbn07XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxuY29uc3QgY29udHJvbF8xID0gcmVxdWlyZShcIi4vY29udHJvbFwiKTtcclxuY29uc3QgY29yZV8xID0gcmVxdWlyZShcIkBha2FsYS9jb3JlXCIpO1xyXG5sZXQgUGFydCA9IGNsYXNzIFBhcnQgZXh0ZW5kcyBjb250cm9sXzEuQmFzZUNvbnRyb2wge1xyXG4gICAgY29uc3RydWN0b3IocGFydFNlcnZpY2UpIHtcclxuICAgICAgICBzdXBlcigncGFydCcsIDEwMCk7XHJcbiAgICAgICAgdGhpcy5wYXJ0U2VydmljZSA9IHBhcnRTZXJ2aWNlO1xyXG4gICAgfVxyXG4gICAgbGluayh0YXJnZXQsIGVsZW1lbnQsIHBhcmFtZXRlcikge1xyXG4gICAgICAgIHZhciBwYXJ0U2VydmljZSA9IHRoaXMucGFydFNlcnZpY2U7XHJcbiAgICAgICAgaWYgKHR5cGVvZiBwYXJhbWV0ZXIgIT0gJ3N0cmluZycpIHtcclxuICAgICAgICAgICAgaWYgKHBhcmFtZXRlci50ZW1wbGF0ZSBpbnN0YW5jZW9mIGNvcmVfMS5CaW5kaW5nKVxyXG4gICAgICAgICAgICAgICAgcGFyYW1ldGVyLnRlbXBsYXRlLm9uQ2hhbmdlZChmdW5jdGlvbiAoZXYpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAocGFyYW1ldGVyLmNvbnRyb2xsZXIgaW5zdGFuY2VvZiBjb3JlXzEuQmluZGluZylcclxuICAgICAgICAgICAgICAgICAgICAgICAgcGFydFNlcnZpY2UuYXBwbHkoZnVuY3Rpb24gKCkgeyByZXR1cm4geyBzY29wZTogdGFyZ2V0LCBlbGVtZW50OiBlbGVtZW50IH07IH0sIHsgY29udHJvbGxlcjogcGFyYW1ldGVyLmNvbnRyb2xsZXIuZ2V0VmFsdWUoKSwgdGVtcGxhdGU6IGV2LmV2ZW50QXJncy52YWx1ZSB9LCB7fSwgJC5ub29wKTtcclxuICAgICAgICAgICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcnRTZXJ2aWNlLmFwcGx5KGZ1bmN0aW9uICgpIHsgcmV0dXJuIHsgc2NvcGU6IHRhcmdldCwgZWxlbWVudDogZWxlbWVudCB9OyB9LCB7IGNvbnRyb2xsZXI6IHBhcmFtZXRlci5jb250cm9sbGVyLCB0ZW1wbGF0ZTogZXYuZXZlbnRBcmdzLnZhbHVlIH0sIHt9LCAkLm5vb3ApO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKHBhcmFtZXRlci5jb250cm9sbGVyIGluc3RhbmNlb2YgY29yZV8xLkJpbmRpbmcpXHJcbiAgICAgICAgICAgICAgICBwYXJ0U2VydmljZS5hcHBseShmdW5jdGlvbiAoKSB7IHJldHVybiB7IHNjb3BlOiB0YXJnZXQsIGVsZW1lbnQ6IGVsZW1lbnQgfTsgfSwgeyBjb250cm9sbGVyOiBwYXJhbWV0ZXIuY29udHJvbGxlci5nZXRWYWx1ZSgpLCB0ZW1wbGF0ZTogcGFyYW1ldGVyLnRlbXBsYXRlIH0sIHt9LCAkLm5vb3ApO1xyXG4gICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICBwYXJ0U2VydmljZS5hcHBseShmdW5jdGlvbiAoKSB7IHJldHVybiB7IHNjb3BlOiB0YXJnZXQsIGVsZW1lbnQ6IGVsZW1lbnQgfTsgfSwgeyBjb250cm9sbGVyOiBwYXJhbWV0ZXIuY29udHJvbGxlciwgdGVtcGxhdGU6IHBhcmFtZXRlci50ZW1wbGF0ZSB9LCB7fSwgJC5ub29wKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICBwYXJ0U2VydmljZS5yZWdpc3RlcihwYXJhbWV0ZXIsIHsgc2NvcGU6IHRhcmdldCwgZWxlbWVudDogZWxlbWVudCB9KTtcclxuICAgIH1cclxufTtcclxuUGFydCA9IF9fZGVjb3JhdGUoW1xyXG4gICAgY29udHJvbF8xLmNvbnRyb2woXCIkcGFydFwiKVxyXG5dLCBQYXJ0KTtcclxuZXhwb3J0cy5QYXJ0ID0gUGFydDtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9cGFydC5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcclxudmFyIF9fZGVjb3JhdGUgPSAodGhpcyAmJiB0aGlzLl9fZGVjb3JhdGUpIHx8IGZ1bmN0aW9uIChkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYykge1xyXG4gICAgdmFyIGMgPSBhcmd1bWVudHMubGVuZ3RoLCByID0gYyA8IDMgPyB0YXJnZXQgOiBkZXNjID09PSBudWxsID8gZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBrZXkpIDogZGVzYywgZDtcclxuICAgIGlmICh0eXBlb2YgUmVmbGVjdCA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgUmVmbGVjdC5kZWNvcmF0ZSA9PT0gXCJmdW5jdGlvblwiKSByID0gUmVmbGVjdC5kZWNvcmF0ZShkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYyk7XHJcbiAgICBlbHNlIGZvciAodmFyIGkgPSBkZWNvcmF0b3JzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSBpZiAoZCA9IGRlY29yYXRvcnNbaV0pIHIgPSAoYyA8IDMgPyBkKHIpIDogYyA+IDMgPyBkKHRhcmdldCwga2V5LCByKSA6IGQodGFyZ2V0LCBrZXkpKSB8fCByO1xyXG4gICAgcmV0dXJuIGMgPiAzICYmIHIgJiYgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwga2V5LCByKSwgcjtcclxufTtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5jb25zdCBkaSA9IHJlcXVpcmUoXCJAYWthbGEvY29yZVwiKTtcclxuY29uc3QgY29udHJvbF8xID0gcmVxdWlyZShcIi4vY29udHJvbFwiKTtcclxuY29uc3QgY29yZV8xID0gcmVxdWlyZShcIkBha2FsYS9jb3JlXCIpO1xyXG5sZXQgU3Bpbm5lciA9IGNsYXNzIFNwaW5uZXIgZXh0ZW5kcyBjb250cm9sXzEuQ29udHJvbCB7XHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICBzdXBlcignc3Bpbm5lcicsIDUwKTtcclxuICAgIH1cclxuICAgIGluc3RhbmNpYXRlKHRhcmdldCwgZWxlbWVudCwgcGFyYW1ldGVyKSB7XHJcbiAgICAgICAgdmFyIHBhcmVudCA9IGVsZW1lbnQ7XHJcbiAgICAgICAgdmFyIHdyYXBwZWQgPSB0aGlzLndyYXAoZWxlbWVudCwgdGFyZ2V0LCB0cnVlKTtcclxuICAgICAgICB2YXIgc2V0dGluZ3MgPSB7fTtcclxuICAgICAgICBpZiAocGFyYW1ldGVyIGluc3RhbmNlb2YgY29yZV8xLkJpbmRpbmcpIHtcclxuICAgICAgICAgICAgcGFyYW1ldGVyID0gcGFyYW1ldGVyLmdldFZhbHVlKCk7XHJcbiAgICAgICAgICAgIGlmIChkaS5pc1Byb21pc2VMaWtlKHBhcmFtZXRlcikpXHJcbiAgICAgICAgICAgICAgICB3cmFwcGVkID0gcGFyYW1ldGVyO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAocGFyYW1ldGVyICYmIHBhcmFtZXRlci5wcm9taXNlIGluc3RhbmNlb2YgY29yZV8xLkJpbmRpbmcpIHtcclxuICAgICAgICAgICAgdmFyIHByb21pc2UgPSBwYXJhbWV0ZXIucHJvbWlzZS5nZXRWYWx1ZSgpO1xyXG4gICAgICAgICAgICBpZiAoZGkuaXNQcm9taXNlTGlrZShwcm9taXNlKSlcclxuICAgICAgICAgICAgICAgIHdyYXBwZWQgPSBwcm9taXNlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShwYXJhbWV0ZXIpKVxyXG4gICAgICAgICAgICBzZXR0aW5ncy5jbGFzc2VzID0gcGFyYW1ldGVyO1xyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgICAgc2V0dGluZ3MuY2xhc3NlcyA9IHBhcmFtZXRlciAmJiBwYXJhbWV0ZXIuY2xhc3NlcyB8fCAnZmEgZmEtc3BpbiBmYS0zeCBmYS1jaXJjbGUtby1ub3RjaCc7XHJcbiAgICAgICAgaWYgKHdyYXBwZWQgIT0gZWxlbWVudCAmJiBkaS5pc1Byb21pc2VMaWtlKHdyYXBwZWQpKSB7XHJcbiAgICAgICAgICAgIHZhciBzcGlubmVyO1xyXG4gICAgICAgICAgICBpZiAoZWxlbWVudFswXS50YWdOYW1lLnRvTG93ZXJDYXNlKCkgPT0gJ3RyJykge1xyXG4gICAgICAgICAgICAgICAgc3Bpbm5lciA9ICQoJzx0ciBjbGFzcz1cInNwaW5uZXJcIj48dGQgY29sc3Bhbj1cIjk5XCI+PC90ZD48L3RyPicpLmFwcGVuZFRvKGVsZW1lbnQucGFyZW50KCkpO1xyXG4gICAgICAgICAgICAgICAgcGFyZW50ID0gc3Bpbm5lci5maW5kKCd0ZCcpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChlbGVtZW50WzBdLnRhZ05hbWUudG9Mb3dlckNhc2UoKSA9PSAnbGknKSB7XHJcbiAgICAgICAgICAgICAgICBzcGlubmVyID0gJCgnPGxpIGNsYXNzPVwic3Bpbm5lclwiPjwvbGk+JykuYXBwZW5kVG8oZWxlbWVudC5wYXJlbnQoKSk7XHJcbiAgICAgICAgICAgICAgICBwYXJlbnQgPSBzcGlubmVyO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHNwaW5uZXIgPSAkKCc8c3BhbiBjbGFzcz1cInNwaW5uZXJcIj48L3NwYW4+Jyk7XHJcbiAgICAgICAgICAgIHNwaW5uZXIuYWRkQ2xhc3Moc2V0dGluZ3MuY2xhc3Nlcyk7XHJcbiAgICAgICAgICAgIHNwaW5uZXIuYXBwZW5kVG8ocGFyZW50KTtcclxuICAgICAgICAgICAgd3JhcHBlZC50aGVuKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHNwaW5uZXIucmVtb3ZlKCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gd3JhcHBlZDtcclxuICAgIH1cclxufTtcclxuU3Bpbm5lciA9IF9fZGVjb3JhdGUoW1xyXG4gICAgY29udHJvbF8xLmNvbnRyb2woKVxyXG5dLCBTcGlubmVyKTtcclxuZXhwb3J0cy5TcGlubmVyID0gU3Bpbm5lcjtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9c3Bpbm5lci5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcclxudmFyIF9fZGVjb3JhdGUgPSAodGhpcyAmJiB0aGlzLl9fZGVjb3JhdGUpIHx8IGZ1bmN0aW9uIChkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYykge1xyXG4gICAgdmFyIGMgPSBhcmd1bWVudHMubGVuZ3RoLCByID0gYyA8IDMgPyB0YXJnZXQgOiBkZXNjID09PSBudWxsID8gZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBrZXkpIDogZGVzYywgZDtcclxuICAgIGlmICh0eXBlb2YgUmVmbGVjdCA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgUmVmbGVjdC5kZWNvcmF0ZSA9PT0gXCJmdW5jdGlvblwiKSByID0gUmVmbGVjdC5kZWNvcmF0ZShkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYyk7XHJcbiAgICBlbHNlIGZvciAodmFyIGkgPSBkZWNvcmF0b3JzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSBpZiAoZCA9IGRlY29yYXRvcnNbaV0pIHIgPSAoYyA8IDMgPyBkKHIpIDogYyA+IDMgPyBkKHRhcmdldCwga2V5LCByKSA6IGQodGFyZ2V0LCBrZXkpKSB8fCByO1xyXG4gICAgcmV0dXJuIGMgPiAzICYmIHIgJiYgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwga2V5LCByKSwgcjtcclxufTtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5jb25zdCBkaSA9IHJlcXVpcmUoXCJAYWthbGEvY29yZVwiKTtcclxuY29uc3QgY29udHJvbF8xID0gcmVxdWlyZShcIi4vY29udHJvbFwiKTtcclxuY29uc3QgY29yZV8xID0gcmVxdWlyZShcIkBha2FsYS9jb3JlXCIpO1xyXG5sZXQgVGV4dCA9IGNsYXNzIFRleHQgZXh0ZW5kcyBjb250cm9sXzEuQmFzZUNvbnRyb2wge1xyXG4gICAgY29uc3RydWN0b3IobmFtZSkge1xyXG4gICAgICAgIHN1cGVyKG5hbWUgfHwgJ3RleHQnLCA0MDApO1xyXG4gICAgfVxyXG4gICAgbGluayh0YXJnZXQsIGVsZW1lbnQsIHBhcmFtZXRlcikge1xyXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgICBpZiAocGFyYW1ldGVyIGluc3RhbmNlb2YgY29yZV8xLkJpbmRpbmcpIHtcclxuICAgICAgICAgICAgcGFyYW1ldGVyLm9uQ2hhbmdlZChmdW5jdGlvbiAoZXYpIHtcclxuICAgICAgICAgICAgICAgIGlmIChkaS5pc1Byb21pc2VMaWtlKGV2LmV2ZW50QXJncy52YWx1ZSkpXHJcbiAgICAgICAgICAgICAgICAgICAgZXYuZXZlbnRBcmdzLnZhbHVlLnRoZW4oZnVuY3Rpb24gKHZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuc2V0VmFsdWUoZWxlbWVudCwgdmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgICAgIHNlbGYuc2V0VmFsdWUoZWxlbWVudCwgZXYuZXZlbnRBcmdzLnZhbHVlKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgICAgc2VsZi5zZXRWYWx1ZShlbGVtZW50LCBwYXJhbWV0ZXIpO1xyXG4gICAgfVxyXG4gICAgc2V0VmFsdWUoZWxlbWVudCwgdmFsdWUpIHtcclxuICAgICAgICBlbGVtZW50LnRleHQodmFsdWUpO1xyXG4gICAgfVxyXG59O1xyXG5UZXh0ID0gX19kZWNvcmF0ZShbXHJcbiAgICBjb250cm9sXzEuY29udHJvbCgpXHJcbl0sIFRleHQpO1xyXG5leHBvcnRzLlRleHQgPSBUZXh0O1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD10ZXh0LmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xyXG52YXIgX19kZWNvcmF0ZSA9ICh0aGlzICYmIHRoaXMuX19kZWNvcmF0ZSkgfHwgZnVuY3Rpb24gKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKSB7XHJcbiAgICB2YXIgYyA9IGFyZ3VtZW50cy5sZW5ndGgsIHIgPSBjIDwgMyA/IHRhcmdldCA6IGRlc2MgPT09IG51bGwgPyBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIGtleSkgOiBkZXNjLCBkO1xyXG4gICAgaWYgKHR5cGVvZiBSZWZsZWN0ID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiBSZWZsZWN0LmRlY29yYXRlID09PSBcImZ1bmN0aW9uXCIpIHIgPSBSZWZsZWN0LmRlY29yYXRlKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKTtcclxuICAgIGVsc2UgZm9yICh2YXIgaSA9IGRlY29yYXRvcnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIGlmIChkID0gZGVjb3JhdG9yc1tpXSkgciA9IChjIDwgMyA/IGQocikgOiBjID4gMyA/IGQodGFyZ2V0LCBrZXksIHIpIDogZCh0YXJnZXQsIGtleSkpIHx8IHI7XHJcbiAgICByZXR1cm4gYyA+IDMgJiYgciAmJiBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBrZXksIHIpLCByO1xyXG59O1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbmNvbnN0IGNvbnRyb2xfMSA9IHJlcXVpcmUoXCIuL2NvbnRyb2xcIik7XHJcbmNvbnN0IHRleHRfMSA9IHJlcXVpcmUoXCIuL3RleHRcIik7XHJcbmxldCBUaXRsZSA9IGNsYXNzIFRpdGxlIGV4dGVuZHMgdGV4dF8xLlRleHQge1xyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgc3VwZXIoJ3RpdGxlJyk7XHJcbiAgICB9XHJcbiAgICBzZXRWYWx1ZShlbGVtZW50LCB2YWx1ZSkge1xyXG4gICAgICAgIGVsZW1lbnQuYXR0cigndGl0bGUnLCB2YWx1ZSk7XHJcbiAgICB9XHJcbn07XHJcblRpdGxlID0gX19kZWNvcmF0ZShbXHJcbiAgICBjb250cm9sXzEuY29udHJvbCgpXHJcbl0sIFRpdGxlKTtcclxuZXhwb3J0cy5UaXRsZSA9IFRpdGxlO1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD10aXRsZS5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcclxudmFyIF9fZGVjb3JhdGUgPSAodGhpcyAmJiB0aGlzLl9fZGVjb3JhdGUpIHx8IGZ1bmN0aW9uIChkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYykge1xyXG4gICAgdmFyIGMgPSBhcmd1bWVudHMubGVuZ3RoLCByID0gYyA8IDMgPyB0YXJnZXQgOiBkZXNjID09PSBudWxsID8gZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBrZXkpIDogZGVzYywgZDtcclxuICAgIGlmICh0eXBlb2YgUmVmbGVjdCA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgUmVmbGVjdC5kZWNvcmF0ZSA9PT0gXCJmdW5jdGlvblwiKSByID0gUmVmbGVjdC5kZWNvcmF0ZShkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYyk7XHJcbiAgICBlbHNlIGZvciAodmFyIGkgPSBkZWNvcmF0b3JzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSBpZiAoZCA9IGRlY29yYXRvcnNbaV0pIHIgPSAoYyA8IDMgPyBkKHIpIDogYyA+IDMgPyBkKHRhcmdldCwga2V5LCByKSA6IGQodGFyZ2V0LCBrZXkpKSB8fCByO1xyXG4gICAgcmV0dXJuIGMgPiAzICYmIHIgJiYgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwga2V5LCByKSwgcjtcclxufTtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5jb25zdCBkaSA9IHJlcXVpcmUoXCJAYWthbGEvY29yZVwiKTtcclxuY29uc3QgY29udHJvbF8xID0gcmVxdWlyZShcIi4vY29udHJvbFwiKTtcclxuY29uc3QgdGV4dF8xID0gcmVxdWlyZShcIi4vdGV4dFwiKTtcclxuZGkucmVnaXN0ZXJGYWN0b3J5KCckdHJhbnNsYXRvcicsIGRpLmluamVjdFdpdGhOYW1lKFsnJHRyYW5zbGF0aW9ucyddLCBmdW5jdGlvbiAodHJhbnNsYXRpb25zKSB7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24gKGtleSwgLi4ucGFyYW1ldGVycykge1xyXG4gICAgICAgIGlmICghcGFyYW1ldGVycylcclxuICAgICAgICAgICAgcmV0dXJuIHRyYW5zbGF0aW9ucyAmJiB0cmFuc2xhdGlvbnNba2V5XSB8fCBrZXk7XHJcbiAgICAgICAgcmV0dXJuICh0cmFuc2xhdGlvbnMgJiYgdHJhbnNsYXRpb25zW2tleV0gfHwga2V5KS5yZXBsYWNlKC9cXHtcXGQrXFx9L2csIGZ1bmN0aW9uIChtKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBwYXJhbWV0ZXJzW21dO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfTtcclxufSkpO1xyXG5sZXQgVHJhbnNsYXRlID0gY2xhc3MgVHJhbnNsYXRlIGV4dGVuZHMgdGV4dF8xLlRleHQge1xyXG4gICAgY29uc3RydWN0b3IodHJhbnNsYXRvcikge1xyXG4gICAgICAgIHN1cGVyKCd0cmFuc2xhdGUnKTtcclxuICAgICAgICB0aGlzLnRyYW5zbGF0b3IgPSB0cmFuc2xhdG9yO1xyXG4gICAgfVxyXG4gICAgc2V0VmFsdWUoZWxlbWVudCwgdmFsdWUpIHtcclxuICAgICAgICBlbGVtZW50LnRleHQodGhpcy50cmFuc2xhdG9yKHZhbHVlKSk7XHJcbiAgICB9XHJcbn07XHJcblRyYW5zbGF0ZSA9IF9fZGVjb3JhdGUoW1xyXG4gICAgY29udHJvbF8xLmNvbnRyb2woJyR0cmFuc2xhdG9yJylcclxuXSwgVHJhbnNsYXRlKTtcclxuZXhwb3J0cy5UcmFuc2xhdGUgPSBUcmFuc2xhdGU7XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXRyYW5zbGF0ZS5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcclxudmFyIF9fZGVjb3JhdGUgPSAodGhpcyAmJiB0aGlzLl9fZGVjb3JhdGUpIHx8IGZ1bmN0aW9uIChkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYykge1xyXG4gICAgdmFyIGMgPSBhcmd1bWVudHMubGVuZ3RoLCByID0gYyA8IDMgPyB0YXJnZXQgOiBkZXNjID09PSBudWxsID8gZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBrZXkpIDogZGVzYywgZDtcclxuICAgIGlmICh0eXBlb2YgUmVmbGVjdCA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgUmVmbGVjdC5kZWNvcmF0ZSA9PT0gXCJmdW5jdGlvblwiKSByID0gUmVmbGVjdC5kZWNvcmF0ZShkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYyk7XHJcbiAgICBlbHNlIGZvciAodmFyIGkgPSBkZWNvcmF0b3JzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSBpZiAoZCA9IGRlY29yYXRvcnNbaV0pIHIgPSAoYyA8IDMgPyBkKHIpIDogYyA+IDMgPyBkKHRhcmdldCwga2V5LCByKSA6IGQodGFyZ2V0LCBrZXkpKSB8fCByO1xyXG4gICAgcmV0dXJuIGMgPiAzICYmIHIgJiYgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwga2V5LCByKSwgcjtcclxufTtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5jb25zdCBkaSA9IHJlcXVpcmUoXCJAYWthbGEvY29yZVwiKTtcclxuY29uc3QgY29udHJvbF8xID0gcmVxdWlyZShcIi4vY29udHJvbFwiKTtcclxubGV0IFZhbHVlID0gY2xhc3MgVmFsdWUgZXh0ZW5kcyBjb250cm9sXzEuQmFzZUNvbnRyb2wge1xyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgc3VwZXIoJ3ZhbHVlJywgNDAwKTtcclxuICAgIH1cclxuICAgIGxpbmsodGFyZ2V0LCBlbGVtZW50LCBwYXJhbWV0ZXIpIHtcclxuICAgICAgICBpZiAodHlwZW9mIChwYXJhbWV0ZXIpID09ICd1bmRlZmluZWQnKVxyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgaWYgKHBhcmFtZXRlciBpbnN0YW5jZW9mIGRpLkJpbmRpbmcpIHtcclxuICAgICAgICAgICAgZWxlbWVudC5jaGFuZ2UoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcGFyYW1ldGVyLnNldFZhbHVlKGVsZW1lbnQudmFsKCksIHBhcmFtZXRlcik7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBwYXJhbWV0ZXIub25DaGFuZ2VkKGZ1bmN0aW9uIChldikge1xyXG4gICAgICAgICAgICAgICAgaWYgKHBhcmFtZXRlciAhPT0gZXYuc291cmNlKVxyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQudmFsKGV2LmV2ZW50QXJncy52YWx1ZSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgIGVsZW1lbnQudmFsKHBhcmFtZXRlcik7XHJcbiAgICB9XHJcbn07XHJcblZhbHVlID0gX19kZWNvcmF0ZShbXHJcbiAgICBjb250cm9sXzEuY29udHJvbCgpXHJcbl0sIFZhbHVlKTtcclxuZXhwb3J0cy5WYWx1ZSA9IFZhbHVlO1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD12YWx1ZS5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcclxudmFyIF9fZGVjb3JhdGUgPSAodGhpcyAmJiB0aGlzLl9fZGVjb3JhdGUpIHx8IGZ1bmN0aW9uIChkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYykge1xyXG4gICAgdmFyIGMgPSBhcmd1bWVudHMubGVuZ3RoLCByID0gYyA8IDMgPyB0YXJnZXQgOiBkZXNjID09PSBudWxsID8gZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBrZXkpIDogZGVzYywgZDtcclxuICAgIGlmICh0eXBlb2YgUmVmbGVjdCA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgUmVmbGVjdC5kZWNvcmF0ZSA9PT0gXCJmdW5jdGlvblwiKSByID0gUmVmbGVjdC5kZWNvcmF0ZShkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYyk7XHJcbiAgICBlbHNlIGZvciAodmFyIGkgPSBkZWNvcmF0b3JzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSBpZiAoZCA9IGRlY29yYXRvcnNbaV0pIHIgPSAoYyA8IDMgPyBkKHIpIDogYyA+IDMgPyBkKHRhcmdldCwga2V5LCByKSA6IGQodGFyZ2V0LCBrZXkpKSB8fCByO1xyXG4gICAgcmV0dXJuIGMgPiAzICYmIHIgJiYgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwga2V5LCByKSwgcjtcclxufTtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5jb25zdCBjb250cm9sXzEgPSByZXF1aXJlKFwiLi9jb250cm9sXCIpO1xyXG5sZXQgSGlkZSA9IGNsYXNzIEhpZGUgZXh0ZW5kcyBjb250cm9sXzEuQmFzZUNvbnRyb2wge1xyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgc3VwZXIoJ2hpZGUnLCA0MDApO1xyXG4gICAgfVxyXG4gICAgbGluayh0YXJnZXQsIGVsZW1lbnQsIHBhcmFtZXRlcikge1xyXG4gICAgICAgIHBhcmFtZXRlci5vbkNoYW5nZWQoZnVuY3Rpb24gKGV2KSB7XHJcbiAgICAgICAgICAgIGVsZW1lbnQudG9nZ2xlKCFldi5ldmVudEFyZ3MudmFsdWUpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG59O1xyXG5IaWRlID0gX19kZWNvcmF0ZShbXHJcbiAgICBjb250cm9sXzEuY29udHJvbCgpXHJcbl0sIEhpZGUpO1xyXG5leHBvcnRzLkhpZGUgPSBIaWRlO1xyXG5sZXQgU2hvdyA9IGNsYXNzIFNob3cgZXh0ZW5kcyBjb250cm9sXzEuQmFzZUNvbnRyb2wge1xyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgc3VwZXIoJ3Nob3cnLCA0MDApO1xyXG4gICAgfVxyXG4gICAgbGluayh0YXJnZXQsIGVsZW1lbnQsIHBhcmFtZXRlcikge1xyXG4gICAgICAgIHBhcmFtZXRlci5vbkNoYW5nZWQoZnVuY3Rpb24gKGV2KSB7XHJcbiAgICAgICAgICAgIGVsZW1lbnQudG9nZ2xlKGV2LmV2ZW50QXJncy52YWx1ZSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbn07XHJcblNob3cgPSBfX2RlY29yYXRlKFtcclxuICAgIGNvbnRyb2xfMS5jb250cm9sKClcclxuXSwgU2hvdyk7XHJcbmV4cG9ydHMuU2hvdyA9IFNob3c7XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXZpc2liaWxpdHkuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxuY29uc3QgdXJsXzEgPSByZXF1aXJlKFwidXJsXCIpO1xyXG5jb25zdCBkaSA9IHJlcXVpcmUoXCJAYWthbGEvY29yZVwiKTtcclxuLy8gQHNlcnZpY2UoJyRodHRwJylcclxuY2xhc3MgSHR0cCB7XHJcbiAgICBjb25zdHJ1Y3RvcigpIHsgfVxyXG4gICAgZ2V0KHVybCwgcGFyYW1zKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuY2FsbCgnR0VUJywgdXJsLCBwYXJhbXMpO1xyXG4gICAgfVxyXG4gICAgZ2V0SlNPTih1cmwsIHBhcmFtcykge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmdldCh1cmwsIHBhcmFtcykudGhlbihmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICByZXR1cm4gSlNPTi5wYXJzZShkYXRhKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGNhbGwobWV0aG9kLCB1cmwsIHBhcmFtcykge1xyXG4gICAgICAgIHZhciB1cmkgPSB1cmxfMS5wYXJzZSh1cmwpO1xyXG4gICAgICAgIHVyaS5xdWVyeSA9ICQuZXh0ZW5kKHt9LCB1cmkucXVlcnksIHBhcmFtcyk7XHJcbiAgICAgICAgdmFyIHJlcSA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xyXG4gICAgICAgIHJlcS5vcGVuKG1ldGhvZCwgdXJsXzEuZm9ybWF0KHVyaSksIHRydWUpO1xyXG4gICAgICAgIHZhciBkZWZlcnJlZCA9IG5ldyBkaS5EZWZlcnJlZCgpO1xyXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgICByZXEub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24gKGFFdnQpIHtcclxuICAgICAgICAgICAgaWYgKHJlcS5yZWFkeVN0YXRlID09IDQpIHtcclxuICAgICAgICAgICAgICAgIGlmIChyZXEuc3RhdHVzID09IDMwMSlcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2VsZi5jYWxsKG1ldGhvZCwgcmVxLmdldFJlc3BvbnNlSGVhZGVyKCdsb2NhdGlvbicpKS50aGVuKGZ1bmN0aW9uIChkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUoZGF0YSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSwgZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0KGRhdGEpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgaWYgKHJlcS5zdGF0dXMgPT0gMjAwKVxyXG4gICAgICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUocmVxLnJlc3BvbnNlVGV4dCk7XHJcbiAgICAgICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgZGVmZXJyZWQucmVqZWN0KHJlcS5yZXNwb25zZVRleHQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgICAgICByZXEuc2VuZChudWxsKTtcclxuICAgICAgICByZXR1cm4gZGVmZXJyZWQ7XHJcbiAgICB9XHJcbn1cclxuZXhwb3J0cy5IdHRwID0gSHR0cDtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9aHR0cC5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5jb25zdCBldmVudHNfMSA9IHJlcXVpcmUoXCJldmVudHNcIik7XHJcbmNvbnN0IGNvcmVfMSA9IHJlcXVpcmUoXCJAYWthbGEvY29yZVwiKTtcclxuLyoqXHJcbiAqIFByZXZpb3VzIGNvbnRleHQsIGZvciBjYXB0dXJpbmdcclxuICogcGFnZSBleGl0IGV2ZW50cy5cclxuICovXHJcbnZhciBwcmV2Q29udGV4dDtcclxuLyoqXHJcbiAqIFBlcmZvcm0gaW5pdGlhbCBkaXNwYXRjaC5cclxuICovXHJcbnZhciBkaXNwYXRjaCA9IHRydWU7XHJcbi8qKlxyXG4gKiBEZWNvZGUgVVJMIGNvbXBvbmVudHMgKHF1ZXJ5IHN0cmluZywgcGF0aG5hbWUsIGhhc2gpLlxyXG4gKiBBY2NvbW1vZGF0ZXMgYm90aCByZWd1bGFyIHBlcmNlbnQgZW5jb2RpbmcgYW5kIHgtd3d3LWZvcm0tdXJsZW5jb2RlZCBmb3JtYXQuXHJcbiAqL1xyXG52YXIgZGVjb2RlVVJMQ29tcG9uZW50cyA9IHRydWU7XHJcbi8qKlxyXG4gKiBCYXNlIHBhdGguXHJcbiAqL1xyXG52YXIgYmFzZSA9ICcnO1xyXG4vKipcclxuICogUnVubmluZyBmbGFnLlxyXG4gKi9cclxudmFyIHJ1bm5pbmc7XHJcbi8qKlxyXG4gKiBIYXNoQmFuZyBvcHRpb25cclxuICovXHJcbnZhciBoYXNoYmFuZyA9IGZhbHNlO1xyXG4vKipcclxuICogRGV0ZWN0IGNsaWNrIGV2ZW50XHJcbiAqL1xyXG52YXIgY2xpY2tFdmVudCA9ICgndW5kZWZpbmVkJyAhPT0gdHlwZW9mIGRvY3VtZW50KSAmJiBkb2N1bWVudC5vbnRvdWNoc3RhcnQgPyAndG91Y2hzdGFydCcgOiAnY2xpY2snO1xyXG5jbGFzcyBMb2NhdGlvblNlcnZpY2UgZXh0ZW5kcyBldmVudHNfMS5FdmVudEVtaXR0ZXIge1xyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgc3VwZXIoKTtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBDdXJyZW50IHBhdGggYmVpbmcgcHJvY2Vzc2VkXHJcbiAgICAgICAgICogQHR5cGUge3N0cmluZ31cclxuICAgICAgICAgKi9cclxuICAgICAgICB0aGlzLmN1cnJlbnQgPSAnJztcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBOdW1iZXIgb2YgcGFnZXMgbmF2aWdhdGVkIHRvLlxyXG4gICAgICAgICAqIEB0eXBlIHtudW1iZXJ9XHJcbiAgICAgICAgICpcclxuICAgICAgICAgKiAgICAgcGFnZS5sZW4gPT0gMDtcclxuICAgICAgICAgKiAgICAgcGFnZSgnL2xvZ2luJyk7XHJcbiAgICAgICAgICogICAgIHBhZ2UubGVuID09IDE7XHJcbiAgICAgICAgICovXHJcbiAgICAgICAgdGhpcy5sZW4gPSAwO1xyXG4gICAgfVxyXG4gICAgc3RhcnQob3B0aW9ucykge1xyXG4gICAgICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xyXG4gICAgICAgIGlmIChydW5uaW5nKVxyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgcnVubmluZyA9IHRydWU7XHJcbiAgICAgICAgaWYgKGZhbHNlID09PSBvcHRpb25zLmRpc3BhdGNoKVxyXG4gICAgICAgICAgICBkaXNwYXRjaCA9IGZhbHNlO1xyXG4gICAgICAgIGlmIChmYWxzZSA9PT0gb3B0aW9ucy5kZWNvZGVVUkxDb21wb25lbnRzKVxyXG4gICAgICAgICAgICBkZWNvZGVVUkxDb21wb25lbnRzID0gZmFsc2U7XHJcbiAgICAgICAgaWYgKGZhbHNlICE9PSBvcHRpb25zLnBvcHN0YXRlKVxyXG4gICAgICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncG9wc3RhdGUnLCBvbnBvcHN0YXRlLCBmYWxzZSk7XHJcbiAgICAgICAgaWYgKGZhbHNlICE9PSBvcHRpb25zLmNsaWNrKSB7XHJcbiAgICAgICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoY2xpY2tFdmVudCwgb25jbGljaywgZmFsc2UpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAodHJ1ZSA9PT0gb3B0aW9ucy5oYXNoYmFuZylcclxuICAgICAgICAgICAgaGFzaGJhbmcgPSB0cnVlO1xyXG4gICAgICAgIGlmICghZGlzcGF0Y2gpXHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB2YXIgdXJsID0gKGhhc2hiYW5nICYmIH5sb2NhdGlvbi5oYXNoLmluZGV4T2YoJyMvJykpID8gbG9jYXRpb24uaGFzaC5zdWJzdHIoMikgKyBsb2NhdGlvbi5zZWFyY2ggOiBsb2NhdGlvbi5wYXRobmFtZSArIGxvY2F0aW9uLnNlYXJjaCArIGxvY2F0aW9uLmhhc2g7XHJcbiAgICAgICAgdGhpcy5yZXBsYWNlKHVybCwgbnVsbCwgdHJ1ZSwgZGlzcGF0Y2gpO1xyXG4gICAgICAgIG5ldyBjb3JlXzEuV2F0Y2hCaW5kaW5nKCdocmVmJywgbG9jYXRpb24sIDEwMCkub25DaGFuZ2VkKHRoaXMuc2hvdy5iaW5kKHRoaXMpKTtcclxuICAgIH1cclxuICAgIDtcclxuICAgIC8qKlxyXG4gKiBSZXBsYWNlIGBwYXRoYCB3aXRoIG9wdGlvbmFsIGBzdGF0ZWAgb2JqZWN0LlxyXG4gKlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gcGF0aFxyXG4gKiBAcGFyYW0ge09iamVjdD19IHN0YXRlXHJcbiAqIEBwYXJhbSB7Ym9vbGVhbj19IGluaXRcclxuICogQHBhcmFtIHtib29sZWFuPX0gZGlzcGF0Y2hcclxuICogQHJldHVybiB7IUNvbnRleHR9XHJcbiAqIEBhcGkgcHVibGljXHJcbiAqL1xyXG4gICAgc2V0KHBhdGgpIHtcclxuICAgICAgICBpZiAoaGFzaGJhbmcgJiYgcGF0aFswXSAhPSAnIycpXHJcbiAgICAgICAgICAgIGxvY2F0aW9uLmFzc2lnbignIycgKyBwYXRoKTtcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgIGxvY2F0aW9uLmFzc2lnbihwYXRoKTtcclxuICAgIH1cclxuICAgIHJlcGxhY2UocGF0aCwgc3RhdGUsIGluaXQsIGRpc3BhdGNoKSB7XHJcbiAgICAgICAgLy8gdmFyIGN0eCA9IG5ldyBDb250ZXh0KHBhdGgsIHN0YXRlKTtcclxuICAgICAgICB0aGlzLmN1cnJlbnQgPSBwYXRoO1xyXG4gICAgICAgIC8vIGN0eC5pbml0ID0gaW5pdDtcclxuICAgICAgICAvLyBjdHguc2F2ZSgpOyAvLyBzYXZlIGJlZm9yZSBkaXNwYXRjaGluZywgd2hpY2ggbWF5IHJlZGlyZWN0XHJcbiAgICAgICAgaWYgKGZhbHNlICE9PSBkaXNwYXRjaClcclxuICAgICAgICAgICAgdGhpcy5kaXNwYXRjaChwYXRoKTtcclxuICAgICAgICByZXR1cm4gcGF0aDtcclxuICAgIH1cclxuICAgIDtcclxuICAgIC8qKlxyXG4gICAgICogVW5iaW5kIGNsaWNrIGFuZCBwb3BzdGF0ZSBldmVudCBoYW5kbGVycy5cclxuICAgICAqXHJcbiAgICAgKiBAYXBpIHB1YmxpY1xyXG4gICAgICovXHJcbiAgICBzdG9wKCkge1xyXG4gICAgICAgIGlmICghcnVubmluZylcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIHRoaXMuY3VycmVudCA9ICcnO1xyXG4gICAgICAgIHRoaXMubGVuID0gMDtcclxuICAgICAgICBydW5uaW5nID0gZmFsc2U7XHJcbiAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihjbGlja0V2ZW50LCBvbmNsaWNrLCBmYWxzZSk7XHJcbiAgICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3BvcHN0YXRlJywgb25wb3BzdGF0ZSwgZmFsc2UpO1xyXG4gICAgfVxyXG4gICAgO1xyXG4gICAgLyoqXHJcbiAgICAgKiBTaG93IGBwYXRoYCB3aXRoIG9wdGlvbmFsIGBzdGF0ZWAgb2JqZWN0LlxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoXHJcbiAgICAgKiBAcGFyYW0ge09iamVjdD19IHN0YXRlXHJcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW49fSBkaXNwYXRjaFxyXG4gICAgICogQHBhcmFtIHtib29sZWFuPX0gcHVzaFxyXG4gICAgICogQHJldHVybiB7IUNvbnRleHR9XHJcbiAgICAgKiBAYXBpIHB1YmxpY1xyXG4gICAgICovXHJcbiAgICBzaG93KHBhdGgsIHN0YXRlLCBkaXNwYXRjaCkge1xyXG4gICAgICAgIHRoaXMuY3VycmVudCA9IHBhdGg7XHJcbiAgICAgICAgaWYgKCFkaXNwYXRjaClcclxuICAgICAgICAgICAgdGhpcy5kaXNwYXRjaChwYXRoKTtcclxuICAgICAgICAvLyBpZiAoZmFsc2UgIT09IGN0eC5oYW5kbGVkICYmIGZhbHNlICE9PSBwdXNoKSBjdHgucHVzaFN0YXRlKCk7XHJcbiAgICAgICAgcmV0dXJuIHN0YXRlO1xyXG4gICAgfVxyXG4gICAgO1xyXG4gICAgLyoqXHJcbiAgICAgKiBHb2VzIGJhY2sgaW4gdGhlIGhpc3RvcnlcclxuICAgICAqIEJhY2sgc2hvdWxkIGFsd2F5cyBsZXQgdGhlIGN1cnJlbnQgcm91dGUgcHVzaCBzdGF0ZSBhbmQgdGhlbiBnbyBiYWNrLlxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoIC0gZmFsbGJhY2sgcGF0aCB0byBnbyBiYWNrIGlmIG5vIG1vcmUgaGlzdG9yeSBleGlzdHMsIGlmIHVuZGVmaW5lZCBkZWZhdWx0cyB0byBwYWdlLmJhc2VcclxuICAgICAqIEBwYXJhbSB7T2JqZWN0PX0gc3RhdGVcclxuICAgICAqIEBhcGkgcHVibGljXHJcbiAgICAgKi9cclxuICAgIGJhY2socGF0aCwgc3RhdGUpIHtcclxuICAgICAgICBpZiAodGhpcy5sZW4gPiAwKSB7XHJcbiAgICAgICAgICAgIC8vIHRoaXMgbWF5IG5lZWQgbW9yZSB0ZXN0aW5nIHRvIHNlZSBpZiBhbGwgYnJvd3NlcnNcclxuICAgICAgICAgICAgLy8gd2FpdCBmb3IgdGhlIG5leHQgdGljayB0byBnbyBiYWNrIGluIGhpc3RvcnlcclxuICAgICAgICAgICAgaGlzdG9yeS5iYWNrKCk7XHJcbiAgICAgICAgICAgIHRoaXMubGVuLS07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2UgaWYgKHBhdGgpIHtcclxuICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNob3cocGF0aCwgc3RhdGUpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zaG93KGJhc2UsIHN0YXRlKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgO1xyXG4gICAgZGlzcGF0Y2gocGF0aCkge1xyXG4gICAgICAgIHRoaXMuZW1pdCgnY2hhbmdpbmcnLCBwYXRoKTtcclxuICAgICAgICB0aGlzLmVtaXQoJ2NoYW5nZScsIHBhdGgpO1xyXG4gICAgfVxyXG59XHJcbmV4cG9ydHMuTG9jYXRpb25TZXJ2aWNlID0gTG9jYXRpb25TZXJ2aWNlO1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1sb2NhdGlvblNlcnZpY2UuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbnZhciBfX2RlY29yYXRlID0gKHRoaXMgJiYgdGhpcy5fX2RlY29yYXRlKSB8fCBmdW5jdGlvbiAoZGVjb3JhdG9ycywgdGFyZ2V0LCBrZXksIGRlc2MpIHtcclxuICAgIHZhciBjID0gYXJndW1lbnRzLmxlbmd0aCwgciA9IGMgPCAzID8gdGFyZ2V0IDogZGVzYyA9PT0gbnVsbCA/IGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRhcmdldCwga2V5KSA6IGRlc2MsIGQ7XHJcbiAgICBpZiAodHlwZW9mIFJlZmxlY3QgPT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIFJlZmxlY3QuZGVjb3JhdGUgPT09IFwiZnVuY3Rpb25cIikgciA9IFJlZmxlY3QuZGVjb3JhdGUoZGVjb3JhdG9ycywgdGFyZ2V0LCBrZXksIGRlc2MpO1xyXG4gICAgZWxzZSBmb3IgKHZhciBpID0gZGVjb3JhdG9ycy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkgaWYgKGQgPSBkZWNvcmF0b3JzW2ldKSByID0gKGMgPCAzID8gZChyKSA6IGMgPiAzID8gZCh0YXJnZXQsIGtleSwgcikgOiBkKHRhcmdldCwga2V5KSkgfHwgcjtcclxuICAgIHJldHVybiBjID4gMyAmJiByICYmIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGtleSwgciksIHI7XHJcbn07XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxuY29uc3QgYWthbGEgPSByZXF1aXJlKFwiQGFrYWxhL2NvcmVcIik7XHJcbmNvbnN0IGV2ZW50c18xID0gcmVxdWlyZShcImV2ZW50c1wiKTtcclxuY29uc3QgY29tbW9uXzEgPSByZXF1aXJlKFwiLi9jb21tb25cIik7XHJcbmxldCBQYXJ0ID0gY2xhc3MgUGFydCBleHRlbmRzIGV2ZW50c18xLkV2ZW50RW1pdHRlciB7XHJcbiAgICBjb25zdHJ1Y3Rvcih0ZW1wbGF0ZSwgcm91dGVyLCBsb2NhdGlvbikge1xyXG4gICAgICAgIHN1cGVyKCk7XHJcbiAgICAgICAgdGhpcy50ZW1wbGF0ZSA9IHRlbXBsYXRlO1xyXG4gICAgICAgIHRoaXMucm91dGVyID0gcm91dGVyO1xyXG4gICAgICAgIHRoaXMucGFydHMgPSBuZXcgYWthbGEuSW5qZWN0b3IoKTtcclxuICAgICAgICBsb2NhdGlvbi5vbignY2hhbmdpbmcnLCAoKSA9PiB7XHJcbiAgICAgICAgICAgIHZhciBwYXJ0cyA9IHRoaXMucGFydHM7XHJcbiAgICAgICAgICAgIHBhcnRzLmtleXMoKS5mb3JFYWNoKGZ1bmN0aW9uIChwYXJ0TmFtZSkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHBhcnROYW1lID09ICckaW5qZWN0b3InKVxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIHBhcnRzLnJlc29sdmUocGFydE5hbWUpLmVsZW1lbnQuZW1wdHkoKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICByZWdpc3RlcihwYXJ0TmFtZSwgY29udHJvbCkge1xyXG4gICAgICAgIHRoaXMucGFydHMucmVnaXN0ZXIocGFydE5hbWUsIGNvbnRyb2wpO1xyXG4gICAgfVxyXG4gICAgYXBwbHkocGFydEluc3RhbmNlLCBwYXJ0LCBwYXJhbXMsIG5leHQpIHtcclxuICAgICAgICB2YXIgcGFydHMgPSB0aGlzLnBhcnRzO1xyXG4gICAgICAgIHZhciB0ZW1wbGF0ZSA9IHRoaXMudGVtcGxhdGU7XHJcbiAgICAgICAgaWYgKHBhcnQudGVtcGxhdGUpXHJcbiAgICAgICAgICAgIHRlbXBsYXRlLmdldChwYXJ0LnRlbXBsYXRlKS50aGVuKGZ1bmN0aW9uICh0ZW1wbGF0ZSkge1xyXG4gICAgICAgICAgICAgICAgdmFyIHAgPSBwYXJ0SW5zdGFuY2UoKTtcclxuICAgICAgICAgICAgICAgIGlmICghcClcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICBpZiAocGFydC5jb250cm9sbGVyKVxyXG4gICAgICAgICAgICAgICAgICAgIHBhcnQuY29udHJvbGxlcihwLnNjb3BlLCBwLmVsZW1lbnQsIHBhcmFtcywgbmV4dCk7XHJcbiAgICAgICAgICAgICAgICBpZiAodGVtcGxhdGUpXHJcbiAgICAgICAgICAgICAgICAgICAgdGVtcGxhdGUocC5zY29wZSwgcC5lbGVtZW50LmVtcHR5KCkpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgdmFyIHAgPSBwYXJ0SW5zdGFuY2UoKTtcclxuICAgICAgICAgICAgaWYgKCFwKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICBpZiAocGFydC5jb250cm9sbGVyKVxyXG4gICAgICAgICAgICAgICAgcGFydC5jb250cm9sbGVyKHAuc2NvcGUsIHAuZWxlbWVudCwgcGFyYW1zLCBuZXh0KTtcclxuICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgbmV4dCgpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHVzZSh1cmwsIHBhcnROYW1lID0gJ2JvZHknLCBwYXJ0KSB7XHJcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgICAgIHRoaXMucm91dGVyLnVzZSh1cmwsIGZ1bmN0aW9uIChyZXEsIG5leHQpIHtcclxuICAgICAgICAgICAgc2VsZi5hcHBseSgoKSA9PiBzZWxmLnBhcnRzLnJlc29sdmUocGFydE5hbWUpLCBwYXJ0LCByZXEucGFyYW1zLCBuZXh0KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxufTtcclxuUGFydCA9IF9fZGVjb3JhdGUoW1xyXG4gICAgY29tbW9uXzEuc2VydmljZSgnJHBhcnQnLCAnJHRlbXBsYXRlJywgJyRyb3V0ZXInLCAnJGxvY2F0aW9uJylcclxuXSwgUGFydCk7XHJcbmV4cG9ydHMuUGFydCA9IFBhcnQ7XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPXBhcnQuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxuY29uc3QgdXJsID0gcmVxdWlyZShcInVybFwiKTtcclxuY29uc3QgYWthbGEgPSByZXF1aXJlKFwiQGFrYWxhL2NvcmVcIik7XHJcbnZhciBkZWJ1ZyA9IHJlcXVpcmUoJ2RlYnVnJykoJ2FrYWxhOnJvdXRlcicpO1xyXG5jbGFzcyBSZXF1ZXN0IHtcclxuICAgIGNvbnN0cnVjdG9yKGxvYykge1xyXG4gICAgICAgIGlmIChsb2MuaGFzaClcclxuICAgICAgICAgICAgdGhpcy51cmwgPSBsb2MuaGFzaC5zdWJzdHIoMSk7XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICB0aGlzLnVybCA9ICcvJztcclxuICAgICAgICB0aGlzLnVyaSA9IHVybC5wYXJzZSh0aGlzLnVybCwgdHJ1ZSk7XHJcbiAgICB9XHJcbn1cclxuZXhwb3J0cy5SZXF1ZXN0ID0gUmVxdWVzdDtcclxuO1xyXG5pZiAoIXdpbmRvdy5zZXRJbW1lZGlhdGUpXHJcbiAgICB3aW5kb3dbJ3NldEltbWVkaWF0ZSddID0gZnVuY3Rpb24gKGZuKSB7XHJcbiAgICAgICAgdmFyIGFyZ3MgPSBhcmd1bWVudHMubGVuZ3RoICYmIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSkgfHwgW107XHJcbiAgICAgICAgcmV0dXJuIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBmbi5hcHBseSh0aGlzLCBhcmdzKTtcclxuICAgICAgICB9LCAwKTtcclxuICAgIH07XHJcbmNsYXNzIEJyb3dzZXJMYXllciBleHRlbmRzIGFrYWxhLkxheWVyIHtcclxuICAgIGNvbnN0cnVjdG9yKHBhdGgsIG9wdGlvbnMsIGhhbmRsZXIpIHtcclxuICAgICAgICBzdXBlcihwYXRoLCBvcHRpb25zLCBoYW5kbGVyKTtcclxuICAgIH1cclxufVxyXG5leHBvcnRzLkJyb3dzZXJMYXllciA9IEJyb3dzZXJMYXllcjtcclxuY2xhc3MgQnJvd3NlclJvdXRlIGV4dGVuZHMgYWthbGEuUm91dGUge1xyXG4gICAgY29uc3RydWN0b3IocGF0aCkge1xyXG4gICAgICAgIHN1cGVyKHBhdGgpO1xyXG4gICAgfVxyXG4gICAgYnVpbGRMYXllcihwYXRoLCBvcHRpb25zLCBjYWxsYmFjaykge1xyXG4gICAgICAgIHJldHVybiBuZXcgQnJvd3NlckxheWVyKCcvJywgb3B0aW9ucywgY2FsbGJhY2spO1xyXG4gICAgfVxyXG59XHJcbmV4cG9ydHMuQnJvd3NlclJvdXRlID0gQnJvd3NlclJvdXRlO1xyXG5jbGFzcyBSb3V0ZXIgZXh0ZW5kcyBha2FsYS5Sb3V0ZXIge1xyXG4gICAgY29uc3RydWN0b3Iob3B0aW9ucykge1xyXG4gICAgICAgIHN1cGVyKG9wdGlvbnMpO1xyXG4gICAgfVxyXG4gICAgYnVpbGRMYXllcihwYXRoLCBvcHRpb25zLCBoYW5kbGVyKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBCcm93c2VyTGF5ZXIocGF0aCwgb3B0aW9ucywgaGFuZGxlcik7XHJcbiAgICB9XHJcbiAgICBidWlsZFJvdXRlKHBhdGgpIHtcclxuICAgICAgICByZXR1cm4gbmV3IEJyb3dzZXJSb3V0ZShwYXRoKTtcclxuICAgIH1cclxufVxyXG5leHBvcnRzLlJvdXRlciA9IFJvdXRlcjtcclxuZnVuY3Rpb24gcm91dGVyKCkge1xyXG4gICAgdmFyIHByb3RvID0gbmV3IFJvdXRlcigpO1xyXG4gICAgcmV0dXJuIHByb3RvO1xyXG59XHJcbmV4cG9ydHMucm91dGVyID0gcm91dGVyO1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1yb3V0ZXIuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxuY29uc3QgZGkgPSByZXF1aXJlKFwiQGFrYWxhL2NvcmVcIik7XHJcbmNsYXNzIFNjb3BlIHtcclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHRoaXMuJCR3YXRjaGVycyA9IHt9O1xyXG4gICAgfVxyXG4gICAgJG5ldygpIHtcclxuICAgICAgICB2YXIgbmV3U2NvcGUgPSBmdW5jdGlvbiAoKSB7IH07XHJcbiAgICAgICAgbmV3U2NvcGUucHJvdG90eXBlID0gdGhpcztcclxuICAgICAgICByZXR1cm4gbmV3IG5ld1Njb3BlKCk7XHJcbiAgICB9XHJcbiAgICAkaW5qZWN0KGYpIHtcclxuICAgICAgICB2YXIgc2NvcGUgPSB0aGlzO1xyXG4gICAgICAgIGlmICghdGhpcy5yZXNvbHZlcikge1xyXG4gICAgICAgICAgICB0aGlzLnJlc29sdmVyID0gbmV3IGRpLkluamVjdG9yKCk7XHJcbiAgICAgICAgICAgIHRoaXMucmVzb2x2ZXIuc2V0SW5qZWN0YWJsZXModGhpcyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0aGlzLnJlc29sdmVyLmluamVjdChmKSh0aGlzKTtcclxuICAgIH1cclxuICAgICRzZXQoZXhwcmVzc2lvbiwgdmFsdWUpIHtcclxuICAgICAgICBkaS5CaW5kaW5nLmdldFNldHRlcih0aGlzLCBleHByZXNzaW9uKSh2YWx1ZSwgJ3Njb3BlJyk7XHJcbiAgICB9XHJcbiAgICAkd2F0Y2goZXhwcmVzc2lvbiwgaGFuZGxlcikge1xyXG4gICAgICAgIHZhciBiaW5kaW5nID0gdGhpcy4kJHdhdGNoZXJzW2V4cHJlc3Npb25dO1xyXG4gICAgICAgIGlmICghYmluZGluZykge1xyXG4gICAgICAgICAgICBiaW5kaW5nID0gbmV3IGRpLkJpbmRpbmcoZXhwcmVzc2lvbiwgdGhpcyk7XHJcbiAgICAgICAgICAgIHRoaXMuJCR3YXRjaGVyc1tleHByZXNzaW9uXSA9IGJpbmRpbmc7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICghYmluZGluZ1snaGFuZGxlcnMnXSlcclxuICAgICAgICAgICAgYmluZGluZ1snaGFuZGxlcnMnXSA9IFtdO1xyXG4gICAgICAgIGlmIChiaW5kaW5nWydoYW5kbGVycyddLmluZGV4T2YoaGFuZGxlcikgPiAtMSlcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIGJpbmRpbmdbJ2hhbmRsZXJzJ10ucHVzaChoYW5kbGVyKTtcclxuICAgICAgICBiaW5kaW5nLm9uQ2hhbmdlZChmdW5jdGlvbiAoZXYpIHtcclxuICAgICAgICAgICAgaGFuZGxlcihldi5ldmVudEFyZ3MudmFsdWUpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG59XHJcbmV4cG9ydHMuU2NvcGUgPSBTY29wZTtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9c2NvcGUuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbnZhciBfX2RlY29yYXRlID0gKHRoaXMgJiYgdGhpcy5fX2RlY29yYXRlKSB8fCBmdW5jdGlvbiAoZGVjb3JhdG9ycywgdGFyZ2V0LCBrZXksIGRlc2MpIHtcclxuICAgIHZhciBjID0gYXJndW1lbnRzLmxlbmd0aCwgciA9IGMgPCAzID8gdGFyZ2V0IDogZGVzYyA9PT0gbnVsbCA/IGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRhcmdldCwga2V5KSA6IGRlc2MsIGQ7XHJcbiAgICBpZiAodHlwZW9mIFJlZmxlY3QgPT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIFJlZmxlY3QuZGVjb3JhdGUgPT09IFwiZnVuY3Rpb25cIikgciA9IFJlZmxlY3QuZGVjb3JhdGUoZGVjb3JhdG9ycywgdGFyZ2V0LCBrZXksIGRlc2MpO1xyXG4gICAgZWxzZSBmb3IgKHZhciBpID0gZGVjb3JhdG9ycy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkgaWYgKGQgPSBkZWNvcmF0b3JzW2ldKSByID0gKGMgPCAzID8gZChyKSA6IGMgPiAzID8gZCh0YXJnZXQsIGtleSwgcikgOiBkKHRhcmdldCwga2V5KSkgfHwgcjtcclxuICAgIHJldHVybiBjID4gMyAmJiByICYmIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGtleSwgciksIHI7XHJcbn07XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxucmVxdWlyZShcIkBha2FsYS9jb3JlXCIpO1xyXG5jb25zdCBkaSA9IHJlcXVpcmUoXCJAYWthbGEvY29yZVwiKTtcclxuY29uc3QgY29udHJvbHNfMSA9IHJlcXVpcmUoXCIuL2NvbnRyb2xzL2NvbnRyb2xzXCIpO1xyXG5jb25zdCBzY29wZV8xID0gcmVxdWlyZShcIi4vc2NvcGVcIik7XHJcbmNvbnN0IGNvbW1vbl8xID0gcmVxdWlyZShcIi4vY29tbW9uXCIpO1xyXG5pZiAoTXV0YXRpb25PYnNlcnZlcikge1xyXG4gICAgdmFyIGRvbU9ic2VydmVyID0gbmV3IE11dGF0aW9uT2JzZXJ2ZXIoZnVuY3Rpb24gKG11dGF0aW9ucykge1xyXG4gICAgICAgIG11dGF0aW9ucy5mb3JFYWNoKGZ1bmN0aW9uIChtdXRhdGlvbikge1xyXG4gICAgICAgICAgICBzd2l0Y2ggKG11dGF0aW9uLnR5cGUpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgJ2NoYXJhY3RlckRhdGEnOlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIGNhc2UgJ2F0dHJpYnV0ZXMnOlxyXG4gICAgICAgICAgICAgICAgY2FzZSAnY2hpbGRMaXN0JzpcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcbn1cclxubGV0IEludGVycG9sYXRlID0gSW50ZXJwb2xhdGVfMSA9IGNsYXNzIEludGVycG9sYXRlIHtcclxuICAgIGdldCBzdGFydFN5bWJvbCgpIHsgcmV0dXJuIEludGVycG9sYXRlXzEuX3N0YXJ0U3ltYm9sOyB9XHJcbiAgICA7XHJcbiAgICBzZXQgc3RhcnRTeW1ib2wodmFsdWUpIHsgSW50ZXJwb2xhdGVfMS5fc3RhcnRTeW1ib2wgPSB2YWx1ZTsgfVxyXG4gICAgO1xyXG4gICAgZ2V0IGVuZFN5bWJvbCgpIHsgcmV0dXJuIEludGVycG9sYXRlXzEuX2VuZFN5bWJvbDsgfVxyXG4gICAgO1xyXG4gICAgc2V0IGVuZFN5bWJvbCh2YWx1ZSkgeyBJbnRlcnBvbGF0ZV8xLl9lbmRTeW1ib2wgPSB2YWx1ZTsgfVxyXG4gICAgO1xyXG4gICAgc3RhdGljIHVuZXNjYXBlVGV4dCh0ZXh0KSB7XHJcbiAgICAgICAgcmV0dXJuIHRleHQucmVwbGFjZSh0aGlzLmVzY2FwZWRTdGFydFJlZ2V4cCwgSW50ZXJwb2xhdGVfMS5fc3RhcnRTeW1ib2wpLlxyXG4gICAgICAgICAgICByZXBsYWNlKHRoaXMuZXNjYXBlZEVuZFJlZ2V4cCwgSW50ZXJwb2xhdGVfMS5fZW5kU3ltYm9sKTtcclxuICAgIH1cclxuICAgIHN0YXRpYyBlc2NhcGUoY2gpIHtcclxuICAgICAgICByZXR1cm4gJ1xcXFxcXFxcXFxcXCcgKyBjaDtcclxuICAgIH1cclxuICAgIHN0YXRpYyBidWlsZCh0ZXh0LCBtdXN0SGF2ZUV4cHJlc3Npb24sIHRydXN0ZWRDb250ZXh0LCBhbGxPck5vdGhpbmcpIHtcclxuICAgICAgICB2YXIgc3RhcnRTeW1ib2xMZW5ndGggPSBJbnRlcnBvbGF0ZV8xLl9zdGFydFN5bWJvbC5sZW5ndGgsIGVuZFN5bWJvbExlbmd0aCA9IEludGVycG9sYXRlXzEuX2VuZFN5bWJvbC5sZW5ndGg7XHJcbiAgICAgICAgaWYgKCF0ZXh0Lmxlbmd0aCB8fCB0ZXh0LmluZGV4T2YoSW50ZXJwb2xhdGVfMS5fc3RhcnRTeW1ib2wpID09PSAtMSkge1xyXG4gICAgICAgICAgICB2YXIgY29uc3RhbnRJbnRlcnA7XHJcbiAgICAgICAgICAgIGlmICghbXVzdEhhdmVFeHByZXNzaW9uKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHRhcmdldCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0ZXh0O1xyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gY29uc3RhbnRJbnRlcnA7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGFsbE9yTm90aGluZyA9ICEhYWxsT3JOb3RoaW5nO1xyXG4gICAgICAgIHZhciBzdGFydEluZGV4LCBlbmRJbmRleCwgaW5kZXggPSAwLCBleHByZXNzaW9ucyA9IFtdLCBwYXJzZUZucyA9IFtdLCB0ZXh0TGVuZ3RoID0gdGV4dC5sZW5ndGgsIGV4cCwgY29uY2F0ID0gW10sIGV4cHJlc3Npb25Qb3NpdGlvbnMgPSBbXTtcclxuICAgICAgICB3aGlsZSAoaW5kZXggPCB0ZXh0TGVuZ3RoKSB7XHJcbiAgICAgICAgICAgIGlmICgoKHN0YXJ0SW5kZXggPSB0ZXh0LmluZGV4T2YoSW50ZXJwb2xhdGVfMS5fc3RhcnRTeW1ib2wsIGluZGV4KSkgIT09IC0xKSAmJlxyXG4gICAgICAgICAgICAgICAgKChlbmRJbmRleCA9IHRleHQuaW5kZXhPZihJbnRlcnBvbGF0ZV8xLl9lbmRTeW1ib2wsIHN0YXJ0SW5kZXggKyBzdGFydFN5bWJvbExlbmd0aCkpICE9PSAtMSkpIHtcclxuICAgICAgICAgICAgICAgIGlmIChpbmRleCAhPT0gc3RhcnRJbmRleCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbmNhdC5wdXNoKHRoaXMudW5lc2NhcGVUZXh0KHRleHQuc3Vic3RyaW5nKGluZGV4LCBzdGFydEluZGV4KSkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZXhwID0gdGV4dC5zdWJzdHJpbmcoc3RhcnRJbmRleCArIHN0YXJ0U3ltYm9sTGVuZ3RoLCBlbmRJbmRleCk7XHJcbiAgICAgICAgICAgICAgICBleHByZXNzaW9ucy5wdXNoKGV4cCk7XHJcbiAgICAgICAgICAgICAgICBwYXJzZUZucy5wdXNoKGZ1bmN0aW9uICh0YXJnZXQpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IGRpLkJpbmRpbmcoZXhwLCB0YXJnZXQpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICBpbmRleCA9IGVuZEluZGV4ICsgZW5kU3ltYm9sTGVuZ3RoO1xyXG4gICAgICAgICAgICAgICAgZXhwcmVzc2lvblBvc2l0aW9ucy5wdXNoKGNvbmNhdC5sZW5ndGgpO1xyXG4gICAgICAgICAgICAgICAgY29uY2F0LnB1c2goJycpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgLy8gd2UgZGlkIG5vdCBmaW5kIGFuIGludGVycG9sYXRpb24sIHNvIHdlIGhhdmUgdG8gYWRkIHRoZSByZW1haW5kZXIgdG8gdGhlIHNlcGFyYXRvcnMgYXJyYXlcclxuICAgICAgICAgICAgICAgIGlmIChpbmRleCAhPT0gdGV4dExlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbmNhdC5wdXNoKHRoaXMudW5lc2NhcGVUZXh0KHRleHQuc3Vic3RyaW5nKGluZGV4KSkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGNvbXB1dGUgPSBmdW5jdGlvbiAodmFsdWVzKSB7XHJcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBpaSA9IGV4cHJlc3Npb25zLmxlbmd0aDsgaSA8IGlpOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIGlmIChhbGxPck5vdGhpbmcgJiYgdHlwZW9mICh2YWx1ZXNbaV0pKVxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIGNvbmNhdFtleHByZXNzaW9uUG9zaXRpb25zW2ldXSA9IHZhbHVlc1tpXS5nZXRWYWx1ZSgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBjb25jYXQuam9pbignJyk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gaW50ZXJwb2xhdGlvbkZuKHRhcmdldCkge1xyXG4gICAgICAgICAgICB2YXIgYmluZGluZ3MgPSBbXTtcclxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBleHByZXNzaW9ucy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgYmluZGluZ3NbaV0gPSBwYXJzZUZuc1tpXSh0YXJnZXQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBjb21wdXRlKGJpbmRpbmdzKTtcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG59O1xyXG5JbnRlcnBvbGF0ZS5fc3RhcnRTeW1ib2wgPSAne3snO1xyXG5JbnRlcnBvbGF0ZS5fZW5kU3ltYm9sID0gJ319JztcclxuSW50ZXJwb2xhdGUuZXNjYXBlZFN0YXJ0UmVnZXhwID0gbmV3IFJlZ0V4cChJbnRlcnBvbGF0ZV8xLl9zdGFydFN5bWJvbC5yZXBsYWNlKC8uL2csIEludGVycG9sYXRlXzEuZXNjYXBlKSwgJ2cnKTtcclxuSW50ZXJwb2xhdGUuZXNjYXBlZEVuZFJlZ2V4cCA9IG5ldyBSZWdFeHAoSW50ZXJwb2xhdGVfMS5fZW5kU3ltYm9sLnJlcGxhY2UoLy4vZywgSW50ZXJwb2xhdGVfMS5lc2NhcGUpLCAnZycpO1xyXG5JbnRlcnBvbGF0ZSA9IEludGVycG9sYXRlXzEgPSBfX2RlY29yYXRlKFtcclxuICAgIGNvbW1vbl8xLnNlcnZpY2UoJyRpbnRlcnBvbGF0ZScpXHJcbl0sIEludGVycG9sYXRlKTtcclxuZXhwb3J0cy5JbnRlcnBvbGF0ZSA9IEludGVycG9sYXRlO1xyXG52YXIgY2FjaGUgPSBuZXcgZGkuSW5qZWN0b3IoKTtcclxubGV0IFRlbXBsYXRlID0gVGVtcGxhdGVfMSA9IGNsYXNzIFRlbXBsYXRlIHtcclxuICAgIGNvbnN0cnVjdG9yKGludGVycG9sYXRvciwgaHR0cCkge1xyXG4gICAgICAgIHRoaXMuaW50ZXJwb2xhdG9yID0gaW50ZXJwb2xhdG9yO1xyXG4gICAgICAgIHRoaXMuaHR0cCA9IGh0dHA7XHJcbiAgICB9XHJcbiAgICBnZXQodCwgcmVnaXN0ZXJUZW1wbGF0ZSA9IHRydWUpIHtcclxuICAgICAgICB2YXIgaHR0cCA9IHRoaXMuaHR0cDtcclxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICAgICAgdmFyIHAgPSBuZXcgZGkuRGVmZXJyZWQoKTtcclxuICAgICAgICBpZiAoIXQpXHJcbiAgICAgICAgICAgIHNldEltbWVkaWF0ZShwLnJlc29sdmUsIHQpO1xyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICB2YXIgdGVtcGxhdGUgPSBjYWNoZS5yZXNvbHZlKHQpO1xyXG4gICAgICAgICAgICBpZiAodGVtcGxhdGUpIHtcclxuICAgICAgICAgICAgICAgIGlmIChkaS5pc1Byb21pc2VMaWtlKHRlbXBsYXRlKSlcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGVtcGxhdGUudGhlbihmdW5jdGlvbiAoZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBwLnJlc29sdmUoZGF0YSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBkYXRhO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgICAgIHNldEltbWVkaWF0ZShwLnJlc29sdmUuYmluZChwKSwgdGVtcGxhdGUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKC88Ly50ZXN0KHQpKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgdGVtcGxhdGUgPSBUZW1wbGF0ZV8xLmJ1aWxkKHQpO1xyXG4gICAgICAgICAgICAgICAgc2V0SW1tZWRpYXRlKHAucmVzb2x2ZS5iaW5kKHApLCB0ZW1wbGF0ZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBjYWNoZS5yZWdpc3Rlcih0LCBwKTtcclxuICAgICAgICAgICAgICAgIGh0dHAuZ2V0KHQpLnRoZW4oZnVuY3Rpb24gKGRhdGEpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgdGVtcGxhdGUgPSBUZW1wbGF0ZV8xLmJ1aWxkKGRhdGEpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChyZWdpc3RlclRlbXBsYXRlKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYWNoZS5yZWdpc3Rlcih0LCB0ZW1wbGF0ZSwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcC5yZXNvbHZlKHRlbXBsYXRlKTtcclxuICAgICAgICAgICAgICAgIH0sIHAucmVqZWN0LmJpbmQocCkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBwO1xyXG4gICAgfVxyXG4gICAgc3RhdGljIGJ1aWxkKG1hcmt1cCkge1xyXG4gICAgICAgIHZhciB0ZW1wbGF0ZSA9IEludGVycG9sYXRlLmJ1aWxkKG1hcmt1cCk7XHJcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChkYXRhLCBwYXJlbnQpIHtcclxuICAgICAgICAgICAgdmFyIHRlbXBsYXRlSW5zdGFuY2UgPSAkKHRlbXBsYXRlKGRhdGEpKTtcclxuICAgICAgICAgICAgaWYgKHBhcmVudClcclxuICAgICAgICAgICAgICAgIHRlbXBsYXRlSW5zdGFuY2UuYXBwZW5kVG8ocGFyZW50KTtcclxuICAgICAgICAgICAgcmV0dXJuIHRlbXBsYXRlSW5zdGFuY2UuYXBwbHlUZW1wbGF0ZShkYXRhLCBwYXJlbnQpO1xyXG4gICAgICAgIH07XHJcbiAgICB9XHJcbn07XHJcblRlbXBsYXRlID0gVGVtcGxhdGVfMSA9IF9fZGVjb3JhdGUoW1xyXG4gICAgY29tbW9uXzEuc2VydmljZSgnJHRlbXBsYXRlJywgJyRpbnRlcnBvbGF0ZScsICckaHR0cCcpXHJcbl0sIFRlbXBsYXRlKTtcclxuZXhwb3J0cy5UZW1wbGF0ZSA9IFRlbXBsYXRlO1xyXG52YXIgZGF0YWJpbmRSZWdleCA9IC8oXFx3Kyk6KFteO10rKTs/L2c7XHJcbiQuZXh0ZW5kKCQuZm4sIHtcclxuICAgIGFwcGx5VGVtcGxhdGU6IGZ1bmN0aW9uIGFwcGx5VGVtcGxhdGUoZGF0YSwgcm9vdCkge1xyXG4gICAgICAgIGRhdGEuJG5ldyA9IHNjb3BlXzEuU2NvcGUucHJvdG90eXBlLiRuZXc7XHJcbiAgICAgICAgaWYgKHRoaXMuZmlsdGVyKCdbZGF0YS1iaW5kXScpLmxlbmd0aCA9PSAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZmluZCgnW2RhdGEtYmluZF0nKS5lYWNoKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHZhciBjbG9zZXN0ID0gJCh0aGlzKS5wYXJlbnQoKS5jbG9zZXN0KCdbZGF0YS1iaW5kXScpO1xyXG4gICAgICAgICAgICAgICAgdmFyIGFwcGx5SW5uZXJUZW1wbGF0ZSA9IGNsb3Nlc3QubGVuZ3RoID09IDA7XHJcbiAgICAgICAgICAgICAgICBpZiAoIWFwcGx5SW5uZXJUZW1wbGF0ZSAmJiByb290KVxyXG4gICAgICAgICAgICAgICAgICAgIHJvb3QuZWFjaChmdW5jdGlvbiAoaSwgaXQpIHsgYXBwbHlJbm5lclRlbXBsYXRlID0gYXBwbHlJbm5lclRlbXBsYXRlIHx8IGl0ID09IGNsb3Nlc3RbMF07IH0pO1xyXG4gICAgICAgICAgICAgICAgaWYgKGFwcGx5SW5uZXJUZW1wbGF0ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICQodGhpcykuYXBwbHlUZW1wbGF0ZShkYXRhLCB0aGlzKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgdmFyIGVsZW1lbnQgPSAkKCk7XHJcbiAgICAgICAgICAgIHZhciBwcm9taXNlcyA9IFtdO1xyXG4gICAgICAgICAgICB0aGlzLmZpbHRlcignW2RhdGEtYmluZF0nKS5lYWNoKGZ1bmN0aW9uIChpbmRleCwgaXRlbSkge1xyXG4gICAgICAgICAgICAgICAgdmFyICRpdGVtID0gJChpdGVtKTtcclxuICAgICAgICAgICAgICAgIHZhciBzdWJFbGVtID0gY29udHJvbHNfMS5Db250cm9sLmFwcGx5KGRpLlBhcnNlci5ldmFsQXNGdW5jdGlvbigkaXRlbS5hdHRyKFwiZGF0YS1iaW5kXCIpLCB0cnVlKSwgJGl0ZW0sIGRhdGEpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGRpLmlzUHJvbWlzZUxpa2Uoc3ViRWxlbSkpIHtcclxuICAgICAgICAgICAgICAgICAgICBwcm9taXNlcy5wdXNoKHN1YkVsZW0udGhlbihmdW5jdGlvbiAoc3ViRWxlbSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50ID0gZWxlbWVudC5hZGQoc3ViRWxlbSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnQgPSBlbGVtZW50LmFkZChzdWJFbGVtKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIGlmIChwcm9taXNlcy5sZW5ndGgpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZGkud2hlbihwcm9taXNlcykudGhlbihmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGVsZW1lbnQ7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgcmV0dXJuIGVsZW1lbnQ7XHJcbiAgICAgICAgfVxyXG4gICAgfSxcclxuICAgIHRtcGw6IGZ1bmN0aW9uIChkYXRhLCBvcHRpb25zKSB7XHJcbiAgICAgICAgaWYgKHRoaXMubGVuZ3RoID4gMSlcclxuICAgICAgICAgICAgdGhyb3cgJ0EgdGVtcGxhdGUgY2FuIG9ubHkgYmUgYSBzaW5nbGUgaXRlbSc7XHJcbiAgICAgICAgaWYgKHRoaXMubGVuZ3RoID09IDApXHJcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIHJldHVybiBUZW1wbGF0ZS5idWlsZCh0aGlzWzBdKTtcclxuICAgIH1cclxufSk7XHJcbnZhciBJbnRlcnBvbGF0ZV8xLCBUZW1wbGF0ZV8xO1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD10ZW1wbGF0ZS5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5jb25zdCBwYXJzZXJfMSA9IHJlcXVpcmUoXCIuL3BhcnNlclwiKTtcclxuY29uc3QgZXZlbnRzXzEgPSByZXF1aXJlKFwiZXZlbnRzXCIpO1xyXG5jb25zdCBwcm9taXNlSGVscGVyc18xID0gcmVxdWlyZShcIi4vcHJvbWlzZUhlbHBlcnNcIik7XHJcbmNvbnN0IGZvcm1hdHRlcnMgPSByZXF1aXJlKFwiLi9mb3JtYXR0ZXJzXCIpO1xyXG5jb25zdCBlYWNoQXN5bmNfMSA9IHJlcXVpcmUoXCIuL2VhY2hBc3luY1wiKTtcclxuY2xhc3MgQmluZGluZyBleHRlbmRzIGV2ZW50c18xLkV2ZW50RW1pdHRlciB7XHJcbiAgICBjb25zdHJ1Y3RvcihfZXhwcmVzc2lvbiwgX3RhcmdldCwgcmVnaXN0ZXIgPSB0cnVlKSB7XHJcbiAgICAgICAgc3VwZXIoKTtcclxuICAgICAgICB0aGlzLl9leHByZXNzaW9uID0gX2V4cHJlc3Npb247XHJcbiAgICAgICAgdGhpcy5fdGFyZ2V0ID0gX3RhcmdldDtcclxuICAgICAgICB0aGlzLmV2YWx1YXRvciA9IHBhcnNlcl8xLlBhcnNlci5ldmFsQXNGdW5jdGlvbih0aGlzLmV4cHJlc3Npb24pO1xyXG4gICAgICAgIHRoaXMucmVnaXN0ZXJlZEJpbmRpbmdzID0gW107XHJcbiAgICAgICAgdGhpcy5mb3JtYXR0ZXIgPSBmb3JtYXR0ZXJzLmlkZW50aXR5O1xyXG4gICAgICAgIGlmIChyZWdpc3RlcilcclxuICAgICAgICAgICAgdGhpcy5yZWdpc3RlcigpO1xyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgICAgdGhpcy5zZXRNYXhMaXN0ZW5lcnMoMCk7XHJcbiAgICB9XHJcbiAgICBnZXQgZXhwcmVzc2lvbigpIHsgcmV0dXJuIHRoaXMuX2V4cHJlc3Npb247IH1cclxuICAgIGdldCB0YXJnZXQoKSB7IHJldHVybiB0aGlzLl90YXJnZXQ7IH1cclxuICAgIHNldCB0YXJnZXQodmFsdWUpIHsgdGhpcy5fdGFyZ2V0ID0gdmFsdWU7IHRoaXMucmVnaXN0ZXIoKTsgfVxyXG4gICAgb25DaGFuZ2luZyhoYW5kbGVyKSB7XHJcbiAgICAgICAgdGhpcy5vbihCaW5kaW5nLkNoYW5naW5nRmllbGRFdmVudE5hbWUsIGhhbmRsZXIpO1xyXG4gICAgfVxyXG4gICAgb25DaGFuZ2VkKGhhbmRsZXIsIGRvTm90VHJpZ2dlckhhbmRsZXIpIHtcclxuICAgICAgICB0aGlzLm9uKEJpbmRpbmcuQ2hhbmdlZEZpZWxkRXZlbnROYW1lLCBoYW5kbGVyKTtcclxuICAgICAgICBpZiAoIWRvTm90VHJpZ2dlckhhbmRsZXIpXHJcbiAgICAgICAgICAgIGhhbmRsZXIoe1xyXG4gICAgICAgICAgICAgICAgdGFyZ2V0OiB0aGlzLnRhcmdldCxcclxuICAgICAgICAgICAgICAgIGV2ZW50QXJnczoge1xyXG4gICAgICAgICAgICAgICAgICAgIGZpZWxkTmFtZTogdGhpcy5leHByZXNzaW9uLFxyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiB0aGlzLmdldFZhbHVlKClcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBzb3VyY2U6IG51bGxcclxuICAgICAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBvbkVycm9yKGhhbmRsZXIpIHtcclxuICAgICAgICB0aGlzLm9uKEJpbmRpbmcuRXJyb3JFdmVudE5hbWUsIGhhbmRsZXIpO1xyXG4gICAgfVxyXG4gICAgcGlwZShiaW5kaW5nKSB7XHJcbiAgICAgICAgaWYgKHRoaXMucmVnaXN0ZXJlZEJpbmRpbmdzLmluZGV4T2YoYmluZGluZykgPiAtMSlcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIHRoaXMucmVnaXN0ZXJlZEJpbmRpbmdzLnB1c2goYmluZGluZyk7XHJcbiAgICAgICAgdmFyIHdhdGNoZXIgPSB0aGlzO1xyXG4gICAgICAgIHdhdGNoZXIub25DaGFuZ2luZyhmdW5jdGlvbiAoYSkge1xyXG4gICAgICAgICAgICBpZiAoYS5zb3VyY2UgPT0gYmluZGluZyB8fCBhLnNvdXJjZSA9PT0gbnVsbClcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgdmFyIGFyZ3MgPSBbQmluZGluZy5DaGFuZ2luZ0ZpZWxkRXZlbnROYW1lLCBhXTtcclxuICAgICAgICAgICAgYmluZGluZy5lbWl0LmFwcGx5KGJpbmRpbmcsIGFyZ3MpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHdhdGNoZXIub25DaGFuZ2VkKGZ1bmN0aW9uIChhKSB7XHJcbiAgICAgICAgICAgIGlmIChhLnNvdXJjZSA9PSBiaW5kaW5nIHx8IGEuc291cmNlID09PSBudWxsKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB2YXIgYXJncyA9IFtCaW5kaW5nLkNoYW5nZWRGaWVsZEV2ZW50TmFtZSwgeyBzb3VyY2U6IGEuc291cmNlLCB0YXJnZXQ6IGEudGFyZ2V0LCBldmVudEFyZ3M6IHsgZmllbGROYW1lOiBhLmV2ZW50QXJncy5maWVsZE5hbWUsIHZhbHVlOiBiaW5kaW5nLmdldFZhbHVlKCkgfSB9XTtcclxuICAgICAgICAgICAgYmluZGluZy5lbWl0LmFwcGx5KGJpbmRpbmcsIGFyZ3MpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHdhdGNoZXIub25FcnJvcihmdW5jdGlvbiAoYSkge1xyXG4gICAgICAgICAgICBpZiAoYS5zb3VyY2UgPT0gYmluZGluZyB8fCBhLnNvdXJjZSA9PT0gbnVsbClcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgdmFyIGFyZ3MgPSBbQmluZGluZy5DaGFuZ2VkRmllbGRFdmVudE5hbWUsIGFdO1xyXG4gICAgICAgICAgICBiaW5kaW5nLmVtaXQuYXBwbHkoYmluZGluZywgYXJncyk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICAvL2RlZmluZWQgaW4gY29uc3RydWN0b3JcclxuICAgIGdldFZhbHVlKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmZvcm1hdHRlcih0aGlzLmV2YWx1YXRvcih0aGlzLnRhcmdldCwgZmFsc2UpKTtcclxuICAgIH1cclxuICAgIHJlZ2lzdGVyKCkge1xyXG4gICAgICAgIHZhciB0YXJnZXQgPSB0aGlzLnRhcmdldDtcclxuICAgICAgICB2YXIgcGFydHMgPSBwYXJzZXJfMS5QYXJzZXIucGFyc2VCaW5kYWJsZSh0aGlzLmV4cHJlc3Npb24pO1xyXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgICB3aGlsZSAocGFydHMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICB2YXIgcGFydCA9IHBhcnRzLnNoaWZ0KCk7XHJcbiAgICAgICAgICAgIGlmICh0YXJnZXQgIT09IG51bGwgJiYgdGFyZ2V0ICE9PSB1bmRlZmluZWQgJiYgdHlwZW9mICh0YXJnZXQpID09ICdvYmplY3QnKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXRhcmdldC5oYXNPd25Qcm9wZXJ0eSgnJCR3YXRjaGVycycpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgJyQkd2F0Y2hlcnMnLCB7IGVudW1lcmFibGU6IGZhbHNlLCB3cml0YWJsZTogZmFsc2UsIHZhbHVlOiB7fSwgY29uZmlndXJhYmxlOiB0cnVlIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdjb3VsZCBub3QgcmVnaXN0ZXIgd2F0Y2hlciBvbiAnLCB0YXJnZXQsICd0aGlzIGNvdWxkIGxlYWQgdG8gcGVyZm9ybWFuY2UgaXNzdWVzJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdmFyIHdhdGNoZXIgPSB0YXJnZXQuJCR3YXRjaGVycyAmJiB0YXJnZXQuJCR3YXRjaGVyc1twYXJ0XTtcclxuICAgICAgICAgICAgICAgIGlmICghd2F0Y2hlcikge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChwcm9taXNlSGVscGVyc18xLmlzUHJvbWlzZUxpa2UodGFyZ2V0KSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgc3ViUGFydHMgPSBwYXJ0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocGFydHMubGVuZ3RoID4gMClcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1YlBhcnRzICs9ICcuJyArIHBhcnRzLmpvaW4oJy4nKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgd2F0Y2hlciA9IG5ldyBQcm9taXNlQmluZGluZyhzdWJQYXJ0cywgdGFyZ2V0KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAodGFyZ2V0IGluc3RhbmNlb2YgT2JzZXJ2YWJsZUFycmF5KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBpbml0SGFuZGxlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXQub24oJ2NvbGxlY3Rpb25DaGFuZ2VkJywgZnVuY3Rpb24gKGFyZ3MpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhcmdzLmFjdGlvbiA9PSAnaW5pdCcpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW5pdEhhbmRsZWQpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpbml0SGFuZGxlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YXIgc3ViUGFydHMgPSBwYXJ0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBhcnRzLmxlbmd0aCA+IDApXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3ViUGFydHMgKz0gJy4nICsgcGFydHMuam9pbignLicpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yICh2YXIgaSBpbiBhcmdzLm5ld0l0ZW1zKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3IEJpbmRpbmcoc3ViUGFydHMsIGFyZ3MubmV3SXRlbXNbaV0pLnBpcGUodGhpcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXQuaW5pdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgICAgICAgICAgICAgd2F0Y2hlciA9IG5ldyBCaW5kaW5nKHBhcnQsIHRhcmdldCwgZmFsc2UpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0YXJnZXQuJCR3YXRjaGVycylcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0LiQkd2F0Y2hlcnNbcGFydF0gPSB3YXRjaGVyO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgd2F0Y2hlci5waXBlKHRoaXMpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHdhdGNoZXIgaW5zdGFuY2VvZiBQcm9taXNlQmluZGluZylcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB0YXJnZXQgPSB3YXRjaGVyLmdldFZhbHVlKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBhcHBseShlbGVtZW50cywgZG9Ob3RSZWdpc3RlckV2ZW50cykgeyB9XHJcbiAgICAvKmFwcGx5KGVsZW1lbnRzLCBkb05vdFJlZ2lzdGVyRXZlbnRzKVxyXG4gICAge1xyXG4gICAgICAgIHZhciB2YWwgPSB0aGlzLmdldFZhbHVlKCk7XHJcbiAgICAgICAgdmFyIGlucHV0cyA9IGVsZW1lbnRzLmZpbHRlcignOmlucHV0JykudmFsKHZhbClcclxuICAgICAgICB2YXIgYmluZGluZyA9IHRoaXM7XHJcbiAgICAgICAgaWYgKCFkb05vdFJlZ2lzdGVyRXZlbnRzKVxyXG4gICAgICAgICAgICBpbnB1dHMuY2hhbmdlKGZ1bmN0aW9uICgpXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgIGJpbmRpbmcuc2V0VmFsdWUoJCh0aGlzKS52YWwoKSwgdGhpcyk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIGVsZW1lbnRzLmZpbHRlcignOm5vdCg6aW5wdXQpKScpLnRleHQodmFsKTtcclxuICAgIH0qL1xyXG4gICAgc3RhdGljIGdldFNldHRlcih0YXJnZXQsIGV4cHJlc3Npb24pIHtcclxuICAgICAgICB2YXIgcGFydHMgPSBwYXJzZXJfMS5QYXJzZXIucGFyc2VCaW5kYWJsZShleHByZXNzaW9uKTtcclxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKHZhbHVlLCBzb3VyY2UsIGRvTm90VHJpZ2dlckV2ZW50cykge1xyXG4gICAgICAgICAgICB3aGlsZSAocGFydHMubGVuZ3RoID4gMSkge1xyXG4gICAgICAgICAgICAgICAgaWYgKCF0YXJnZXQgJiYgdGFyZ2V0ICE9PSAnJylcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB0YXJnZXQgPSB0YXJnZXRbcGFydHMuc2hpZnQoKV07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdmFyIHdhdGNoZXIgPSB0YXJnZXQuJCR3YXRjaGVyc1twYXJ0c1swXV07XHJcbiAgICAgICAgICAgIHZhciBzZXR0ZXIgPSBwYXJzZXJfMS5QYXJzZXIuZ2V0U2V0dGVyKHBhcnRzWzBdLCB0YXJnZXQpO1xyXG4gICAgICAgICAgICBpZiAoc2V0dGVyID09PSBudWxsKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgdmFyIHByb21pc2UgPSBuZXcgcHJvbWlzZUhlbHBlcnNfMS5EZWZlcnJlZCgpO1xyXG4gICAgICAgICAgICAgICAgcHJvbWlzZS50aGVuKGZ1bmN0aW9uIHJlc29sdmUodmFsdWUpIHtcclxuICAgICAgICAgICAgICAgICAgICBzZXR0ZXIuc2V0KHZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAod2F0Y2hlciAmJiAhZG9Ob3RUcmlnZ2VyRXZlbnRzKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB3YXRjaGVyLmVtaXQoQmluZGluZy5DaGFuZ2VkRmllbGRFdmVudE5hbWUsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldDogdGFyZ2V0LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnRBcmdzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmllbGROYW1lOiBzZXR0ZXIuZXhwcmVzc2lvbixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdmFsdWVcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzb3VyY2U6IHNvdXJjZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChleCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh3YXRjaGVyKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB3YXRjaGVyLmVtaXQoQmluZGluZy5FcnJvckV2ZW50TmFtZSwge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0OiB0YXJnZXQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmaWVsZDogc2V0dGVyLmV4cHJlc3Npb24sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBFeGNlcHRpb246IGV4LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc291cmNlOiBzb3VyY2VcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIGlmIChkb05vdFRyaWdnZXJFdmVudHMpXHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHByb21pc2UucmVzb2x2ZSh2YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICBpZiAod2F0Y2hlcikge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBsaXN0ZW5lcnMgPSB3YXRjaGVyLmxpc3RlbmVycyhCaW5kaW5nLkNoYW5naW5nRmllbGRFdmVudE5hbWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGVhY2hBc3luY18xLmFycmF5KGxpc3RlbmVycywgZnVuY3Rpb24gKGxpc3RlbmVyLCBpLCBuZXh0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21pc2VIZWxwZXJzXzEuUHJvbWlzaWZ5KGxpc3RlbmVyKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldDogdGFyZ2V0LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmllbGROYW1lOiBzZXR0ZXIuZXhwcmVzc2lvbixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNvdXJjZTogc291cmNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KSkudGhlbihmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXh0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sIHByb21pc2UucmVqZWN0KTtcclxuICAgICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb21pc2UucmVzb2x2ZSh2YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvbWlzZS5yZXNvbHZlKHZhbHVlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjYXRjaCAoZXgpIHtcclxuICAgICAgICAgICAgICAgIHdhdGNoZXIuZW1pdChCaW5kaW5nLkVycm9yRXZlbnROYW1lLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0OiB0YXJnZXQsXHJcbiAgICAgICAgICAgICAgICAgICAgZmllbGQ6IHNldHRlci5leHByZXNzaW9uLFxyXG4gICAgICAgICAgICAgICAgICAgIEV4Y2VwdGlvbjogZXgsXHJcbiAgICAgICAgICAgICAgICAgICAgc291cmNlOiBzb3VyY2VcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgcHJvbWlzZS5yZWplY3QoZXgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuICAgIHNldFZhbHVlKHZhbHVlLCBzb3VyY2UsIGRvTm90VHJpZ2dlckV2ZW50cykge1xyXG4gICAgICAgIHZhciB0YXJnZXQgPSB0aGlzLnRhcmdldDtcclxuICAgICAgICB2YXIgc2V0dGVyID0gQmluZGluZy5nZXRTZXR0ZXIodGhpcy50YXJnZXQsIHRoaXMuZXhwcmVzc2lvbik7XHJcbiAgICAgICAgaWYgKHNldHRlciAhPSBudWxsKVxyXG4gICAgICAgICAgICBzZXR0ZXIodmFsdWUsIHNvdXJjZSB8fCB0aGlzLCBkb05vdFRyaWdnZXJFdmVudHMpO1xyXG4gICAgfVxyXG4gICAgO1xyXG59XHJcbkJpbmRpbmcuQ2hhbmdpbmdGaWVsZEV2ZW50TmFtZSA9IFwiZmllbGRDaGFuZ2luZ1wiO1xyXG5CaW5kaW5nLkNoYW5nZWRGaWVsZEV2ZW50TmFtZSA9IFwiZmllbGRDaGFuZ2VkXCI7XHJcbkJpbmRpbmcuRXJyb3JFdmVudE5hbWUgPSBcImJpbmRpbmdFcnJvclwiO1xyXG5leHBvcnRzLkJpbmRpbmcgPSBCaW5kaW5nO1xyXG5jbGFzcyBQcm9taXNlQmluZGluZyBleHRlbmRzIEJpbmRpbmcge1xyXG4gICAgY29uc3RydWN0b3IoZXhwcmVzc2lvbiwgdGFyZ2V0KSB7XHJcbiAgICAgICAgc3VwZXIoZXhwcmVzc2lvbiwgbnVsbCwgZmFsc2UpO1xyXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgICB2YXIgYmluZGluZyA9IG5ldyBCaW5kaW5nKGV4cHJlc3Npb24sIG51bGwpO1xyXG4gICAgICAgIGJpbmRpbmcucGlwZShzZWxmKTtcclxuICAgICAgICB2YXIgY2FsbGJhY2sgPSBmdW5jdGlvbiAodmFsdWUpIHtcclxuICAgICAgICAgICAgaWYgKHByb21pc2VIZWxwZXJzXzEuaXNQcm9taXNlTGlrZSh2YWx1ZSkpIHtcclxuICAgICAgICAgICAgICAgIHZhbHVlLnRoZW4oY2FsbGJhY2spO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGJpbmRpbmcuZm9ybWF0dGVyID0gc2VsZi5mb3JtYXR0ZXI7XHJcbiAgICAgICAgICAgIGJpbmRpbmcudGFyZ2V0ID0gdmFsdWU7XHJcbiAgICAgICAgICAgIHNlbGYuZW1pdChCaW5kaW5nLkNoYW5nZWRGaWVsZEV2ZW50TmFtZSwge1xyXG4gICAgICAgICAgICAgICAgdGFyZ2V0OiB2YWx1ZSxcclxuICAgICAgICAgICAgICAgIGV2ZW50QXJnczoge1xyXG4gICAgICAgICAgICAgICAgICAgIGZpZWxkTmFtZTogc2VsZi5leHByZXNzaW9uLFxyXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBzZWxmLmdldFZhbHVlKClcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBzb3VyY2U6IGJpbmRpbmdcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICB0YXJnZXQudGhlbihjYWxsYmFjayk7XHJcbiAgICB9XHJcbn1cclxuZXhwb3J0cy5Qcm9taXNlQmluZGluZyA9IFByb21pc2VCaW5kaW5nO1xyXG5pZiAodHlwZW9mIChBcnJheS5wcm90b3R5cGVbJ3JlcGxhY2UnXSkgPT0gJ3VuZGVmaW5lZCcpXHJcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoQXJyYXkucHJvdG90eXBlLCAncmVwbGFjZScsIHtcclxuICAgICAgICB2YWx1ZTogZnVuY3Rpb24gKGluZGV4LCBpdGVtKSB7XHJcbiAgICAgICAgICAgIHRoaXNbaW5kZXhdID0gaXRlbTtcclxuICAgICAgICB9LCBjb25maWd1cmFibGU6IHRydWUsIHdyaXRhYmxlOiB0cnVlLCBlbnVtZXJhYmxlOiBmYWxzZVxyXG4gICAgfSk7XHJcbmNsYXNzIE9ic2VydmFibGVBcnJheSBleHRlbmRzIGV2ZW50c18xLkV2ZW50RW1pdHRlciB7XHJcbiAgICBjb25zdHJ1Y3RvcihhcnJheSkge1xyXG4gICAgICAgIHN1cGVyKCk7XHJcbiAgICAgICAgdGhpcy5hcnJheSA9IGFycmF5O1xyXG4gICAgICAgIHRoaXMudW5zaGlmdCA9IGZ1bmN0aW9uIChpdGVtKSB7XHJcbiAgICAgICAgICAgIHRoaXMuYXJyYXkudW5zaGlmdChpdGVtKTtcclxuICAgICAgICAgICAgdGhpcy5lbWl0KCdjb2xsZWN0aW9uQ2hhbmdlZCcsIHtcclxuICAgICAgICAgICAgICAgIGFjdGlvbjogJ3Vuc2hpZnQnLFxyXG4gICAgICAgICAgICAgICAgbmV3SXRlbXM6IFtpdGVtXVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9O1xyXG4gICAgfVxyXG4gICAgZ2V0IGxlbmd0aCgpIHsgcmV0dXJuIHRoaXMuYXJyYXkubGVuZ3RoOyB9XHJcbiAgICBwdXNoKC4uLml0ZW1zKSB7XHJcbiAgICAgICAgdGhpcy5hcnJheS5wdXNoLmFwcGx5KHRoaXMuYXJyYXksIGl0ZW1zKTtcclxuICAgICAgICB0aGlzLmVtaXQoJ2NvbGxlY3Rpb25DaGFuZ2VkJywge1xyXG4gICAgICAgICAgICBhY3Rpb246ICdwdXNoJyxcclxuICAgICAgICAgICAgbmV3SXRlbXM6IGl0ZW1zXHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICA7XHJcbiAgICBzaGlmdCgpIHtcclxuICAgICAgICB2YXIgaXRlbSA9IHRoaXMuYXJyYXkuc2hpZnQoKTtcclxuICAgICAgICB0aGlzLmVtaXQoJ2NvbGxlY3Rpb25DaGFuZ2VkJywge1xyXG4gICAgICAgICAgICBhY3Rpb246ICdzaGlmdCcsXHJcbiAgICAgICAgICAgIG9sZEl0ZW1zOiBbaXRlbV1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIDtcclxuICAgIHBvcCgpIHtcclxuICAgICAgICB2YXIgaXRlbSA9IHRoaXMuYXJyYXkucG9wKCk7XHJcbiAgICAgICAgdGhpcy5lbWl0KCdjb2xsZWN0aW9uQ2hhbmdlZCcsIHtcclxuICAgICAgICAgICAgYWN0aW9uOiAncG9wJyxcclxuICAgICAgICAgICAgb2xkSXRlbXM6IFtpdGVtXVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgO1xyXG4gICAgcmVwbGFjZShpbmRleCwgaXRlbSkge1xyXG4gICAgICAgIHZhciBvbGRJdGVtID0gdGhpcy5hcnJheVtpbmRleF07XHJcbiAgICAgICAgdGhpcy5hcnJheVsncmVwbGFjZSddKGluZGV4LCBpdGVtKTtcclxuICAgICAgICB0aGlzLmVtaXQoJ2NvbGxlY3Rpb25DaGFuZ2VkJywge1xyXG4gICAgICAgICAgICBhY3Rpb246ICdyZXBsYWNlJyxcclxuICAgICAgICAgICAgbmV3SXRlbXM6IFtpdGVtXSxcclxuICAgICAgICAgICAgb2xkSXRlbXM6IFtvbGRJdGVtXVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgO1xyXG4gICAgaW5pdCgpIHtcclxuICAgICAgICB0aGlzLmVtaXQoJ2NvbGxlY3Rpb25DaGFuZ2VkJywge1xyXG4gICAgICAgICAgICBhY3Rpb246ICdpbml0JyxcclxuICAgICAgICAgICAgbmV3SXRlbXM6IHRoaXMuYXJyYXkuc2xpY2UoMClcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIGluZGV4T2YoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuYXJyYXkuaW5kZXhPZi5hcHBseSh0aGlzLmFycmF5LCBhcmd1bWVudHMpO1xyXG4gICAgfVxyXG4gICAgdG9TdHJpbmcoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuYXJyYXkudG9TdHJpbmcoKTtcclxuICAgIH1cclxuICAgIDtcclxufVxyXG5leHBvcnRzLk9ic2VydmFibGVBcnJheSA9IE9ic2VydmFibGVBcnJheTtcclxuO1xyXG5jbGFzcyBXYXRjaEJpbmRpbmcgZXh0ZW5kcyBCaW5kaW5nIHtcclxuICAgIGNvbnN0cnVjdG9yKGV4cHJlc3Npb24sIHRhcmdldCwgaW50ZXJ2YWwpIHtcclxuICAgICAgICBzdXBlcihleHByZXNzaW9uLCB0YXJnZXQsIHRydWUpO1xyXG4gICAgICAgIHNldEludGVydmFsKHRoaXMuY2hlY2suYmluZCh0aGlzKSwgaW50ZXJ2YWwpO1xyXG4gICAgfVxyXG4gICAgY2hlY2soKSB7XHJcbiAgICAgICAgdmFyIG5ld1ZhbHVlID0gdGhpcy5nZXRWYWx1ZSgpO1xyXG4gICAgICAgIGlmICh0aGlzLmxhc3RWYWx1ZSAhPT0gbmV3VmFsdWUpIHtcclxuICAgICAgICAgICAgdGhpcy5sYXN0VmFsdWUgPSBuZXdWYWx1ZTtcclxuICAgICAgICAgICAgdGhpcy5lbWl0KEJpbmRpbmcuQ2hhbmdlZEZpZWxkRXZlbnROYW1lLCB7XHJcbiAgICAgICAgICAgICAgICB0YXJnZXQ6IHRoaXMudGFyZ2V0LFxyXG4gICAgICAgICAgICAgICAgZXZlbnRBcmdzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgZmllbGROYW1lOiB0aGlzLmV4cHJlc3Npb24sXHJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IG5ld1ZhbHVlXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgc291cmNlOiB0aGlzXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5leHBvcnRzLldhdGNoQmluZGluZyA9IFdhdGNoQmluZGluZztcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9YmluZGVyLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbmZ1bmN0aW9uIGFycmF5KGFycmF5LCBib2R5LCBjb21wbGV0ZSkge1xyXG4gICAgdmFyIGxvb3AgPSBmdW5jdGlvbiAoaSkge1xyXG4gICAgICAgIGlmIChpID09IGFycmF5Lmxlbmd0aClcclxuICAgICAgICAgICAgY29tcGxldGUoKTtcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBib2R5KGFycmF5W2ldLCBpLCBmdW5jdGlvbiAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyb3IpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbXBsZXRlKGVycm9yKTtcclxuICAgICAgICAgICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldEltbWVkaWF0ZShsb29wLCBpICsgMSk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgY29tcGxldGUoZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgIH07XHJcbiAgICBsb29wKDApO1xyXG59XHJcbmV4cG9ydHMuYXJyYXkgPSBhcnJheTtcclxuZnVuY3Rpb24gb2JqZWN0KG8sIGJvZHksIGNvbXBsZXRlKSB7XHJcbiAgICBhcnJheShPYmplY3Qua2V5cyhvKSwgZnVuY3Rpb24gKGtleSwgaSwgbmV4dCkge1xyXG4gICAgICAgIGJvZHkob1trZXldLCBrZXksIG5leHQpO1xyXG4gICAgfSwgY29tcGxldGUpO1xyXG59XHJcbmV4cG9ydHMub2JqZWN0ID0gb2JqZWN0O1xyXG5mdW5jdGlvbiBhbnkoaXQsIGJvZHksIGNvbXBsZXRlKSB7XHJcbiAgICBpZiAoQXJyYXkuaXNBcnJheShpdCkgfHwgdHlwZW9mIChpdFsnbGVuZ3RoJ10pICE9ICd1bmRlZmluZWQnKVxyXG4gICAgICAgIHJldHVybiBhcnJheShpdCwgYm9keSwgY29tcGxldGUpO1xyXG4gICAgcmV0dXJuIG9iamVjdChpdCwgYm9keSwgY29tcGxldGUpO1xyXG59XHJcbmV4cG9ydHMuYW55ID0gYW55O1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1lYWNoQXN5bmMuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxuY29uc3QgaW5qZWN0b3JfMSA9IHJlcXVpcmUoXCIuL2luamVjdG9yXCIpO1xyXG5mdW5jdGlvbiBmYWN0b3J5KG5hbWUsIC4uLnRvSW5qZWN0KSB7XHJcbiAgICByZXR1cm4gZnVuY3Rpb24gKHRhcmdldCkge1xyXG4gICAgICAgIHZhciBpbnN0YW5jZSA9IG51bGw7XHJcbiAgICAgICAgdmFyIGZhY3RvcnkgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIGlmICghaW5zdGFuY2UpIHtcclxuICAgICAgICAgICAgICAgIHZhciBhcmdzID0gW251bGxdO1xyXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgYXJnIGluIGFyZ3VtZW50cylcclxuICAgICAgICAgICAgICAgICAgICBhcmdzLnB1c2goYXJndW1lbnRzW2FyZ10pO1xyXG4gICAgICAgICAgICAgICAgaW5zdGFuY2UgPSBuZXcgKHRhcmdldC5iaW5kLmFwcGx5KHRhcmdldCwgYXJncykpKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIGluc3RhbmNlLmJ1aWxkKCk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICBpZiAodG9JbmplY3QgPT0gbnVsbCB8fCB0b0luamVjdC5sZW5ndGggPT0gMClcclxuICAgICAgICAgICAgaW5qZWN0b3JfMS5yZWdpc3RlckZhY3RvcnkobmFtZSwgaW5qZWN0b3JfMS5pbmplY3QoZmFjdG9yeSkpO1xyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgICAgaW5qZWN0b3JfMS5yZWdpc3RlckZhY3RvcnkobmFtZSwgaW5qZWN0b3JfMS5pbmplY3RXaXRoTmFtZSh0b0luamVjdCwgZmFjdG9yeSkpO1xyXG4gICAgfTtcclxufVxyXG5leHBvcnRzLmZhY3RvcnkgPSBmYWN0b3J5O1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1mYWN0b3J5LmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbmZ1bmN0aW9uIGJvb2xlYW5pemUoYSkge1xyXG4gICAgcmV0dXJuICEhYTtcclxufVxyXG5leHBvcnRzLmJvb2xlYW5pemUgPSBib29sZWFuaXplO1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1ib29sZWFuaXplLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbmZ1bmN0aW9uIGlkZW50aXR5KGEpIHtcclxuICAgIHJldHVybiBhO1xyXG59XHJcbmV4cG9ydHMuaWRlbnRpdHkgPSBpZGVudGl0eTtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9aWRlbnRpdHkuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbmZ1bmN0aW9uIF9fZXhwb3J0KG0pIHtcclxuICAgIGZvciAodmFyIHAgaW4gbSkgaWYgKCFleHBvcnRzLmhhc093blByb3BlcnR5KHApKSBleHBvcnRzW3BdID0gbVtwXTtcclxufVxyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbl9fZXhwb3J0KHJlcXVpcmUoXCIuL2lkZW50aXR5XCIpKTtcclxuX19leHBvcnQocmVxdWlyZShcIi4vbmVnYXRlXCIpKTtcclxuX19leHBvcnQocmVxdWlyZShcIi4vYm9vbGVhbml6ZVwiKSk7XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWluZGV4LmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbmZ1bmN0aW9uIG5lZ2F0ZShhKSB7XHJcbiAgICByZXR1cm4gIWE7XHJcbn1cclxuZXhwb3J0cy5uZWdhdGUgPSBuZWdhdGU7XHJcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPW5lZ2F0ZS5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcclxuZnVuY3Rpb24gX19leHBvcnQobSkge1xyXG4gICAgZm9yICh2YXIgcCBpbiBtKSBpZiAoIWV4cG9ydHMuaGFzT3duUHJvcGVydHkocCkpIGV4cG9ydHNbcF0gPSBtW3BdO1xyXG59XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxuX19leHBvcnQocmVxdWlyZShcIi4vaW5qZWN0b3JcIikpO1xyXG5fX2V4cG9ydChyZXF1aXJlKFwiLi9mYWN0b3J5XCIpKTtcclxuX19leHBvcnQocmVxdWlyZShcIi4vc2VydmljZVwiKSk7XHJcbl9fZXhwb3J0KHJlcXVpcmUoXCIuL2JpbmRlclwiKSk7XHJcbl9fZXhwb3J0KHJlcXVpcmUoXCIuL3BhcnNlclwiKSk7XHJcbmNvbnN0IG1vZHVsZV8xID0gcmVxdWlyZShcIi4vbW9kdWxlXCIpO1xyXG5fX2V4cG9ydChyZXF1aXJlKFwiLi9wcm9taXNlSGVscGVyc1wiKSk7XHJcbnZhciBlYWNoQXN5bmNfMSA9IHJlcXVpcmUoXCIuL2VhY2hBc3luY1wiKTtcclxuZXhwb3J0cy5lYWNoQXN5bmMgPSBlYWNoQXN5bmNfMS5hbnk7XHJcbl9fZXhwb3J0KHJlcXVpcmUoXCIuL3JvdXRlclwiKSk7XHJcbmNvbnN0IGxvZyA9IHJlcXVpcmUoXCJkZWJ1Z1wiKTtcclxuZXhwb3J0cy5sb2cgPSBsb2c7XHJcbmZ1bmN0aW9uIGV4dGVuZCh0YXJnZXQsIC4uLmFyZ3MpIHtcclxuICAgIGFyZ3MuZm9yRWFjaChmdW5jdGlvbiAoYXJnKSB7XHJcbiAgICAgICAgT2JqZWN0LmtleXMoYXJnKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcclxuICAgICAgICAgICAgdmFyIGEgPSB0eXBlb2YgKHRhcmdldFtrZXldKTtcclxuICAgICAgICAgICAgc3dpdGNoICh0eXBlb2YgKHRhcmdldFtrZXldKSkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSAnb2JqZWN0JzpcclxuICAgICAgICAgICAgICAgICAgICBleHRlbmQodGFyZ2V0W2tleV0sIGFyZ1trZXldKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0W2tleV0gPSBhcmdba2V5XTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcbiAgICByZXR1cm4gdGFyZ2V0O1xyXG59XHJcbmV4cG9ydHMuZXh0ZW5kID0gZXh0ZW5kO1xyXG5mdW5jdGlvbiBtb2R1bGUobmFtZSwgLi4uZGVwZW5kZW5jaWVzKSB7XHJcbiAgICByZXR1cm4gbmV3IG1vZHVsZV8xLk1vZHVsZShuYW1lLCBkZXBlbmRlbmNpZXMpO1xyXG59XHJcbmV4cG9ydHMubW9kdWxlID0gbW9kdWxlO1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1pbmRleC5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5jb25zdCByZWZsZWN0XzEgPSByZXF1aXJlKFwiLi9yZWZsZWN0XCIpO1xyXG5mdW5jdGlvbiBjdG9yVG9GdW5jdGlvbigpIHtcclxuICAgIHZhciBhcmdzID0gW251bGxdO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspXHJcbiAgICAgICAgYXJnc1tpICsgMV0gPSBhcmd1bWVudHNbaV07XHJcbiAgICByZXR1cm4gbmV3IChGdW5jdGlvbi5wcm90b3R5cGUuYmluZC5hcHBseSh0aGlzLCBhcmdzKSk7XHJcbn1cclxuY2xhc3MgSW5qZWN0b3Ige1xyXG4gICAgY29uc3RydWN0b3IocGFyZW50KSB7XHJcbiAgICAgICAgdGhpcy5wYXJlbnQgPSBwYXJlbnQ7XHJcbiAgICAgICAgdGhpcy5pbmplY3RhYmxlcyA9IHt9O1xyXG4gICAgICAgIGlmICh0aGlzLnBhcmVudCA9PSBudWxsKVxyXG4gICAgICAgICAgICB0aGlzLnBhcmVudCA9IGRlZmF1bHRJbmplY3RvcjtcclxuICAgICAgICB0aGlzLnJlZ2lzdGVyKCckaW5qZWN0b3InLCB0aGlzKTtcclxuICAgIH1cclxuICAgIHNldEluamVjdGFibGVzKHZhbHVlKSB7XHJcbiAgICAgICAgdGhpcy5pbmplY3RhYmxlcyA9IHZhbHVlO1xyXG4gICAgfVxyXG4gICAga2V5cygpIHtcclxuICAgICAgICByZXR1cm4gT2JqZWN0LmtleXModGhpcy5pbmplY3RhYmxlcyk7XHJcbiAgICB9XHJcbiAgICBtZXJnZShpKSB7XHJcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgICAgIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKGkuaW5qZWN0YWJsZXMpLmZvckVhY2goZnVuY3Rpb24gKHByb3BlcnR5KSB7XHJcbiAgICAgICAgICAgIGlmIChwcm9wZXJ0eSAhPSAnJGluamVjdG9yJylcclxuICAgICAgICAgICAgICAgIHNlbGYucmVnaXN0ZXJEZXNjcmlwdG9yKHByb3BlcnR5LCBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKGkuaW5qZWN0YWJsZXMsIHByb3BlcnR5KSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBpbmplY3QoYSkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmluamVjdFdpdGhOYW1lKGFbJyRpbmplY3QnXSB8fCByZWZsZWN0XzEuZ2V0UGFyYW1OYW1lcyhhKSwgYSk7XHJcbiAgICB9XHJcbiAgICByZXNvbHZlKHBhcmFtKSB7XHJcbiAgICAgICAgaWYgKHR5cGVvZiAodGhpcy5pbmplY3RhYmxlc1twYXJhbV0pICE9ICd1bmRlZmluZWQnKVxyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pbmplY3RhYmxlc1twYXJhbV07XHJcbiAgICAgICAgaWYgKHRoaXMucGFyZW50KVxyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5wYXJlbnQucmVzb2x2ZShwYXJhbSk7XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcbiAgICBpbnNwZWN0KCkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKHRoaXMuaW5qZWN0YWJsZXMpO1xyXG4gICAgfVxyXG4gICAgaW5qZWN0TmV3V2l0aE5hbWUodG9JbmplY3QsIGN0b3IpIHtcclxuICAgICAgICByZXR1cm4gaW5qZWN0V2l0aE5hbWUodG9JbmplY3QsIGN0b3JUb0Z1bmN0aW9uLmJpbmQoY3RvcikpO1xyXG4gICAgfVxyXG4gICAgaW5qZWN0V2l0aE5hbWUodG9JbmplY3QsIGEpIHtcclxuICAgICAgICB2YXIgcGFyYW1OYW1lcyA9IHJlZmxlY3RfMS5nZXRQYXJhbU5hbWVzKGEpO1xyXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgICBpZiAocGFyYW1OYW1lcy5sZW5ndGggPT0gdG9JbmplY3QubGVuZ3RoIHx8IHBhcmFtTmFtZXMubGVuZ3RoID09IDApIHtcclxuICAgICAgICAgICAgaWYgKHRvSW5qZWN0Lmxlbmd0aCA9PSBwYXJhbU5hbWVzLmxlbmd0aCAmJiBwYXJhbU5hbWVzLmxlbmd0aCA9PSAwKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGE7XHJcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiAoaW5zdGFuY2UpIHtcclxuICAgICAgICAgICAgICAgIHZhciBhcmdzID0gW107XHJcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBwYXJhbSBvZiB0b0luamVjdCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGFyZ3NbYXJncy5sZW5ndGhdID0gc2VsZi5yZXNvbHZlKHBhcmFtKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiBhLmFwcGx5KGluc3RhbmNlLCBhcmdzKTtcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGluc3RhbmNlKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgYXJncyA9IFtdO1xyXG4gICAgICAgICAgICAgICAgdmFyIHVua25vd25BcmdJbmRleCA9IDA7XHJcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBwYXJhbSBvZiBwYXJhbU5hbWVzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBhcmFtIGluIHRvSW5qZWN0KVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhcmdzW2FyZ3MubGVuZ3RoXSA9IHNlbGYucmVzb2x2ZShwYXJhbSk7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAodHlwZW9mIChhcmd1bWVudHNbdW5rbm93bkFyZ0luZGV4XSkgIT0gJ3VuZGVmaW5lZCcpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3NbYXJncy5sZW5ndGhdID0gYXJndW1lbnRzW3Vua25vd25BcmdJbmRleCsrXTtcclxuICAgICAgICAgICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFyZ3NbYXJncy5sZW5ndGhdID0gbnVsbDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiBhLmFwcGx5KGluc3RhbmNlLCBhcmdzKTtcclxuICAgICAgICAgICAgfTtcclxuICAgIH1cclxuICAgIHVucmVnaXN0ZXIobmFtZSkge1xyXG4gICAgICAgIHZhciByZWdpc3RyYXRpb24gPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRoaXMuaW5qZWN0YWJsZXMsIG5hbWUpO1xyXG4gICAgICAgIGlmIChyZWdpc3RyYXRpb24pXHJcbiAgICAgICAgICAgIGRlbGV0ZSB0aGlzLmluamVjdGFibGVzW25hbWVdO1xyXG4gICAgfVxyXG4gICAgcmVnaXN0ZXIobmFtZSwgdmFsdWUsIG92ZXJyaWRlKSB7XHJcbiAgICAgICAgaWYgKHR5cGVvZiAodmFsdWUpICE9ICd1bmRlZmluZWQnICYmIHZhbHVlICE9PSBudWxsKVxyXG4gICAgICAgICAgICB0aGlzLnJlZ2lzdGVyRGVzY3JpcHRvcihuYW1lLCB7IHZhbHVlOiB2YWx1ZSwgZW51bWVyYWJsZTogdHJ1ZSwgY29uZmlndXJhYmxlOiB0cnVlIH0sIG92ZXJyaWRlKTtcclxuICAgICAgICByZXR1cm4gdmFsdWU7XHJcbiAgICB9XHJcbiAgICByZWdpc3RlckZhY3RvcnkobmFtZSwgdmFsdWUsIG92ZXJyaWRlKSB7XHJcbiAgICAgICAgdGhpcy5yZWdpc3RlcihuYW1lICsgJ0ZhY3RvcnknLCB2YWx1ZSwgb3ZlcnJpZGUpO1xyXG4gICAgICAgIHRoaXMucmVnaXN0ZXJEZXNjcmlwdG9yKG5hbWUsIHtcclxuICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWUoKTtcclxuICAgICAgICAgICAgfSwgZW51bWVyYWJsZTogdHJ1ZSwgY29uZmlndXJhYmxlOiB0cnVlXHJcbiAgICAgICAgfSwgb3ZlcnJpZGUpO1xyXG4gICAgICAgIHJldHVybiB2YWx1ZTtcclxuICAgIH1cclxuICAgIHJlZ2lzdGVyRGVzY3JpcHRvcihuYW1lLCB2YWx1ZSwgb3ZlcnJpZGUpIHtcclxuICAgICAgICBpZiAoIW92ZXJyaWRlICYmIHR5cGVvZiAodGhpcy5pbmplY3RhYmxlc1tuYW1lXSkgIT0gJ3VuZGVmaW5lZCcpXHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignVGhlcmUgaXMgYWxyZWFkeSBhIHJlZ2lzdGVyZWQgaXRlbSBmb3IgJyArIG5hbWUpO1xyXG4gICAgICAgIGlmICh0eXBlb2YgKHRoaXMuaW5qZWN0YWJsZXNbbmFtZV0pICE9PSAndW5kZWZpbmVkJylcclxuICAgICAgICAgICAgdGhpcy51bnJlZ2lzdGVyKG5hbWUpO1xyXG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLmluamVjdGFibGVzLCBuYW1lLCB2YWx1ZSk7XHJcbiAgICB9XHJcbn1cclxuZXhwb3J0cy5JbmplY3RvciA9IEluamVjdG9yO1xyXG5pZiAoIWdsb2JhbFsnJCRkZWZhdWx0SW5qZWN0b3InXSlcclxuICAgIGdsb2JhbFsnJCRkZWZhdWx0SW5qZWN0b3InXSA9IG5ldyBJbmplY3RvcigpO1xyXG52YXIgZGVmYXVsdEluamVjdG9yID0gZ2xvYmFsWyckJGRlZmF1bHRJbmplY3RvciddO1xyXG5mdW5jdGlvbiByZXNvbHZlKG5hbWUpIHtcclxuICAgIHJldHVybiBkZWZhdWx0SW5qZWN0b3IucmVzb2x2ZShuYW1lKTtcclxufVxyXG5leHBvcnRzLnJlc29sdmUgPSByZXNvbHZlO1xyXG5mdW5jdGlvbiB1bnJlZ2lzdGVyKG5hbWUpIHtcclxuICAgIHJldHVybiBkZWZhdWx0SW5qZWN0b3IudW5yZWdpc3RlcihuYW1lKTtcclxufVxyXG5leHBvcnRzLnVucmVnaXN0ZXIgPSB1bnJlZ2lzdGVyO1xyXG5mdW5jdGlvbiBtZXJnZShpKSB7XHJcbiAgICByZXR1cm4gZGVmYXVsdEluamVjdG9yLm1lcmdlKGkpO1xyXG59XHJcbmV4cG9ydHMubWVyZ2UgPSBtZXJnZTtcclxuZnVuY3Rpb24gaW5zcGVjdCgpIHtcclxuICAgIHJldHVybiBkZWZhdWx0SW5qZWN0b3IuaW5zcGVjdCgpO1xyXG59XHJcbmV4cG9ydHMuaW5zcGVjdCA9IGluc3BlY3Q7XHJcbmZ1bmN0aW9uIGluamVjdChhKSB7XHJcbiAgICByZXR1cm4gZGVmYXVsdEluamVjdG9yLmluamVjdChhKTtcclxufVxyXG5leHBvcnRzLmluamVjdCA9IGluamVjdDtcclxuZnVuY3Rpb24gaW5qZWN0V2l0aE5hbWUodG9JbmplY3QsIGEpIHtcclxuICAgIHJldHVybiBkZWZhdWx0SW5qZWN0b3IuaW5qZWN0V2l0aE5hbWUodG9JbmplY3QsIGEpO1xyXG59XHJcbmV4cG9ydHMuaW5qZWN0V2l0aE5hbWUgPSBpbmplY3RXaXRoTmFtZTtcclxuZnVuY3Rpb24gaW5qZWN0TmV3V2l0aE5hbWUodG9JbmplY3QsIGEpIHtcclxuICAgIHJldHVybiBkZWZhdWx0SW5qZWN0b3IuaW5qZWN0TmV3V2l0aE5hbWUodG9JbmplY3QsIGEpO1xyXG59XHJcbmV4cG9ydHMuaW5qZWN0TmV3V2l0aE5hbWUgPSBpbmplY3ROZXdXaXRoTmFtZTtcclxuZnVuY3Rpb24gcmVnaXN0ZXIobmFtZSwgdmFsdWUsIG92ZXJyaWRlKSB7XHJcbiAgICByZXR1cm4gZGVmYXVsdEluamVjdG9yLnJlZ2lzdGVyKG5hbWUsIHZhbHVlLCBvdmVycmlkZSk7XHJcbn1cclxuZXhwb3J0cy5yZWdpc3RlciA9IHJlZ2lzdGVyO1xyXG5mdW5jdGlvbiByZWdpc3RlckZhY3RvcnkobmFtZSwgdmFsdWUsIG92ZXJyaWRlKSB7XHJcbiAgICByZXR1cm4gZGVmYXVsdEluamVjdG9yLnJlZ2lzdGVyRmFjdG9yeShuYW1lLCB2YWx1ZSwgb3ZlcnJpZGUpO1xyXG59XHJcbmV4cG9ydHMucmVnaXN0ZXJGYWN0b3J5ID0gcmVnaXN0ZXJGYWN0b3J5O1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1pbmplY3Rvci5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5jb25zdCBkaSA9IHJlcXVpcmUoXCIuL2luamVjdG9yXCIpO1xyXG5jb25zdCBvcmNoZXN0cmF0b3IgPSByZXF1aXJlKFwib3JjaGVzdHJhdG9yXCIpO1xyXG5jb25zdCBldmVudHNfMSA9IHJlcXVpcmUoXCJldmVudHNcIik7XHJcbnByb2Nlc3MuaHJ0aW1lID0gcHJvY2Vzcy5ocnRpbWUgfHwgcmVxdWlyZSgnYnJvd3Nlci1wcm9jZXNzLWhydGltZScpO1xyXG5jbGFzcyBNb2R1bGUgZXh0ZW5kcyBkaS5JbmplY3RvciB7XHJcbiAgICBjb25zdHJ1Y3RvcihuYW1lLCBkZXApIHtcclxuICAgICAgICBzdXBlcigpO1xyXG4gICAgICAgIHRoaXMubmFtZSA9IG5hbWU7XHJcbiAgICAgICAgdGhpcy5kZXAgPSBkZXA7XHJcbiAgICAgICAgdGhpcy5lbWl0dGVyID0gbmV3IGV2ZW50c18xLkV2ZW50RW1pdHRlcigpO1xyXG4gICAgICAgIE1vZHVsZS5yZWdpc3Rlck1vZHVsZSh0aGlzKTtcclxuICAgIH1cclxuICAgIHN0YXRpYyByZWdpc3Rlck1vZHVsZShtKSB7XHJcbiAgICAgICAgdmFyIGVtaXR0ZXIgPSBtLmVtaXR0ZXI7XHJcbiAgICAgICAgTW9kdWxlLm8uYWRkKG0ubmFtZSwgbS5kZXAsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgZGkubWVyZ2UobSk7XHJcbiAgICAgICAgICAgIGVtaXR0ZXIuZW1pdCgnaW5pdCcpO1xyXG4gICAgICAgICAgICBlbWl0dGVyLmVtaXQoJ3J1bicpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgcnVuKHRvSW5qZWN0LCBmKSB7XHJcbiAgICAgICAgdGhpcy5lbWl0dGVyLm9uKCdydW4nLCBkaS5pbmplY3RXaXRoTmFtZSh0b0luamVjdCwgZikpO1xyXG4gICAgfVxyXG4gICAgaW5pdCh0b0luamVjdCwgZikge1xyXG4gICAgICAgIGlmICghdG9JbmplY3QgfHwgdG9JbmplY3QubGVuZ3RoID09IDApXHJcbiAgICAgICAgICAgIHRoaXMuZW1pdHRlci5vbignaW5pdCcsIGYpO1xyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgICAgdGhpcy5lbWl0dGVyLm9uKCdpbml0JywgZGkuaW5qZWN0V2l0aE5hbWUodG9JbmplY3QsIGYpKTtcclxuICAgIH1cclxuICAgIHN0YXJ0KHRvSW5qZWN0LCBmKSB7XHJcbiAgICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT0gMClcclxuICAgICAgICAgICAgTW9kdWxlLm8uc3RhcnQodGhpcy5uYW1lKTtcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgIE1vZHVsZS5vLm9uKCdzdG9wJywgZGkuaW5qZWN0V2l0aE5hbWUodG9JbmplY3QsIGYpKTtcclxuICAgIH1cclxuICAgIGludGVybmFsU3RhcnQoY2FsbGJhY2spIHtcclxuICAgICAgICBpZiAodGhpcy5zdGFydGluZylcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIHRoaXMuc3RhcnRpbmcgPSB0cnVlO1xyXG4gICAgfVxyXG59XHJcbk1vZHVsZS5vID0gbmV3IG9yY2hlc3RyYXRvcigpO1xyXG5leHBvcnRzLk1vZHVsZSA9IE1vZHVsZTtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9bW9kdWxlLmpzLm1hcCIsIlwidXNlIHN0cmljdFwiO1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbmNvbnN0IHByb21pc2VIZWxwZXJzXzEgPSByZXF1aXJlKFwiLi9wcm9taXNlSGVscGVyc1wiKTtcclxuY29uc3QgYmluZGVyXzEgPSByZXF1aXJlKFwiLi9iaW5kZXJcIik7XHJcbmNvbnN0IGZvcm1hdHRlcnMgPSByZXF1aXJlKFwiLi9mb3JtYXR0ZXJzXCIpO1xyXG52YXIganNvbktleVJlZ2V4ID0gL14gKig/Oig/OlwiKFteXCJdKylcIil8KD86JyhbXiddKyknKXwoPzooW15cXDogXSspKSAqKTogKi87XHJcbmNsYXNzIFBhcnNlZEJpbmFyeSB7XHJcbiAgICBjb25zdHJ1Y3RvcihvcGVyYXRvciwgbGVmdCwgcmlnaHQpIHtcclxuICAgICAgICB0aGlzLm9wZXJhdG9yID0gb3BlcmF0b3I7XHJcbiAgICAgICAgdGhpcy5sZWZ0ID0gbGVmdDtcclxuICAgICAgICB0aGlzLnJpZ2h0ID0gcmlnaHQ7XHJcbiAgICAgICAgdGhpcy4kJGxlbmd0aCA9IHRoaXMubGVmdC4kJGxlbmd0aCArIHRoaXMub3BlcmF0b3IubGVuZ3RoICsgdGhpcy5yaWdodC4kJGxlbmd0aDtcclxuICAgIH1cclxuICAgIGV2YWx1YXRlKHZhbHVlLCBhc0JpbmRpbmcpIHtcclxuICAgICAgICB2YXIgb3BlcmF0aW9uID0gdGhpcztcclxuICAgICAgICBpZiAoYXNCaW5kaW5nKSB7XHJcbiAgICAgICAgICAgIHZhciBsZWZ0LCByaWdodDtcclxuICAgICAgICAgICAgaWYgKG9wZXJhdGlvbi5sZWZ0IGluc3RhbmNlb2YgRnVuY3Rpb24pXHJcbiAgICAgICAgICAgICAgICBsZWZ0ID0gb3BlcmF0aW9uLmxlZnQodmFsdWUsIGFzQmluZGluZyk7XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKG9wZXJhdGlvbi5sZWZ0IGluc3RhbmNlb2YgUGFyc2VkQmluYXJ5KVxyXG4gICAgICAgICAgICAgICAgbGVmdCA9IG9wZXJhdGlvbi5sZWZ0LmV2YWx1YXRlKHZhbHVlLCBhc0JpbmRpbmcpO1xyXG4gICAgICAgICAgICBlbHNlIGlmIChvcGVyYXRpb24ubGVmdCBpbnN0YW5jZW9mIFBhcnNlZFN0cmluZylcclxuICAgICAgICAgICAgICAgIGxlZnQgPSBvcGVyYXRpb24ubGVmdC52YWx1ZTtcclxuICAgICAgICAgICAgZWxzZSBpZiAob3BlcmF0aW9uLmxlZnQgaW5zdGFuY2VvZiBQYXJzZWROdW1iZXIpXHJcbiAgICAgICAgICAgICAgICBsZWZ0ID0gb3BlcmF0aW9uLmxlZnQudmFsdWU7XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKG9wZXJhdGlvbi5sZWZ0IGluc3RhbmNlb2YgQXJyYXkpXHJcbiAgICAgICAgICAgICAgICBsZWZ0ID0gb3BlcmF0aW9uLmxlZnQ7XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKG9wZXJhdGlvbi5sZWZ0IGluc3RhbmNlb2YgT2JqZWN0KVxyXG4gICAgICAgICAgICAgICAgbGVmdCA9IG9wZXJhdGlvbi5sZWZ0O1xyXG4gICAgICAgICAgICBpZiAob3BlcmF0aW9uLnJpZ2h0IGluc3RhbmNlb2YgRnVuY3Rpb24pXHJcbiAgICAgICAgICAgICAgICByaWdodCA9IG9wZXJhdGlvbi5yaWdodCh2YWx1ZSwgYXNCaW5kaW5nKTtcclxuICAgICAgICAgICAgZWxzZSBpZiAob3BlcmF0aW9uLnJpZ2h0IGluc3RhbmNlb2YgUGFyc2VkQmluYXJ5KVxyXG4gICAgICAgICAgICAgICAgcmlnaHQgPSBvcGVyYXRpb24ucmlnaHQuZXZhbHVhdGUodmFsdWUsIGFzQmluZGluZyk7XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKG9wZXJhdGlvbi5yaWdodCBpbnN0YW5jZW9mIFBhcnNlZFN0cmluZylcclxuICAgICAgICAgICAgICAgIHJpZ2h0ID0gb3BlcmF0aW9uLnJpZ2h0LnZhbHVlO1xyXG4gICAgICAgICAgICBlbHNlIGlmIChvcGVyYXRpb24ucmlnaHQgaW5zdGFuY2VvZiBQYXJzZWROdW1iZXIpXHJcbiAgICAgICAgICAgICAgICByaWdodCA9IG9wZXJhdGlvbi5yaWdodC52YWx1ZTtcclxuICAgICAgICAgICAgZWxzZSBpZiAob3BlcmF0aW9uLnJpZ2h0IGluc3RhbmNlb2YgQXJyYXkpXHJcbiAgICAgICAgICAgICAgICByaWdodCA9IG9wZXJhdGlvbi5yaWdodDtcclxuICAgICAgICAgICAgZWxzZSBpZiAob3BlcmF0aW9uLnJpZ2h0IGluc3RhbmNlb2YgT2JqZWN0KVxyXG4gICAgICAgICAgICAgICAgcmlnaHQgPSBvcGVyYXRpb24ucmlnaHQ7XHJcbiAgICAgICAgICAgIHZhciBiaW5kaW5nID0gbmV3IGJpbmRlcl8xLkJpbmRpbmcobnVsbCwgbnVsbCwgZmFsc2UpO1xyXG4gICAgICAgICAgICBpZiAobGVmdCBpbnN0YW5jZW9mIGJpbmRlcl8xLkJpbmRpbmcpXHJcbiAgICAgICAgICAgICAgICBsZWZ0LnBpcGUoYmluZGluZyk7XHJcbiAgICAgICAgICAgIGlmIChyaWdodCBpbnN0YW5jZW9mIGJpbmRlcl8xLkJpbmRpbmcpXHJcbiAgICAgICAgICAgICAgICByaWdodC5waXBlKGJpbmRpbmcpO1xyXG4gICAgICAgICAgICBiaW5kaW5nWyckJGxlbmd0aCddID0gb3BlcmF0aW9uLiQkbGVuZ3RoO1xyXG4gICAgICAgICAgICBiaW5kaW5nLmdldFZhbHVlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIGZsZWZ0LCBmcmlnaHQ7XHJcbiAgICAgICAgICAgICAgICBpZiAobGVmdCBpbnN0YW5jZW9mIGJpbmRlcl8xLkJpbmRpbmcpXHJcbiAgICAgICAgICAgICAgICAgICAgZmxlZnQgPSBsZWZ0LmdldFZhbHVlKCk7XHJcbiAgICAgICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgZmxlZnQgPSBsZWZ0O1xyXG4gICAgICAgICAgICAgICAgaWYgKHJpZ2h0IGluc3RhbmNlb2YgYmluZGVyXzEuQmluZGluZylcclxuICAgICAgICAgICAgICAgICAgICBmcmlnaHQgPSByaWdodC5nZXRWYWx1ZSgpO1xyXG4gICAgICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgICAgIGZyaWdodCA9IHJpZ2h0O1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFBhcnNlci5vcGVyYXRlKG9wZXJhdGlvbi5vcGVyYXRvciwgZmxlZnQsIGZyaWdodCk7XHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIHJldHVybiBiaW5kaW5nO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgdmFyIGxlZnQsIHJpZ2h0O1xyXG4gICAgICAgICAgICBpZiAob3BlcmF0aW9uLmxlZnQgaW5zdGFuY2VvZiBGdW5jdGlvbilcclxuICAgICAgICAgICAgICAgIGxlZnQgPSBvcGVyYXRpb24ubGVmdCh2YWx1ZSwgZmFsc2UpO1xyXG4gICAgICAgICAgICBlbHNlIGlmIChvcGVyYXRpb24ubGVmdCBpbnN0YW5jZW9mIFBhcnNlZEJpbmFyeSlcclxuICAgICAgICAgICAgICAgIGxlZnQgPSBvcGVyYXRpb24ubGVmdC5ldmFsdWF0ZSh2YWx1ZSwgYXNCaW5kaW5nKTtcclxuICAgICAgICAgICAgZWxzZSBpZiAob3BlcmF0aW9uLmxlZnQgaW5zdGFuY2VvZiBQYXJzZWRTdHJpbmcpXHJcbiAgICAgICAgICAgICAgICBsZWZ0ID0gb3BlcmF0aW9uLmxlZnQudmFsdWU7XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKG9wZXJhdGlvbi5sZWZ0IGluc3RhbmNlb2YgUGFyc2VkTnVtYmVyKVxyXG4gICAgICAgICAgICAgICAgbGVmdCA9IG9wZXJhdGlvbi5sZWZ0LnZhbHVlO1xyXG4gICAgICAgICAgICBlbHNlIGlmIChvcGVyYXRpb24ubGVmdCBpbnN0YW5jZW9mIEFycmF5KVxyXG4gICAgICAgICAgICAgICAgbGVmdCA9IG9wZXJhdGlvbi5sZWZ0O1xyXG4gICAgICAgICAgICBlbHNlIGlmIChvcGVyYXRpb24ubGVmdCBpbnN0YW5jZW9mIE9iamVjdClcclxuICAgICAgICAgICAgICAgIGxlZnQgPSBvcGVyYXRpb24ubGVmdDtcclxuICAgICAgICAgICAgaWYgKG9wZXJhdGlvbi5yaWdodCBpbnN0YW5jZW9mIEZ1bmN0aW9uKVxyXG4gICAgICAgICAgICAgICAgcmlnaHQgPSBvcGVyYXRpb24ucmlnaHQodmFsdWUsIGZhbHNlKTtcclxuICAgICAgICAgICAgZWxzZSBpZiAob3BlcmF0aW9uLnJpZ2h0IGluc3RhbmNlb2YgUGFyc2VkQmluYXJ5KVxyXG4gICAgICAgICAgICAgICAgcmlnaHQgPSBvcGVyYXRpb24ucmlnaHQuZXZhbHVhdGUodmFsdWUsIGFzQmluZGluZyk7XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKG9wZXJhdGlvbi5yaWdodCBpbnN0YW5jZW9mIFBhcnNlZFN0cmluZylcclxuICAgICAgICAgICAgICAgIHJpZ2h0ID0gb3BlcmF0aW9uLnJpZ2h0LnZhbHVlO1xyXG4gICAgICAgICAgICBlbHNlIGlmIChvcGVyYXRpb24ucmlnaHQgaW5zdGFuY2VvZiBQYXJzZWROdW1iZXIpXHJcbiAgICAgICAgICAgICAgICByaWdodCA9IG9wZXJhdGlvbi5yaWdodC52YWx1ZTtcclxuICAgICAgICAgICAgZWxzZSBpZiAob3BlcmF0aW9uLnJpZ2h0IGluc3RhbmNlb2YgQXJyYXkpXHJcbiAgICAgICAgICAgICAgICByaWdodCA9IG9wZXJhdGlvbi5yaWdodDtcclxuICAgICAgICAgICAgZWxzZSBpZiAob3BlcmF0aW9uLnJpZ2h0IGluc3RhbmNlb2YgT2JqZWN0KVxyXG4gICAgICAgICAgICAgICAgcmlnaHQgPSBvcGVyYXRpb24ucmlnaHQ7XHJcbiAgICAgICAgICAgIHJldHVybiBQYXJzZXIub3BlcmF0ZShvcGVyYXRpb24ub3BlcmF0b3IsIGxlZnQsIHJpZ2h0KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBzdGF0aWMgYXBwbHlQcmVjZWRlbmNlKG9wZXJhdGlvbikge1xyXG4gICAgICAgIGlmIChvcGVyYXRpb24ub3BlcmF0b3IgIT0gJysnICYmIG9wZXJhdGlvbi5vcGVyYXRvciAhPSAnLScpIHtcclxuICAgICAgICAgICAgaWYgKG9wZXJhdGlvbi5yaWdodCBpbnN0YW5jZW9mIEZ1bmN0aW9uICYmIG9wZXJhdGlvbi5yaWdodC4kJGFzdCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIHJpZ2h0ID0gUGFyc2VkQmluYXJ5LmFwcGx5UHJlY2VkZW5jZShvcGVyYXRpb24ucmlnaHQuJCRhc3QpO1xyXG4gICAgICAgICAgICAgICAgc3dpdGNoIChyaWdodC5vcGVyYXRvcikge1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJysnOlxyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJy0nOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICBjYXNlICcqJzogLy8gYiooYytkKSA9PT4gKGIqYykrZFxyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJy8nOlxyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJyYmJzpcclxuICAgICAgICAgICAgICAgICAgICBjYXNlICd8fCc6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBsZWZ0ID0gb3BlcmF0aW9uLmxlZnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG9wZXJhdGlvbi5yaWdodCA9IHJpZ2h0LnJpZ2h0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBvcGVyYXRpb24ubGVmdCA9IG5ldyBQYXJzZWRCaW5hcnkob3BlcmF0aW9uLm9wZXJhdG9yLCBsZWZ0LCByaWdodC5sZWZ0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgb3BlcmF0aW9uLm9wZXJhdG9yID0gcmlnaHQub3BlcmF0b3I7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBvcGVyYXRpb247XHJcbiAgICB9XHJcbiAgICB0b1N0cmluZygpIHtcclxuICAgICAgICByZXR1cm4gJygnICsgdGhpcy5sZWZ0LnRvU3RyaW5nKCkgKyB0aGlzLm9wZXJhdG9yICsgdGhpcy5yaWdodC50b1N0cmluZygpICsgJyknO1xyXG4gICAgfVxyXG59XHJcbmV4cG9ydHMuUGFyc2VkQmluYXJ5ID0gUGFyc2VkQmluYXJ5O1xyXG5jbGFzcyBQYXJzZWRTdHJpbmcge1xyXG4gICAgY29uc3RydWN0b3IodmFsdWUpIHtcclxuICAgICAgICB0aGlzLnZhbHVlID0gdmFsdWU7XHJcbiAgICAgICAgdGhpcy4kJGxlbmd0aCA9IHZhbHVlLmxlbmd0aCArIDI7XHJcbiAgICB9XHJcbiAgICB0b1N0cmluZygpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy52YWx1ZTtcclxuICAgIH1cclxufVxyXG5leHBvcnRzLlBhcnNlZFN0cmluZyA9IFBhcnNlZFN0cmluZztcclxuY2xhc3MgUGFyc2VkTnVtYmVyIHtcclxuICAgIGNvbnN0cnVjdG9yKHZhbHVlKSB7XHJcbiAgICAgICAgdGhpcy52YWx1ZSA9IE51bWJlcih2YWx1ZSk7XHJcbiAgICAgICAgdGhpcy4kJGxlbmd0aCA9IHZhbHVlLmxlbmd0aDtcclxuICAgIH1cclxufVxyXG5leHBvcnRzLlBhcnNlZE51bWJlciA9IFBhcnNlZE51bWJlcjtcclxuY2xhc3MgUGFyc2VkQm9vbGVhbiB7XHJcbiAgICBjb25zdHJ1Y3Rvcih2YWx1ZSkge1xyXG4gICAgICAgIHRoaXMudmFsdWUgPSBCb29sZWFuKHZhbHVlKTtcclxuICAgICAgICBpZiAodHlwZW9mIHZhbHVlICE9ICd1bmRlZmluZWQnKVxyXG4gICAgICAgICAgICB0aGlzLiQkbGVuZ3RoID0gdmFsdWUudG9TdHJpbmcoKS5sZW5ndGg7XHJcbiAgICB9XHJcbn1cclxuZXhwb3J0cy5QYXJzZWRCb29sZWFuID0gUGFyc2VkQm9vbGVhbjtcclxuY2xhc3MgUGFyc2VyIHtcclxuICAgIHN0YXRpYyBwYXJzZShleHByZXNzaW9uLCBleGNsdWRlRmlyc3RMZXZlbEZ1bmN0aW9uKSB7XHJcbiAgICAgICAgZXhwcmVzc2lvbiA9IGV4cHJlc3Npb24udHJpbSgpO1xyXG4gICAgICAgIHZhciByZXN1bHQgPSBQYXJzZXIucGFyc2VBbnkoZXhwcmVzc2lvbiwgZXhjbHVkZUZpcnN0TGV2ZWxGdW5jdGlvbik7XHJcbiAgICAgICAgaWYgKCFleGNsdWRlRmlyc3RMZXZlbEZ1bmN0aW9uICYmIHJlc3VsdCBpbnN0YW5jZW9mIFBhcnNlZEJpbmFyeSlcclxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdC5ldmFsdWF0ZS5iaW5kKHJlc3VsdCk7XHJcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgIH1cclxuICAgIHN0YXRpYyBwYXJzZUFueShleHByZXNzaW9uLCBleGNsdWRlRmlyc3RMZXZlbEZ1bmN0aW9uKSB7XHJcbiAgICAgICAgc3dpdGNoIChleHByZXNzaW9uWzBdKSB7XHJcbiAgICAgICAgICAgIGNhc2UgJ3snOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFBhcnNlci5wYXJzZU9iamVjdChleHByZXNzaW9uLCBleGNsdWRlRmlyc3RMZXZlbEZ1bmN0aW9uKTtcclxuICAgICAgICAgICAgY2FzZSAnWyc6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gUGFyc2VyLnBhcnNlQXJyYXkoZXhwcmVzc2lvbiwgZXhjbHVkZUZpcnN0TGV2ZWxGdW5jdGlvbik7XHJcbiAgICAgICAgICAgIGNhc2UgJ1wiJzpcclxuICAgICAgICAgICAgY2FzZSBcIidcIjpcclxuICAgICAgICAgICAgICAgIHJldHVybiBQYXJzZXIucGFyc2VTdHJpbmcoZXhwcmVzc2lvbiwgZXhwcmVzc2lvblswXSk7XHJcbiAgICAgICAgICAgIGNhc2UgJzAnOlxyXG4gICAgICAgICAgICBjYXNlICcxJzpcclxuICAgICAgICAgICAgY2FzZSAnMic6XHJcbiAgICAgICAgICAgIGNhc2UgJzMnOlxyXG4gICAgICAgICAgICBjYXNlICc0JzpcclxuICAgICAgICAgICAgY2FzZSAnNSc6XHJcbiAgICAgICAgICAgIGNhc2UgJzYnOlxyXG4gICAgICAgICAgICBjYXNlICc3JzpcclxuICAgICAgICAgICAgY2FzZSAnOCc6XHJcbiAgICAgICAgICAgIGNhc2UgJzknOlxyXG4gICAgICAgICAgICBjYXNlICcuJzpcclxuICAgICAgICAgICAgICAgIHJldHVybiBQYXJzZXIucGFyc2VOdW1iZXIoZXhwcmVzc2lvbik7XHJcbiAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gUGFyc2VyLnBhcnNlRXZhbChleHByZXNzaW9uKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBzdGF0aWMgcGFyc2VOdW1iZXIoZXhwcmVzc2lvbikge1xyXG4gICAgICAgIHZhciByZXN1bHQgPSBuZXcgUGFyc2VkTnVtYmVyKC9eWzAtOS5dLy5leGVjKGV4cHJlc3Npb24pWzBdKTtcclxuICAgICAgICByZXR1cm4gUGFyc2VyLnRyeVBhcnNlT3BlcmF0b3IoZXhwcmVzc2lvbi5zdWJzdHJpbmcocmVzdWx0LiQkbGVuZ3RoKSwgcmVzdWx0KTtcclxuICAgIH1cclxuICAgIHN0YXRpYyBwYXJzZUJvb2xlYW4oZXhwcmVzc2lvbikge1xyXG4gICAgICAgIHZhciBmb3JtYXR0ZXIgPSBmb3JtYXR0ZXJzLmlkZW50aXR5O1xyXG4gICAgICAgIGlmIChleHByZXNzaW9uWzBdID09ICchJykge1xyXG4gICAgICAgICAgICBmb3JtYXR0ZXIgPSBmb3JtYXR0ZXJzLm5lZ2F0ZTtcclxuICAgICAgICAgICAgZXhwcmVzc2lvbiA9IGV4cHJlc3Npb24uc3Vic3RyaW5nKDEpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoZXhwcmVzc2lvblswXSA9PSAnIScpIHtcclxuICAgICAgICAgICAgZm9ybWF0dGVyID0gZm9ybWF0dGVycy5ib29sZWFuaXplO1xyXG4gICAgICAgICAgICBleHByZXNzaW9uID0gZXhwcmVzc2lvbi5zdWJzdHJpbmcoMSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICgvXnRydWV8ZmFsc2V8dW5kZWZpbmVkLy5leGVjKGV4cHJlc3Npb24pKSB7XHJcbiAgICAgICAgICAgIHZhciByZXN1bHQgPSBuZXcgUGFyc2VkQm9vbGVhbigvXnRydWV8ZmFsc2V8dW5kZWZpbmVkLy5leGVjKGV4cHJlc3Npb24pWzBdKTtcclxuICAgICAgICAgICAgaWYgKGZvcm1hdHRlciAhPT0gZm9ybWF0dGVycy5pZGVudGl0eSlcclxuICAgICAgICAgICAgICAgIHJlc3VsdC52YWx1ZSA9IGZvcm1hdHRlcihyZXN1bHQudmFsdWUpO1xyXG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuICAgIHN0YXRpYyBwYXJzZUV2YWwoZXhwcmVzc2lvbikge1xyXG4gICAgICAgIHZhciBiID0gUGFyc2VyLnBhcnNlQm9vbGVhbihleHByZXNzaW9uKTtcclxuICAgICAgICBpZiAoYilcclxuICAgICAgICAgICAgcmV0dXJuIGI7XHJcbiAgICAgICAgcmV0dXJuIFBhcnNlci5wYXJzZUZ1bmN0aW9uKGV4cHJlc3Npb24pO1xyXG4gICAgfVxyXG4gICAgc3RhdGljIHBhcnNlRnVuY3Rpb24oZXhwcmVzc2lvbikge1xyXG4gICAgICAgIHZhciBsZW5ndGggPSAwO1xyXG4gICAgICAgIHZhciBmb3JtYXR0ZXIgPSBmb3JtYXR0ZXJzLmlkZW50aXR5O1xyXG4gICAgICAgIGlmIChleHByZXNzaW9uWzBdID09ICchJykge1xyXG4gICAgICAgICAgICBmb3JtYXR0ZXIgPSBmb3JtYXR0ZXJzLm5lZ2F0ZTtcclxuICAgICAgICAgICAgZXhwcmVzc2lvbiA9IGV4cHJlc3Npb24uc3Vic3RyaW5nKDEpO1xyXG4gICAgICAgICAgICBsZW5ndGgrKztcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGV4cHJlc3Npb25bMF0gPT0gJyEnKSB7XHJcbiAgICAgICAgICAgIGZvcm1hdHRlciA9IGZvcm1hdHRlcnMuYm9vbGVhbml6ZTtcclxuICAgICAgICAgICAgZXhwcmVzc2lvbiA9IGV4cHJlc3Npb24uc3Vic3RyaW5nKDEpO1xyXG4gICAgICAgICAgICBsZW5ndGgrKztcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGl0ZW0gPSAvXltcXHcwLTlcXC5cXCRdKy8uZXhlYyhleHByZXNzaW9uKVswXTtcclxuICAgICAgICBsZW5ndGggKz0gaXRlbS5sZW5ndGg7XHJcbiAgICAgICAgdmFyIHBhcnRzID0gUGFyc2VyLnBhcnNlQmluZGFibGUoaXRlbSk7XHJcbiAgICAgICAgdmFyIGYgPSBmdW5jdGlvbiAodmFsdWUsIGFzQmluZGluZykge1xyXG4gICAgICAgICAgICBpZiAoYXNCaW5kaW5nKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAocHJvbWlzZUhlbHBlcnNfMS5pc1Byb21pc2VMaWtlKHZhbHVlKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBiaW5kaW5nID0gbmV3IGJpbmRlcl8xLlByb21pc2VCaW5kaW5nKGl0ZW0sIHZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICBiaW5kaW5nWyckJGxlbmd0aCddID0gaXRlbS5sZW5ndGg7XHJcbiAgICAgICAgICAgICAgICAgICAgYmluZGluZy5mb3JtYXR0ZXIgPSBmb3JtYXR0ZXI7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGJpbmRpbmc7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB2YXIgYmluZGluZyA9IG5ldyBiaW5kZXJfMS5CaW5kaW5nKGl0ZW0sIHZhbHVlKTtcclxuICAgICAgICAgICAgICAgIGJpbmRpbmdbJyQkbGVuZ3RoJ10gPSBpdGVtLmxlbmd0aDtcclxuICAgICAgICAgICAgICAgIGJpbmRpbmcuZm9ybWF0dGVyID0gZm9ybWF0dGVyO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGJpbmRpbmc7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXJ0cy5sZW5ndGggJiYgdmFsdWU7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZVtwYXJ0c1tpXV07XHJcbiAgICAgICAgICAgICAgICBpZiAocHJvbWlzZUhlbHBlcnNfMS5pc1Byb21pc2VMaWtlKHZhbHVlKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh2YWx1ZSBpbnN0YW5jZW9mIHByb21pc2VIZWxwZXJzXzEuRGVmZXJyZWQgJiYgdmFsdWUuJCRzdGF0dXMgPT0gcHJvbWlzZUhlbHBlcnNfMS5Qcm9taXNlU3RhdHVzLlJlc29sdmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gdmFsdWUuJCR2YWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBwcm9taXNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaSA9PSBwYXJ0cy5sZW5ndGggLSAxKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJvbWlzZSA9IHZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9taXNlID0gdmFsdWUudGhlbihQYXJzZXIucGFyc2VGdW5jdGlvbihwYXJ0cy5zbGljZShpICsgMSkuam9pbignLicpKSkudGhlbihmb3JtYXR0ZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9taXNlWyckJGxlbmd0aCddID0gaXRlbS5sZW5ndGg7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBwcm9taXNlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gdmFsdWU7XHJcbiAgICAgICAgfTtcclxuICAgICAgICBmLiQkbGVuZ3RoID0gbGVuZ3RoO1xyXG4gICAgICAgIGYgPSBQYXJzZXIudHJ5UGFyc2VPcGVyYXRvcihleHByZXNzaW9uLnN1YnN0cihpdGVtLmxlbmd0aCksIGYpO1xyXG4gICAgICAgIHJldHVybiBmO1xyXG4gICAgfVxyXG4gICAgc3RhdGljIHRyeVBhcnNlT3BlcmF0b3IoZXhwcmVzc2lvbiwgbGhzKSB7XHJcbiAgICAgICAgdmFyIG9wZXJhdG9yID0gL14gKihbPD49IVxcK1xcLVxcL1xcKiZcXHxdKykgKi8uZXhlYyhleHByZXNzaW9uKTtcclxuICAgICAgICBpZiAob3BlcmF0b3IpIHtcclxuICAgICAgICAgICAgZXhwcmVzc2lvbiA9IGV4cHJlc3Npb24uc3Vic3RyaW5nKG9wZXJhdG9yWzBdLmxlbmd0aCk7XHJcbiAgICAgICAgICAgIHZhciByaHMgPSBQYXJzZXIucGFyc2VBbnkoZXhwcmVzc2lvbiwgZmFsc2UpO1xyXG4gICAgICAgICAgICB2YXIgYmluYXJ5ID0gbmV3IFBhcnNlZEJpbmFyeShvcGVyYXRvclsxXSwgbGhzLCByaHMpO1xyXG4gICAgICAgICAgICBiaW5hcnkuJCRsZW5ndGggPSBsaHMuJCRsZW5ndGggKyBvcGVyYXRvclswXS5sZW5ndGggKyByaHMuJCRsZW5ndGg7XHJcbiAgICAgICAgICAgIHJldHVybiBQYXJzZWRCaW5hcnkuYXBwbHlQcmVjZWRlbmNlKGJpbmFyeSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgICAgcmV0dXJuIGxocztcclxuICAgIH1cclxuICAgIHN0YXRpYyBwYXJzZUFycmF5KGV4cHJlc3Npb24sIGV4Y2x1ZGVGaXJzdExldmVsRnVuY3Rpb24pIHtcclxuICAgICAgICB2YXIgcmVzdWx0cyA9IFtdO1xyXG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShyZXN1bHRzLCAnJCRsZW5ndGgnLCB7IHZhbHVlOiAwLCBlbnVtZXJhYmxlOiBmYWxzZSwgY29uZmlndXJhYmxlOiB0cnVlLCB3cml0YWJsZTogdHJ1ZSB9KTtcclxuICAgICAgICB2YXIgaXNGdW5jdGlvbiA9IGZhbHNlO1xyXG4gICAgICAgIHJldHVybiBQYXJzZXIucGFyc2VDU1YoZXhwcmVzc2lvbiwgZnVuY3Rpb24gKHJlc3VsdCkge1xyXG4gICAgICAgICAgICB2YXIgaXRlbSA9IFBhcnNlci5wYXJzZUFueShyZXN1bHQsIGZhbHNlKTtcclxuICAgICAgICAgICAgaXRlbSA9IFBhcnNlci50cnlQYXJzZU9wZXJhdG9yKHJlc3VsdC5zdWJzdHJpbmcoaXRlbS4kJGxlbmd0aCksIGl0ZW0pO1xyXG4gICAgICAgICAgICBpZiAoaXRlbSBpbnN0YW5jZW9mIFBhcnNlZEJvb2xlYW4gfHwgaXRlbSBpbnN0YW5jZW9mIFBhcnNlZFN0cmluZyB8fCBpdGVtIGluc3RhbmNlb2YgUGFyc2VkTnVtYmVyKVxyXG4gICAgICAgICAgICAgICAgcmVzdWx0cy5wdXNoKGl0ZW0udmFsdWUpO1xyXG4gICAgICAgICAgICBlbHNlIGlmIChpdGVtIGluc3RhbmNlb2YgUGFyc2VkQmluYXJ5KVxyXG4gICAgICAgICAgICAgICAgcmVzdWx0cy5wdXNoKGl0ZW0uZXZhbHVhdGUuYmluZChpdGVtKSk7XHJcbiAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgICAgIHJlc3VsdHMucHVzaChpdGVtKTtcclxuICAgICAgICAgICAgcmVzdWx0cy4kJGxlbmd0aCArPSBpdGVtLiQkbGVuZ3RoO1xyXG4gICAgICAgICAgICByZXR1cm4gaXRlbTtcclxuICAgICAgICB9LCAnXScsIHJlc3VsdHMsIGV4Y2x1ZGVGaXJzdExldmVsRnVuY3Rpb24pO1xyXG4gICAgfVxyXG4gICAgc3RhdGljIHBhcnNlU3RyaW5nKGV4cHJlc3Npb24sIHN0YXJ0KSB7XHJcbiAgICAgICAgdmFyIGV2YWx1YXRlZFJlZ2V4ID0gbmV3IFJlZ0V4cChcIl5cIiArIHN0YXJ0ICsgXCIoKD86W15cXFxcXCIgKyBzdGFydCArIFwiXXxcXFxcLikrKVwiICsgc3RhcnQpLmV4ZWMoZXhwcmVzc2lvbik7XHJcbiAgICAgICAgLy8gY29uc29sZS5sb2coYXJndW1lbnRzKTtcclxuICAgICAgICB2YXIgcmVzdWx0ID0gZXZhbHVhdGVkUmVnZXhbMV07XHJcbiAgICAgICAgdmFyIHBhcnNlZFN0cmluZyA9IG5ldyBQYXJzZWRTdHJpbmcocmVzdWx0KTtcclxuICAgICAgICByZXR1cm4gUGFyc2VyLnRyeVBhcnNlT3BlcmF0b3IoZXhwcmVzc2lvbi5zdWJzdHJpbmcoZXZhbHVhdGVkUmVnZXhbMF0ubGVuZ3RoKSwgcGFyc2VkU3RyaW5nKTtcclxuICAgIH1cclxuICAgIHN0YXRpYyBvcGVyYXRlKG9wZXJhdG9yLCBsZWZ0LCByaWdodCkge1xyXG4gICAgICAgIC8vIGlmIChhcmd1bWVudHMubGVuZ3RoID09IDEpXHJcbiAgICAgICAgLy8gICAgIHJldHVybiBmdW5jdGlvbiAobGVmdDogYW55LCByaWdodDogYW55KVxyXG4gICAgICAgIC8vICAgICB7XHJcbiAgICAgICAgLy8gICAgICAgICByZXR1cm4gUGFyc2VyLm9wZXJhdGUob3BlcmF0b3IsIGxlZnQsIHJpZ2h0KTtcclxuICAgICAgICAvLyAgICAgfVxyXG4gICAgICAgIHN3aXRjaCAob3BlcmF0b3IpIHtcclxuICAgICAgICAgICAgY2FzZSAnPT0nOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGxlZnQgPT0gcmlnaHQ7XHJcbiAgICAgICAgICAgIGNhc2UgJz09PSc6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbGVmdCA9PT0gcmlnaHQ7XHJcbiAgICAgICAgICAgIGNhc2UgJzwnOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGxlZnQgPCByaWdodDtcclxuICAgICAgICAgICAgY2FzZSAnPD0nOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGxlZnQgPD0gcmlnaHQ7XHJcbiAgICAgICAgICAgIGNhc2UgJz4nOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGxlZnQgPiByaWdodDtcclxuICAgICAgICAgICAgY2FzZSAnPj0nOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGxlZnQgPj0gcmlnaHQ7XHJcbiAgICAgICAgICAgIGNhc2UgJyE9JzpcclxuICAgICAgICAgICAgICAgIHJldHVybiBsZWZ0ICE9IHJpZ2h0O1xyXG4gICAgICAgICAgICBjYXNlICchPT0nOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGxlZnQgIT09IHJpZ2h0O1xyXG4gICAgICAgICAgICBjYXNlICcrJzpcclxuICAgICAgICAgICAgICAgIHJldHVybiBsZWZ0ICsgcmlnaHQ7XHJcbiAgICAgICAgICAgIGNhc2UgJy0nOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGxlZnQgLSByaWdodDtcclxuICAgICAgICAgICAgY2FzZSAnLyc6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbGVmdCAvIHJpZ2h0O1xyXG4gICAgICAgICAgICBjYXNlICcqJzpcclxuICAgICAgICAgICAgICAgIHJldHVybiBsZWZ0ICogcmlnaHQ7XHJcbiAgICAgICAgICAgIGNhc2UgJ3x8JzpcclxuICAgICAgICAgICAgICAgIHJldHVybiBsZWZ0IHx8IHJpZ2h0O1xyXG4gICAgICAgICAgICBjYXNlICcmJic6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbGVmdCAmJiByaWdodDtcclxuICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignaW52YWxpZCBvcGVyYXRvcicgKyBvcGVyYXRvcik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgc3RhdGljIHBhcnNlQ1NWKGV4cHJlc3Npb24sIHBhcnNlSXRlbSwgZW5kLCBvdXRwdXQsIGV4Y2x1ZGVGaXJzdExldmVsRnVuY3Rpb24pIHtcclxuICAgICAgICBleHByZXNzaW9uID0gZXhwcmVzc2lvbi5zdWJzdHJpbmcoMSk7XHJcbiAgICAgICAgb3V0cHV0LiQkbGVuZ3RoKys7XHJcbiAgICAgICAgdmFyIGlzRnVuY3Rpb24gPSBmYWxzZTtcclxuICAgICAgICBkbyB7XHJcbiAgICAgICAgICAgIHZhciBpdGVtID0gcGFyc2VJdGVtKGV4cHJlc3Npb24pO1xyXG4gICAgICAgICAgICBpZiAoaXRlbSBpbnN0YW5jZW9mIEZ1bmN0aW9uIHx8IGl0ZW0gaW5zdGFuY2VvZiBQYXJzZWRCaW5hcnkpXHJcbiAgICAgICAgICAgICAgICBpc0Z1bmN0aW9uID0gdHJ1ZTtcclxuICAgICAgICAgICAgZXhwcmVzc2lvbiA9IGV4cHJlc3Npb24uc3Vic3RyaW5nKGl0ZW0uJCRsZW5ndGgpO1xyXG4gICAgICAgICAgICB2YXIgbmV4dCA9IC9eICosICovLmV4ZWMoZXhwcmVzc2lvbik7XHJcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGV4cHJlc3Npb24pXHJcbiAgICAgICAgICAgIGlmICghbmV4dClcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBleHByZXNzaW9uID0gZXhwcmVzc2lvbi5zdWJzdHJpbmcobmV4dFswXS5sZW5ndGgpO1xyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhleHByZXNzaW9uKTtcclxuICAgICAgICAgICAgb3V0cHV0LiQkbGVuZ3RoICs9IG5leHRbMF0ubGVuZ3RoO1xyXG4gICAgICAgIH0gd2hpbGUgKGV4cHJlc3Npb25bMF0gIT0gZW5kKTtcclxuICAgICAgICBvdXRwdXQuJCRsZW5ndGggKz0gZW5kLmxlbmd0aDtcclxuICAgICAgICAvLyBjb25zb2xlLmxvZyhvdXRwdXQuJCRsZW5ndGgpO1xyXG4gICAgICAgIHZhciByZXN1bHQ7XHJcbiAgICAgICAgaWYgKG91dHB1dCBpbnN0YW5jZW9mIEFycmF5KVxyXG4gICAgICAgICAgICByZXN1bHQgPSBbXTtcclxuICAgICAgICBlbHNlXHJcbiAgICAgICAgICAgIHJlc3VsdCA9IHt9O1xyXG4gICAgICAgIGlmIChpc0Z1bmN0aW9uICYmICFleGNsdWRlRmlyc3RMZXZlbEZ1bmN0aW9uKSB7XHJcbiAgICAgICAgICAgIHZhciBmID0gZnVuY3Rpb24gKHZhbHVlLCBhc0JpbmRpbmcpIHtcclxuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgaW4gb3V0cHV0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG91dHB1dFtpXSBpbnN0YW5jZW9mIEZ1bmN0aW9uKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHRbaV0gPSBvdXRwdXRbaV0odmFsdWUsIGFzQmluZGluZyk7XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHRbaV0gPSBvdXRwdXRbaV07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICBmLiQkbGVuZ3RoID0gb3V0cHV0LiQkbGVuZ3RoO1xyXG4gICAgICAgICAgICByZXR1cm4gZjtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICByZXR1cm4gb3V0cHV0O1xyXG4gICAgfVxyXG4gICAgc3RhdGljIHBhcnNlT2JqZWN0KGV4cHJlc3Npb24sIGV4Y2x1ZGVGaXJzdExldmVsRnVuY3Rpb24pIHtcclxuICAgICAgICB2YXIga2V5TWF0Y2g7XHJcbiAgICAgICAgdmFyIHJlc3VsdCA9IHt9O1xyXG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShyZXN1bHQsICckJGxlbmd0aCcsIHsgdmFsdWU6IDAsIGVudW1lcmFibGU6IGZhbHNlLCB3cml0YWJsZTogdHJ1ZSwgY29uZmlndXJhYmxlOiB0cnVlIH0pO1xyXG4gICAgICAgIHJldHVybiBQYXJzZXIucGFyc2VDU1YoZXhwcmVzc2lvbiwgZnVuY3Rpb24gKGV4cHJlc3Npb24pIHtcclxuICAgICAgICAgICAgLy8gdmFyIGxlbmd0aCA9IDA7XHJcbiAgICAgICAgICAgIHZhciBrZXlNYXRjaCA9IGpzb25LZXlSZWdleC5leGVjKGV4cHJlc3Npb24pO1xyXG4gICAgICAgICAgICB2YXIga2V5ID0ga2V5TWF0Y2hbMV0gfHwga2V5TWF0Y2hbMl0gfHwga2V5TWF0Y2hbM107XHJcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2coa2V5TWF0Y2gpO1xyXG4gICAgICAgICAgICB2YXIgbGVuZ3RoID0ga2V5TWF0Y2hbMF0ubGVuZ3RoICsga2V5TWF0Y2guaW5kZXg7XHJcbiAgICAgICAgICAgIGV4cHJlc3Npb24gPSBleHByZXNzaW9uLnN1YnN0cmluZyhsZW5ndGgpO1xyXG4gICAgICAgICAgICB2YXIgaXRlbSA9IFBhcnNlci5wYXJzZUFueShleHByZXNzaW9uLCBmYWxzZSk7XHJcbiAgICAgICAgICAgIGxlbmd0aCArPSBpdGVtLiQkbGVuZ3RoO1xyXG4gICAgICAgICAgICBpZiAoaXRlbSBpbnN0YW5jZW9mIFBhcnNlZEJvb2xlYW4gfHwgaXRlbSBpbnN0YW5jZW9mIFBhcnNlZFN0cmluZyB8fCBpdGVtIGluc3RhbmNlb2YgUGFyc2VkTnVtYmVyKVxyXG4gICAgICAgICAgICAgICAgcmVzdWx0W2tleV0gPSBpdGVtLnZhbHVlO1xyXG4gICAgICAgICAgICBlbHNlIGlmIChpdGVtIGluc3RhbmNlb2YgUGFyc2VkQmluYXJ5KVxyXG4gICAgICAgICAgICAgICAgcmVzdWx0W2tleV0gPSBpdGVtLmV2YWx1YXRlLmJpbmQoaXRlbSk7XHJcbiAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgICAgIHJlc3VsdFtrZXldID0gaXRlbTtcclxuICAgICAgICAgICAgLy8gZXhwcmVzc2lvbiA9IGV4cHJlc3Npb24uc3Vic3RyaW5nKHJlc3VsdFtrZXldLiQkbGVuZ3RoKTtcclxuICAgICAgICAgICAgaXRlbS4kJGxlbmd0aCA9IGxlbmd0aDtcclxuICAgICAgICAgICAgcmVzdWx0LiQkbGVuZ3RoICs9IGxlbmd0aDtcclxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coZXhwcmVzc2lvbik7XHJcbiAgICAgICAgICAgIC8vY29uc29sZS5sb2cobGVuZ3RoKTtcclxuICAgICAgICAgICAgcmV0dXJuIGl0ZW07XHJcbiAgICAgICAgfSwgJ30nLCByZXN1bHQsIGV4Y2x1ZGVGaXJzdExldmVsRnVuY3Rpb24pO1xyXG4gICAgfVxyXG4gICAgc3RhdGljIHBhcnNlQmluZGFibGUoZXhwcmVzc2lvbikge1xyXG4gICAgICAgIHJldHVybiBleHByZXNzaW9uLnNwbGl0KCcuJyk7XHJcbiAgICB9XHJcbiAgICBzdGF0aWMgZ2V0U2V0dGVyKGV4cHJlc3Npb24sIHJvb3QpIHtcclxuICAgICAgICB2YXIgdGFyZ2V0ID0gcm9vdDtcclxuICAgICAgICB2YXIgcGFydHMgPSBQYXJzZXIucGFyc2VCaW5kYWJsZShleHByZXNzaW9uKTtcclxuICAgICAgICB3aGlsZSAocGFydHMubGVuZ3RoID4gMSAmJiB0eXBlb2YgKHRhcmdldCkgIT0gJ3VuZGVmaW5lZCcpIHtcclxuICAgICAgICAgICAgdGFyZ2V0ID0gUGFyc2VyLmV2YWwocGFydHNbMF0sIHRhcmdldCk7XHJcbiAgICAgICAgICAgIHBhcnRzLnNoaWZ0KCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh0eXBlb2YgKHRhcmdldCkgPT0gJ3VuZGVmaW5lZCcpXHJcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIHJldHVybiB7IGV4cHJlc3Npb246IHBhcnRzWzBdLCB0YXJnZXQ6IHRhcmdldCwgc2V0OiBmdW5jdGlvbiAodmFsdWUpIHsgdGFyZ2V0W3BhcnRzWzBdXSA9IHZhbHVlOyB9IH07XHJcbiAgICB9XHJcbiAgICBzdGF0aWMgZXZhbEFzRnVuY3Rpb24oZXhwcmVzc2lvbiwgZXhjbHVkZUZpcnN0TGV2ZWxGdW5jdGlvbikge1xyXG4gICAgICAgIGlmICghZXhwcmVzc2lvbilcclxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgdmFyIHBhcnRzID0gUGFyc2VyLnBhcnNlKGV4cHJlc3Npb24sIGV4Y2x1ZGVGaXJzdExldmVsRnVuY3Rpb24pO1xyXG4gICAgICAgIGlmIChwYXJ0cyBpbnN0YW5jZW9mIEFycmF5KVxyXG4gICAgICAgICAgICByZXR1cm4gUGFyc2VyLnBhcnNlRnVuY3Rpb24oZXhwcmVzc2lvbik7XHJcbiAgICAgICAgcmV0dXJuIHBhcnRzO1xyXG4gICAgfVxyXG4gICAgc3RhdGljIGV2YWwoZXhwcmVzc2lvbiwgdmFsdWUpIHtcclxuICAgICAgICByZXR1cm4gUGFyc2VyLmV2YWxBc0Z1bmN0aW9uKGV4cHJlc3Npb24sIGZhbHNlKSh2YWx1ZSwgZmFsc2UpO1xyXG4gICAgfVxyXG59XHJcbmV4cG9ydHMuUGFyc2VyID0gUGFyc2VyO1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1wYXJzZXIuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxuY29uc3QgZXZlbnRzXzEgPSByZXF1aXJlKFwiZXZlbnRzXCIpO1xyXG5mdW5jdGlvbiBQcm9taXNpZnkobykge1xyXG4gICAgaWYgKG8gJiYgbyBpbnN0YW5jZW9mIFByb21pc2UpXHJcbiAgICAgICAgcmV0dXJuIG87XHJcbiAgICBpZiAobyAmJiBvWyd0aGVuJ10pXHJcbiAgICAgICAgcmV0dXJuIG87XHJcbiAgICB2YXIgZGVmZXJyZWQgPSBuZXcgRGVmZXJyZWQoKTtcclxuICAgIHZhciBlID0gbmV3IEVycm9yKCk7XHJcbiAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAvLyBjb25zb2xlLmRlYnVnKGUuc3RhY2spO1xyXG4gICAgICAgIGRlZmVycmVkLnJlc29sdmUobyk7XHJcbiAgICB9KTtcclxuICAgIHJldHVybiBkZWZlcnJlZDtcclxufVxyXG5leHBvcnRzLlByb21pc2lmeSA9IFByb21pc2lmeTtcclxuZnVuY3Rpb24gaXNQcm9taXNlTGlrZShvKSB7XHJcbiAgICByZXR1cm4gbyAmJiBvWyd0aGVuJ10gJiYgdHlwZW9mIChvWyd0aGVuJ10pID09ICdmdW5jdGlvbic7XHJcbn1cclxuZXhwb3J0cy5pc1Byb21pc2VMaWtlID0gaXNQcm9taXNlTGlrZTtcclxuZnVuY3Rpb24gd2hlbihwcm9taXNlcykge1xyXG4gICAgaWYgKHByb21pc2VzICYmICFwcm9taXNlcy5sZW5ndGgpXHJcbiAgICAgICAgcmV0dXJuIFByb21pc2lmeShudWxsKTtcclxuICAgIGlmIChwcm9taXNlcyAmJiBwcm9taXNlcy5sZW5ndGggPT0gMSlcclxuICAgICAgICByZXR1cm4gcHJvbWlzZXNbMF07XHJcbiAgICB2YXIgcmVzdWx0cyA9IG5ldyBBcnJheShwcm9taXNlcy5sZW5ndGgpO1xyXG4gICAgdmFyIGRlZmVycmVkID0gbmV3IERlZmVycmVkKCk7XHJcbiAgICB2YXIgY29tcGxldGVkID0gMDtcclxuICAgIHByb21pc2VzLmZvckVhY2goZnVuY3Rpb24gKHByb21pc2UsIGlkeCkge1xyXG4gICAgICAgIHByb21pc2UudGhlbihmdW5jdGlvbiAocmVzdWx0KSB7XHJcbiAgICAgICAgICAgIHJlc3VsdHNbaWR4XSA9IHJlc3VsdDtcclxuICAgICAgICAgICAgaWYgKCsrY29tcGxldGVkID09IHByb21pc2VzLmxlbmd0aClcclxuICAgICAgICAgICAgICAgIGRlZmVycmVkLnJlc29sdmUocmVzdWx0cyk7XHJcbiAgICAgICAgfSwgZnVuY3Rpb24gKHJlamVjdGlvbikge1xyXG4gICAgICAgICAgICBkZWZlcnJlZC5yZWplY3QocmVqZWN0aW9uKTtcclxuICAgICAgICB9KTtcclxuICAgIH0pO1xyXG59XHJcbmV4cG9ydHMud2hlbiA9IHdoZW47XHJcbnZhciBQcm9taXNlU3RhdHVzO1xyXG4oZnVuY3Rpb24gKFByb21pc2VTdGF0dXMpIHtcclxuICAgIFByb21pc2VTdGF0dXNbUHJvbWlzZVN0YXR1c1tcIlBlbmRpbmdcIl0gPSAwXSA9IFwiUGVuZGluZ1wiO1xyXG4gICAgUHJvbWlzZVN0YXR1c1tQcm9taXNlU3RhdHVzW1wiUmVzb2x2ZWRcIl0gPSAxXSA9IFwiUmVzb2x2ZWRcIjtcclxuICAgIFByb21pc2VTdGF0dXNbUHJvbWlzZVN0YXR1c1tcIlJlamVjdGVkXCJdID0gMl0gPSBcIlJlamVjdGVkXCI7XHJcbn0pKFByb21pc2VTdGF0dXMgPSBleHBvcnRzLlByb21pc2VTdGF0dXMgfHwgKGV4cG9ydHMuUHJvbWlzZVN0YXR1cyA9IHt9KSk7XHJcbmNsYXNzIERlZmVycmVkIGV4dGVuZHMgZXZlbnRzXzEuRXZlbnRFbWl0dGVyIHtcclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHN1cGVyKCk7XHJcbiAgICAgICAgdGhpcy4kJHN0YXR1cyA9IFByb21pc2VTdGF0dXMuUGVuZGluZztcclxuICAgIH1cclxuICAgIHJlc29sdmUodmFsKSB7XHJcbiAgICAgICAgaWYgKGlzUHJvbWlzZUxpa2UodmFsKSlcclxuICAgICAgICAgICAgdmFsLnRoZW4odGhpcy5yZXNvbHZlLmJpbmQodGhpcyksIHRoaXMucmVqZWN0LmJpbmQodGhpcykpO1xyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLiQkc3RhdHVzID0gUHJvbWlzZVN0YXR1cy5SZXNvbHZlZDtcclxuICAgICAgICAgICAgdGhpcy4kJHZhbHVlID0gdmFsO1xyXG4gICAgICAgICAgICB0aGlzLmVtaXQoJ3Jlc29sdmUnLCB2YWwpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJlamVjdChyZWFzb24pIHtcclxuICAgICAgICB0aGlzLiQkdmFsdWUgPSByZWFzb247XHJcbiAgICAgICAgdGhpcy4kJHN0YXR1cyA9IFByb21pc2VTdGF0dXMuUmVqZWN0ZWQ7XHJcbiAgICAgICAgdGhpcy5lbWl0KCdyZWplY3QnLCByZWFzb24pO1xyXG4gICAgfVxyXG4gICAgdGhlbihvbmZ1bGZpbGxlZCwgb25yZWplY3RlZCkge1xyXG4gICAgICAgIHN3aXRjaCAodGhpcy4kJHN0YXR1cykge1xyXG4gICAgICAgICAgICBjYXNlIFByb21pc2VTdGF0dXMuUmVzb2x2ZWQ6XHJcbiAgICAgICAgICAgICAgICB2YXIgZGVmZXJyZWQgPSBuZXcgRGVmZXJyZWQoKTtcclxuICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSBvbmZ1bGZpbGxlZCh0aGlzLiQkdmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiAocmVzdWx0KSA9PSAndW5kZWZpbmVkJylcclxuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSB0aGlzLiQkdmFsdWU7XHJcbiAgICAgICAgICAgICAgICBzZXRJbW1lZGlhdGUoZGVmZXJyZWQucmVzb2x2ZS5iaW5kKGRlZmVycmVkKSwgUHJvbWlzaWZ5KHJlc3VsdCkpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGRlZmVycmVkO1xyXG4gICAgICAgICAgICBjYXNlIFByb21pc2VTdGF0dXMuUmVqZWN0ZWQ6XHJcbiAgICAgICAgICAgICAgICB2YXIgZGVmZXJyZWQgPSBuZXcgRGVmZXJyZWQoKTtcclxuICAgICAgICAgICAgICAgIHZhciByZWplY3Rpb24gPSBvbnJlamVjdGVkKHRoaXMuJCR2YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIChyZWplY3Rpb24pID09ICd1bmRlZmluZWQnKVxyXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdGlvbiA9IHRoaXMuJCR2YWx1ZTtcclxuICAgICAgICAgICAgICAgIHNldEltbWVkaWF0ZShkZWZlcnJlZC5yZWplY3QuYmluZChkZWZlcnJlZCksIFByb21pc2lmeShyZWplY3Rpb24pKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBkZWZlcnJlZDtcclxuICAgICAgICAgICAgY2FzZSBQcm9taXNlU3RhdHVzLlBlbmRpbmc6XHJcbiAgICAgICAgICAgICAgICB2YXIgbmV4dCA9IG5ldyBEZWZlcnJlZCgpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vbmNlKCdyZXNvbHZlJywgZnVuY3Rpb24gKHZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHJlc3VsdCA9IG9uZnVsZmlsbGVkKHZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIChyZXN1bHQpID09ICd1bmRlZmluZWQnKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXh0LnJlc29sdmUodmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmV4dC5yZXNvbHZlKHJlc3VsdCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIHRoaXMub25jZSgncmVqZWN0JywgZnVuY3Rpb24gKHZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9ucmVqZWN0ZWQpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5leHQucmVqZWN0KG9ucmVqZWN0ZWQodmFsdWUpKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG5leHQ7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcbmV4cG9ydHMuRGVmZXJyZWQgPSBEZWZlcnJlZDtcclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9cHJvbWlzZUhlbHBlcnMuanMubWFwIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxudmFyIFNUUklQX0NPTU1FTlRTID0gLygoXFwvXFwvLiokKXwoXFwvXFwqW1xcc1xcU10qP1xcKlxcLykpL21nO1xyXG5mdW5jdGlvbiBnZXRQYXJhbU5hbWVzKGZ1bmMpIHtcclxuICAgIHZhciBmblN0ciA9IGZ1bmMudG9TdHJpbmcoKS5yZXBsYWNlKFNUUklQX0NPTU1FTlRTLCAnJyk7XHJcbiAgICB2YXIgcmVzdWx0ID0gZm5TdHIuc2xpY2UoZm5TdHIuaW5kZXhPZignKCcpICsgMSwgZm5TdHIuaW5kZXhPZignKScpKS5tYXRjaCgvKFteXFxzLF0rKS9nKTtcclxuICAgIGlmIChyZXN1bHQgPT09IG51bGwpXHJcbiAgICAgICAgcmVzdWx0ID0gW107XHJcbiAgICByZXR1cm4gcmVzdWx0O1xyXG59XHJcbmV4cG9ydHMuZ2V0UGFyYW1OYW1lcyA9IGdldFBhcmFtTmFtZXM7XHJcbmZ1bmN0aW9uIGVzY2FwZVJlZ0V4cChzdHIpIHtcclxuICAgIHJldHVybiBzdHIucmVwbGFjZSgvW1xcLVxcW1xcXVxce1xcfVxcKFxcKVxcKlxcK1xcP1xcLlxcXFxcXF5cXCRcXHxdL2csIFwiXFxcXCQmXCIpO1xyXG59XHJcbmV4cG9ydHMuZXNjYXBlUmVnRXhwID0gZXNjYXBlUmVnRXhwO1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1yZWZsZWN0LmpzLm1hcCIsIi8qIVxyXG4gKiByb3V0ZXJcclxuICogQ29weXJpZ2h0KGMpIDIwMTMgUm9tYW4gU2h0eWxtYW5cclxuICogQ29weXJpZ2h0KGMpIDIwMTQgRG91Z2xhcyBDaHJpc3RvcGhlciBXaWxzb25cclxuICogTUlUIExpY2Vuc2VkXHJcbiAqL1xyXG4ndXNlIHN0cmljdCc7XHJcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcclxuLyoqXHJcbiAqIE1vZHVsZSBkZXBlbmRlbmNpZXMuXHJcbiAqIEBwcml2YXRlXHJcbiAqL1xyXG52YXIgZGVidWcgPSByZXF1aXJlKCdkZWJ1ZycpKCdyb3V0ZXInKTtcclxuY29uc3QgZmxhdHRlbiA9IHJlcXVpcmUoXCJhcnJheS1mbGF0dGVuXCIpO1xyXG5jb25zdCBsYXllcl8xID0gcmVxdWlyZShcIi4vbGF5ZXJcIik7XHJcbmV4cG9ydHMuTGF5ZXIgPSBsYXllcl8xLkxheWVyO1xyXG4vLyBpbXBvcnQgKiBhcyBtZXRob2RzIGZyb20gJ21ldGhvZHMnO1xyXG5jb25zdCBtaXhpbiA9IHJlcXVpcmUoXCJ1dGlscy1tZXJnZVwiKTtcclxuY29uc3QgcGFyc2VVcmwgPSByZXF1aXJlKFwicGFyc2V1cmxcIik7XHJcbmNvbnN0IHJvdXRlXzEgPSByZXF1aXJlKFwiLi9yb3V0ZVwiKTtcclxuZXhwb3J0cy5Sb3V0ZSA9IHJvdXRlXzEuUm91dGU7XHJcbnZhciBzbGljZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZTtcclxuLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxudmFyIGRlZmVyID0gdHlwZW9mIHNldEltbWVkaWF0ZSA9PT0gJ2Z1bmN0aW9uJ1xyXG4gICAgPyBzZXRJbW1lZGlhdGVcclxuICAgIDogZnVuY3Rpb24gKGZuLCAuLi5hcmdzKSB7IHByb2Nlc3MubmV4dFRpY2soZm4uYmluZC5hcHBseShmbiwgYXJndW1lbnRzKSk7IH07XHJcbmNsYXNzIFJvdXRlciB7XHJcbiAgICBjb25zdHJ1Y3RvcihvcHRpb25zKSB7XHJcbiAgICAgICAgdGhpcy5wYXJhbXMgPSB7fTtcclxuICAgICAgICB0aGlzLnN0YWNrID0gW107XHJcbiAgICAgICAgdGhpcy5yb3V0ZXIgPSB0aGlzLmhhbmRsZS5iaW5kKHRoaXMpO1xyXG4gICAgICAgIHZhciBvcHRzID0gb3B0aW9ucyB8fCB7fTtcclxuICAgICAgICB0aGlzLmNhc2VTZW5zaXRpdmUgPSBvcHRzLmNhc2VTZW5zaXRpdmU7XHJcbiAgICAgICAgdGhpcy5tZXJnZVBhcmFtcyA9IG9wdHMubWVyZ2VQYXJhbXM7XHJcbiAgICAgICAgdGhpcy5zdHJpY3QgPSBvcHRzLnN0cmljdDtcclxuICAgICAgICB0aGlzLmxlbmd0aCA9IG9wdHMubGVuZ3RoIHx8IDI7XHJcbiAgICB9XHJcbiAgICAvKipcclxuICAgICAqIE1hcCB0aGUgZ2l2ZW4gcGFyYW0gcGxhY2Vob2xkZXIgYG5hbWVgKHMpIHRvIHRoZSBnaXZlbiBjYWxsYmFjay5cclxuICAgICAqXHJcbiAgICAgKiBQYXJhbWV0ZXIgbWFwcGluZyBpcyB1c2VkIHRvIHByb3ZpZGUgcHJlLWNvbmRpdGlvbnMgdG8gcm91dGVzXHJcbiAgICAgKiB3aGljaCB1c2Ugbm9ybWFsaXplZCBwbGFjZWhvbGRlcnMuIEZvciBleGFtcGxlIGEgXzp1c2VyX2lkXyBwYXJhbWV0ZXJcclxuICAgICAqIGNvdWxkIGF1dG9tYXRpY2FsbHkgbG9hZCBhIHVzZXIncyBpbmZvcm1hdGlvbiBmcm9tIHRoZSBkYXRhYmFzZSB3aXRob3V0XHJcbiAgICAgKiBhbnkgYWRkaXRpb25hbCBjb2RlLlxyXG4gICAgICpcclxuICAgICAqIFRoZSBjYWxsYmFjayB1c2VzIHRoZSBzYW1lIHNpZ25hdHVyZSBhcyBtaWRkbGV3YXJlLCB0aGUgb25seSBkaWZmZXJlbmNlXHJcbiAgICAgKiBiZWluZyB0aGF0IHRoZSB2YWx1ZSBvZiB0aGUgcGxhY2Vob2xkZXIgaXMgcGFzc2VkLCBpbiB0aGlzIGNhc2UgdGhlIF9pZF9cclxuICAgICAqIG9mIHRoZSB1c2VyLiBPbmNlIHRoZSBgbmV4dCgpYCBmdW5jdGlvbiBpcyBpbnZva2VkLCBqdXN0IGxpa2UgbWlkZGxld2FyZVxyXG4gICAgICogaXQgd2lsbCBjb250aW51ZSBvbiB0byBleGVjdXRlIHRoZSByb3V0ZSwgb3Igc3Vic2VxdWVudCBwYXJhbWV0ZXIgZnVuY3Rpb25zLlxyXG4gICAgICpcclxuICAgICAqIEp1c3QgbGlrZSBpbiBtaWRkbGV3YXJlLCB5b3UgbXVzdCBlaXRoZXIgcmVzcG9uZCB0byB0aGUgcmVxdWVzdCBvciBjYWxsIG5leHRcclxuICAgICAqIHRvIGF2b2lkIHN0YWxsaW5nIHRoZSByZXF1ZXN0LlxyXG4gICAgICpcclxuICAgICAqICByb3V0ZXIucGFyYW0oJ3VzZXJfaWQnLCBmdW5jdGlvbihyZXEsIHJlcywgbmV4dCwgaWQpe1xyXG4gICAgICogICAgVXNlci5maW5kKGlkLCBmdW5jdGlvbihlcnIsIHVzZXIpe1xyXG4gICAgICogICAgICBpZiAoZXJyKSB7XHJcbiAgICAgKiAgICAgICAgcmV0dXJuIG5leHQoZXJyKVxyXG4gICAgICogICAgICB9IGVsc2UgaWYgKCF1c2VyKSB7XHJcbiAgICAgKiAgICAgICAgcmV0dXJuIG5leHQobmV3IEVycm9yKCdmYWlsZWQgdG8gbG9hZCB1c2VyJykpXHJcbiAgICAgKiAgICAgIH1cclxuICAgICAqICAgICAgcmVxLnVzZXIgPSB1c2VyXHJcbiAgICAgKiAgICAgIG5leHQoKVxyXG4gICAgICogICAgfSlcclxuICAgICAqICB9KVxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lXHJcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBmblxyXG4gICAgICogQHB1YmxpY1xyXG4gICAgICovXHJcbiAgICBwYXJhbShuYW1lLCBmbikge1xyXG4gICAgICAgIGlmICghbmFtZSkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdhcmd1bWVudCBuYW1lIGlzIHJlcXVpcmVkJyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh0eXBlb2YgbmFtZSAhPT0gJ3N0cmluZycpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignYXJndW1lbnQgbmFtZSBtdXN0IGJlIGEgc3RyaW5nJyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICghZm4pIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignYXJndW1lbnQgZm4gaXMgcmVxdWlyZWQnKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHR5cGVvZiBmbiAhPT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdhcmd1bWVudCBmbiBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIHBhcmFtcyA9IHRoaXMucGFyYW1zW25hbWVdO1xyXG4gICAgICAgIGlmICghcGFyYW1zKSB7XHJcbiAgICAgICAgICAgIHBhcmFtcyA9IHRoaXMucGFyYW1zW25hbWVdID0gW107XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHBhcmFtcy5wdXNoKGZuKTtcclxuICAgICAgICByZXR1cm4gdGhpcztcclxuICAgIH1cclxuICAgIC8qKlxyXG4gICAgICogRGlzcGF0Y2ggYSByZXEsIHJlcyBpbnRvIHRoZSByb3V0ZXIuXHJcbiAgICAgKlxyXG4gICAgICogQHByaXZhdGVcclxuICAgICAqL1xyXG4gICAgaGFuZGxlKHJlcSwgLi4ucmVzdCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmludGVybmFsSGFuZGxlLmFwcGx5KHRoaXMsIFt7fSwgcmVxXS5jb25jYXQocmVzdCkpO1xyXG4gICAgfVxyXG4gICAgaW50ZXJuYWxIYW5kbGUob3B0aW9ucywgcmVxLCAuLi5yZXN0KSB7XHJcbiAgICAgICAgdmFyIGNhbGxiYWNrID0gcmVzdFtyZXN0Lmxlbmd0aCAtIDFdO1xyXG4gICAgICAgIGlmICghY2FsbGJhY2spIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignYXJndW1lbnQgY2FsbGJhY2sgaXMgcmVxdWlyZWQnKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZGVidWcoJ2Rpc3BhdGNoaW5nICVzICVzJywgcmVxWydtZXRob2QnXSB8fCAnJywgcmVxLnVybCk7XHJcbiAgICAgICAgdmFyIGlkeCA9IDA7XHJcbiAgICAgICAgdmFyIHJlbW92ZWQgPSAnJztcclxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICAgICAgdmFyIHNsYXNoQWRkZWQgPSBmYWxzZTtcclxuICAgICAgICB2YXIgcGFyYW1jYWxsZWQgPSB7fTtcclxuICAgICAgICAvLyBtaWRkbGV3YXJlIGFuZCByb3V0ZXNcclxuICAgICAgICB2YXIgc3RhY2sgPSB0aGlzLnN0YWNrO1xyXG4gICAgICAgIC8vIG1hbmFnZSBpbnRlci1yb3V0ZXIgdmFyaWFibGVzXHJcbiAgICAgICAgdmFyIHBhcmVudFBhcmFtcyA9IHJlcS5wYXJhbXM7XHJcbiAgICAgICAgdmFyIHBhcmVudFVybCA9IHJlcS5iYXNlVXJsIHx8ICcnO1xyXG4gICAgICAgIHZhciBkb25lID0gUm91dGVyLnJlc3RvcmUoY2FsbGJhY2ssIHJlcSwgJ2Jhc2VVcmwnLCAnbmV4dCcsICdwYXJhbXMnKTtcclxuICAgICAgICAvLyBzZXR1cCBuZXh0IGxheWVyXHJcbiAgICAgICAgcmVxLm5leHQgPSBuZXh0O1xyXG4gICAgICAgIGlmIChvcHRpb25zICYmIG9wdGlvbnMucHJlSGFuZGxlKSB7XHJcbiAgICAgICAgICAgIGRvbmUgPSBvcHRpb25zLnByZUhhbmRsZShkb25lKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gc2V0dXAgYmFzaWMgcmVxIHZhbHVlc1xyXG4gICAgICAgIHJlcS5iYXNlVXJsID0gcGFyZW50VXJsO1xyXG4gICAgICAgIHJlcS5vcmlnaW5hbFVybCA9IHJlcS5vcmlnaW5hbFVybCB8fCByZXEudXJsO1xyXG4gICAgICAgIG5leHQoKTtcclxuICAgICAgICBmdW5jdGlvbiBuZXh0KGVycikge1xyXG4gICAgICAgICAgICB2YXIgbGF5ZXJFcnJvciA9IGVyciA9PT0gJ3JvdXRlJ1xyXG4gICAgICAgICAgICAgICAgPyBudWxsXHJcbiAgICAgICAgICAgICAgICA6IGVycjtcclxuICAgICAgICAgICAgLy8gcmVtb3ZlIGFkZGVkIHNsYXNoXHJcbiAgICAgICAgICAgIGlmIChzbGFzaEFkZGVkKSB7XHJcbiAgICAgICAgICAgICAgICByZXEudXJsID0gcmVxLnVybC5zdWJzdHIoMSk7XHJcbiAgICAgICAgICAgICAgICBzbGFzaEFkZGVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8gcmVzdG9yZSBhbHRlcmVkIHJlcS51cmxcclxuICAgICAgICAgICAgaWYgKHJlbW92ZWQubGVuZ3RoICE9PSAwKSB7XHJcbiAgICAgICAgICAgICAgICByZXEuYmFzZVVybCA9IHBhcmVudFVybDtcclxuICAgICAgICAgICAgICAgIHJlcS51cmwgPSByZW1vdmVkICsgcmVxLnVybDtcclxuICAgICAgICAgICAgICAgIHJlbW92ZWQgPSAnJztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyBzaWduYWwgdG8gZXhpdCByb3V0ZXJcclxuICAgICAgICAgICAgaWYgKGxheWVyRXJyb3IgPT09ICdyb3V0ZXInKSB7XHJcbiAgICAgICAgICAgICAgICBkZWZlcihkb25lLCBudWxsKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyBubyBtb3JlIG1hdGNoaW5nIGxheWVyc1xyXG4gICAgICAgICAgICBpZiAoaWR4ID49IHN0YWNrLmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgZGVmZXIoZG9uZSwgbGF5ZXJFcnJvcik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8gZ2V0IHBhdGhuYW1lIG9mIHJlcXVlc3RcclxuICAgICAgICAgICAgdmFyIHBhdGggPSBSb3V0ZXIuZ2V0UGF0aG5hbWUocmVxKTtcclxuICAgICAgICAgICAgaWYgKHBhdGggPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGRvbmUobGF5ZXJFcnJvcik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8gZmluZCBuZXh0IG1hdGNoaW5nIGxheWVyXHJcbiAgICAgICAgICAgIHZhciBsYXllcjtcclxuICAgICAgICAgICAgdmFyIG1hdGNoO1xyXG4gICAgICAgICAgICB2YXIgcm91dGU7XHJcbiAgICAgICAgICAgIHdoaWxlIChtYXRjaCAhPT0gdHJ1ZSAmJiBpZHggPCBzdGFjay5sZW5ndGgpIHtcclxuICAgICAgICAgICAgICAgIGxheWVyID0gc3RhY2tbaWR4KytdO1xyXG4gICAgICAgICAgICAgICAgbWF0Y2ggPSBSb3V0ZXIubWF0Y2hMYXllcihsYXllciwgcGF0aCk7XHJcbiAgICAgICAgICAgICAgICByb3V0ZSA9IGxheWVyLnJvdXRlO1xyXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBtYXRjaCAhPT0gJ2Jvb2xlYW4nKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gaG9sZCBvbiB0byBsYXllckVycm9yXHJcbiAgICAgICAgICAgICAgICAgICAgbGF5ZXJFcnJvciA9IGxheWVyRXJyb3IgfHwgbWF0Y2g7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAobWF0Y2ggIT09IHRydWUpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmICghcm91dGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBwcm9jZXNzIG5vbi1yb3V0ZSBoYW5kbGVycyBub3JtYWxseVxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKGxheWVyRXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyByb3V0ZXMgZG8gbm90IG1hdGNoIHdpdGggYSBwZW5kaW5nIGVycm9yXHJcbiAgICAgICAgICAgICAgICAgICAgbWF0Y2ggPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHZhciBpc0FwcGxpY2FibGUgPSByb3V0ZS5pc0FwcGxpY2FibGUocmVxKTtcclxuICAgICAgICAgICAgICAgIC8vIGJ1aWxkIHVwIGF1dG9tYXRpYyBvcHRpb25zIHJlc3BvbnNlXHJcbiAgICAgICAgICAgICAgICBpZiAoIWlzQXBwbGljYWJsZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChvcHRpb25zICYmIG9wdGlvbnMubm90QXBwbGljYWJsZVJvdXRlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLm5vdEFwcGxpY2FibGVSb3V0ZShyb3V0ZSkgPT09IGZhbHNlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYXRjaCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8gbm8gbWF0Y2hcclxuICAgICAgICAgICAgaWYgKG1hdGNoICE9PSB0cnVlKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZG9uZShsYXllckVycm9yKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyBzdG9yZSByb3V0ZSBmb3IgZGlzcGF0Y2ggb24gY2hhbmdlXHJcbiAgICAgICAgICAgIGlmIChyb3V0ZSkge1xyXG4gICAgICAgICAgICAgICAgcmVxLnJvdXRlID0gcm91dGU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8gQ2FwdHVyZSBvbmUtdGltZSBsYXllciB2YWx1ZXNcclxuICAgICAgICAgICAgcmVxLnBhcmFtcyA9IHNlbGYubWVyZ2VQYXJhbXNcclxuICAgICAgICAgICAgICAgID8gUm91dGVyLm1lcmdlUGFyYW1zKGxheWVyLnBhcmFtcywgcGFyZW50UGFyYW1zKVxyXG4gICAgICAgICAgICAgICAgOiBsYXllci5wYXJhbXM7XHJcbiAgICAgICAgICAgIHZhciBsYXllclBhdGggPSBsYXllci5wYXRoO1xyXG4gICAgICAgICAgICB2YXIgYXJncyA9IFtyZXFdO1xyXG4gICAgICAgICAgICBhcmdzID0gYXJncy5jb25jYXQocmVzdC5zbGljZSgwLCByZXN0Lmxlbmd0aCAtIDEpKTtcclxuICAgICAgICAgICAgO1xyXG4gICAgICAgICAgICAvLyB0aGlzIHNob3VsZCBiZSBkb25lIGZvciB0aGUgbGF5ZXJcclxuICAgICAgICAgICAgc2VsZi5wcm9jZXNzX3BhcmFtcy5hcHBseShzZWxmLCBbbGF5ZXIsIHBhcmFtY2FsbGVkXS5jb25jYXQoYXJncykuY29uY2F0KGZ1bmN0aW9uIChlcnIpIHtcclxuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV4dChsYXllckVycm9yIHx8IGVycik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAocm91dGUpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGF5ZXIuaGFuZGxlX3JlcXVlc3QuYXBwbHkobGF5ZXIsIGFyZ3MuY29uY2F0KG5leHQpKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHRyaW1fcHJlZml4KGxheWVyLCBsYXllckVycm9yLCBsYXllclBhdGgsIHBhdGgpO1xyXG4gICAgICAgICAgICB9KSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGZ1bmN0aW9uIHRyaW1fcHJlZml4KGxheWVyLCBsYXllckVycm9yLCBsYXllclBhdGgsIHBhdGgpIHtcclxuICAgICAgICAgICAgaWYgKGxheWVyUGF0aC5sZW5ndGggIT09IDApIHtcclxuICAgICAgICAgICAgICAgIC8vIFZhbGlkYXRlIHBhdGggYnJlYWtzIG9uIGEgcGF0aCBzZXBhcmF0b3JcclxuICAgICAgICAgICAgICAgIHZhciBjID0gcGF0aFtsYXllclBhdGgubGVuZ3RoXTtcclxuICAgICAgICAgICAgICAgIGlmIChjICYmIGMgIT09ICcvJykge1xyXG4gICAgICAgICAgICAgICAgICAgIG5leHQobGF5ZXJFcnJvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgLy8gVHJpbSBvZmYgdGhlIHBhcnQgb2YgdGhlIHVybCB0aGF0IG1hdGNoZXMgdGhlIHJvdXRlXHJcbiAgICAgICAgICAgICAgICAvLyBtaWRkbGV3YXJlICgudXNlIHN0dWZmKSBuZWVkcyB0byBoYXZlIHRoZSBwYXRoIHN0cmlwcGVkXHJcbiAgICAgICAgICAgICAgICBkZWJ1ZygndHJpbSBwcmVmaXggKCVzKSBmcm9tIHVybCAlcycsIGxheWVyUGF0aCwgcmVxLnVybCk7XHJcbiAgICAgICAgICAgICAgICByZW1vdmVkID0gbGF5ZXJQYXRoO1xyXG4gICAgICAgICAgICAgICAgcmVxLnVybCA9IHJlcS51cmwuc3Vic3RyKHJlbW92ZWQubGVuZ3RoKTtcclxuICAgICAgICAgICAgICAgIC8vIEVuc3VyZSBsZWFkaW5nIHNsYXNoXHJcbiAgICAgICAgICAgICAgICBpZiAocmVxLnVybFswXSAhPT0gJy8nKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVxLnVybCA9ICcvJyArIHJlcS51cmw7XHJcbiAgICAgICAgICAgICAgICAgICAgc2xhc2hBZGRlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAvLyBTZXR1cCBiYXNlIFVSTCAobm8gdHJhaWxpbmcgc2xhc2gpXHJcbiAgICAgICAgICAgICAgICByZXEuYmFzZVVybCA9IHBhcmVudFVybCArIChyZW1vdmVkW3JlbW92ZWQubGVuZ3RoIC0gMV0gPT09ICcvJ1xyXG4gICAgICAgICAgICAgICAgICAgID8gcmVtb3ZlZC5zdWJzdHJpbmcoMCwgcmVtb3ZlZC5sZW5ndGggLSAxKVxyXG4gICAgICAgICAgICAgICAgICAgIDogcmVtb3ZlZCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZGVidWcoJyVzICVzIDogJXMnLCBsYXllci5uYW1lLCBsYXllclBhdGgsIHJlcS5vcmlnaW5hbFVybCk7XHJcbiAgICAgICAgICAgIHZhciBhcmdzID0gW3JlcV0uY29uY2F0KHJlc3Quc2xpY2UoMCwgcmVzdC5sZW5ndGggLSAxKSk7XHJcbiAgICAgICAgICAgIGFyZ3MucHVzaChuZXh0KTtcclxuICAgICAgICAgICAgaWYgKGxheWVyRXJyb3IpIHtcclxuICAgICAgICAgICAgICAgIGxheWVyLmhhbmRsZV9lcnJvci5hcHBseShsYXllciwgW2xheWVyRXJyb3JdLmNvbmNhdChhcmdzKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBsYXllci5oYW5kbGVfcmVxdWVzdC5hcHBseShsYXllciwgYXJncyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBwcm9jZXNzX3BhcmFtcyhsYXllciwgY2FsbGVkLCByZXEsIC4uLnJlc3QpIHtcclxuICAgICAgICB2YXIgZG9uZSA9IHJlc3RbcmVzdC5sZW5ndGggLSAxXTtcclxuICAgICAgICB2YXIgcGFyYW1zID0gdGhpcy5wYXJhbXM7XHJcbiAgICAgICAgLy8gY2FwdHVyZWQgcGFyYW1ldGVycyBmcm9tIHRoZSBsYXllciwga2V5cyBhbmQgdmFsdWVzXHJcbiAgICAgICAgdmFyIGtleXMgPSBsYXllci5rZXlzO1xyXG4gICAgICAgIC8vIGZhc3QgdHJhY2tcclxuICAgICAgICBpZiAoIWtleXMgfHwga2V5cy5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgcmV0dXJuIGRvbmUoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGkgPSAwO1xyXG4gICAgICAgIHZhciBuYW1lO1xyXG4gICAgICAgIHZhciBwYXJhbUluZGV4ID0gMDtcclxuICAgICAgICB2YXIga2V5O1xyXG4gICAgICAgIHZhciBwYXJhbVZhbDtcclxuICAgICAgICB2YXIgcGFyYW1DYWxsYmFja3M7XHJcbiAgICAgICAgdmFyIHBhcmFtQ2FsbGVkO1xyXG4gICAgICAgIC8vIHByb2Nlc3MgcGFyYW1zIGluIG9yZGVyXHJcbiAgICAgICAgLy8gcGFyYW0gY2FsbGJhY2tzIGNhbiBiZSBhc3luY1xyXG4gICAgICAgIGZ1bmN0aW9uIHBhcmFtKGVycikge1xyXG4gICAgICAgICAgICBpZiAoZXJyKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZG9uZShlcnIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChpID49IGtleXMubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZG9uZSgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHBhcmFtSW5kZXggPSAwO1xyXG4gICAgICAgICAgICBrZXkgPSBrZXlzW2krK107XHJcbiAgICAgICAgICAgIG5hbWUgPSBrZXkubmFtZTtcclxuICAgICAgICAgICAgcGFyYW1WYWwgPSByZXEucGFyYW1zW25hbWVdO1xyXG4gICAgICAgICAgICBwYXJhbUNhbGxiYWNrcyA9IHBhcmFtc1tuYW1lXTtcclxuICAgICAgICAgICAgcGFyYW1DYWxsZWQgPSBjYWxsZWRbbmFtZV07XHJcbiAgICAgICAgICAgIGlmIChwYXJhbVZhbCA9PT0gdW5kZWZpbmVkIHx8ICFwYXJhbUNhbGxiYWNrcykge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcmFtKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8gcGFyYW0gcHJldmlvdXNseSBjYWxsZWQgd2l0aCBzYW1lIHZhbHVlIG9yIGVycm9yIG9jY3VycmVkXHJcbiAgICAgICAgICAgIGlmIChwYXJhbUNhbGxlZCAmJiAocGFyYW1DYWxsZWQubWF0Y2ggPT09IHBhcmFtVmFsXHJcbiAgICAgICAgICAgICAgICB8fCAocGFyYW1DYWxsZWQuZXJyb3IgJiYgcGFyYW1DYWxsZWQuZXJyb3IgIT09ICdyb3V0ZScpKSkge1xyXG4gICAgICAgICAgICAgICAgLy8gcmVzdG9yZSB2YWx1ZVxyXG4gICAgICAgICAgICAgICAgcmVxLnBhcmFtc1tuYW1lXSA9IHBhcmFtQ2FsbGVkLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgLy8gbmV4dCBwYXJhbVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcmFtKHBhcmFtQ2FsbGVkLmVycm9yKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjYWxsZWRbbmFtZV0gPSBwYXJhbUNhbGxlZCA9IHtcclxuICAgICAgICAgICAgICAgIGVycm9yOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgbWF0Y2g6IHBhcmFtVmFsLFxyXG4gICAgICAgICAgICAgICAgdmFsdWU6IHBhcmFtVmFsXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIHBhcmFtQ2FsbGJhY2soKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gc2luZ2xlIHBhcmFtIGNhbGxiYWNrc1xyXG4gICAgICAgIGZ1bmN0aW9uIHBhcmFtQ2FsbGJhY2soZXJyKSB7XHJcbiAgICAgICAgICAgIHZhciBmbiA9IHBhcmFtQ2FsbGJhY2tzW3BhcmFtSW5kZXgrK107XHJcbiAgICAgICAgICAgIC8vIHN0b3JlIHVwZGF0ZWQgdmFsdWVcclxuICAgICAgICAgICAgcGFyYW1DYWxsZWQudmFsdWUgPSByZXEucGFyYW1zW2tleS5uYW1lXTtcclxuICAgICAgICAgICAgaWYgKGVycikge1xyXG4gICAgICAgICAgICAgICAgLy8gc3RvcmUgZXJyb3JcclxuICAgICAgICAgICAgICAgIHBhcmFtQ2FsbGVkLmVycm9yID0gZXJyO1xyXG4gICAgICAgICAgICAgICAgcGFyYW0oZXJyKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoIWZuKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHBhcmFtKCk7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBmbihyZXEsIHBhcmFtQ2FsbGJhY2ssIHBhcmFtVmFsLCBrZXkubmFtZSwgcmVzdC5zbGljZSgwLCByZXN0Lmxlbmd0aCAtIDEpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgcGFyYW1DYWxsYmFjayhlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBwYXJhbSgpO1xyXG4gICAgfVxyXG4gICAgdXNlKGFyZywgLi4uaGFuZGxlcnMpIHtcclxuICAgICAgICB2YXIgb2Zmc2V0ID0gMDtcclxuICAgICAgICB2YXIgcGF0aCA9ICcvJztcclxuICAgICAgICAvLyBkZWZhdWx0IHBhdGggdG8gJy8nXHJcbiAgICAgICAgLy8gZGlzYW1iaWd1YXRlIHJvdXRlci51c2UoW2hhbmRsZXJdKVxyXG4gICAgICAgIGlmICh0eXBlb2YgYXJnICE9PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgIHdoaWxlIChBcnJheS5pc0FycmF5KGFyZykgJiYgYXJnLmxlbmd0aCAhPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgYXJnID0gYXJnWzBdO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIGZpcnN0IGFyZyBpcyB0aGUgcGF0aFxyXG4gICAgICAgICAgICBpZiAodHlwZW9mIGFyZyAhPT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICAgICAgb2Zmc2V0ID0gMTtcclxuICAgICAgICAgICAgICAgIHBhdGggPSBhcmc7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGNhbGxiYWNrcyA9IGZsYXR0ZW4oc2xpY2UuY2FsbChhcmd1bWVudHMsIG9mZnNldCkpO1xyXG4gICAgICAgIGlmIChjYWxsYmFja3MubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2FyZ3VtZW50IGhhbmRsZXIgaXMgcmVxdWlyZWQnKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjYWxsYmFja3MubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgdmFyIGZuID0gY2FsbGJhY2tzW2ldO1xyXG4gICAgICAgICAgICBpZiAodHlwZW9mIGZuICE9PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdhcmd1bWVudCBoYW5kbGVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIGFkZCB0aGUgbWlkZGxld2FyZVxyXG4gICAgICAgICAgICBkZWJ1ZygndXNlICVvICVzJywgcGF0aCwgZm4ubmFtZSB8fCAnPGFub255bW91cz4nKTtcclxuICAgICAgICAgICAgdmFyIGxheWVyID0gdGhpcy5idWlsZExheWVyKHBhdGgsIHtcclxuICAgICAgICAgICAgICAgIHNlbnNpdGl2ZTogdGhpcy5jYXNlU2Vuc2l0aXZlLFxyXG4gICAgICAgICAgICAgICAgc3RyaWN0OiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIGVuZDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICBsZW5ndGg6IHRoaXMubGVuZ3RoXHJcbiAgICAgICAgICAgIH0sIGZuKTtcclxuICAgICAgICAgICAgbGF5ZXIucm91dGUgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIHRoaXMuc3RhY2sucHVzaChsYXllcik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgfVxyXG4gICAgLyoqXHJcbiAgICAgKiBDcmVhdGUgYSBuZXcgUm91dGUgZm9yIHRoZSBnaXZlbiBwYXRoLlxyXG4gICAgICpcclxuICAgICAqIEVhY2ggcm91dGUgY29udGFpbnMgYSBzZXBhcmF0ZSBtaWRkbGV3YXJlIHN0YWNrIGFuZCBWRVJCIGhhbmRsZXJzLlxyXG4gICAgICpcclxuICAgICAqIFNlZSB0aGUgUm91dGUgYXBpIGRvY3VtZW50YXRpb24gZm9yIGRldGFpbHMgb24gYWRkaW5nIGhhbmRsZXJzXHJcbiAgICAgKiBhbmQgbWlkZGxld2FyZSB0byByb3V0ZXMuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhdGhcclxuICAgICAqIEByZXR1cm4ge1JvdXRlfVxyXG4gICAgICogQHB1YmxpY1xyXG4gICAgICovXHJcbiAgICByb3V0ZShwYXRoKSB7XHJcbiAgICAgICAgdmFyIHJvdXRlID0gdGhpcy5idWlsZFJvdXRlKHBhdGgpO1xyXG4gICAgICAgIHZhciBsYXllciA9IHRoaXMuYnVpbGRMYXllcihwYXRoLCB7XHJcbiAgICAgICAgICAgIHNlbnNpdGl2ZTogdGhpcy5jYXNlU2Vuc2l0aXZlLFxyXG4gICAgICAgICAgICBzdHJpY3Q6IHRoaXMuc3RyaWN0LFxyXG4gICAgICAgICAgICBlbmQ6IHRydWUsXHJcbiAgICAgICAgICAgIGxlbmd0aDogdGhpcy5sZW5ndGhcclxuICAgICAgICB9LCByb3V0ZS5kaXNwYXRjaC5iaW5kKHJvdXRlKSk7XHJcbiAgICAgICAgbGF5ZXIucm91dGUgPSByb3V0ZTtcclxuICAgICAgICB0aGlzLnN0YWNrLnB1c2gobGF5ZXIpO1xyXG4gICAgICAgIHJldHVybiByb3V0ZTtcclxuICAgIH1cclxuICAgIC8qKlxyXG4gICAgICogR2V0IHBhdGhuYW1lIG9mIHJlcXVlc3QuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtJbmNvbWluZ01lc3NhZ2V9IHJlcVxyXG4gICAgICogQHByaXZhdGVcclxuICAgICAqL1xyXG4gICAgc3RhdGljIGdldFBhdGhuYW1lKHJlcSkge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIHJldHVybiBwYXJzZVVybChyZXEpLnBhdGhuYW1lO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYXRjaCAoZXJyKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgLyoqXHJcbiAgICAgKiBNYXRjaCBwYXRoIHRvIGEgbGF5ZXIuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtMYXllcn0gbGF5ZXJcclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXRoXHJcbiAgICAgKiBAcHJpdmF0ZVxyXG4gICAgICovXHJcbiAgICBzdGF0aWMgbWF0Y2hMYXllcihsYXllciwgcGF0aCkge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIHJldHVybiBsYXllci5tYXRjaChwYXRoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY2F0Y2ggKGVycikge1xyXG4gICAgICAgICAgICByZXR1cm4gZXJyO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIC8qKlxyXG4gICAgICogTWVyZ2UgcGFyYW1zIHdpdGggcGFyZW50IHBhcmFtc1xyXG4gICAgICpcclxuICAgICAqIEBwcml2YXRlXHJcbiAgICAgKi9cclxuICAgIHN0YXRpYyBtZXJnZVBhcmFtcyhwYXJhbXMsIHBhcmVudCkge1xyXG4gICAgICAgIGlmICh0eXBlb2YgcGFyZW50ICE9PSAnb2JqZWN0JyB8fCAhcGFyZW50KSB7XHJcbiAgICAgICAgICAgIHJldHVybiBwYXJhbXM7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIG1ha2UgY29weSBvZiBwYXJlbnQgZm9yIGJhc2VcclxuICAgICAgICB2YXIgb2JqID0gbWl4aW4oe30sIHBhcmVudCk7XHJcbiAgICAgICAgLy8gc2ltcGxlIG5vbi1udW1lcmljIG1lcmdpbmdcclxuICAgICAgICBpZiAoISgwIGluIHBhcmFtcykgfHwgISgwIGluIHBhcmVudCkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG1peGluKG9iaiwgcGFyYW1zKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGkgPSAwO1xyXG4gICAgICAgIHZhciBvID0gMDtcclxuICAgICAgICAvLyBkZXRlcm1pbmUgbnVtZXJpYyBnYXAgaW4gcGFyYW1zXHJcbiAgICAgICAgd2hpbGUgKGkgaW4gcGFyYW1zKSB7XHJcbiAgICAgICAgICAgIGkrKztcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gZGV0ZXJtaW5lIG51bWVyaWMgZ2FwIGluIHBhcmVudFxyXG4gICAgICAgIHdoaWxlIChvIGluIHBhcmVudCkge1xyXG4gICAgICAgICAgICBvKys7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIG9mZnNldCBudW1lcmljIGluZGljZXMgaW4gcGFyYW1zIGJlZm9yZSBtZXJnZVxyXG4gICAgICAgIGZvciAoaS0tOyBpID49IDA7IGktLSkge1xyXG4gICAgICAgICAgICBwYXJhbXNbaSArIG9dID0gcGFyYW1zW2ldO1xyXG4gICAgICAgICAgICAvLyBjcmVhdGUgaG9sZXMgZm9yIHRoZSBtZXJnZSB3aGVuIG5lY2Vzc2FyeVxyXG4gICAgICAgICAgICBpZiAoaSA8IG8pIHtcclxuICAgICAgICAgICAgICAgIGRlbGV0ZSBwYXJhbXNbaV07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIG1peGluKG9iaiwgcGFyYW1zKTtcclxuICAgIH1cclxuICAgIHN0YXRpYyByZXN0b3JlKGZuLCBvYmosIC4uLnByb3BzKSB7XHJcbiAgICAgICAgdmFyIHZhbHMgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCAtIDIpO1xyXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcHJvcHMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgdmFsc1tpXSA9IG9ialtwcm9wc1tpXV07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoLi4uYXJncykge1xyXG4gICAgICAgICAgICAvLyByZXN0b3JlIHZhbHNcclxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwcm9wcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgb2JqW3Byb3BzW2ldXSA9IHZhbHNbaV07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XHJcbiAgICAgICAgfTtcclxuICAgIH1cclxuICAgIHN0YXRpYyB3cmFwKG9sZCwgZm4pIHtcclxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gcHJveHkoKSB7XHJcbiAgICAgICAgICAgIHZhciBhcmdzID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGggKyAxKTtcclxuICAgICAgICAgICAgYXJnc1swXSA9IG9sZDtcclxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xyXG4gICAgICAgICAgICAgICAgYXJnc1tpICsgMV0gPSBhcmd1bWVudHNbaV07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZm4uYXBwbHkodGhpcywgYXJncyk7XHJcbiAgICAgICAgfTtcclxuICAgIH1cclxufVxyXG5leHBvcnRzLlJvdXRlciA9IFJvdXRlcjtcclxuLy8gLy8gY3JlYXRlIFJvdXRlciNWRVJCIGZ1bmN0aW9uc1xyXG4vLyBtZXRob2RzLmNvbmNhdCgnYWxsJykuZm9yRWFjaChmdW5jdGlvbiAobWV0aG9kKVxyXG4vLyB7XHJcbi8vICAgICBSb3V0ZXIucHJvdG90eXBlW21ldGhvZF0gPSBmdW5jdGlvbiAocGF0aClcclxuLy8gICAgIHtcclxuLy8gICAgICAgICB2YXIgcm91dGUgPSB0aGlzLnJvdXRlKHBhdGgpXHJcbi8vICAgICAgICAgcm91dGVbbWV0aG9kXS5hcHBseShyb3V0ZSwgc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKVxyXG4vLyAgICAgICAgIHJldHVybiB0aGlzXHJcbi8vICAgICB9XHJcbi8vIH0pIFxyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1pbmRleC5qcy5tYXAiLCIvKiFcclxuICogcm91dGVyXHJcbiAqIENvcHlyaWdodChjKSAyMDEzIFJvbWFuIFNodHlsbWFuXHJcbiAqIENvcHlyaWdodChjKSAyMDE0IERvdWdsYXMgQ2hyaXN0b3BoZXIgV2lsc29uXHJcbiAqIE1JVCBMaWNlbnNlZFxyXG4gKi9cclxuJ3VzZSBzdHJpY3QnO1xyXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbi8qKlxyXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxyXG4gKiBAcHJpdmF0ZVxyXG4gKi9cclxuY29uc3QgcGF0aFJlZ2V4cCA9IHJlcXVpcmUoXCJwYXRoLXRvLXJlZ2V4cFwiKTtcclxuY29uc3QgbG9nID0gcmVxdWlyZShcImRlYnVnXCIpO1xyXG52YXIgZGVidWcgPSBsb2coJ3JvdXRlcjpsYXllcicpO1xyXG4vKipcclxuICogTW9kdWxlIHZhcmlhYmxlcy5cclxuICogQHByaXZhdGVcclxuICovXHJcbnZhciBoYXNPd25Qcm9wZXJ0eSA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XHJcbi8qKlxyXG4gKiBFeHBvc2UgYExheWVyYC5cclxuICovXHJcbmNsYXNzIExheWVyIHtcclxuICAgIGNvbnN0cnVjdG9yKHBhdGgsIG9wdGlvbnMsIGZuKSB7XHJcbiAgICAgICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIExheWVyKSkge1xyXG4gICAgICAgICAgICByZXR1cm4gbmV3IExheWVyKHBhdGgsIG9wdGlvbnMsIGZuKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZGVidWcoJ25ldyAlbycsIHBhdGgpO1xyXG4gICAgICAgIHZhciBvcHRzID0gb3B0aW9ucyB8fCB7IGxlbmd0aDogMiB9O1xyXG4gICAgICAgIHRoaXMuaGFuZGxlciA9IGZuO1xyXG4gICAgICAgIHRoaXMubmFtZSA9IGZuLm5hbWUgfHwgJzxhbm9ueW1vdXM+JztcclxuICAgICAgICB0aGlzLnBhcmFtcyA9IHVuZGVmaW5lZDtcclxuICAgICAgICB0aGlzLnBhdGggPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgdGhpcy5yZWdleHAgPSBwYXRoUmVnZXhwKHBhdGgsIHRoaXMua2V5cyA9IFtdLCBvcHRzKTtcclxuICAgICAgICAvLyBzZXQgZmFzdCBwYXRoIGZsYWdzXHJcbiAgICAgICAgdGhpcy5yZWdleHAuZmFzdF9zdGFyID0gcGF0aCA9PT0gJyonO1xyXG4gICAgICAgIHRoaXMucmVnZXhwLmZhc3Rfc2xhc2ggPSBwYXRoID09PSAnLycgJiYgb3B0cy5lbmQgPT09IGZhbHNlO1xyXG4gICAgICAgIHRoaXMuaXNFcnJvckhhbmRsZXIgPSBmbi5sZW5ndGggPT0gMCB8fCBmbi5sZW5ndGggPj0gKG9wdHMubGVuZ3RoIHx8IDIpICsgMjtcclxuICAgICAgICB0aGlzLmlzUmVxdWVzdEhhbmRsZXIgPSBmbi5sZW5ndGggPT0gMCB8fCBmbi5sZW5ndGggPCAob3B0cy5sZW5ndGggfHwgMikgKyAyO1xyXG4gICAgfVxyXG4gICAgaXNBcHBsaWNhYmxlKHJlcSwgcm91dGUpIHtcclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuICAgIGhhbmRsZV9lcnJvcihlcnJvciwgLi4uYXJncykge1xyXG4gICAgICAgIHZhciBmbiA9IHRoaXMuaGFuZGxlcjtcclxuICAgICAgICB2YXIgbmV4dCA9IGFyZ3NbYXJncy5sZW5ndGggLSAxXTtcclxuICAgICAgICBpZiAoIXRoaXMuaXNFcnJvckhhbmRsZXIpIHtcclxuICAgICAgICAgICAgZGVidWcoJ3NraXBwaW5nIG5vbiBlcnJvciBoYW5kbGVyJyk7XHJcbiAgICAgICAgICAgIC8vIG5vdCBhIHN0YW5kYXJkIGVycm9yIGhhbmRsZXJcclxuICAgICAgICAgICAgcmV0dXJuIG5leHQoZXJyb3IpO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBmbi5hcHBseShudWxsLCBbZXJyb3JdLmNvbmNhdChhcmdzKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhdGNoIChlcnIpIHtcclxuICAgICAgICAgICAgbmV4dChlcnIpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGhhbmRsZV9yZXF1ZXN0KC4uLmFyZ3MpIHtcclxuICAgICAgICB2YXIgZm4gPSB0aGlzLmhhbmRsZXI7XHJcbiAgICAgICAgdmFyIG5leHQgPSBhcmdzW2FyZ3MubGVuZ3RoIC0gMV07XHJcbiAgICAgICAgaWYgKCF0aGlzLmlzUmVxdWVzdEhhbmRsZXIpIHtcclxuICAgICAgICAgICAgZGVidWcoJ3NraXBwaW5nIG5vbiByZXF1ZXN0IGhhbmRsZXInKTtcclxuICAgICAgICAgICAgLy8gbm90IGEgc3RhbmRhcmQgcmVxdWVzdCBoYW5kbGVyXHJcbiAgICAgICAgICAgIHJldHVybiBuZXh0KCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGZuLmFwcGx5KG51bGwsIGFyZ3MpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYXRjaCAoZXJyKSB7XHJcbiAgICAgICAgICAgIG5leHQoZXJyKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICAvKipcclxuICAgICAqIENoZWNrIGlmIHRoaXMgcm91dGUgbWF0Y2hlcyBgcGF0aGAsIGlmIHNvXHJcbiAgICAgKiBwb3B1bGF0ZSBgLnBhcmFtc2AuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcclxuICAgICAqIEByZXR1cm4ge0Jvb2xlYW59XHJcbiAgICAgKiBAYXBpIHByaXZhdGVcclxuICAgICAqL1xyXG4gICAgbWF0Y2gocGF0aCkge1xyXG4gICAgICAgIHZhciBtYXRjaDtcclxuICAgICAgICBsb2codGhpcy5yZWdleHApO1xyXG4gICAgICAgIGlmIChwYXRoICE9IG51bGwpIHtcclxuICAgICAgICAgICAgLy8gZmFzdCBwYXRoIG5vbi1lbmRpbmcgbWF0Y2ggZm9yIC8gKGFueSBwYXRoIG1hdGNoZXMpXHJcbiAgICAgICAgICAgIGlmICh0aGlzLnJlZ2V4cC5mYXN0X3NsYXNoKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnBhcmFtcyA9IHt9O1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wYXRoID0gJyc7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyBmYXN0IHBhdGggZm9yICogKGV2ZXJ5dGhpbmcgbWF0Y2hlZCBpbiBhIHBhcmFtKVxyXG4gICAgICAgICAgICBpZiAodGhpcy5yZWdleHAuZmFzdF9zdGFyKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnBhcmFtcyA9IHsgJzAnOiBkZWNvZGVfcGFyYW0ocGF0aCkgfTtcclxuICAgICAgICAgICAgICAgIHRoaXMucGF0aCA9IHBhdGg7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyBtYXRjaCB0aGUgcGF0aFxyXG4gICAgICAgICAgICBtYXRjaCA9IHRoaXMucmVnZXhwLmV4ZWMocGF0aCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICghbWF0Y2gpIHtcclxuICAgICAgICAgICAgbG9nKHRoaXMucmVnZXhwKTtcclxuICAgICAgICAgICAgdGhpcy5wYXJhbXMgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIHRoaXMucGF0aCA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBzdG9yZSB2YWx1ZXNcclxuICAgICAgICB0aGlzLnBhcmFtcyA9IHt9O1xyXG4gICAgICAgIHRoaXMucGF0aCA9IG1hdGNoWzBdO1xyXG4gICAgICAgIC8vIGl0ZXJhdGUgbWF0Y2hlc1xyXG4gICAgICAgIHZhciBrZXlzID0gdGhpcy5rZXlzO1xyXG4gICAgICAgIHZhciBwYXJhbXMgPSB0aGlzLnBhcmFtcztcclxuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IG1hdGNoLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIHZhciBrZXkgPSBrZXlzW2kgLSAxXTtcclxuICAgICAgICAgICAgdmFyIHByb3AgPSBrZXkubmFtZTtcclxuICAgICAgICAgICAgdmFyIHZhbCA9IGRlY29kZV9wYXJhbShtYXRjaFtpXSk7XHJcbiAgICAgICAgICAgIGlmICh2YWwgIT09IHVuZGVmaW5lZCB8fCAhKGhhc093blByb3BlcnR5LmNhbGwocGFyYW1zLCBwcm9wKSkpIHtcclxuICAgICAgICAgICAgICAgIHBhcmFtc1twcm9wXSA9IHZhbDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxufVxyXG5leHBvcnRzLkxheWVyID0gTGF5ZXI7XHJcbi8qKlxyXG4gKiBEZWNvZGUgcGFyYW0gdmFsdWUuXHJcbiAqXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWxcclxuICogQHJldHVybiB7c3RyaW5nfVxyXG4gKiBAcHJpdmF0ZVxyXG4gKi9cclxuZnVuY3Rpb24gZGVjb2RlX3BhcmFtKHZhbCkge1xyXG4gICAgaWYgKHR5cGVvZiB2YWwgIT09ICdzdHJpbmcnIHx8IHZhbC5sZW5ndGggPT09IDApIHtcclxuICAgICAgICByZXR1cm4gdmFsO1xyXG4gICAgfVxyXG4gICAgdHJ5IHtcclxuICAgICAgICByZXR1cm4gZGVjb2RlVVJJQ29tcG9uZW50KHZhbCk7XHJcbiAgICB9XHJcbiAgICBjYXRjaCAoZXJyKSB7XHJcbiAgICAgICAgaWYgKGVyciBpbnN0YW5jZW9mIFVSSUVycm9yKSB7XHJcbiAgICAgICAgICAgIGVyci5tZXNzYWdlID0gJ0ZhaWxlZCB0byBkZWNvZGUgcGFyYW0gXFwnJyArIHZhbCArICdcXCcnO1xyXG4gICAgICAgICAgICBlcnJbJ3N0YXR1cyddID0gNDAwO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aHJvdyBlcnI7XHJcbiAgICB9XHJcbn1cclxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9bGF5ZXIuanMubWFwIiwiLyohXHJcbiAqIHJvdXRlclxyXG4gKiBDb3B5cmlnaHQoYykgMjAxMyBSb21hbiBTaHR5bG1hblxyXG4gKiBDb3B5cmlnaHQoYykgMjAxNCBEb3VnbGFzIENocmlzdG9waGVyIFdpbHNvblxyXG4gKiBNSVQgTGljZW5zZWRcclxuICovXHJcbid1c2Ugc3RyaWN0JztcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG4vKipcclxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cclxuICogQHByaXZhdGVcclxuICovXHJcbnZhciBkZWJ1ZyA9IHJlcXVpcmUoJ2RlYnVnJykoJ3JvdXRlcjpyb3V0ZScpO1xyXG52YXIgZmxhdHRlbiA9IHJlcXVpcmUoJ2FycmF5LWZsYXR0ZW4nKTtcclxuY29uc3QgbGF5ZXJfMSA9IHJlcXVpcmUoXCIuL2xheWVyXCIpO1xyXG4vKipcclxuICogTW9kdWxlIHZhcmlhYmxlcy5cclxuICogQHByaXZhdGVcclxuICovXHJcbnZhciBzbGljZSA9IEFycmF5LnByb3RvdHlwZS5zbGljZTtcclxuLyoqXHJcbiAqIEV4cG9zZSBgUm91dGVgLlxyXG4gKi9cclxuY2xhc3MgUm91dGUge1xyXG4gICAgY29uc3RydWN0b3IocGF0aCkge1xyXG4gICAgICAgIHRoaXMucGF0aCA9IHBhdGg7XHJcbiAgICAgICAgdGhpcy5zdGFjayA9IFtdO1xyXG4gICAgICAgIGRlYnVnKCduZXcgJW8nLCBwYXRoKTtcclxuICAgIH1cclxuICAgIGRpc3BhdGNoKHJlcSwgLi4ucmVzdCkge1xyXG4gICAgICAgIHZhciBkb25lID0gYXJndW1lbnRzW2FyZ3VtZW50cy5sZW5ndGggLSAxXTtcclxuICAgICAgICB2YXIgaWR4ID0gMDtcclxuICAgICAgICB2YXIgc3RhY2sgPSB0aGlzLnN0YWNrO1xyXG4gICAgICAgIGlmIChzdGFjay5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgcmV0dXJuIGRvbmUoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmVxLnJvdXRlID0gdGhpcztcclxuICAgICAgICB2YXIgYXJncyA9IHNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKTtcclxuICAgICAgICBhcmdzW2FyZ3MubGVuZ3RoIC0gMV0gPSBuZXh0O1xyXG4gICAgICAgIG5leHQoKTtcclxuICAgICAgICBmdW5jdGlvbiBuZXh0KGVycikge1xyXG4gICAgICAgICAgICAvLyBzaWduYWwgdG8gZXhpdCByb3V0ZVxyXG4gICAgICAgICAgICBpZiAoZXJyICYmIGVyciA9PT0gJ3JvdXRlJylcclxuICAgICAgICAgICAgICAgIHJldHVybiBkb25lKCk7XHJcbiAgICAgICAgICAgIC8vIHNpZ25hbCB0byBleGl0IHJvdXRlclxyXG4gICAgICAgICAgICBpZiAoZXJyICYmIGVyciA9PT0gJ3JvdXRlcicpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZG9uZShlcnIpO1xyXG4gICAgICAgICAgICAvLyBubyBtb3JlIG1hdGNoaW5nIGxheWVyc1xyXG4gICAgICAgICAgICBpZiAoaWR4ID49IHN0YWNrLmxlbmd0aClcclxuICAgICAgICAgICAgICAgIHJldHVybiBkb25lKGVycik7XHJcbiAgICAgICAgICAgIHZhciBsYXllcjtcclxuICAgICAgICAgICAgdmFyIG1hdGNoO1xyXG4gICAgICAgICAgICAvLyBmaW5kIG5leHQgbWF0Y2hpbmcgbGF5ZXJcclxuICAgICAgICAgICAgd2hpbGUgKG1hdGNoICE9PSB0cnVlICYmIGlkeCA8IHN0YWNrLmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgbGF5ZXIgPSBzdGFja1tpZHgrK107XHJcbiAgICAgICAgICAgICAgICBtYXRjaCA9IGxheWVyLmlzQXBwbGljYWJsZShyZXEsIHRoaXMpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIG5vIG1hdGNoXHJcbiAgICAgICAgICAgIGlmIChtYXRjaCAhPT0gdHJ1ZSlcclxuICAgICAgICAgICAgICAgIHJldHVybiBkb25lKGVycik7XHJcbiAgICAgICAgICAgIGlmIChlcnIpXHJcbiAgICAgICAgICAgICAgICBsYXllci5oYW5kbGVfZXJyb3IuYXBwbHkobGF5ZXIsIFtlcnJdLmNvbmNhdChhcmdzKSk7XHJcbiAgICAgICAgICAgIGVsc2VcclxuICAgICAgICAgICAgICAgIGxheWVyLmhhbmRsZV9yZXF1ZXN0LmFwcGx5KGxheWVyLCBhcmdzKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBidWlsZExheWVyKHBhdGgsIG9wdGlvbnMsIGNhbGxiYWNrKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBsYXllcl8xLkxheWVyKCcvJywgb3B0aW9ucywgY2FsbGJhY2spO1xyXG4gICAgfVxyXG4gICAgaXNBcHBsaWNhYmxlKHJlcSkge1xyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG4gICAgYWRkSGFuZGxlcihwb3N0QnVpbGRMYXllciwgLi4uaGFuZGxlcnMpIHtcclxuICAgICAgICB2YXIgY2FsbGJhY2tzID0gZmxhdHRlbihoYW5kbGVycyk7XHJcbiAgICAgICAgaWYgKGNhbGxiYWNrcy5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignYXJndW1lbnQgaGFuZGxlciBpcyByZXF1aXJlZCcpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNhbGxiYWNrcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICB2YXIgZm4gPSBjYWxsYmFja3NbaV07XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2YgZm4gIT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ2FyZ3VtZW50IGhhbmRsZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdmFyIGxheWVyID0gcG9zdEJ1aWxkTGF5ZXIodGhpcy5idWlsZExheWVyKCcvJywgeyBsZW5ndGg6IGZuLmxlbmd0aCAtIDEgfSwgZm4pKTtcclxuICAgICAgICAgICAgdGhpcy5zdGFjay5wdXNoKGxheWVyKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICB9XHJcbn1cclxuZXhwb3J0cy5Sb3V0ZSA9IFJvdXRlO1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1yb3V0ZS5qcy5tYXAiLCJcInVzZSBzdHJpY3RcIjtcclxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG5jb25zdCBpbmplY3Rvcl8xID0gcmVxdWlyZShcIi4vaW5qZWN0b3JcIik7XHJcbmZ1bmN0aW9uIHNlcnZpY2UobmFtZSwgLi4udG9JbmplY3QpIHtcclxuICAgIHJldHVybiBmdW5jdGlvbiAodGFyZ2V0KSB7XHJcbiAgICAgICAgdmFyIGluc3RhbmNlID0gbnVsbDtcclxuICAgICAgICBpZiAodG9JbmplY3QgPT0gbnVsbCB8fCB0b0luamVjdC5sZW5ndGggPT0gMCAmJiB0YXJnZXQubGVuZ3RoID4gMClcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdtaXNzaW5nIGluamVjdCBuYW1lcycpO1xyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgICAgaW5qZWN0b3JfMS5yZWdpc3RlckZhY3RvcnkobmFtZSwgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGluc3RhbmNlIHx8IGluamVjdG9yXzEuaW5qZWN0V2l0aE5hbWUodG9JbmplY3QsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgYXJncyA9IFtudWxsXTtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKylcclxuICAgICAgICAgICAgICAgICAgICAgICAgYXJnc1tpICsgMV0gPSBhcmd1bWVudHNbaV07XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGluc3RhbmNlID0gbmV3IChGdW5jdGlvbi5wcm90b3R5cGUuYmluZC5hcHBseSh0YXJnZXQsIGFyZ3MpKTtcclxuICAgICAgICAgICAgICAgIH0pKCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgfTtcclxufVxyXG5leHBvcnRzLnNlcnZpY2UgPSBzZXJ2aWNlO1xyXG4vLyMgc291cmNlTWFwcGluZ1VSTD1zZXJ2aWNlLmpzLm1hcCIsIid1c2Ugc3RyaWN0J1xuXG4vKipcbiAqIEV4cG9zZSBgYXJyYXlGbGF0dGVuYC5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBhcnJheUZsYXR0ZW5cblxuLyoqXG4gKiBSZWN1cnNpdmUgZmxhdHRlbiBmdW5jdGlvbiB3aXRoIGRlcHRoLlxuICpcbiAqIEBwYXJhbSAge0FycmF5fSAgYXJyYXlcbiAqIEBwYXJhbSAge0FycmF5fSAgcmVzdWx0XG4gKiBAcGFyYW0gIHtOdW1iZXJ9IGRlcHRoXG4gKiBAcmV0dXJuIHtBcnJheX1cbiAqL1xuZnVuY3Rpb24gZmxhdHRlbldpdGhEZXB0aCAoYXJyYXksIHJlc3VsdCwgZGVwdGgpIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnJheS5sZW5ndGg7IGkrKykge1xuICAgIHZhciB2YWx1ZSA9IGFycmF5W2ldXG5cbiAgICBpZiAoZGVwdGggPiAwICYmIEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICBmbGF0dGVuV2l0aERlcHRoKHZhbHVlLCByZXN1bHQsIGRlcHRoIC0gMSlcbiAgICB9IGVsc2Uge1xuICAgICAgcmVzdWx0LnB1c2godmFsdWUpXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlc3VsdFxufVxuXG4vKipcbiAqIFJlY3Vyc2l2ZSBmbGF0dGVuIGZ1bmN0aW9uLiBPbWl0dGluZyBkZXB0aCBpcyBzbGlnaHRseSBmYXN0ZXIuXG4gKlxuICogQHBhcmFtICB7QXJyYXl9IGFycmF5XG4gKiBAcGFyYW0gIHtBcnJheX0gcmVzdWx0XG4gKiBAcmV0dXJuIHtBcnJheX1cbiAqL1xuZnVuY3Rpb24gZmxhdHRlbkZvcmV2ZXIgKGFycmF5LCByZXN1bHQpIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnJheS5sZW5ndGg7IGkrKykge1xuICAgIHZhciB2YWx1ZSA9IGFycmF5W2ldXG5cbiAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgIGZsYXR0ZW5Gb3JldmVyKHZhbHVlLCByZXN1bHQpXG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc3VsdC5wdXNoKHZhbHVlKVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXN1bHRcbn1cblxuLyoqXG4gKiBGbGF0dGVuIGFuIGFycmF5LCB3aXRoIHRoZSBhYmlsaXR5IHRvIGRlZmluZSBhIGRlcHRoLlxuICpcbiAqIEBwYXJhbSAge0FycmF5fSAgYXJyYXlcbiAqIEBwYXJhbSAge051bWJlcn0gZGVwdGhcbiAqIEByZXR1cm4ge0FycmF5fVxuICovXG5mdW5jdGlvbiBhcnJheUZsYXR0ZW4gKGFycmF5LCBkZXB0aCkge1xuICBpZiAoZGVwdGggPT0gbnVsbCkge1xuICAgIHJldHVybiBmbGF0dGVuRm9yZXZlcihhcnJheSwgW10pXG4gIH1cblxuICByZXR1cm4gZmxhdHRlbldpdGhEZXB0aChhcnJheSwgW10sIGRlcHRoKVxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSBwcm9jZXNzLmhydGltZSB8fCBocnRpbWVcblxuLy8gcG9seWZpbCBmb3Igd2luZG93LnBlcmZvcm1hbmNlLm5vd1xudmFyIHBlcmZvcm1hbmNlID0gZ2xvYmFsLnBlcmZvcm1hbmNlIHx8IHt9XG52YXIgcGVyZm9ybWFuY2VOb3cgPVxuICBwZXJmb3JtYW5jZS5ub3cgICAgICAgIHx8XG4gIHBlcmZvcm1hbmNlLm1vek5vdyAgICAgfHxcbiAgcGVyZm9ybWFuY2UubXNOb3cgICAgICB8fFxuICBwZXJmb3JtYW5jZS5vTm93ICAgICAgIHx8XG4gIHBlcmZvcm1hbmNlLndlYmtpdE5vdyAgfHxcbiAgZnVuY3Rpb24oKXsgcmV0dXJuIChuZXcgRGF0ZSgpKS5nZXRUaW1lKCkgfVxuXG4vLyBnZW5lcmF0ZSB0aW1lc3RhbXAgb3IgZGVsdGFcbi8vIHNlZSBodHRwOi8vbm9kZWpzLm9yZy9hcGkvcHJvY2Vzcy5odG1sI3Byb2Nlc3NfcHJvY2Vzc19ocnRpbWVcbmZ1bmN0aW9uIGhydGltZShwcmV2aW91c1RpbWVzdGFtcCl7XG4gIHZhciBjbG9ja3RpbWUgPSBwZXJmb3JtYW5jZU5vdy5jYWxsKHBlcmZvcm1hbmNlKSoxZS0zXG4gIHZhciBzZWNvbmRzID0gTWF0aC5mbG9vcihjbG9ja3RpbWUpXG4gIHZhciBuYW5vc2Vjb25kcyA9IE1hdGguZmxvb3IoKGNsb2NrdGltZSUxKSoxZTkpXG4gIGlmIChwcmV2aW91c1RpbWVzdGFtcCkge1xuICAgIHNlY29uZHMgPSBzZWNvbmRzIC0gcHJldmlvdXNUaW1lc3RhbXBbMF1cbiAgICBuYW5vc2Vjb25kcyA9IG5hbm9zZWNvbmRzIC0gcHJldmlvdXNUaW1lc3RhbXBbMV1cbiAgICBpZiAobmFub3NlY29uZHM8MCkge1xuICAgICAgc2Vjb25kcy0tXG4gICAgICBuYW5vc2Vjb25kcyArPSAxZTlcbiAgICB9XG4gIH1cbiAgcmV0dXJuIFtzZWNvbmRzLG5hbm9zZWNvbmRzXVxufSIsIlxuLyoqXG4gKiBUaGlzIGlzIHRoZSB3ZWIgYnJvd3NlciBpbXBsZW1lbnRhdGlvbiBvZiBgZGVidWcoKWAuXG4gKlxuICogRXhwb3NlIGBkZWJ1ZygpYCBhcyB0aGUgbW9kdWxlLlxuICovXG5cbmV4cG9ydHMgPSBtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vZGVidWcnKTtcbmV4cG9ydHMubG9nID0gbG9nO1xuZXhwb3J0cy5mb3JtYXRBcmdzID0gZm9ybWF0QXJncztcbmV4cG9ydHMuc2F2ZSA9IHNhdmU7XG5leHBvcnRzLmxvYWQgPSBsb2FkO1xuZXhwb3J0cy51c2VDb2xvcnMgPSB1c2VDb2xvcnM7XG5leHBvcnRzLnN0b3JhZ2UgPSAndW5kZWZpbmVkJyAhPSB0eXBlb2YgY2hyb21lXG4gICAgICAgICAgICAgICAmJiAndW5kZWZpbmVkJyAhPSB0eXBlb2YgY2hyb21lLnN0b3JhZ2VcbiAgICAgICAgICAgICAgICAgID8gY2hyb21lLnN0b3JhZ2UubG9jYWxcbiAgICAgICAgICAgICAgICAgIDogbG9jYWxzdG9yYWdlKCk7XG5cbi8qKlxuICogQ29sb3JzLlxuICovXG5cbmV4cG9ydHMuY29sb3JzID0gW1xuICAnbGlnaHRzZWFncmVlbicsXG4gICdmb3Jlc3RncmVlbicsXG4gICdnb2xkZW5yb2QnLFxuICAnZG9kZ2VyYmx1ZScsXG4gICdkYXJrb3JjaGlkJyxcbiAgJ2NyaW1zb24nXG5dO1xuXG4vKipcbiAqIEN1cnJlbnRseSBvbmx5IFdlYktpdC1iYXNlZCBXZWIgSW5zcGVjdG9ycywgRmlyZWZveCA+PSB2MzEsXG4gKiBhbmQgdGhlIEZpcmVidWcgZXh0ZW5zaW9uIChhbnkgRmlyZWZveCB2ZXJzaW9uKSBhcmUga25vd25cbiAqIHRvIHN1cHBvcnQgXCIlY1wiIENTUyBjdXN0b21pemF0aW9ucy5cbiAqXG4gKiBUT0RPOiBhZGQgYSBgbG9jYWxTdG9yYWdlYCB2YXJpYWJsZSB0byBleHBsaWNpdGx5IGVuYWJsZS9kaXNhYmxlIGNvbG9yc1xuICovXG5cbmZ1bmN0aW9uIHVzZUNvbG9ycygpIHtcbiAgLy8gaXMgd2Via2l0PyBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8xNjQ1OTYwNi8zNzY3NzNcbiAgcmV0dXJuICgnV2Via2l0QXBwZWFyYW5jZScgaW4gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnN0eWxlKSB8fFxuICAgIC8vIGlzIGZpcmVidWc/IGh0dHA6Ly9zdGFja292ZXJmbG93LmNvbS9hLzM5ODEyMC8zNzY3NzNcbiAgICAod2luZG93LmNvbnNvbGUgJiYgKGNvbnNvbGUuZmlyZWJ1ZyB8fCAoY29uc29sZS5leGNlcHRpb24gJiYgY29uc29sZS50YWJsZSkpKSB8fFxuICAgIC8vIGlzIGZpcmVmb3ggPj0gdjMxP1xuICAgIC8vIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvVG9vbHMvV2ViX0NvbnNvbGUjU3R5bGluZ19tZXNzYWdlc1xuICAgIChuYXZpZ2F0b3IudXNlckFnZW50LnRvTG93ZXJDYXNlKCkubWF0Y2goL2ZpcmVmb3hcXC8oXFxkKykvKSAmJiBwYXJzZUludChSZWdFeHAuJDEsIDEwKSA+PSAzMSk7XG59XG5cbi8qKlxuICogTWFwICVqIHRvIGBKU09OLnN0cmluZ2lmeSgpYCwgc2luY2Ugbm8gV2ViIEluc3BlY3RvcnMgZG8gdGhhdCBieSBkZWZhdWx0LlxuICovXG5cbmV4cG9ydHMuZm9ybWF0dGVycy5qID0gZnVuY3Rpb24odikge1xuICByZXR1cm4gSlNPTi5zdHJpbmdpZnkodik7XG59O1xuXG5cbi8qKlxuICogQ29sb3JpemUgbG9nIGFyZ3VtZW50cyBpZiBlbmFibGVkLlxuICpcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gZm9ybWF0QXJncygpIHtcbiAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XG4gIHZhciB1c2VDb2xvcnMgPSB0aGlzLnVzZUNvbG9ycztcblxuICBhcmdzWzBdID0gKHVzZUNvbG9ycyA/ICclYycgOiAnJylcbiAgICArIHRoaXMubmFtZXNwYWNlXG4gICAgKyAodXNlQ29sb3JzID8gJyAlYycgOiAnICcpXG4gICAgKyBhcmdzWzBdXG4gICAgKyAodXNlQ29sb3JzID8gJyVjICcgOiAnICcpXG4gICAgKyAnKycgKyBleHBvcnRzLmh1bWFuaXplKHRoaXMuZGlmZik7XG5cbiAgaWYgKCF1c2VDb2xvcnMpIHJldHVybiBhcmdzO1xuXG4gIHZhciBjID0gJ2NvbG9yOiAnICsgdGhpcy5jb2xvcjtcbiAgYXJncyA9IFthcmdzWzBdLCBjLCAnY29sb3I6IGluaGVyaXQnXS5jb25jYXQoQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJncywgMSkpO1xuXG4gIC8vIHRoZSBmaW5hbCBcIiVjXCIgaXMgc29tZXdoYXQgdHJpY2t5LCBiZWNhdXNlIHRoZXJlIGNvdWxkIGJlIG90aGVyXG4gIC8vIGFyZ3VtZW50cyBwYXNzZWQgZWl0aGVyIGJlZm9yZSBvciBhZnRlciB0aGUgJWMsIHNvIHdlIG5lZWQgdG9cbiAgLy8gZmlndXJlIG91dCB0aGUgY29ycmVjdCBpbmRleCB0byBpbnNlcnQgdGhlIENTUyBpbnRvXG4gIHZhciBpbmRleCA9IDA7XG4gIHZhciBsYXN0QyA9IDA7XG4gIGFyZ3NbMF0ucmVwbGFjZSgvJVthLXolXS9nLCBmdW5jdGlvbihtYXRjaCkge1xuICAgIGlmICgnJSUnID09PSBtYXRjaCkgcmV0dXJuO1xuICAgIGluZGV4Kys7XG4gICAgaWYgKCclYycgPT09IG1hdGNoKSB7XG4gICAgICAvLyB3ZSBvbmx5IGFyZSBpbnRlcmVzdGVkIGluIHRoZSAqbGFzdCogJWNcbiAgICAgIC8vICh0aGUgdXNlciBtYXkgaGF2ZSBwcm92aWRlZCB0aGVpciBvd24pXG4gICAgICBsYXN0QyA9IGluZGV4O1xuICAgIH1cbiAgfSk7XG5cbiAgYXJncy5zcGxpY2UobGFzdEMsIDAsIGMpO1xuICByZXR1cm4gYXJncztcbn1cblxuLyoqXG4gKiBJbnZva2VzIGBjb25zb2xlLmxvZygpYCB3aGVuIGF2YWlsYWJsZS5cbiAqIE5vLW9wIHdoZW4gYGNvbnNvbGUubG9nYCBpcyBub3QgYSBcImZ1bmN0aW9uXCIuXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5mdW5jdGlvbiBsb2coKSB7XG4gIC8vIHRoaXMgaGFja2VyeSBpcyByZXF1aXJlZCBmb3IgSUU4LzksIHdoZXJlXG4gIC8vIHRoZSBgY29uc29sZS5sb2dgIGZ1bmN0aW9uIGRvZXNuJ3QgaGF2ZSAnYXBwbHknXG4gIHJldHVybiAnb2JqZWN0JyA9PT0gdHlwZW9mIGNvbnNvbGVcbiAgICAmJiBjb25zb2xlLmxvZ1xuICAgICYmIEZ1bmN0aW9uLnByb3RvdHlwZS5hcHBseS5jYWxsKGNvbnNvbGUubG9nLCBjb25zb2xlLCBhcmd1bWVudHMpO1xufVxuXG4vKipcbiAqIFNhdmUgYG5hbWVzcGFjZXNgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lc3BhY2VzXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBzYXZlKG5hbWVzcGFjZXMpIHtcbiAgdHJ5IHtcbiAgICBpZiAobnVsbCA9PSBuYW1lc3BhY2VzKSB7XG4gICAgICBleHBvcnRzLnN0b3JhZ2UucmVtb3ZlSXRlbSgnZGVidWcnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZXhwb3J0cy5zdG9yYWdlLmRlYnVnID0gbmFtZXNwYWNlcztcbiAgICB9XG4gIH0gY2F0Y2goZSkge31cbn1cblxuLyoqXG4gKiBMb2FkIGBuYW1lc3BhY2VzYC5cbiAqXG4gKiBAcmV0dXJuIHtTdHJpbmd9IHJldHVybnMgdGhlIHByZXZpb3VzbHkgcGVyc2lzdGVkIGRlYnVnIG1vZGVzXG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBsb2FkKCkge1xuICB2YXIgcjtcbiAgdHJ5IHtcbiAgICByID0gZXhwb3J0cy5zdG9yYWdlLmRlYnVnO1xuICB9IGNhdGNoKGUpIHt9XG4gIHJldHVybiByO1xufVxuXG4vKipcbiAqIEVuYWJsZSBuYW1lc3BhY2VzIGxpc3RlZCBpbiBgbG9jYWxTdG9yYWdlLmRlYnVnYCBpbml0aWFsbHkuXG4gKi9cblxuZXhwb3J0cy5lbmFibGUobG9hZCgpKTtcblxuLyoqXG4gKiBMb2NhbHN0b3JhZ2UgYXR0ZW1wdHMgdG8gcmV0dXJuIHRoZSBsb2NhbHN0b3JhZ2UuXG4gKlxuICogVGhpcyBpcyBuZWNlc3NhcnkgYmVjYXVzZSBzYWZhcmkgdGhyb3dzXG4gKiB3aGVuIGEgdXNlciBkaXNhYmxlcyBjb29raWVzL2xvY2Fsc3RvcmFnZVxuICogYW5kIHlvdSBhdHRlbXB0IHRvIGFjY2VzcyBpdC5cbiAqXG4gKiBAcmV0dXJuIHtMb2NhbFN0b3JhZ2V9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBsb2NhbHN0b3JhZ2UoKXtcbiAgdHJ5IHtcbiAgICByZXR1cm4gd2luZG93LmxvY2FsU3RvcmFnZTtcbiAgfSBjYXRjaCAoZSkge31cbn1cbiIsIlxuLyoqXG4gKiBUaGlzIGlzIHRoZSBjb21tb24gbG9naWMgZm9yIGJvdGggdGhlIE5vZGUuanMgYW5kIHdlYiBicm93c2VyXG4gKiBpbXBsZW1lbnRhdGlvbnMgb2YgYGRlYnVnKClgLlxuICpcbiAqIEV4cG9zZSBgZGVidWcoKWAgYXMgdGhlIG1vZHVsZS5cbiAqL1xuXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBkZWJ1ZztcbmV4cG9ydHMuY29lcmNlID0gY29lcmNlO1xuZXhwb3J0cy5kaXNhYmxlID0gZGlzYWJsZTtcbmV4cG9ydHMuZW5hYmxlID0gZW5hYmxlO1xuZXhwb3J0cy5lbmFibGVkID0gZW5hYmxlZDtcbmV4cG9ydHMuaHVtYW5pemUgPSByZXF1aXJlKCdtcycpO1xuXG4vKipcbiAqIFRoZSBjdXJyZW50bHkgYWN0aXZlIGRlYnVnIG1vZGUgbmFtZXMsIGFuZCBuYW1lcyB0byBza2lwLlxuICovXG5cbmV4cG9ydHMubmFtZXMgPSBbXTtcbmV4cG9ydHMuc2tpcHMgPSBbXTtcblxuLyoqXG4gKiBNYXAgb2Ygc3BlY2lhbCBcIiVuXCIgaGFuZGxpbmcgZnVuY3Rpb25zLCBmb3IgdGhlIGRlYnVnIFwiZm9ybWF0XCIgYXJndW1lbnQuXG4gKlxuICogVmFsaWQga2V5IG5hbWVzIGFyZSBhIHNpbmdsZSwgbG93ZXJjYXNlZCBsZXR0ZXIsIGkuZS4gXCJuXCIuXG4gKi9cblxuZXhwb3J0cy5mb3JtYXR0ZXJzID0ge307XG5cbi8qKlxuICogUHJldmlvdXNseSBhc3NpZ25lZCBjb2xvci5cbiAqL1xuXG52YXIgcHJldkNvbG9yID0gMDtcblxuLyoqXG4gKiBQcmV2aW91cyBsb2cgdGltZXN0YW1wLlxuICovXG5cbnZhciBwcmV2VGltZTtcblxuLyoqXG4gKiBTZWxlY3QgYSBjb2xvci5cbiAqXG4gKiBAcmV0dXJuIHtOdW1iZXJ9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBzZWxlY3RDb2xvcigpIHtcbiAgcmV0dXJuIGV4cG9ydHMuY29sb3JzW3ByZXZDb2xvcisrICUgZXhwb3J0cy5jb2xvcnMubGVuZ3RoXTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgYSBkZWJ1Z2dlciB3aXRoIHRoZSBnaXZlbiBgbmFtZXNwYWNlYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZXNwYWNlXG4gKiBAcmV0dXJuIHtGdW5jdGlvbn1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gZGVidWcobmFtZXNwYWNlKSB7XG5cbiAgLy8gZGVmaW5lIHRoZSBgZGlzYWJsZWRgIHZlcnNpb25cbiAgZnVuY3Rpb24gZGlzYWJsZWQoKSB7XG4gIH1cbiAgZGlzYWJsZWQuZW5hYmxlZCA9IGZhbHNlO1xuXG4gIC8vIGRlZmluZSB0aGUgYGVuYWJsZWRgIHZlcnNpb25cbiAgZnVuY3Rpb24gZW5hYmxlZCgpIHtcblxuICAgIHZhciBzZWxmID0gZW5hYmxlZDtcblxuICAgIC8vIHNldCBgZGlmZmAgdGltZXN0YW1wXG4gICAgdmFyIGN1cnIgPSArbmV3IERhdGUoKTtcbiAgICB2YXIgbXMgPSBjdXJyIC0gKHByZXZUaW1lIHx8IGN1cnIpO1xuICAgIHNlbGYuZGlmZiA9IG1zO1xuICAgIHNlbGYucHJldiA9IHByZXZUaW1lO1xuICAgIHNlbGYuY3VyciA9IGN1cnI7XG4gICAgcHJldlRpbWUgPSBjdXJyO1xuXG4gICAgLy8gYWRkIHRoZSBgY29sb3JgIGlmIG5vdCBzZXRcbiAgICBpZiAobnVsbCA9PSBzZWxmLnVzZUNvbG9ycykgc2VsZi51c2VDb2xvcnMgPSBleHBvcnRzLnVzZUNvbG9ycygpO1xuICAgIGlmIChudWxsID09IHNlbGYuY29sb3IgJiYgc2VsZi51c2VDb2xvcnMpIHNlbGYuY29sb3IgPSBzZWxlY3RDb2xvcigpO1xuXG4gICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuXG4gICAgYXJnc1swXSA9IGV4cG9ydHMuY29lcmNlKGFyZ3NbMF0pO1xuXG4gICAgaWYgKCdzdHJpbmcnICE9PSB0eXBlb2YgYXJnc1swXSkge1xuICAgICAgLy8gYW55dGhpbmcgZWxzZSBsZXQncyBpbnNwZWN0IHdpdGggJW9cbiAgICAgIGFyZ3MgPSBbJyVvJ10uY29uY2F0KGFyZ3MpO1xuICAgIH1cblxuICAgIC8vIGFwcGx5IGFueSBgZm9ybWF0dGVyc2AgdHJhbnNmb3JtYXRpb25zXG4gICAgdmFyIGluZGV4ID0gMDtcbiAgICBhcmdzWzBdID0gYXJnc1swXS5yZXBsYWNlKC8lKFthLXolXSkvZywgZnVuY3Rpb24obWF0Y2gsIGZvcm1hdCkge1xuICAgICAgLy8gaWYgd2UgZW5jb3VudGVyIGFuIGVzY2FwZWQgJSB0aGVuIGRvbid0IGluY3JlYXNlIHRoZSBhcnJheSBpbmRleFxuICAgICAgaWYgKG1hdGNoID09PSAnJSUnKSByZXR1cm4gbWF0Y2g7XG4gICAgICBpbmRleCsrO1xuICAgICAgdmFyIGZvcm1hdHRlciA9IGV4cG9ydHMuZm9ybWF0dGVyc1tmb3JtYXRdO1xuICAgICAgaWYgKCdmdW5jdGlvbicgPT09IHR5cGVvZiBmb3JtYXR0ZXIpIHtcbiAgICAgICAgdmFyIHZhbCA9IGFyZ3NbaW5kZXhdO1xuICAgICAgICBtYXRjaCA9IGZvcm1hdHRlci5jYWxsKHNlbGYsIHZhbCk7XG5cbiAgICAgICAgLy8gbm93IHdlIG5lZWQgdG8gcmVtb3ZlIGBhcmdzW2luZGV4XWAgc2luY2UgaXQncyBpbmxpbmVkIGluIHRoZSBgZm9ybWF0YFxuICAgICAgICBhcmdzLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgIGluZGV4LS07XG4gICAgICB9XG4gICAgICByZXR1cm4gbWF0Y2g7XG4gICAgfSk7XG5cbiAgICBpZiAoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIGV4cG9ydHMuZm9ybWF0QXJncykge1xuICAgICAgYXJncyA9IGV4cG9ydHMuZm9ybWF0QXJncy5hcHBseShzZWxmLCBhcmdzKTtcbiAgICB9XG4gICAgdmFyIGxvZ0ZuID0gZW5hYmxlZC5sb2cgfHwgZXhwb3J0cy5sb2cgfHwgY29uc29sZS5sb2cuYmluZChjb25zb2xlKTtcbiAgICBsb2dGbi5hcHBseShzZWxmLCBhcmdzKTtcbiAgfVxuICBlbmFibGVkLmVuYWJsZWQgPSB0cnVlO1xuXG4gIHZhciBmbiA9IGV4cG9ydHMuZW5hYmxlZChuYW1lc3BhY2UpID8gZW5hYmxlZCA6IGRpc2FibGVkO1xuXG4gIGZuLm5hbWVzcGFjZSA9IG5hbWVzcGFjZTtcblxuICByZXR1cm4gZm47XG59XG5cbi8qKlxuICogRW5hYmxlcyBhIGRlYnVnIG1vZGUgYnkgbmFtZXNwYWNlcy4gVGhpcyBjYW4gaW5jbHVkZSBtb2Rlc1xuICogc2VwYXJhdGVkIGJ5IGEgY29sb24gYW5kIHdpbGRjYXJkcy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZXNwYWNlc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5mdW5jdGlvbiBlbmFibGUobmFtZXNwYWNlcykge1xuICBleHBvcnRzLnNhdmUobmFtZXNwYWNlcyk7XG5cbiAgdmFyIHNwbGl0ID0gKG5hbWVzcGFjZXMgfHwgJycpLnNwbGl0KC9bXFxzLF0rLyk7XG4gIHZhciBsZW4gPSBzcGxpdC5sZW5ndGg7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgIGlmICghc3BsaXRbaV0pIGNvbnRpbnVlOyAvLyBpZ25vcmUgZW1wdHkgc3RyaW5nc1xuICAgIG5hbWVzcGFjZXMgPSBzcGxpdFtpXS5yZXBsYWNlKC9cXCovZywgJy4qPycpO1xuICAgIGlmIChuYW1lc3BhY2VzWzBdID09PSAnLScpIHtcbiAgICAgIGV4cG9ydHMuc2tpcHMucHVzaChuZXcgUmVnRXhwKCdeJyArIG5hbWVzcGFjZXMuc3Vic3RyKDEpICsgJyQnKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGV4cG9ydHMubmFtZXMucHVzaChuZXcgUmVnRXhwKCdeJyArIG5hbWVzcGFjZXMgKyAnJCcpKTtcbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBEaXNhYmxlIGRlYnVnIG91dHB1dC5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIGRpc2FibGUoKSB7XG4gIGV4cG9ydHMuZW5hYmxlKCcnKTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIHRydWUgaWYgdGhlIGdpdmVuIG1vZGUgbmFtZSBpcyBlbmFibGVkLCBmYWxzZSBvdGhlcndpc2UuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IG5hbWVcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIGVuYWJsZWQobmFtZSkge1xuICB2YXIgaSwgbGVuO1xuICBmb3IgKGkgPSAwLCBsZW4gPSBleHBvcnRzLnNraXBzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgaWYgKGV4cG9ydHMuc2tpcHNbaV0udGVzdChuYW1lKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuICBmb3IgKGkgPSAwLCBsZW4gPSBleHBvcnRzLm5hbWVzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgaWYgKGV4cG9ydHMubmFtZXNbaV0udGVzdChuYW1lKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuLyoqXG4gKiBDb2VyY2UgYHZhbGAuXG4gKlxuICogQHBhcmFtIHtNaXhlZH0gdmFsXG4gKiBAcmV0dXJuIHtNaXhlZH1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIGNvZXJjZSh2YWwpIHtcbiAgaWYgKHZhbCBpbnN0YW5jZW9mIEVycm9yKSByZXR1cm4gdmFsLnN0YWNrIHx8IHZhbC5tZXNzYWdlO1xuICByZXR1cm4gdmFsO1xufVxuIiwiLyoqXG4gKiBIZWxwZXJzLlxuICovXG5cbnZhciBzID0gMTAwMDtcbnZhciBtID0gcyAqIDYwO1xudmFyIGggPSBtICogNjA7XG52YXIgZCA9IGggKiAyNDtcbnZhciB5ID0gZCAqIDM2NS4yNTtcblxuLyoqXG4gKiBQYXJzZSBvciBmb3JtYXQgdGhlIGdpdmVuIGB2YWxgLlxuICpcbiAqIE9wdGlvbnM6XG4gKlxuICogIC0gYGxvbmdgIHZlcmJvc2UgZm9ybWF0dGluZyBbZmFsc2VdXG4gKlxuICogQHBhcmFtIHtTdHJpbmd8TnVtYmVyfSB2YWxcbiAqIEBwYXJhbSB7T2JqZWN0fSBvcHRpb25zXG4gKiBAcmV0dXJuIHtTdHJpbmd8TnVtYmVyfVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHZhbCwgb3B0aW9ucyl7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICBpZiAoJ3N0cmluZycgPT0gdHlwZW9mIHZhbCkgcmV0dXJuIHBhcnNlKHZhbCk7XG4gIHJldHVybiBvcHRpb25zLmxvbmdcbiAgICA/IGxvbmcodmFsKVxuICAgIDogc2hvcnQodmFsKTtcbn07XG5cbi8qKlxuICogUGFyc2UgdGhlIGdpdmVuIGBzdHJgIGFuZCByZXR1cm4gbWlsbGlzZWNvbmRzLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBzdHJcbiAqIEByZXR1cm4ge051bWJlcn1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIHBhcnNlKHN0cikge1xuICBzdHIgPSAnJyArIHN0cjtcbiAgaWYgKHN0ci5sZW5ndGggPiAxMDAwMCkgcmV0dXJuO1xuICB2YXIgbWF0Y2ggPSAvXigoPzpcXGQrKT9cXC4/XFxkKykgKihtaWxsaXNlY29uZHM/fG1zZWNzP3xtc3xzZWNvbmRzP3xzZWNzP3xzfG1pbnV0ZXM/fG1pbnM/fG18aG91cnM/fGhycz98aHxkYXlzP3xkfHllYXJzP3x5cnM/fHkpPyQvaS5leGVjKHN0cik7XG4gIGlmICghbWF0Y2gpIHJldHVybjtcbiAgdmFyIG4gPSBwYXJzZUZsb2F0KG1hdGNoWzFdKTtcbiAgdmFyIHR5cGUgPSAobWF0Y2hbMl0gfHwgJ21zJykudG9Mb3dlckNhc2UoKTtcbiAgc3dpdGNoICh0eXBlKSB7XG4gICAgY2FzZSAneWVhcnMnOlxuICAgIGNhc2UgJ3llYXInOlxuICAgIGNhc2UgJ3lycyc6XG4gICAgY2FzZSAneXInOlxuICAgIGNhc2UgJ3knOlxuICAgICAgcmV0dXJuIG4gKiB5O1xuICAgIGNhc2UgJ2RheXMnOlxuICAgIGNhc2UgJ2RheSc6XG4gICAgY2FzZSAnZCc6XG4gICAgICByZXR1cm4gbiAqIGQ7XG4gICAgY2FzZSAnaG91cnMnOlxuICAgIGNhc2UgJ2hvdXInOlxuICAgIGNhc2UgJ2hycyc6XG4gICAgY2FzZSAnaHInOlxuICAgIGNhc2UgJ2gnOlxuICAgICAgcmV0dXJuIG4gKiBoO1xuICAgIGNhc2UgJ21pbnV0ZXMnOlxuICAgIGNhc2UgJ21pbnV0ZSc6XG4gICAgY2FzZSAnbWlucyc6XG4gICAgY2FzZSAnbWluJzpcbiAgICBjYXNlICdtJzpcbiAgICAgIHJldHVybiBuICogbTtcbiAgICBjYXNlICdzZWNvbmRzJzpcbiAgICBjYXNlICdzZWNvbmQnOlxuICAgIGNhc2UgJ3NlY3MnOlxuICAgIGNhc2UgJ3NlYyc6XG4gICAgY2FzZSAncyc6XG4gICAgICByZXR1cm4gbiAqIHM7XG4gICAgY2FzZSAnbWlsbGlzZWNvbmRzJzpcbiAgICBjYXNlICdtaWxsaXNlY29uZCc6XG4gICAgY2FzZSAnbXNlY3MnOlxuICAgIGNhc2UgJ21zZWMnOlxuICAgIGNhc2UgJ21zJzpcbiAgICAgIHJldHVybiBuO1xuICB9XG59XG5cbi8qKlxuICogU2hvcnQgZm9ybWF0IGZvciBgbXNgLlxuICpcbiAqIEBwYXJhbSB7TnVtYmVyfSBtc1xuICogQHJldHVybiB7U3RyaW5nfVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gc2hvcnQobXMpIHtcbiAgaWYgKG1zID49IGQpIHJldHVybiBNYXRoLnJvdW5kKG1zIC8gZCkgKyAnZCc7XG4gIGlmIChtcyA+PSBoKSByZXR1cm4gTWF0aC5yb3VuZChtcyAvIGgpICsgJ2gnO1xuICBpZiAobXMgPj0gbSkgcmV0dXJuIE1hdGgucm91bmQobXMgLyBtKSArICdtJztcbiAgaWYgKG1zID49IHMpIHJldHVybiBNYXRoLnJvdW5kKG1zIC8gcykgKyAncyc7XG4gIHJldHVybiBtcyArICdtcyc7XG59XG5cbi8qKlxuICogTG9uZyBmb3JtYXQgZm9yIGBtc2AuXG4gKlxuICogQHBhcmFtIHtOdW1iZXJ9IG1zXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBsb25nKG1zKSB7XG4gIHJldHVybiBwbHVyYWwobXMsIGQsICdkYXknKVxuICAgIHx8IHBsdXJhbChtcywgaCwgJ2hvdXInKVxuICAgIHx8IHBsdXJhbChtcywgbSwgJ21pbnV0ZScpXG4gICAgfHwgcGx1cmFsKG1zLCBzLCAnc2Vjb25kJylcbiAgICB8fCBtcyArICcgbXMnO1xufVxuXG4vKipcbiAqIFBsdXJhbGl6YXRpb24gaGVscGVyLlxuICovXG5cbmZ1bmN0aW9uIHBsdXJhbChtcywgbiwgbmFtZSkge1xuICBpZiAobXMgPCBuKSByZXR1cm47XG4gIGlmIChtcyA8IG4gKiAxLjUpIHJldHVybiBNYXRoLmZsb29yKG1zIC8gbikgKyAnICcgKyBuYW1lO1xuICByZXR1cm4gTWF0aC5jZWlsKG1zIC8gbikgKyAnICcgKyBuYW1lICsgJ3MnO1xufVxuIiwidmFyIHdyYXBweSA9IHJlcXVpcmUoJ3dyYXBweScpXG5tb2R1bGUuZXhwb3J0cyA9IHdyYXBweShvbmNlKVxuXG5vbmNlLnByb3RvID0gb25jZShmdW5jdGlvbiAoKSB7XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShGdW5jdGlvbi5wcm90b3R5cGUsICdvbmNlJywge1xuICAgIHZhbHVlOiBmdW5jdGlvbiAoKSB7XG4gICAgICByZXR1cm4gb25jZSh0aGlzKVxuICAgIH0sXG4gICAgY29uZmlndXJhYmxlOiB0cnVlXG4gIH0pXG59KVxuXG5mdW5jdGlvbiBvbmNlIChmbikge1xuICB2YXIgZiA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoZi5jYWxsZWQpIHJldHVybiBmLnZhbHVlXG4gICAgZi5jYWxsZWQgPSB0cnVlXG4gICAgcmV0dXJuIGYudmFsdWUgPSBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpXG4gIH1cbiAgZi5jYWxsZWQgPSBmYWxzZVxuICByZXR1cm4gZlxufVxuIiwiLypqc2hpbnQgbm9kZTp0cnVlICovXHJcblxyXG5cInVzZSBzdHJpY3RcIjtcclxuXHJcbnZhciB1dGlsID0gcmVxdWlyZSgndXRpbCcpO1xyXG52YXIgZXZlbnRzID0gcmVxdWlyZSgnZXZlbnRzJyk7XHJcbnZhciBFdmVudEVtaXR0ZXIgPSBldmVudHMuRXZlbnRFbWl0dGVyO1xyXG52YXIgcnVuVGFzayA9IHJlcXVpcmUoJy4vbGliL3J1blRhc2snKTtcclxuXHJcbnZhciBPcmNoZXN0cmF0b3IgPSBmdW5jdGlvbiAoKSB7XHJcblx0RXZlbnRFbWl0dGVyLmNhbGwodGhpcyk7XHJcblx0dGhpcy5kb25lQ2FsbGJhY2sgPSB1bmRlZmluZWQ7IC8vIGNhbGwgdGhpcyB3aGVuIGFsbCB0YXNrcyBpbiB0aGUgcXVldWUgYXJlIGRvbmVcclxuXHR0aGlzLnNlcSA9IFtdOyAvLyB0aGUgb3JkZXIgdG8gcnVuIHRoZSB0YXNrc1xyXG5cdHRoaXMudGFza3MgPSB7fTsgLy8gdGFzayBvYmplY3RzOiBuYW1lLCBkZXAgKGxpc3Qgb2YgbmFtZXMgb2YgZGVwZW5kZW5jaWVzKSwgZm4gKHRoZSB0YXNrIHRvIHJ1bilcclxuXHR0aGlzLmlzUnVubmluZyA9IGZhbHNlOyAvLyBpcyB0aGUgb3JjaGVzdHJhdG9yIHJ1bm5pbmcgdGFza3M/IC5zdGFydCgpIHRvIHN0YXJ0LCAuc3RvcCgpIHRvIHN0b3BcclxufTtcclxudXRpbC5pbmhlcml0cyhPcmNoZXN0cmF0b3IsIEV2ZW50RW1pdHRlcik7XHJcblxyXG5cdE9yY2hlc3RyYXRvci5wcm90b3R5cGUucmVzZXQgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHRpZiAodGhpcy5pc1J1bm5pbmcpIHtcclxuXHRcdFx0dGhpcy5zdG9wKG51bGwpO1xyXG5cdFx0fVxyXG5cdFx0dGhpcy50YXNrcyA9IHt9O1xyXG5cdFx0dGhpcy5zZXEgPSBbXTtcclxuXHRcdHRoaXMuaXNSdW5uaW5nID0gZmFsc2U7XHJcblx0XHR0aGlzLmRvbmVDYWxsYmFjayA9IHVuZGVmaW5lZDtcclxuXHRcdHJldHVybiB0aGlzO1xyXG5cdH07XHJcblx0T3JjaGVzdHJhdG9yLnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbiAobmFtZSwgZGVwLCBmbikge1xyXG5cdFx0aWYgKCFmbiAmJiB0eXBlb2YgZGVwID09PSAnZnVuY3Rpb24nKSB7XHJcblx0XHRcdGZuID0gZGVwO1xyXG5cdFx0XHRkZXAgPSB1bmRlZmluZWQ7XHJcblx0XHR9XHJcblx0XHRkZXAgPSBkZXAgfHwgW107XHJcblx0XHRmbiA9IGZuIHx8IGZ1bmN0aW9uICgpIHt9OyAvLyBuby1vcFxyXG5cdFx0aWYgKCFuYW1lKSB7XHJcblx0XHRcdHRocm93IG5ldyBFcnJvcignVGFzayByZXF1aXJlcyBhIG5hbWUnKTtcclxuXHRcdH1cclxuXHRcdC8vIHZhbGlkYXRlIG5hbWUgaXMgYSBzdHJpbmcsIGRlcCBpcyBhbiBhcnJheSBvZiBzdHJpbmdzLCBhbmQgZm4gaXMgYSBmdW5jdGlvblxyXG5cdFx0aWYgKHR5cGVvZiBuYW1lICE9PSAnc3RyaW5nJykge1xyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ1Rhc2sgcmVxdWlyZXMgYSBuYW1lIHRoYXQgaXMgYSBzdHJpbmcnKTtcclxuXHRcdH1cclxuXHRcdGlmICh0eXBlb2YgZm4gIT09ICdmdW5jdGlvbicpIHtcclxuXHRcdFx0dGhyb3cgbmV3IEVycm9yKCdUYXNrICcrbmFtZSsnIHJlcXVpcmVzIGEgZnVuY3Rpb24gdGhhdCBpcyBhIGZ1bmN0aW9uJyk7XHJcblx0XHR9XHJcblx0XHRpZiAoIUFycmF5LmlzQXJyYXkoZGVwKSkge1xyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ1Rhc2sgJytuYW1lKycgY2FuXFwndCBzdXBwb3J0IGRlcGVuZGVuY2llcyB0aGF0IGlzIG5vdCBhbiBhcnJheSBvZiBzdHJpbmdzJyk7XHJcblx0XHR9XHJcblx0XHRkZXAuZm9yRWFjaChmdW5jdGlvbiAoaXRlbSkge1xyXG5cdFx0XHRpZiAodHlwZW9mIGl0ZW0gIT09ICdzdHJpbmcnKSB7XHJcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKCdUYXNrICcrbmFtZSsnIGRlcGVuZGVuY3kgJytpdGVtKycgaXMgbm90IGEgc3RyaW5nJyk7XHJcblx0XHRcdH1cclxuXHRcdH0pO1xyXG5cdFx0dGhpcy50YXNrc1tuYW1lXSA9IHtcclxuXHRcdFx0Zm46IGZuLFxyXG5cdFx0XHRkZXA6IGRlcCxcclxuXHRcdFx0bmFtZTogbmFtZVxyXG5cdFx0fTtcclxuXHRcdHJldHVybiB0aGlzO1xyXG5cdH07XHJcblx0T3JjaGVzdHJhdG9yLnByb3RvdHlwZS50YXNrID0gZnVuY3Rpb24gKG5hbWUsIGRlcCwgZm4pIHtcclxuXHRcdGlmIChkZXAgfHwgZm4pIHtcclxuXHRcdFx0Ly8gYWxpYXMgZm9yIGFkZCwgcmV0dXJuIG5vdGhpbmcgcmF0aGVyIHRoYW4gdGhpc1xyXG5cdFx0XHR0aGlzLmFkZChuYW1lLCBkZXAsIGZuKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHJldHVybiB0aGlzLnRhc2tzW25hbWVdO1xyXG5cdFx0fVxyXG5cdH07XHJcblx0T3JjaGVzdHJhdG9yLnByb3RvdHlwZS5oYXNUYXNrID0gZnVuY3Rpb24gKG5hbWUpIHtcclxuXHRcdHJldHVybiAhIXRoaXMudGFza3NbbmFtZV07XHJcblx0fTtcclxuXHQvLyB0YXNrcyBhbmQgb3B0aW9uYWxseSBhIGNhbGxiYWNrXHJcblx0T3JjaGVzdHJhdG9yLnByb3RvdHlwZS5zdGFydCA9IGZ1bmN0aW9uKCkge1xyXG5cdFx0dmFyIGFyZ3MsIGFyZywgbmFtZXMgPSBbXSwgbGFzdFRhc2ssIGksIHNlcSA9IFtdO1xyXG5cdFx0YXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCk7XHJcblx0XHRpZiAoYXJncy5sZW5ndGgpIHtcclxuXHRcdFx0bGFzdFRhc2sgPSBhcmdzW2FyZ3MubGVuZ3RoLTFdO1xyXG5cdFx0XHRpZiAodHlwZW9mIGxhc3RUYXNrID09PSAnZnVuY3Rpb24nKSB7XHJcblx0XHRcdFx0dGhpcy5kb25lQ2FsbGJhY2sgPSBsYXN0VGFzaztcclxuXHRcdFx0XHRhcmdzLnBvcCgpO1xyXG5cdFx0XHR9XHJcblx0XHRcdGZvciAoaSA9IDA7IGkgPCBhcmdzLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdFx0YXJnID0gYXJnc1tpXTtcclxuXHRcdFx0XHRpZiAodHlwZW9mIGFyZyA9PT0gJ3N0cmluZycpIHtcclxuXHRcdFx0XHRcdG5hbWVzLnB1c2goYXJnKTtcclxuXHRcdFx0XHR9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkoYXJnKSkge1xyXG5cdFx0XHRcdFx0bmFtZXMgPSBuYW1lcy5jb25jYXQoYXJnKTsgLy8gRlJBR0lMRTogQVNTVU1FOiBpdCdzIGFuIGFycmF5IG9mIHN0cmluZ3NcclxuXHRcdFx0XHR9IGVsc2Uge1xyXG5cdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKCdwYXNzIHN0cmluZ3Mgb3IgYXJyYXlzIG9mIHN0cmluZ3MnKTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdGlmICh0aGlzLmlzUnVubmluZykge1xyXG5cdFx0XHQvLyByZXNldCBzcGVjaWZpZWQgdGFza3MgKGFuZCBkZXBlbmRlbmNpZXMpIGFzIG5vdCBydW5cclxuXHRcdFx0dGhpcy5fcmVzZXRTcGVjaWZpY1Rhc2tzKG5hbWVzKTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdC8vIHJlc2V0IGFsbCB0YXNrcyBhcyBub3QgcnVuXHJcblx0XHRcdHRoaXMuX3Jlc2V0QWxsVGFza3MoKTtcclxuXHRcdH1cclxuXHRcdGlmICh0aGlzLmlzUnVubmluZykge1xyXG5cdFx0XHQvLyBpZiB5b3UgY2FsbCBzdGFydCgpIGFnYWluIHdoaWxlIGEgcHJldmlvdXMgcnVuIGlzIHN0aWxsIGluIHBsYXlcclxuXHRcdFx0Ly8gcHJlcGVuZCB0aGUgbmV3IHRhc2tzIHRvIHRoZSBleGlzdGluZyB0YXNrIHF1ZXVlXHJcblx0XHRcdG5hbWVzID0gbmFtZXMuY29uY2F0KHRoaXMuc2VxKTtcclxuXHRcdH1cclxuXHRcdGlmIChuYW1lcy5sZW5ndGggPCAxKSB7XHJcblx0XHRcdC8vIHJ1biBhbGwgdGFza3NcclxuXHRcdFx0Zm9yIChpIGluIHRoaXMudGFza3MpIHtcclxuXHRcdFx0XHRpZiAodGhpcy50YXNrcy5oYXNPd25Qcm9wZXJ0eShpKSkge1xyXG5cdFx0XHRcdFx0bmFtZXMucHVzaCh0aGlzLnRhc2tzW2ldLm5hbWUpO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0c2VxID0gW107XHJcblx0XHR0cnkge1xyXG5cdFx0XHR0aGlzLnNlcXVlbmNlKHRoaXMudGFza3MsIG5hbWVzLCBzZXEsIFtdKTtcclxuXHRcdH0gY2F0Y2ggKGVycikge1xyXG5cdFx0XHQvLyBJcyB0aGlzIGEga25vd24gZXJyb3I/XHJcblx0XHRcdGlmIChlcnIpIHtcclxuXHRcdFx0XHRpZiAoZXJyLm1pc3NpbmdUYXNrKSB7XHJcblx0XHRcdFx0XHR0aGlzLmVtaXQoJ3Rhc2tfbm90X2ZvdW5kJywge21lc3NhZ2U6IGVyci5tZXNzYWdlLCB0YXNrOmVyci5taXNzaW5nVGFzaywgZXJyOiBlcnJ9KTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0aWYgKGVyci5yZWN1cnNpdmVUYXNrcykge1xyXG5cdFx0XHRcdFx0dGhpcy5lbWl0KCd0YXNrX3JlY3Vyc2lvbicsIHttZXNzYWdlOiBlcnIubWVzc2FnZSwgcmVjdXJzaXZlVGFza3M6ZXJyLnJlY3Vyc2l2ZVRhc2tzLCBlcnI6IGVycn0pO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHR0aGlzLnN0b3AoZXJyKTtcclxuXHRcdFx0cmV0dXJuIHRoaXM7XHJcblx0XHR9XHJcblx0XHR0aGlzLnNlcSA9IHNlcTtcclxuXHRcdHRoaXMuZW1pdCgnc3RhcnQnLCB7bWVzc2FnZTonc2VxOiAnK3RoaXMuc2VxLmpvaW4oJywnKX0pO1xyXG5cdFx0aWYgKCF0aGlzLmlzUnVubmluZykge1xyXG5cdFx0XHR0aGlzLmlzUnVubmluZyA9IHRydWU7XHJcblx0XHR9XHJcblx0XHR0aGlzLl9ydW5TdGVwKCk7XHJcblx0XHRyZXR1cm4gdGhpcztcclxuXHR9O1xyXG5cdE9yY2hlc3RyYXRvci5wcm90b3R5cGUuc3RvcCA9IGZ1bmN0aW9uIChlcnIsIHN1Y2Nlc3NmdWxGaW5pc2gpIHtcclxuXHRcdHRoaXMuaXNSdW5uaW5nID0gZmFsc2U7XHJcblx0XHRpZiAoZXJyKSB7XHJcblx0XHRcdHRoaXMuZW1pdCgnZXJyJywge21lc3NhZ2U6J29yY2hlc3RyYXRpb24gZmFpbGVkJywgZXJyOmVycn0pO1xyXG5cdFx0fSBlbHNlIGlmIChzdWNjZXNzZnVsRmluaXNoKSB7XHJcblx0XHRcdHRoaXMuZW1pdCgnc3RvcCcsIHttZXNzYWdlOidvcmNoZXN0cmF0aW9uIHN1Y2NlZWRlZCd9KTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdC8vIEFTU1VNRVxyXG5cdFx0XHRlcnIgPSAnb3JjaGVzdHJhdGlvbiBhYm9ydGVkJztcclxuXHRcdFx0dGhpcy5lbWl0KCdlcnInLCB7bWVzc2FnZTonb3JjaGVzdHJhdGlvbiBhYm9ydGVkJywgZXJyOiBlcnJ9KTtcclxuXHRcdH1cclxuXHRcdGlmICh0aGlzLmRvbmVDYWxsYmFjaykge1xyXG5cdFx0XHQvLyBBdm9pZCBjYWxsaW5nIGl0IG11bHRpcGxlIHRpbWVzXHJcblx0XHRcdHRoaXMuZG9uZUNhbGxiYWNrKGVycik7XHJcblx0XHR9IGVsc2UgaWYgKGVyciAmJiAhdGhpcy5saXN0ZW5lcnMoJ2VycicpLmxlbmd0aCkge1xyXG5cdFx0XHQvLyBObyBvbmUgaXMgbGlzdGVuaW5nIGZvciB0aGUgZXJyb3Igc28gc3BlYWsgbG91ZGVyXHJcblx0XHRcdHRocm93IGVycjtcclxuXHRcdH1cclxuXHR9O1xyXG5cdE9yY2hlc3RyYXRvci5wcm90b3R5cGUuc2VxdWVuY2UgPSByZXF1aXJlKCdzZXF1ZW5jaWZ5Jyk7XHJcblx0T3JjaGVzdHJhdG9yLnByb3RvdHlwZS5hbGxEb25lID0gZnVuY3Rpb24gKCkge1xyXG5cdFx0dmFyIGksIHRhc2ssIGFsbERvbmUgPSB0cnVlOyAvLyBub3RoaW5nIGRpc3B1dGVkIGl0IHlldFxyXG5cdFx0Zm9yIChpID0gMDsgaSA8IHRoaXMuc2VxLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdHRhc2sgPSB0aGlzLnRhc2tzW3RoaXMuc2VxW2ldXTtcclxuXHRcdFx0aWYgKCF0YXNrLmRvbmUpIHtcclxuXHRcdFx0XHRhbGxEb25lID0gZmFsc2U7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdHJldHVybiBhbGxEb25lO1xyXG5cdH07XHJcblx0T3JjaGVzdHJhdG9yLnByb3RvdHlwZS5fcmVzZXRUYXNrID0gZnVuY3Rpb24odGFzaykge1xyXG5cdFx0aWYgKHRhc2spIHtcclxuXHRcdFx0aWYgKHRhc2suZG9uZSkge1xyXG5cdFx0XHRcdHRhc2suZG9uZSA9IGZhbHNlO1xyXG5cdFx0XHR9XHJcblx0XHRcdGRlbGV0ZSB0YXNrLnN0YXJ0O1xyXG5cdFx0XHRkZWxldGUgdGFzay5zdG9wO1xyXG5cdFx0XHRkZWxldGUgdGFzay5kdXJhdGlvbjtcclxuXHRcdFx0ZGVsZXRlIHRhc2suaHJEdXJhdGlvbjtcclxuXHRcdFx0ZGVsZXRlIHRhc2suYXJncztcclxuXHRcdH1cclxuXHR9O1xyXG5cdE9yY2hlc3RyYXRvci5wcm90b3R5cGUuX3Jlc2V0QWxsVGFza3MgPSBmdW5jdGlvbigpIHtcclxuXHRcdHZhciB0YXNrO1xyXG5cdFx0Zm9yICh0YXNrIGluIHRoaXMudGFza3MpIHtcclxuXHRcdFx0aWYgKHRoaXMudGFza3MuaGFzT3duUHJvcGVydHkodGFzaykpIHtcclxuXHRcdFx0XHR0aGlzLl9yZXNldFRhc2sodGhpcy50YXNrc1t0YXNrXSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9O1xyXG5cdE9yY2hlc3RyYXRvci5wcm90b3R5cGUuX3Jlc2V0U3BlY2lmaWNUYXNrcyA9IGZ1bmN0aW9uIChuYW1lcykge1xyXG5cdFx0dmFyIGksIG5hbWUsIHQ7XHJcblxyXG5cdFx0aWYgKG5hbWVzICYmIG5hbWVzLmxlbmd0aCkge1xyXG5cdFx0XHRmb3IgKGkgPSAwOyBpIDwgbmFtZXMubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0XHRuYW1lID0gbmFtZXNbaV07XHJcblx0XHRcdFx0dCA9IHRoaXMudGFza3NbbmFtZV07XHJcblx0XHRcdFx0aWYgKHQpIHtcclxuXHRcdFx0XHRcdHRoaXMuX3Jlc2V0VGFzayh0KTtcclxuXHRcdFx0XHRcdGlmICh0LmRlcCAmJiB0LmRlcC5sZW5ndGgpIHtcclxuXHRcdFx0XHRcdFx0dGhpcy5fcmVzZXRTcGVjaWZpY1Rhc2tzKHQuZGVwKTsgLy8gcmVjdXJzZVxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdC8vfSBlbHNlIHtcclxuXHRcdFx0XHRcdC8vIEZSQUdJTEU6IGlnbm9yZSB0aGF0IHRoZSB0YXNrIGRvZXNuJ3QgZXhpc3RcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9O1xyXG5cdE9yY2hlc3RyYXRvci5wcm90b3R5cGUuX3J1blN0ZXAgPSBmdW5jdGlvbiAoKSB7XHJcblx0XHR2YXIgaSwgdGFzaztcclxuXHRcdGlmICghdGhpcy5pc1J1bm5pbmcpIHtcclxuXHRcdFx0cmV0dXJuOyAvLyB1c2VyIGFib3J0ZWQsIEFTU1VNRTogc3RvcCBjYWxsZWQgcHJldmlvdXNseVxyXG5cdFx0fVxyXG5cdFx0Zm9yIChpID0gMDsgaSA8IHRoaXMuc2VxLmxlbmd0aDsgaSsrKSB7XHJcblx0XHRcdHRhc2sgPSB0aGlzLnRhc2tzW3RoaXMuc2VxW2ldXTtcclxuXHRcdFx0aWYgKCF0YXNrLmRvbmUgJiYgIXRhc2sucnVubmluZyAmJiB0aGlzLl9yZWFkeVRvUnVuVGFzayh0YXNrKSkge1xyXG5cdFx0XHRcdHRoaXMuX3J1blRhc2sodGFzayk7XHJcblx0XHRcdH1cclxuXHRcdFx0aWYgKCF0aGlzLmlzUnVubmluZykge1xyXG5cdFx0XHRcdHJldHVybjsgLy8gdGFzayBmYWlsZWQgb3IgdXNlciBhYm9ydGVkLCBBU1NVTUU6IHN0b3AgY2FsbGVkIHByZXZpb3VzbHlcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0aWYgKHRoaXMuYWxsRG9uZSgpKSB7XHJcblx0XHRcdHRoaXMuc3RvcChudWxsLCB0cnVlKTtcclxuXHRcdH1cclxuXHR9O1xyXG5cdE9yY2hlc3RyYXRvci5wcm90b3R5cGUuX3JlYWR5VG9SdW5UYXNrID0gZnVuY3Rpb24gKHRhc2spIHtcclxuXHRcdHZhciByZWFkeSA9IHRydWUsIC8vIG5vIG9uZSBkaXNwcm92ZWQgaXQgeWV0XHJcblx0XHRcdGksIG5hbWUsIHQ7XHJcblx0XHRpZiAodGFzay5kZXAubGVuZ3RoKSB7XHJcblx0XHRcdGZvciAoaSA9IDA7IGkgPCB0YXNrLmRlcC5sZW5ndGg7IGkrKykge1xyXG5cdFx0XHRcdG5hbWUgPSB0YXNrLmRlcFtpXTtcclxuXHRcdFx0XHR0ID0gdGhpcy50YXNrc1tuYW1lXTtcclxuXHRcdFx0XHRpZiAoIXQpIHtcclxuXHRcdFx0XHRcdC8vIEZSQUdJTEU6IHRoaXMgc2hvdWxkIG5ldmVyIGhhcHBlblxyXG5cdFx0XHRcdFx0dGhpcy5zdG9wKFwiY2FuJ3QgcnVuIFwiK3Rhc2submFtZStcIiBiZWNhdXNlIGl0IGRlcGVuZHMgb24gXCIrbmFtZStcIiB3aGljaCBkb2Vzbid0IGV4aXN0XCIpO1xyXG5cdFx0XHRcdFx0cmVhZHkgPSBmYWxzZTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRpZiAoIXQuZG9uZSkge1xyXG5cdFx0XHRcdFx0cmVhZHkgPSBmYWxzZTtcclxuXHRcdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0cmV0dXJuIHJlYWR5O1xyXG5cdH07XHJcblx0T3JjaGVzdHJhdG9yLnByb3RvdHlwZS5fc3RvcFRhc2sgPSBmdW5jdGlvbiAodGFzaywgbWV0YSkge1xyXG5cdFx0dGFzay5kdXJhdGlvbiA9IG1ldGEuZHVyYXRpb247XHJcblx0XHR0YXNrLmhyRHVyYXRpb24gPSBtZXRhLmhyRHVyYXRpb247XHJcblx0XHR0YXNrLnJ1bm5pbmcgPSBmYWxzZTtcclxuXHRcdHRhc2suZG9uZSA9IHRydWU7XHJcblx0fTtcclxuXHRPcmNoZXN0cmF0b3IucHJvdG90eXBlLl9lbWl0VGFza0RvbmUgPSBmdW5jdGlvbiAodGFzaywgbWVzc2FnZSwgZXJyKSB7XHJcblx0XHRpZiAoIXRhc2suYXJncykge1xyXG5cdFx0XHR0YXNrLmFyZ3MgPSB7dGFzazp0YXNrLm5hbWV9O1xyXG5cdFx0fVxyXG5cdFx0dGFzay5hcmdzLmR1cmF0aW9uID0gdGFzay5kdXJhdGlvbjtcclxuXHRcdHRhc2suYXJncy5ockR1cmF0aW9uID0gdGFzay5ockR1cmF0aW9uO1xyXG5cdFx0dGFzay5hcmdzLm1lc3NhZ2UgPSB0YXNrLm5hbWUrJyAnK21lc3NhZ2U7XHJcblx0XHR2YXIgZXZ0ID0gJ3N0b3AnO1xyXG5cdFx0aWYgKGVycikge1xyXG5cdFx0XHR0YXNrLmFyZ3MuZXJyID0gZXJyO1xyXG5cdFx0XHRldnQgPSAnZXJyJztcclxuXHRcdH1cclxuXHRcdC8vICd0YXNrX3N0b3AnIG9yICd0YXNrX2VycidcclxuXHRcdHRoaXMuZW1pdCgndGFza18nK2V2dCwgdGFzay5hcmdzKTtcclxuXHR9O1xyXG5cdE9yY2hlc3RyYXRvci5wcm90b3R5cGUuX3J1blRhc2sgPSBmdW5jdGlvbiAodGFzaykge1xyXG5cdFx0dmFyIHRoYXQgPSB0aGlzO1xyXG5cclxuXHRcdHRhc2suYXJncyA9IHt0YXNrOnRhc2submFtZSwgbWVzc2FnZTp0YXNrLm5hbWUrJyBzdGFydGVkJ307XHJcblx0XHR0aGlzLmVtaXQoJ3Rhc2tfc3RhcnQnLCB0YXNrLmFyZ3MpO1xyXG5cdFx0dGFzay5ydW5uaW5nID0gdHJ1ZTtcclxuXHJcblx0XHRydW5UYXNrKHRhc2suZm4uYmluZCh0aGlzKSwgZnVuY3Rpb24gKGVyciwgbWV0YSkge1xyXG5cdFx0XHR0aGF0Ll9zdG9wVGFzay5jYWxsKHRoYXQsIHRhc2ssIG1ldGEpO1xyXG5cdFx0XHR0aGF0Ll9lbWl0VGFza0RvbmUuY2FsbCh0aGF0LCB0YXNrLCBtZXRhLnJ1bk1ldGhvZCwgZXJyKTtcclxuXHRcdFx0aWYgKGVycikge1xyXG5cdFx0XHRcdHJldHVybiB0aGF0LnN0b3AuY2FsbCh0aGF0LCBlcnIpO1xyXG5cdFx0XHR9XHJcblx0XHRcdHRoYXQuX3J1blN0ZXAuY2FsbCh0aGF0KTtcclxuXHRcdH0pO1xyXG5cdH07XHJcblxyXG4vLyBGUkFHSUxFOiBBU1NVTUU6IHRoaXMgbGlzdCBpcyBhbiBleGhhdXN0aXZlIGxpc3Qgb2YgZXZlbnRzIGVtaXR0ZWRcclxudmFyIGV2ZW50cyA9IFsnc3RhcnQnLCdzdG9wJywnZXJyJywndGFza19zdGFydCcsJ3Rhc2tfc3RvcCcsJ3Rhc2tfZXJyJywndGFza19ub3RfZm91bmQnLCd0YXNrX3JlY3Vyc2lvbiddO1xyXG5cclxudmFyIGxpc3RlblRvRXZlbnQgPSBmdW5jdGlvbiAodGFyZ2V0LCBldmVudCwgY2FsbGJhY2spIHtcclxuXHR0YXJnZXQub24oZXZlbnQsIGZ1bmN0aW9uIChlKSB7XHJcblx0XHRlLnNyYyA9IGV2ZW50O1xyXG5cdFx0Y2FsbGJhY2soZSk7XHJcblx0fSk7XHJcbn07XHJcblxyXG5cdE9yY2hlc3RyYXRvci5wcm90b3R5cGUub25BbGwgPSBmdW5jdGlvbiAoY2FsbGJhY2spIHtcclxuXHRcdHZhciBpO1xyXG5cdFx0aWYgKHR5cGVvZiBjYWxsYmFjayAhPT0gJ2Z1bmN0aW9uJykge1xyXG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ05vIGNhbGxiYWNrIHNwZWNpZmllZCcpO1xyXG5cdFx0fVxyXG5cclxuXHRcdGZvciAoaSA9IDA7IGkgPCBldmVudHMubGVuZ3RoOyBpKyspIHtcclxuXHRcdFx0bGlzdGVuVG9FdmVudCh0aGlzLCBldmVudHNbaV0sIGNhbGxiYWNrKTtcclxuXHRcdH1cclxuXHR9O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBPcmNoZXN0cmF0b3I7XHJcbiIsIi8qanNoaW50IG5vZGU6dHJ1ZSAqL1xyXG5cclxuXCJ1c2Ugc3RyaWN0XCI7XHJcblxyXG52YXIgZW9zID0gcmVxdWlyZSgnZW5kLW9mLXN0cmVhbScpO1xyXG52YXIgY29uc3VtZSA9IHJlcXVpcmUoJ3N0cmVhbS1jb25zdW1lJyk7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICh0YXNrLCBkb25lKSB7XHJcblx0dmFyIHRoYXQgPSB0aGlzLCBmaW5pc2gsIGNiLCBpc0RvbmUgPSBmYWxzZSwgc3RhcnQsIHI7XHJcblxyXG5cdGZpbmlzaCA9IGZ1bmN0aW9uIChlcnIsIHJ1bk1ldGhvZCkge1xyXG5cdFx0dmFyIGhyRHVyYXRpb24gPSBwcm9jZXNzLmhydGltZShzdGFydCk7XHJcblxyXG5cdFx0aWYgKGlzRG9uZSAmJiAhZXJyKSB7XHJcblx0XHRcdGVyciA9IG5ldyBFcnJvcigndGFzayBjb21wbGV0aW9uIGNhbGxiYWNrIGNhbGxlZCB0b28gbWFueSB0aW1lcycpO1xyXG5cdFx0fVxyXG5cdFx0aXNEb25lID0gdHJ1ZTtcclxuXHJcblx0XHR2YXIgZHVyYXRpb24gPSBockR1cmF0aW9uWzBdICsgKGhyRHVyYXRpb25bMV0gLyAxZTkpOyAvLyBzZWNvbmRzXHJcblxyXG5cdFx0ZG9uZS5jYWxsKHRoYXQsIGVyciwge1xyXG5cdFx0XHRkdXJhdGlvbjogZHVyYXRpb24sIC8vIHNlY29uZHNcclxuXHRcdFx0aHJEdXJhdGlvbjogaHJEdXJhdGlvbiwgLy8gW3NlY29uZHMsbmFub3NlY29uZHNdXHJcblx0XHRcdHJ1bk1ldGhvZDogcnVuTWV0aG9kXHJcblx0XHR9KTtcclxuXHR9O1xyXG5cclxuXHRjYiA9IGZ1bmN0aW9uIChlcnIpIHtcclxuXHRcdGZpbmlzaChlcnIsICdjYWxsYmFjaycpO1xyXG5cdH07XHJcblxyXG5cdHRyeSB7XHJcblx0XHRzdGFydCA9IHByb2Nlc3MuaHJ0aW1lKCk7XHJcblx0XHRyID0gdGFzayhjYik7XHJcblx0fSBjYXRjaCAoZXJyKSB7XHJcblx0XHRyZXR1cm4gZmluaXNoKGVyciwgJ2NhdGNoJyk7XHJcblx0fVxyXG5cclxuXHRpZiAociAmJiB0eXBlb2Ygci50aGVuID09PSAnZnVuY3Rpb24nKSB7XHJcblx0XHQvLyB3YWl0IGZvciBwcm9taXNlIHRvIHJlc29sdmVcclxuXHRcdC8vIEZSQUdJTEU6IEFTU1VNRTogUHJvbWlzZXMvQSssIHNlZSBodHRwOi8vcHJvbWlzZXMtYXBsdXMuZ2l0aHViLmlvL3Byb21pc2VzLXNwZWMvXHJcblx0XHRyLnRoZW4oZnVuY3Rpb24gKCkge1xyXG5cdFx0XHRmaW5pc2gobnVsbCwgJ3Byb21pc2UnKTtcclxuXHRcdH0sIGZ1bmN0aW9uKGVycikge1xyXG5cdFx0XHRmaW5pc2goZXJyLCAncHJvbWlzZScpO1xyXG5cdFx0fSk7XHJcblxyXG5cdH0gZWxzZSBpZiAociAmJiB0eXBlb2Ygci5waXBlID09PSAnZnVuY3Rpb24nKSB7XHJcblx0XHQvLyB3YWl0IGZvciBzdHJlYW0gdG8gZW5kXHJcblxyXG5cdFx0ZW9zKHIsIHsgZXJyb3I6IHRydWUsIHJlYWRhYmxlOiByLnJlYWRhYmxlLCB3cml0YWJsZTogci53cml0YWJsZSAmJiAhci5yZWFkYWJsZSB9LCBmdW5jdGlvbihlcnIpe1xyXG5cdFx0XHRmaW5pc2goZXJyLCAnc3RyZWFtJyk7XHJcblx0XHR9KTtcclxuXHJcblx0XHQvLyBFbnN1cmUgdGhhdCB0aGUgc3RyZWFtIGNvbXBsZXRlc1xyXG4gICAgICAgIGNvbnN1bWUocik7XHJcblxyXG5cdH0gZWxzZSBpZiAodGFzay5sZW5ndGggPT09IDApIHtcclxuXHRcdC8vIHN5bmNocm9ub3VzLCBmdW5jdGlvbiB0b29rIGluIGFyZ3MubGVuZ3RoIHBhcmFtZXRlcnMsIGFuZCB0aGUgY2FsbGJhY2sgd2FzIGV4dHJhXHJcblx0XHRmaW5pc2gobnVsbCwgJ3N5bmMnKTtcclxuXHJcblx0Ly99IGVsc2Uge1xyXG5cdFx0Ly8gRlJBR0lMRTogQVNTVU1FOiBjYWxsYmFja1xyXG5cclxuXHR9XHJcbn07XHJcbiIsInZhciBvbmNlID0gcmVxdWlyZSgnb25jZScpO1xuXG52YXIgbm9vcCA9IGZ1bmN0aW9uKCkge307XG5cbnZhciBpc1JlcXVlc3QgPSBmdW5jdGlvbihzdHJlYW0pIHtcblx0cmV0dXJuIHN0cmVhbS5zZXRIZWFkZXIgJiYgdHlwZW9mIHN0cmVhbS5hYm9ydCA9PT0gJ2Z1bmN0aW9uJztcbn07XG5cbnZhciBlb3MgPSBmdW5jdGlvbihzdHJlYW0sIG9wdHMsIGNhbGxiYWNrKSB7XG5cdGlmICh0eXBlb2Ygb3B0cyA9PT0gJ2Z1bmN0aW9uJykgcmV0dXJuIGVvcyhzdHJlYW0sIG51bGwsIG9wdHMpO1xuXHRpZiAoIW9wdHMpIG9wdHMgPSB7fTtcblxuXHRjYWxsYmFjayA9IG9uY2UoY2FsbGJhY2sgfHwgbm9vcCk7XG5cblx0dmFyIHdzID0gc3RyZWFtLl93cml0YWJsZVN0YXRlO1xuXHR2YXIgcnMgPSBzdHJlYW0uX3JlYWRhYmxlU3RhdGU7XG5cdHZhciByZWFkYWJsZSA9IG9wdHMucmVhZGFibGUgfHwgKG9wdHMucmVhZGFibGUgIT09IGZhbHNlICYmIHN0cmVhbS5yZWFkYWJsZSk7XG5cdHZhciB3cml0YWJsZSA9IG9wdHMud3JpdGFibGUgfHwgKG9wdHMud3JpdGFibGUgIT09IGZhbHNlICYmIHN0cmVhbS53cml0YWJsZSk7XG5cblx0dmFyIG9ubGVnYWN5ZmluaXNoID0gZnVuY3Rpb24oKSB7XG5cdFx0aWYgKCFzdHJlYW0ud3JpdGFibGUpIG9uZmluaXNoKCk7XG5cdH07XG5cblx0dmFyIG9uZmluaXNoID0gZnVuY3Rpb24oKSB7XG5cdFx0d3JpdGFibGUgPSBmYWxzZTtcblx0XHRpZiAoIXJlYWRhYmxlKSBjYWxsYmFjaygpO1xuXHR9O1xuXG5cdHZhciBvbmVuZCA9IGZ1bmN0aW9uKCkge1xuXHRcdHJlYWRhYmxlID0gZmFsc2U7XG5cdFx0aWYgKCF3cml0YWJsZSkgY2FsbGJhY2soKTtcblx0fTtcblxuXHR2YXIgb25jbG9zZSA9IGZ1bmN0aW9uKCkge1xuXHRcdGlmIChyZWFkYWJsZSAmJiAhKHJzICYmIHJzLmVuZGVkKSkgcmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcigncHJlbWF0dXJlIGNsb3NlJykpO1xuXHRcdGlmICh3cml0YWJsZSAmJiAhKHdzICYmIHdzLmVuZGVkKSkgcmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcigncHJlbWF0dXJlIGNsb3NlJykpO1xuXHR9O1xuXG5cdHZhciBvbnJlcXVlc3QgPSBmdW5jdGlvbigpIHtcblx0XHRzdHJlYW0ucmVxLm9uKCdmaW5pc2gnLCBvbmZpbmlzaCk7XG5cdH07XG5cblx0aWYgKGlzUmVxdWVzdChzdHJlYW0pKSB7XG5cdFx0c3RyZWFtLm9uKCdjb21wbGV0ZScsIG9uZmluaXNoKTtcblx0XHRzdHJlYW0ub24oJ2Fib3J0Jywgb25jbG9zZSk7XG5cdFx0aWYgKHN0cmVhbS5yZXEpIG9ucmVxdWVzdCgpO1xuXHRcdGVsc2Ugc3RyZWFtLm9uKCdyZXF1ZXN0Jywgb25yZXF1ZXN0KTtcblx0fSBlbHNlIGlmICh3cml0YWJsZSAmJiAhd3MpIHsgLy8gbGVnYWN5IHN0cmVhbXNcblx0XHRzdHJlYW0ub24oJ2VuZCcsIG9ubGVnYWN5ZmluaXNoKTtcblx0XHRzdHJlYW0ub24oJ2Nsb3NlJywgb25sZWdhY3lmaW5pc2gpO1xuXHR9XG5cblx0c3RyZWFtLm9uKCdlbmQnLCBvbmVuZCk7XG5cdHN0cmVhbS5vbignZmluaXNoJywgb25maW5pc2gpO1xuXHRpZiAob3B0cy5lcnJvciAhPT0gZmFsc2UpIHN0cmVhbS5vbignZXJyb3InLCBjYWxsYmFjayk7XG5cdHN0cmVhbS5vbignY2xvc2UnLCBvbmNsb3NlKTtcblxuXHRyZXR1cm4gc3RyZWFtO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBlb3M7IiwiLyohXG4gKiBwYXJzZXVybFxuICogQ29weXJpZ2h0KGMpIDIwMTQgSm9uYXRoYW4gT25nXG4gKiBDb3B5cmlnaHQoYykgMjAxNCBEb3VnbGFzIENocmlzdG9waGVyIFdpbHNvblxuICogTUlUIExpY2Vuc2VkXG4gKi9cblxuJ3VzZSBzdHJpY3QnXG5cbi8qKlxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xuXG52YXIgdXJsID0gcmVxdWlyZSgndXJsJylcbnZhciBwYXJzZSA9IHVybC5wYXJzZVxudmFyIFVybCA9IHVybC5VcmxcblxuLyoqXG4gKiBQYXR0ZXJuIGZvciBhIHNpbXBsZSBwYXRoIGNhc2UuXG4gKiBTZWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9qb3llbnQvbm9kZS9wdWxsLzc4NzhcbiAqL1xuXG52YXIgc2ltcGxlUGF0aFJlZ0V4cCA9IC9eKFxcL1xcLz8oPyFcXC8pW15cXD8jXFxzXSopKFxcP1teI1xcc10qKT8kL1xuXG4vKipcbiAqIEV4cG9ydHMuXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBwYXJzZXVybFxubW9kdWxlLmV4cG9ydHMub3JpZ2luYWwgPSBvcmlnaW5hbHVybFxuXG4vKipcbiAqIFBhcnNlIHRoZSBgcmVxYCB1cmwgd2l0aCBtZW1vaXphdGlvbi5cbiAqXG4gKiBAcGFyYW0ge1NlcnZlclJlcXVlc3R9IHJlcVxuICogQHJldHVybiB7T2JqZWN0fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5mdW5jdGlvbiBwYXJzZXVybChyZXEpIHtcbiAgdmFyIHVybCA9IHJlcS51cmxcblxuICBpZiAodXJsID09PSB1bmRlZmluZWQpIHtcbiAgICAvLyBVUkwgaXMgdW5kZWZpbmVkXG4gICAgcmV0dXJuIHVuZGVmaW5lZFxuICB9XG5cbiAgdmFyIHBhcnNlZCA9IHJlcS5fcGFyc2VkVXJsXG5cbiAgaWYgKGZyZXNoKHVybCwgcGFyc2VkKSkge1xuICAgIC8vIFJldHVybiBjYWNoZWQgVVJMIHBhcnNlXG4gICAgcmV0dXJuIHBhcnNlZFxuICB9XG5cbiAgLy8gUGFyc2UgdGhlIFVSTFxuICBwYXJzZWQgPSBmYXN0cGFyc2UodXJsKVxuICBwYXJzZWQuX3JhdyA9IHVybFxuXG4gIHJldHVybiByZXEuX3BhcnNlZFVybCA9IHBhcnNlZFxufTtcblxuLyoqXG4gKiBQYXJzZSB0aGUgYHJlcWAgb3JpZ2luYWwgdXJsIHdpdGggZmFsbGJhY2sgYW5kIG1lbW9pemF0aW9uLlxuICpcbiAqIEBwYXJhbSB7U2VydmVyUmVxdWVzdH0gcmVxXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIG9yaWdpbmFsdXJsKHJlcSkge1xuICB2YXIgdXJsID0gcmVxLm9yaWdpbmFsVXJsXG5cbiAgaWYgKHR5cGVvZiB1cmwgIT09ICdzdHJpbmcnKSB7XG4gICAgLy8gRmFsbGJhY2tcbiAgICByZXR1cm4gcGFyc2V1cmwocmVxKVxuICB9XG5cbiAgdmFyIHBhcnNlZCA9IHJlcS5fcGFyc2VkT3JpZ2luYWxVcmxcblxuICBpZiAoZnJlc2godXJsLCBwYXJzZWQpKSB7XG4gICAgLy8gUmV0dXJuIGNhY2hlZCBVUkwgcGFyc2VcbiAgICByZXR1cm4gcGFyc2VkXG4gIH1cblxuICAvLyBQYXJzZSB0aGUgVVJMXG4gIHBhcnNlZCA9IGZhc3RwYXJzZSh1cmwpXG4gIHBhcnNlZC5fcmF3ID0gdXJsXG5cbiAgcmV0dXJuIHJlcS5fcGFyc2VkT3JpZ2luYWxVcmwgPSBwYXJzZWRcbn07XG5cbi8qKlxuICogUGFyc2UgdGhlIGBzdHJgIHVybCB3aXRoIGZhc3QtcGF0aCBzaG9ydC1jdXQuXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHN0clxuICogQHJldHVybiB7T2JqZWN0fVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gZmFzdHBhcnNlKHN0cikge1xuICAvLyBUcnkgZmFzdCBwYXRoIHJlZ2V4cFxuICAvLyBTZWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9qb3llbnQvbm9kZS9wdWxsLzc4NzhcbiAgdmFyIHNpbXBsZVBhdGggPSB0eXBlb2Ygc3RyID09PSAnc3RyaW5nJyAmJiBzaW1wbGVQYXRoUmVnRXhwLmV4ZWMoc3RyKVxuXG4gIC8vIENvbnN0cnVjdCBzaW1wbGUgVVJMXG4gIGlmIChzaW1wbGVQYXRoKSB7XG4gICAgdmFyIHBhdGhuYW1lID0gc2ltcGxlUGF0aFsxXVxuICAgIHZhciBzZWFyY2ggPSBzaW1wbGVQYXRoWzJdIHx8IG51bGxcbiAgICB2YXIgdXJsID0gVXJsICE9PSB1bmRlZmluZWRcbiAgICAgID8gbmV3IFVybCgpXG4gICAgICA6IHt9XG4gICAgdXJsLnBhdGggPSBzdHJcbiAgICB1cmwuaHJlZiA9IHN0clxuICAgIHVybC5wYXRobmFtZSA9IHBhdGhuYW1lXG4gICAgdXJsLnNlYXJjaCA9IHNlYXJjaFxuICAgIHVybC5xdWVyeSA9IHNlYXJjaCAmJiBzZWFyY2guc3Vic3RyKDEpXG5cbiAgICByZXR1cm4gdXJsXG4gIH1cblxuICByZXR1cm4gcGFyc2Uoc3RyKVxufVxuXG4vKipcbiAqIERldGVybWluZSBpZiBwYXJzZWQgaXMgc3RpbGwgZnJlc2ggZm9yIHVybC5cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gdXJsXG4gKiBAcGFyYW0ge29iamVjdH0gcGFyc2VkVXJsXG4gKiBAcmV0dXJuIHtib29sZWFufVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gZnJlc2godXJsLCBwYXJzZWRVcmwpIHtcbiAgcmV0dXJuIHR5cGVvZiBwYXJzZWRVcmwgPT09ICdvYmplY3QnXG4gICAgJiYgcGFyc2VkVXJsICE9PSBudWxsXG4gICAgJiYgKFVybCA9PT0gdW5kZWZpbmVkIHx8IHBhcnNlZFVybCBpbnN0YW5jZW9mIFVybClcbiAgICAmJiBwYXJzZWRVcmwuX3JhdyA9PT0gdXJsXG59XG4iLCIvKipcbiAqIEV4cG9zZSBgcGF0aHRvUmVnZXhwYC5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IHBhdGh0b1JlZ2V4cDtcblxuLyoqXG4gKiBNYXRjaCBtYXRjaGluZyBncm91cHMgaW4gYSByZWd1bGFyIGV4cHJlc3Npb24uXG4gKi9cbnZhciBNQVRDSElOR19HUk9VUF9SRUdFWFAgPSAvXFwoKD8hXFw/KS9nO1xuXG4vKipcbiAqIE5vcm1hbGl6ZSB0aGUgZ2l2ZW4gcGF0aCBzdHJpbmcsXG4gKiByZXR1cm5pbmcgYSByZWd1bGFyIGV4cHJlc3Npb24uXG4gKlxuICogQW4gZW1wdHkgYXJyYXkgc2hvdWxkIGJlIHBhc3NlZCxcbiAqIHdoaWNoIHdpbGwgY29udGFpbiB0aGUgcGxhY2Vob2xkZXJcbiAqIGtleSBuYW1lcy4gRm9yIGV4YW1wbGUgXCIvdXNlci86aWRcIiB3aWxsXG4gKiB0aGVuIGNvbnRhaW4gW1wiaWRcIl0uXG4gKlxuICogQHBhcmFtICB7U3RyaW5nfFJlZ0V4cHxBcnJheX0gcGF0aFxuICogQHBhcmFtICB7QXJyYXl9IGtleXNcbiAqIEBwYXJhbSAge09iamVjdH0gb3B0aW9uc1xuICogQHJldHVybiB7UmVnRXhwfVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gcGF0aHRvUmVnZXhwKHBhdGgsIGtleXMsIG9wdGlvbnMpIHtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIGtleXMgPSBrZXlzIHx8IFtdO1xuICB2YXIgc3RyaWN0ID0gb3B0aW9ucy5zdHJpY3Q7XG4gIHZhciBlbmQgPSBvcHRpb25zLmVuZCAhPT0gZmFsc2U7XG4gIHZhciBmbGFncyA9IG9wdGlvbnMuc2Vuc2l0aXZlID8gJycgOiAnaSc7XG4gIHZhciBleHRyYU9mZnNldCA9IDA7XG4gIHZhciBrZXlzT2Zmc2V0ID0ga2V5cy5sZW5ndGg7XG4gIHZhciBpID0gMDtcbiAgdmFyIG5hbWUgPSAwO1xuICB2YXIgbTtcblxuICBpZiAocGF0aCBpbnN0YW5jZW9mIFJlZ0V4cCkge1xuICAgIHdoaWxlIChtID0gTUFUQ0hJTkdfR1JPVVBfUkVHRVhQLmV4ZWMocGF0aC5zb3VyY2UpKSB7XG4gICAgICBrZXlzLnB1c2goe1xuICAgICAgICBuYW1lOiBuYW1lKyssXG4gICAgICAgIG9wdGlvbmFsOiBmYWxzZSxcbiAgICAgICAgb2Zmc2V0OiBtLmluZGV4XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gcGF0aDtcbiAgfVxuXG4gIGlmIChBcnJheS5pc0FycmF5KHBhdGgpKSB7XG4gICAgLy8gTWFwIGFycmF5IHBhcnRzIGludG8gcmVnZXhwcyBhbmQgcmV0dXJuIHRoZWlyIHNvdXJjZS4gV2UgYWxzbyBwYXNzXG4gICAgLy8gdGhlIHNhbWUga2V5cyBhbmQgb3B0aW9ucyBpbnN0YW5jZSBpbnRvIGV2ZXJ5IGdlbmVyYXRpb24gdG8gZ2V0XG4gICAgLy8gY29uc2lzdGVudCBtYXRjaGluZyBncm91cHMgYmVmb3JlIHdlIGpvaW4gdGhlIHNvdXJjZXMgdG9nZXRoZXIuXG4gICAgcGF0aCA9IHBhdGgubWFwKGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgcmV0dXJuIHBhdGh0b1JlZ2V4cCh2YWx1ZSwga2V5cywgb3B0aW9ucykuc291cmNlO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIG5ldyBSZWdFeHAoJyg/OicgKyBwYXRoLmpvaW4oJ3wnKSArICcpJywgZmxhZ3MpO1xuICB9XG5cbiAgcGF0aCA9ICgnXicgKyBwYXRoICsgKHN0cmljdCA/ICcnIDogcGF0aFtwYXRoLmxlbmd0aCAtIDFdID09PSAnLycgPyAnPycgOiAnLz8nKSlcbiAgICAucmVwbGFjZSgvXFwvXFwoL2csICcvKD86JylcbiAgICAucmVwbGFjZSgvKFtcXC9cXC5dKS9nLCAnXFxcXCQxJylcbiAgICAucmVwbGFjZSgvKFxcXFxcXC8pPyhcXFxcXFwuKT86KFxcdyspKFxcKC4qP1xcKSk/KFxcKik/KFxcPyk/L2csIGZ1bmN0aW9uIChtYXRjaCwgc2xhc2gsIGZvcm1hdCwga2V5LCBjYXB0dXJlLCBzdGFyLCBvcHRpb25hbCwgb2Zmc2V0KSB7XG4gICAgICBzbGFzaCA9IHNsYXNoIHx8ICcnO1xuICAgICAgZm9ybWF0ID0gZm9ybWF0IHx8ICcnO1xuICAgICAgY2FwdHVyZSA9IGNhcHR1cmUgfHwgJyhbXlxcXFwvJyArIGZvcm1hdCArICddKz8pJztcbiAgICAgIG9wdGlvbmFsID0gb3B0aW9uYWwgfHwgJyc7XG5cbiAgICAgIGtleXMucHVzaCh7XG4gICAgICAgIG5hbWU6IGtleSxcbiAgICAgICAgb3B0aW9uYWw6ICEhb3B0aW9uYWwsXG4gICAgICAgIG9mZnNldDogb2Zmc2V0ICsgZXh0cmFPZmZzZXRcbiAgICAgIH0pO1xuXG4gICAgICB2YXIgcmVzdWx0ID0gJydcbiAgICAgICAgKyAob3B0aW9uYWwgPyAnJyA6IHNsYXNoKVxuICAgICAgICArICcoPzonXG4gICAgICAgICsgZm9ybWF0ICsgKG9wdGlvbmFsID8gc2xhc2ggOiAnJykgKyBjYXB0dXJlXG4gICAgICAgICsgKHN0YXIgPyAnKCg/OltcXFxcLycgKyBmb3JtYXQgKyAnXS4rPyk/KScgOiAnJylcbiAgICAgICAgKyAnKSdcbiAgICAgICAgKyBvcHRpb25hbDtcblxuICAgICAgZXh0cmFPZmZzZXQgKz0gcmVzdWx0Lmxlbmd0aCAtIG1hdGNoLmxlbmd0aDtcblxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9KVxuICAgIC5yZXBsYWNlKC9cXCovZywgZnVuY3Rpb24gKHN0YXIsIGluZGV4KSB7XG4gICAgICB2YXIgbGVuID0ga2V5cy5sZW5ndGhcblxuICAgICAgd2hpbGUgKGxlbi0tID4ga2V5c09mZnNldCAmJiBrZXlzW2xlbl0ub2Zmc2V0ID4gaW5kZXgpIHtcbiAgICAgICAga2V5c1tsZW5dLm9mZnNldCArPSAzOyAvLyBSZXBsYWNlbWVudCBsZW5ndGggbWludXMgYXN0ZXJpc2sgbGVuZ3RoLlxuICAgICAgfVxuXG4gICAgICByZXR1cm4gJyguKiknO1xuICAgIH0pO1xuXG4gIC8vIFRoaXMgaXMgYSB3b3JrYXJvdW5kIGZvciBoYW5kbGluZyB1bm5hbWVkIG1hdGNoaW5nIGdyb3Vwcy5cbiAgd2hpbGUgKG0gPSBNQVRDSElOR19HUk9VUF9SRUdFWFAuZXhlYyhwYXRoKSkge1xuICAgIHZhciBlc2NhcGVDb3VudCA9IDA7XG4gICAgdmFyIGluZGV4ID0gbS5pbmRleDtcblxuICAgIHdoaWxlIChwYXRoLmNoYXJBdCgtLWluZGV4KSA9PT0gJ1xcXFwnKSB7XG4gICAgICBlc2NhcGVDb3VudCsrO1xuICAgIH1cblxuICAgIC8vIEl0J3MgcG9zc2libGUgdG8gZXNjYXBlIHRoZSBicmFja2V0LlxuICAgIGlmIChlc2NhcGVDb3VudCAlIDIgPT09IDEpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmIChrZXlzT2Zmc2V0ICsgaSA9PT0ga2V5cy5sZW5ndGggfHwga2V5c1trZXlzT2Zmc2V0ICsgaV0ub2Zmc2V0ID4gbS5pbmRleCkge1xuICAgICAga2V5cy5zcGxpY2Uoa2V5c09mZnNldCArIGksIDAsIHtcbiAgICAgICAgbmFtZTogbmFtZSsrLCAvLyBVbm5hbWVkIG1hdGNoaW5nIGdyb3VwcyBtdXN0IGJlIGNvbnNpc3RlbnRseSBsaW5lYXIuXG4gICAgICAgIG9wdGlvbmFsOiBmYWxzZSxcbiAgICAgICAgb2Zmc2V0OiBtLmluZGV4XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpKys7XG4gIH1cblxuICAvLyBJZiB0aGUgcGF0aCBpcyBub24tZW5kaW5nLCBtYXRjaCB1bnRpbCB0aGUgZW5kIG9yIGEgc2xhc2guXG4gIHBhdGggKz0gKGVuZCA/ICckJyA6IChwYXRoW3BhdGgubGVuZ3RoIC0gMV0gPT09ICcvJyA/ICcnIDogJyg/PVxcXFwvfCQpJykpO1xuXG4gIHJldHVybiBuZXcgUmVnRXhwKHBhdGgsIGZsYWdzKTtcbn07XG4iLCIvKmpzaGludCBub2RlOnRydWUgKi9cclxuXHJcblwidXNlIHN0cmljdFwiO1xyXG5cclxudmFyIHNlcXVlbmNlID0gZnVuY3Rpb24gKHRhc2tzLCBuYW1lcywgcmVzdWx0cywgbmVzdCkge1xyXG5cdHZhciBpLCBuYW1lLCBub2RlLCBlLCBqO1xyXG5cdG5lc3QgPSBuZXN0IHx8IFtdO1xyXG5cdGZvciAoaSA9IDA7IGkgPCBuYW1lcy5sZW5ndGg7IGkrKykge1xyXG5cdFx0bmFtZSA9IG5hbWVzW2ldO1xyXG5cdFx0Ly8gZGUtZHVwIHJlc3VsdHNcclxuXHRcdGlmIChyZXN1bHRzLmluZGV4T2YobmFtZSkgPT09IC0xKSB7XHJcblx0XHRcdG5vZGUgPSB0YXNrc1tuYW1lXTtcclxuXHRcdFx0aWYgKCFub2RlKSB7XHJcblx0XHRcdFx0ZSA9IG5ldyBFcnJvcigndGFzayBcIicrbmFtZSsnXCIgaXMgbm90IGRlZmluZWQnKTtcclxuXHRcdFx0XHRlLm1pc3NpbmdUYXNrID0gbmFtZTtcclxuXHRcdFx0XHRlLnRhc2tMaXN0ID0gW107XHJcblx0XHRcdFx0Zm9yIChqIGluIHRhc2tzKSB7XHJcblx0XHRcdFx0XHRpZiAodGFza3MuaGFzT3duUHJvcGVydHkoaikpIHtcclxuXHRcdFx0XHRcdFx0ZS50YXNrTGlzdC5wdXNoKHRhc2tzW2pdLm5hbWUpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHR0aHJvdyBlO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmIChuZXN0LmluZGV4T2YobmFtZSkgPiAtMSkge1xyXG5cdFx0XHRcdG5lc3QucHVzaChuYW1lKTtcclxuXHRcdFx0XHRlID0gbmV3IEVycm9yKCdSZWN1cnNpdmUgZGVwZW5kZW5jaWVzIGRldGVjdGVkOiAnK25lc3Quam9pbignIC0+ICcpKTtcclxuXHRcdFx0XHRlLnJlY3Vyc2l2ZVRhc2tzID0gbmVzdDtcclxuXHRcdFx0XHRlLnRhc2tMaXN0ID0gW107XHJcblx0XHRcdFx0Zm9yIChqIGluIHRhc2tzKSB7XHJcblx0XHRcdFx0XHRpZiAodGFza3MuaGFzT3duUHJvcGVydHkoaikpIHtcclxuXHRcdFx0XHRcdFx0ZS50YXNrTGlzdC5wdXNoKHRhc2tzW2pdLm5hbWUpO1xyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHR0aHJvdyBlO1xyXG5cdFx0XHR9XHJcblx0XHRcdGlmIChub2RlLmRlcC5sZW5ndGgpIHtcclxuXHRcdFx0XHRuZXN0LnB1c2gobmFtZSk7XHJcblx0XHRcdFx0c2VxdWVuY2UodGFza3MsIG5vZGUuZGVwLCByZXN1bHRzLCBuZXN0KTsgLy8gcmVjdXJzZVxyXG5cdFx0XHRcdG5lc3QucG9wKG5hbWUpO1xyXG5cdFx0XHR9XHJcblx0XHRcdHJlc3VsdHMucHVzaChuYW1lKTtcclxuXHRcdH1cclxuXHR9XHJcbn07XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHNlcXVlbmNlO1xyXG4iLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHN0cmVhbSkge1xuICAgIGlmIChzdHJlYW0ucmVhZGFibGUgJiYgdHlwZW9mIHN0cmVhbS5yZXN1bWUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgdmFyIHN0YXRlID0gc3RyZWFtLl9yZWFkYWJsZVN0YXRlO1xuICAgICAgICBpZiAoIXN0YXRlIHx8IHN0YXRlLnBpcGVzQ291bnQgPT09IDApIHtcbiAgICAgICAgICAgIC8vIEVpdGhlciBhIGNsYXNzaWMgc3RyZWFtIG9yIHN0cmVhbXMyIHRoYXQncyBub3QgcGlwZWQgdG8gYW5vdGhlciBkZXN0aW5hdGlvblxuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBzdHJlYW0ucmVzdW1lKCk7XG4gICAgICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiR290IGVycm9yOiBcIiArIGVycik7XG4gICAgICAgICAgICAgICAgLy8gSWYgd2UgY2FuJ3QsIGl0J3Mgbm90IHdvcnRoIGR5aW5nIG92ZXJcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbn07XG4iLCIvKipcbiAqIE1lcmdlIG9iamVjdCBiIHdpdGggb2JqZWN0IGEuXG4gKlxuICogICAgIHZhciBhID0geyBmb286ICdiYXInIH1cbiAqICAgICAgICwgYiA9IHsgYmFyOiAnYmF6JyB9O1xuICpcbiAqICAgICBtZXJnZShhLCBiKTtcbiAqICAgICAvLyA9PiB7IGZvbzogJ2JhcicsIGJhcjogJ2JheicgfVxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBhXG4gKiBAcGFyYW0ge09iamVjdH0gYlxuICogQHJldHVybiB7T2JqZWN0fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihhLCBiKXtcbiAgaWYgKGEgJiYgYikge1xuICAgIGZvciAodmFyIGtleSBpbiBiKSB7XG4gICAgICBhW2tleV0gPSBiW2tleV07XG4gICAgfVxuICB9XG4gIHJldHVybiBhO1xufTtcbiIsIi8vIFJldHVybnMgYSB3cmFwcGVyIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyBhIHdyYXBwZWQgY2FsbGJhY2tcbi8vIFRoZSB3cmFwcGVyIGZ1bmN0aW9uIHNob3VsZCBkbyBzb21lIHN0dWZmLCBhbmQgcmV0dXJuIGFcbi8vIHByZXN1bWFibHkgZGlmZmVyZW50IGNhbGxiYWNrIGZ1bmN0aW9uLlxuLy8gVGhpcyBtYWtlcyBzdXJlIHRoYXQgb3duIHByb3BlcnRpZXMgYXJlIHJldGFpbmVkLCBzbyB0aGF0XG4vLyBkZWNvcmF0aW9ucyBhbmQgc3VjaCBhcmUgbm90IGxvc3QgYWxvbmcgdGhlIHdheS5cbm1vZHVsZS5leHBvcnRzID0gd3JhcHB5XG5mdW5jdGlvbiB3cmFwcHkgKGZuLCBjYikge1xuICBpZiAoZm4gJiYgY2IpIHJldHVybiB3cmFwcHkoZm4pKGNiKVxuXG4gIGlmICh0eXBlb2YgZm4gIT09ICdmdW5jdGlvbicpXG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignbmVlZCB3cmFwcGVyIGZ1bmN0aW9uJylcblxuICBPYmplY3Qua2V5cyhmbikuZm9yRWFjaChmdW5jdGlvbiAoaykge1xuICAgIHdyYXBwZXJba10gPSBmbltrXVxuICB9KVxuXG4gIHJldHVybiB3cmFwcGVyXG5cbiAgZnVuY3Rpb24gd3JhcHBlcigpIHtcbiAgICB2YXIgYXJncyA9IG5ldyBBcnJheShhcmd1bWVudHMubGVuZ3RoKVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJncy5sZW5ndGg7IGkrKykge1xuICAgICAgYXJnc1tpXSA9IGFyZ3VtZW50c1tpXVxuICAgIH1cbiAgICB2YXIgcmV0ID0gZm4uYXBwbHkodGhpcywgYXJncylcbiAgICB2YXIgY2IgPSBhcmdzW2FyZ3MubGVuZ3RoLTFdXG4gICAgaWYgKHR5cGVvZiByZXQgPT09ICdmdW5jdGlvbicgJiYgcmV0ICE9PSBjYikge1xuICAgICAgT2JqZWN0LmtleXMoY2IpLmZvckVhY2goZnVuY3Rpb24gKGspIHtcbiAgICAgICAgcmV0W2tdID0gY2Jba11cbiAgICAgIH0pXG4gICAgfVxuICAgIHJldHVybiByZXRcbiAgfVxufVxuIiwiOy8qISBzaG93ZG93biAwNi0wMi0yMDE3ICovXHJcbihmdW5jdGlvbigpe1xyXG4vKipcbiAqIENyZWF0ZWQgYnkgVGl2aWUgb24gMTMtMDctMjAxNS5cbiAqL1xuXG5mdW5jdGlvbiBnZXREZWZhdWx0T3B0cyAoc2ltcGxlKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICB2YXIgZGVmYXVsdE9wdGlvbnMgPSB7XG4gICAgb21pdEV4dHJhV0xJbkNvZGVCbG9ja3M6IHtcbiAgICAgIGRlZmF1bHRWYWx1ZTogZmFsc2UsXG4gICAgICBkZXNjcmliZTogJ09taXQgdGhlIGRlZmF1bHQgZXh0cmEgd2hpdGVsaW5lIGFkZGVkIHRvIGNvZGUgYmxvY2tzJyxcbiAgICAgIHR5cGU6ICdib29sZWFuJ1xuICAgIH0sXG4gICAgbm9IZWFkZXJJZDoge1xuICAgICAgZGVmYXVsdFZhbHVlOiBmYWxzZSxcbiAgICAgIGRlc2NyaWJlOiAnVHVybiBvbi9vZmYgZ2VuZXJhdGVkIGhlYWRlciBpZCcsXG4gICAgICB0eXBlOiAnYm9vbGVhbidcbiAgICB9LFxuICAgIHByZWZpeEhlYWRlcklkOiB7XG4gICAgICBkZWZhdWx0VmFsdWU6IGZhbHNlLFxuICAgICAgZGVzY3JpYmU6ICdTcGVjaWZ5IGEgcHJlZml4IHRvIGdlbmVyYXRlZCBoZWFkZXIgaWRzJyxcbiAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgfSxcbiAgICBnaENvbXBhdGlibGVIZWFkZXJJZDoge1xuICAgICAgZGVmYXVsdFZhbHVlOiBmYWxzZSxcbiAgICAgIGRlc2NyaWJlOiAnR2VuZXJhdGUgaGVhZGVyIGlkcyBjb21wYXRpYmxlIHdpdGggZ2l0aHViIHN0eWxlIChzcGFjZXMgYXJlIHJlcGxhY2VkIHdpdGggZGFzaGVzLCBhIGJ1bmNoIG9mIG5vbiBhbHBoYW51bWVyaWMgY2hhcnMgYXJlIHJlbW92ZWQpJyxcbiAgICAgIHR5cGU6ICdib29sZWFuJ1xuICAgIH0sXG4gICAgaGVhZGVyTGV2ZWxTdGFydDoge1xuICAgICAgZGVmYXVsdFZhbHVlOiBmYWxzZSxcbiAgICAgIGRlc2NyaWJlOiAnVGhlIGhlYWRlciBibG9ja3MgbGV2ZWwgc3RhcnQnLFxuICAgICAgdHlwZTogJ2ludGVnZXInXG4gICAgfSxcbiAgICBwYXJzZUltZ0RpbWVuc2lvbnM6IHtcbiAgICAgIGRlZmF1bHRWYWx1ZTogZmFsc2UsXG4gICAgICBkZXNjcmliZTogJ1R1cm4gb24vb2ZmIGltYWdlIGRpbWVuc2lvbiBwYXJzaW5nJyxcbiAgICAgIHR5cGU6ICdib29sZWFuJ1xuICAgIH0sXG4gICAgc2ltcGxpZmllZEF1dG9MaW5rOiB7XG4gICAgICBkZWZhdWx0VmFsdWU6IGZhbHNlLFxuICAgICAgZGVzY3JpYmU6ICdUdXJuIG9uL29mZiBHRk0gYXV0b2xpbmsgc3R5bGUnLFxuICAgICAgdHlwZTogJ2Jvb2xlYW4nXG4gICAgfSxcbiAgICBleGNsdWRlVHJhaWxpbmdQdW5jdHVhdGlvbkZyb21VUkxzOiB7XG4gICAgICBkZWZhdWx0VmFsdWU6IGZhbHNlLFxuICAgICAgZGVzY3JpYmU6ICdFeGNsdWRlcyB0cmFpbGluZyBwdW5jdHVhdGlvbiBmcm9tIGxpbmtzIGdlbmVyYXRlZCB3aXRoIGF1dG9MaW5raW5nJyxcbiAgICAgIHR5cGU6ICdib29sZWFuJ1xuICAgIH0sXG4gICAgbGl0ZXJhbE1pZFdvcmRVbmRlcnNjb3Jlczoge1xuICAgICAgZGVmYXVsdFZhbHVlOiBmYWxzZSxcbiAgICAgIGRlc2NyaWJlOiAnUGFyc2UgbWlkd29yZCB1bmRlcnNjb3JlcyBhcyBsaXRlcmFsIHVuZGVyc2NvcmVzJyxcbiAgICAgIHR5cGU6ICdib29sZWFuJ1xuICAgIH0sXG4gICAgc3RyaWtldGhyb3VnaDoge1xuICAgICAgZGVmYXVsdFZhbHVlOiBmYWxzZSxcbiAgICAgIGRlc2NyaWJlOiAnVHVybiBvbi9vZmYgc3RyaWtldGhyb3VnaCBzdXBwb3J0JyxcbiAgICAgIHR5cGU6ICdib29sZWFuJ1xuICAgIH0sXG4gICAgdGFibGVzOiB7XG4gICAgICBkZWZhdWx0VmFsdWU6IGZhbHNlLFxuICAgICAgZGVzY3JpYmU6ICdUdXJuIG9uL29mZiB0YWJsZXMgc3VwcG9ydCcsXG4gICAgICB0eXBlOiAnYm9vbGVhbidcbiAgICB9LFxuICAgIHRhYmxlc0hlYWRlcklkOiB7XG4gICAgICBkZWZhdWx0VmFsdWU6IGZhbHNlLFxuICAgICAgZGVzY3JpYmU6ICdBZGQgYW4gaWQgdG8gdGFibGUgaGVhZGVycycsXG4gICAgICB0eXBlOiAnYm9vbGVhbidcbiAgICB9LFxuICAgIGdoQ29kZUJsb2Nrczoge1xuICAgICAgZGVmYXVsdFZhbHVlOiB0cnVlLFxuICAgICAgZGVzY3JpYmU6ICdUdXJuIG9uL29mZiBHRk0gZmVuY2VkIGNvZGUgYmxvY2tzIHN1cHBvcnQnLFxuICAgICAgdHlwZTogJ2Jvb2xlYW4nXG4gICAgfSxcbiAgICB0YXNrbGlzdHM6IHtcbiAgICAgIGRlZmF1bHRWYWx1ZTogZmFsc2UsXG4gICAgICBkZXNjcmliZTogJ1R1cm4gb24vb2ZmIEdGTSB0YXNrbGlzdCBzdXBwb3J0JyxcbiAgICAgIHR5cGU6ICdib29sZWFuJ1xuICAgIH0sXG4gICAgc21vb3RoTGl2ZVByZXZpZXc6IHtcbiAgICAgIGRlZmF1bHRWYWx1ZTogZmFsc2UsXG4gICAgICBkZXNjcmliZTogJ1ByZXZlbnRzIHdlaXJkIGVmZmVjdHMgaW4gbGl2ZSBwcmV2aWV3cyBkdWUgdG8gaW5jb21wbGV0ZSBpbnB1dCcsXG4gICAgICB0eXBlOiAnYm9vbGVhbidcbiAgICB9LFxuICAgIHNtYXJ0SW5kZW50YXRpb25GaXg6IHtcbiAgICAgIGRlZmF1bHRWYWx1ZTogZmFsc2UsXG4gICAgICBkZXNjcmlwdGlvbjogJ1RyaWVzIHRvIHNtYXJ0bHkgZml4IGluZGVudGF0aW9uIGluIGVzNiBzdHJpbmdzJyxcbiAgICAgIHR5cGU6ICdib29sZWFuJ1xuICAgIH0sXG4gICAgZGlzYWJsZUZvcmNlZDRTcGFjZXNJbmRlbnRlZFN1Ymxpc3RzOiB7XG4gICAgICBkZWZhdWx0VmFsdWU6IGZhbHNlLFxuICAgICAgZGVzY3JpcHRpb246ICdEaXNhYmxlcyB0aGUgcmVxdWlyZW1lbnQgb2YgaW5kZW50aW5nIG5lc3RlZCBzdWJsaXN0cyBieSA0IHNwYWNlcycsXG4gICAgICB0eXBlOiAnYm9vbGVhbidcbiAgICB9LFxuICAgIHNpbXBsZUxpbmVCcmVha3M6IHtcbiAgICAgIGRlZmF1bHRWYWx1ZTogZmFsc2UsXG4gICAgICBkZXNjcmlwdGlvbjogJ1BhcnNlcyBzaW1wbGUgbGluZSBicmVha3MgYXMgPGJyPiAoR0ZNIFN0eWxlKScsXG4gICAgICB0eXBlOiAnYm9vbGVhbidcbiAgICB9LFxuICAgIHJlcXVpcmVTcGFjZUJlZm9yZUhlYWRpbmdUZXh0OiB7XG4gICAgICBkZWZhdWx0VmFsdWU6IGZhbHNlLFxuICAgICAgZGVzY3JpcHRpb246ICdNYWtlcyBhZGRpbmcgYSBzcGFjZSBiZXR3ZWVuIGAjYCBhbmQgdGhlIGhlYWRlciB0ZXh0IG1hbmRhdG9yeSAoR0ZNIFN0eWxlKScsXG4gICAgICB0eXBlOiAnYm9vbGVhbidcbiAgICB9LFxuICAgIGdoTWVudGlvbnM6IHtcbiAgICAgIGRlZmF1bHRWYWx1ZTogZmFsc2UsXG4gICAgICBkZXNjcmlwdGlvbjogJ0VuYWJsZXMgZ2l0aHViIEBtZW50aW9ucycsXG4gICAgICB0eXBlOiAnYm9vbGVhbidcbiAgICB9LFxuICAgIGdoTWVudGlvbnNMaW5rOiB7XG4gICAgICBkZWZhdWx0VmFsdWU6ICdodHRwczovL2dpdGh1Yi5jb20ve3V9JyxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ2hhbmdlcyB0aGUgbGluayBnZW5lcmF0ZWQgYnkgQG1lbnRpb25zLiBPbmx5IGFwcGxpZXMgaWYgZ2hNZW50aW9ucyBvcHRpb24gaXMgZW5hYmxlZC4nLFxuICAgICAgdHlwZTogJ3N0cmluZydcbiAgICB9LFxuICAgIGVuY29kZUVtYWlsczoge1xuICAgICAgZGVmYXVsdFZhbHVlOiB0cnVlLFxuICAgICAgZGVzY3JpcHRpb246ICdFbmNvZGUgZS1tYWlsIGFkZHJlc3NlcyB0aHJvdWdoIHRoZSB1c2Ugb2YgQ2hhcmFjdGVyIEVudGl0aWVzLCB0cmFuc2Zvcm1pbmcgQVNDSUkgZS1tYWlsIGFkZHJlc3NlcyBpbnRvIGl0cyBlcXVpdmFsZW50IGRlY2ltYWwgZW50aXRpZXMnLFxuICAgICAgdHlwZTogJ2Jvb2xlYW4nXG4gICAgfVxuICB9O1xuICBpZiAoc2ltcGxlID09PSBmYWxzZSkge1xuICAgIHJldHVybiBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGRlZmF1bHRPcHRpb25zKSk7XG4gIH1cbiAgdmFyIHJldCA9IHt9O1xuICBmb3IgKHZhciBvcHQgaW4gZGVmYXVsdE9wdGlvbnMpIHtcbiAgICBpZiAoZGVmYXVsdE9wdGlvbnMuaGFzT3duUHJvcGVydHkob3B0KSkge1xuICAgICAgcmV0W29wdF0gPSBkZWZhdWx0T3B0aW9uc1tvcHRdLmRlZmF1bHRWYWx1ZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJldDtcbn1cblxuZnVuY3Rpb24gYWxsT3B0aW9uc09uICgpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuICB2YXIgb3B0aW9ucyA9IGdldERlZmF1bHRPcHRzKHRydWUpLFxuICAgICAgcmV0ID0ge307XG4gIGZvciAodmFyIG9wdCBpbiBvcHRpb25zKSB7XG4gICAgaWYgKG9wdGlvbnMuaGFzT3duUHJvcGVydHkob3B0KSkge1xuICAgICAgcmV0W29wdF0gPSB0cnVlO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcmV0O1xufVxuXHJcbi8qKlxuICogQ3JlYXRlZCBieSBUaXZpZSBvbiAwNi0wMS0yMDE1LlxuICovXG5cbi8vIFByaXZhdGUgcHJvcGVydGllc1xudmFyIHNob3dkb3duID0ge30sXG4gICAgcGFyc2VycyA9IHt9LFxuICAgIGV4dGVuc2lvbnMgPSB7fSxcbiAgICBnbG9iYWxPcHRpb25zID0gZ2V0RGVmYXVsdE9wdHModHJ1ZSksXG4gICAgc2V0Rmxhdm9yID0gJ3ZhbmlsbGEnLFxuICAgIGZsYXZvciA9IHtcbiAgICAgIGdpdGh1Yjoge1xuICAgICAgICBvbWl0RXh0cmFXTEluQ29kZUJsb2NrczogICAgICAgICAgICAgIHRydWUsXG4gICAgICAgIHNpbXBsaWZpZWRBdXRvTGluazogICAgICAgICAgICAgICAgICAgdHJ1ZSxcbiAgICAgICAgZXhjbHVkZVRyYWlsaW5nUHVuY3R1YXRpb25Gcm9tVVJMczogICB0cnVlLFxuICAgICAgICBsaXRlcmFsTWlkV29yZFVuZGVyc2NvcmVzOiAgICAgICAgICAgIHRydWUsXG4gICAgICAgIHN0cmlrZXRocm91Z2g6ICAgICAgICAgICAgICAgICAgICAgICAgdHJ1ZSxcbiAgICAgICAgdGFibGVzOiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cnVlLFxuICAgICAgICB0YWJsZXNIZWFkZXJJZDogICAgICAgICAgICAgICAgICAgICAgIHRydWUsXG4gICAgICAgIGdoQ29kZUJsb2NrczogICAgICAgICAgICAgICAgICAgICAgICAgdHJ1ZSxcbiAgICAgICAgdGFza2xpc3RzOiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cnVlLFxuICAgICAgICBkaXNhYmxlRm9yY2VkNFNwYWNlc0luZGVudGVkU3VibGlzdHM6IHRydWUsXG4gICAgICAgIHNpbXBsZUxpbmVCcmVha3M6ICAgICAgICAgICAgICAgICAgICAgdHJ1ZSxcbiAgICAgICAgcmVxdWlyZVNwYWNlQmVmb3JlSGVhZGluZ1RleHQ6ICAgICAgICB0cnVlLFxuICAgICAgICBnaENvbXBhdGlibGVIZWFkZXJJZDogICAgICAgICAgICAgICAgIHRydWUsXG4gICAgICAgIGdoTWVudGlvbnM6ICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJ1ZVxuICAgICAgfSxcbiAgICAgIG9yaWdpbmFsOiB7XG4gICAgICAgIG5vSGVhZGVySWQ6ICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJ1ZSxcbiAgICAgICAgZ2hDb2RlQmxvY2tzOiAgICAgICAgICAgICAgICAgICAgICAgICBmYWxzZVxuICAgICAgfSxcbiAgICAgIGdob3N0OiB7XG4gICAgICAgIG9taXRFeHRyYVdMSW5Db2RlQmxvY2tzOiAgICAgICAgICAgICAgdHJ1ZSxcbiAgICAgICAgcGFyc2VJbWdEaW1lbnNpb25zOiAgICAgICAgICAgICAgICAgICB0cnVlLFxuICAgICAgICBzaW1wbGlmaWVkQXV0b0xpbms6ICAgICAgICAgICAgICAgICAgIHRydWUsXG4gICAgICAgIGV4Y2x1ZGVUcmFpbGluZ1B1bmN0dWF0aW9uRnJvbVVSTHM6ICAgdHJ1ZSxcbiAgICAgICAgbGl0ZXJhbE1pZFdvcmRVbmRlcnNjb3JlczogICAgICAgICAgICB0cnVlLFxuICAgICAgICBzdHJpa2V0aHJvdWdoOiAgICAgICAgICAgICAgICAgICAgICAgIHRydWUsXG4gICAgICAgIHRhYmxlczogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJ1ZSxcbiAgICAgICAgdGFibGVzSGVhZGVySWQ6ICAgICAgICAgICAgICAgICAgICAgICB0cnVlLFxuICAgICAgICBnaENvZGVCbG9ja3M6ICAgICAgICAgICAgICAgICAgICAgICAgIHRydWUsXG4gICAgICAgIHRhc2tsaXN0czogICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJ1ZSxcbiAgICAgICAgc21vb3RoTGl2ZVByZXZpZXc6ICAgICAgICAgICAgICAgICAgICB0cnVlLFxuICAgICAgICBzaW1wbGVMaW5lQnJlYWtzOiAgICAgICAgICAgICAgICAgICAgIHRydWUsXG4gICAgICAgIHJlcXVpcmVTcGFjZUJlZm9yZUhlYWRpbmdUZXh0OiAgICAgICAgdHJ1ZSxcbiAgICAgICAgZ2hNZW50aW9uczogICAgICAgICAgICAgICAgICAgICAgICAgICBmYWxzZSxcbiAgICAgICAgZW5jb2RlRW1haWxzOiAgICAgICAgICAgICAgICAgICAgICAgICB0cnVlXG4gICAgICB9LFxuICAgICAgdmFuaWxsYTogZ2V0RGVmYXVsdE9wdHModHJ1ZSksXG4gICAgICBhbGxPbjogYWxsT3B0aW9uc09uKClcbiAgICB9O1xuXG4vKipcbiAqIGhlbHBlciBuYW1lc3BhY2VcbiAqIEB0eXBlIHt7fX1cbiAqL1xuc2hvd2Rvd24uaGVscGVyID0ge307XG5cbi8qKlxuICogVE9ETyBMRUdBQ1kgU1VQUE9SVCBDT0RFXG4gKiBAdHlwZSB7e319XG4gKi9cbnNob3dkb3duLmV4dGVuc2lvbnMgPSB7fTtcblxuLyoqXG4gKiBTZXQgYSBnbG9iYWwgb3B0aW9uXG4gKiBAc3RhdGljXG4gKiBAcGFyYW0ge3N0cmluZ30ga2V5XG4gKiBAcGFyYW0geyp9IHZhbHVlXG4gKiBAcmV0dXJucyB7c2hvd2Rvd259XG4gKi9cbnNob3dkb3duLnNldE9wdGlvbiA9IGZ1bmN0aW9uIChrZXksIHZhbHVlKSB7XG4gICd1c2Ugc3RyaWN0JztcbiAgZ2xvYmFsT3B0aW9uc1trZXldID0gdmFsdWU7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBHZXQgYSBnbG9iYWwgb3B0aW9uXG4gKiBAc3RhdGljXG4gKiBAcGFyYW0ge3N0cmluZ30ga2V5XG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuc2hvd2Rvd24uZ2V0T3B0aW9uID0gZnVuY3Rpb24gKGtleSkge1xuICAndXNlIHN0cmljdCc7XG4gIHJldHVybiBnbG9iYWxPcHRpb25zW2tleV07XG59O1xuXG4vKipcbiAqIEdldCB0aGUgZ2xvYmFsIG9wdGlvbnNcbiAqIEBzdGF0aWNcbiAqIEByZXR1cm5zIHt7fX1cbiAqL1xuc2hvd2Rvd24uZ2V0T3B0aW9ucyA9IGZ1bmN0aW9uICgpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuICByZXR1cm4gZ2xvYmFsT3B0aW9ucztcbn07XG5cbi8qKlxuICogUmVzZXQgZ2xvYmFsIG9wdGlvbnMgdG8gdGhlIGRlZmF1bHQgdmFsdWVzXG4gKiBAc3RhdGljXG4gKi9cbnNob3dkb3duLnJlc2V0T3B0aW9ucyA9IGZ1bmN0aW9uICgpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuICBnbG9iYWxPcHRpb25zID0gZ2V0RGVmYXVsdE9wdHModHJ1ZSk7XG59O1xuXG4vKipcbiAqIFNldCB0aGUgZmxhdm9yIHNob3dkb3duIHNob3VsZCB1c2UgYXMgZGVmYXVsdFxuICogQHBhcmFtIHtzdHJpbmd9IG5hbWVcbiAqL1xuc2hvd2Rvd24uc2V0Rmxhdm9yID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuICBpZiAoIWZsYXZvci5oYXNPd25Qcm9wZXJ0eShuYW1lKSkge1xuICAgIHRocm93IEVycm9yKG5hbWUgKyAnIGZsYXZvciB3YXMgbm90IGZvdW5kJyk7XG4gIH1cbiAgdmFyIHByZXNldCA9IGZsYXZvcltuYW1lXTtcbiAgc2V0Rmxhdm9yID0gbmFtZTtcbiAgZm9yICh2YXIgb3B0aW9uIGluIHByZXNldCkge1xuICAgIGlmIChwcmVzZXQuaGFzT3duUHJvcGVydHkob3B0aW9uKSkge1xuICAgICAgZ2xvYmFsT3B0aW9uc1tvcHRpb25dID0gcHJlc2V0W29wdGlvbl07XG4gICAgfVxuICB9XG59O1xuXG4vKipcbiAqIEdldCB0aGUgY3VycmVudGx5IHNldCBmbGF2b3JcbiAqIEByZXR1cm5zIHtzdHJpbmd9XG4gKi9cbnNob3dkb3duLmdldEZsYXZvciA9IGZ1bmN0aW9uICgpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuICByZXR1cm4gc2V0Rmxhdm9yO1xufTtcblxuLyoqXG4gKiBHZXQgdGhlIG9wdGlvbnMgb2YgYSBzcGVjaWZpZWQgZmxhdm9yLiBSZXR1cm5zIHVuZGVmaW5lZCBpZiB0aGUgZmxhdm9yIHdhcyBub3QgZm91bmRcbiAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIE5hbWUgb2YgdGhlIGZsYXZvclxuICogQHJldHVybnMge3t9fHVuZGVmaW5lZH1cbiAqL1xuc2hvd2Rvd24uZ2V0Rmxhdm9yT3B0aW9ucyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICd1c2Ugc3RyaWN0JztcbiAgaWYgKGZsYXZvci5oYXNPd25Qcm9wZXJ0eShuYW1lKSkge1xuICAgIHJldHVybiBmbGF2b3JbbmFtZV07XG4gIH1cbn07XG5cbi8qKlxuICogR2V0IHRoZSBkZWZhdWx0IG9wdGlvbnNcbiAqIEBzdGF0aWNcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW3NpbXBsZT10cnVlXVxuICogQHJldHVybnMge3t9fVxuICovXG5zaG93ZG93bi5nZXREZWZhdWx0T3B0aW9ucyA9IGZ1bmN0aW9uIChzaW1wbGUpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuICByZXR1cm4gZ2V0RGVmYXVsdE9wdHMoc2ltcGxlKTtcbn07XG5cbi8qKlxuICogR2V0IG9yIHNldCBhIHN1YlBhcnNlclxuICpcbiAqIHN1YlBhcnNlcihuYW1lKSAgICAgICAtIEdldCBhIHJlZ2lzdGVyZWQgc3ViUGFyc2VyXG4gKiBzdWJQYXJzZXIobmFtZSwgZnVuYykgLSBSZWdpc3RlciBhIHN1YlBhcnNlclxuICogQHN0YXRpY1xuICogQHBhcmFtIHtzdHJpbmd9IG5hbWVcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IFtmdW5jXVxuICogQHJldHVybnMgeyp9XG4gKi9cbnNob3dkb3duLnN1YlBhcnNlciA9IGZ1bmN0aW9uIChuYW1lLCBmdW5jKSB7XG4gICd1c2Ugc3RyaWN0JztcbiAgaWYgKHNob3dkb3duLmhlbHBlci5pc1N0cmluZyhuYW1lKSkge1xuICAgIGlmICh0eXBlb2YgZnVuYyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgIHBhcnNlcnNbbmFtZV0gPSBmdW5jO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAocGFyc2Vycy5oYXNPd25Qcm9wZXJ0eShuYW1lKSkge1xuICAgICAgICByZXR1cm4gcGFyc2Vyc1tuYW1lXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IEVycm9yKCdTdWJQYXJzZXIgbmFtZWQgJyArIG5hbWUgKyAnIG5vdCByZWdpc3RlcmVkIScpO1xuICAgICAgfVxuICAgIH1cbiAgfVxufTtcblxuLyoqXG4gKiBHZXRzIG9yIHJlZ2lzdGVycyBhbiBleHRlbnNpb25cbiAqIEBzdGF0aWNcbiAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lXG4gKiBAcGFyYW0ge29iamVjdHxmdW5jdGlvbj19IGV4dFxuICogQHJldHVybnMgeyp9XG4gKi9cbnNob3dkb3duLmV4dGVuc2lvbiA9IGZ1bmN0aW9uIChuYW1lLCBleHQpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIGlmICghc2hvd2Rvd24uaGVscGVyLmlzU3RyaW5nKG5hbWUpKSB7XG4gICAgdGhyb3cgRXJyb3IoJ0V4dGVuc2lvbiBcXCduYW1lXFwnIG11c3QgYmUgYSBzdHJpbmcnKTtcbiAgfVxuXG4gIG5hbWUgPSBzaG93ZG93bi5oZWxwZXIuc3RkRXh0TmFtZShuYW1lKTtcblxuICAvLyBHZXR0ZXJcbiAgaWYgKHNob3dkb3duLmhlbHBlci5pc1VuZGVmaW5lZChleHQpKSB7XG4gICAgaWYgKCFleHRlbnNpb25zLmhhc093blByb3BlcnR5KG5hbWUpKSB7XG4gICAgICB0aHJvdyBFcnJvcignRXh0ZW5zaW9uIG5hbWVkICcgKyBuYW1lICsgJyBpcyBub3QgcmVnaXN0ZXJlZCEnKTtcbiAgICB9XG4gICAgcmV0dXJuIGV4dGVuc2lvbnNbbmFtZV07XG5cbiAgICAvLyBTZXR0ZXJcbiAgfSBlbHNlIHtcbiAgICAvLyBFeHBhbmQgZXh0ZW5zaW9uIGlmIGl0J3Mgd3JhcHBlZCBpbiBhIGZ1bmN0aW9uXG4gICAgaWYgKHR5cGVvZiBleHQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGV4dCA9IGV4dCgpO1xuICAgIH1cblxuICAgIC8vIEVuc3VyZSBleHRlbnNpb24gaXMgYW4gYXJyYXlcbiAgICBpZiAoIXNob3dkb3duLmhlbHBlci5pc0FycmF5KGV4dCkpIHtcbiAgICAgIGV4dCA9IFtleHRdO1xuICAgIH1cblxuICAgIHZhciB2YWxpZEV4dGVuc2lvbiA9IHZhbGlkYXRlKGV4dCwgbmFtZSk7XG5cbiAgICBpZiAodmFsaWRFeHRlbnNpb24udmFsaWQpIHtcbiAgICAgIGV4dGVuc2lvbnNbbmFtZV0gPSBleHQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IEVycm9yKHZhbGlkRXh0ZW5zaW9uLmVycm9yKTtcbiAgICB9XG4gIH1cbn07XG5cbi8qKlxuICogR2V0cyBhbGwgZXh0ZW5zaW9ucyByZWdpc3RlcmVkXG4gKiBAcmV0dXJucyB7e319XG4gKi9cbnNob3dkb3duLmdldEFsbEV4dGVuc2lvbnMgPSBmdW5jdGlvbiAoKSB7XG4gICd1c2Ugc3RyaWN0JztcbiAgcmV0dXJuIGV4dGVuc2lvbnM7XG59O1xuXG4vKipcbiAqIFJlbW92ZSBhbiBleHRlbnNpb25cbiAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lXG4gKi9cbnNob3dkb3duLnJlbW92ZUV4dGVuc2lvbiA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICd1c2Ugc3RyaWN0JztcbiAgZGVsZXRlIGV4dGVuc2lvbnNbbmFtZV07XG59O1xuXG4vKipcbiAqIFJlbW92ZXMgYWxsIGV4dGVuc2lvbnNcbiAqL1xuc2hvd2Rvd24ucmVzZXRFeHRlbnNpb25zID0gZnVuY3Rpb24gKCkge1xuICAndXNlIHN0cmljdCc7XG4gIGV4dGVuc2lvbnMgPSB7fTtcbn07XG5cbi8qKlxuICogVmFsaWRhdGUgZXh0ZW5zaW9uXG4gKiBAcGFyYW0ge2FycmF5fSBleHRlbnNpb25cbiAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lXG4gKiBAcmV0dXJucyB7e3ZhbGlkOiBib29sZWFuLCBlcnJvcjogc3RyaW5nfX1cbiAqL1xuZnVuY3Rpb24gdmFsaWRhdGUgKGV4dGVuc2lvbiwgbmFtZSkge1xuICAndXNlIHN0cmljdCc7XG5cbiAgdmFyIGVyck1zZyA9IChuYW1lKSA/ICdFcnJvciBpbiAnICsgbmFtZSArICcgZXh0ZW5zaW9uLT4nIDogJ0Vycm9yIGluIHVubmFtZWQgZXh0ZW5zaW9uJyxcbiAgICAgIHJldCA9IHtcbiAgICAgICAgdmFsaWQ6IHRydWUsXG4gICAgICAgIGVycm9yOiAnJ1xuICAgICAgfTtcblxuICBpZiAoIXNob3dkb3duLmhlbHBlci5pc0FycmF5KGV4dGVuc2lvbikpIHtcbiAgICBleHRlbnNpb24gPSBbZXh0ZW5zaW9uXTtcbiAgfVxuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgZXh0ZW5zaW9uLmxlbmd0aDsgKytpKSB7XG4gICAgdmFyIGJhc2VNc2cgPSBlcnJNc2cgKyAnIHN1Yi1leHRlbnNpb24gJyArIGkgKyAnOiAnLFxuICAgICAgICBleHQgPSBleHRlbnNpb25baV07XG4gICAgaWYgKHR5cGVvZiBleHQgIT09ICdvYmplY3QnKSB7XG4gICAgICByZXQudmFsaWQgPSBmYWxzZTtcbiAgICAgIHJldC5lcnJvciA9IGJhc2VNc2cgKyAnbXVzdCBiZSBhbiBvYmplY3QsIGJ1dCAnICsgdHlwZW9mIGV4dCArICcgZ2l2ZW4nO1xuICAgICAgcmV0dXJuIHJldDtcbiAgICB9XG5cbiAgICBpZiAoIXNob3dkb3duLmhlbHBlci5pc1N0cmluZyhleHQudHlwZSkpIHtcbiAgICAgIHJldC52YWxpZCA9IGZhbHNlO1xuICAgICAgcmV0LmVycm9yID0gYmFzZU1zZyArICdwcm9wZXJ0eSBcInR5cGVcIiBtdXN0IGJlIGEgc3RyaW5nLCBidXQgJyArIHR5cGVvZiBleHQudHlwZSArICcgZ2l2ZW4nO1xuICAgICAgcmV0dXJuIHJldDtcbiAgICB9XG5cbiAgICB2YXIgdHlwZSA9IGV4dC50eXBlID0gZXh0LnR5cGUudG9Mb3dlckNhc2UoKTtcblxuICAgIC8vIG5vcm1hbGl6ZSBleHRlbnNpb24gdHlwZVxuICAgIGlmICh0eXBlID09PSAnbGFuZ3VhZ2UnKSB7XG4gICAgICB0eXBlID0gZXh0LnR5cGUgPSAnbGFuZyc7XG4gICAgfVxuXG4gICAgaWYgKHR5cGUgPT09ICdodG1sJykge1xuICAgICAgdHlwZSA9IGV4dC50eXBlID0gJ291dHB1dCc7XG4gICAgfVxuXG4gICAgaWYgKHR5cGUgIT09ICdsYW5nJyAmJiB0eXBlICE9PSAnb3V0cHV0JyAmJiB0eXBlICE9PSAnbGlzdGVuZXInKSB7XG4gICAgICByZXQudmFsaWQgPSBmYWxzZTtcbiAgICAgIHJldC5lcnJvciA9IGJhc2VNc2cgKyAndHlwZSAnICsgdHlwZSArICcgaXMgbm90IHJlY29nbml6ZWQuIFZhbGlkIHZhbHVlczogXCJsYW5nL2xhbmd1YWdlXCIsIFwib3V0cHV0L2h0bWxcIiBvciBcImxpc3RlbmVyXCInO1xuICAgICAgcmV0dXJuIHJldDtcbiAgICB9XG5cbiAgICBpZiAodHlwZSA9PT0gJ2xpc3RlbmVyJykge1xuICAgICAgaWYgKHNob3dkb3duLmhlbHBlci5pc1VuZGVmaW5lZChleHQubGlzdGVuZXJzKSkge1xuICAgICAgICByZXQudmFsaWQgPSBmYWxzZTtcbiAgICAgICAgcmV0LmVycm9yID0gYmFzZU1zZyArICcuIEV4dGVuc2lvbnMgb2YgdHlwZSBcImxpc3RlbmVyXCIgbXVzdCBoYXZlIGEgcHJvcGVydHkgY2FsbGVkIFwibGlzdGVuZXJzXCInO1xuICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoc2hvd2Rvd24uaGVscGVyLmlzVW5kZWZpbmVkKGV4dC5maWx0ZXIpICYmIHNob3dkb3duLmhlbHBlci5pc1VuZGVmaW5lZChleHQucmVnZXgpKSB7XG4gICAgICAgIHJldC52YWxpZCA9IGZhbHNlO1xuICAgICAgICByZXQuZXJyb3IgPSBiYXNlTXNnICsgdHlwZSArICcgZXh0ZW5zaW9ucyBtdXN0IGRlZmluZSBlaXRoZXIgYSBcInJlZ2V4XCIgcHJvcGVydHkgb3IgYSBcImZpbHRlclwiIG1ldGhvZCc7XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGV4dC5saXN0ZW5lcnMpIHtcbiAgICAgIGlmICh0eXBlb2YgZXh0Lmxpc3RlbmVycyAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgcmV0LnZhbGlkID0gZmFsc2U7XG4gICAgICAgIHJldC5lcnJvciA9IGJhc2VNc2cgKyAnXCJsaXN0ZW5lcnNcIiBwcm9wZXJ0eSBtdXN0IGJlIGFuIG9iamVjdCBidXQgJyArIHR5cGVvZiBleHQubGlzdGVuZXJzICsgJyBnaXZlbic7XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgICB9XG4gICAgICBmb3IgKHZhciBsbiBpbiBleHQubGlzdGVuZXJzKSB7XG4gICAgICAgIGlmIChleHQubGlzdGVuZXJzLmhhc093blByb3BlcnR5KGxuKSkge1xuICAgICAgICAgIGlmICh0eXBlb2YgZXh0Lmxpc3RlbmVyc1tsbl0gIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgIHJldC52YWxpZCA9IGZhbHNlO1xuICAgICAgICAgICAgcmV0LmVycm9yID0gYmFzZU1zZyArICdcImxpc3RlbmVyc1wiIHByb3BlcnR5IG11c3QgYmUgYW4gaGFzaCBvZiBbZXZlbnQgbmFtZV06IFtjYWxsYmFja10uIGxpc3RlbmVycy4nICsgbG4gK1xuICAgICAgICAgICAgICAnIG11c3QgYmUgYSBmdW5jdGlvbiBidXQgJyArIHR5cGVvZiBleHQubGlzdGVuZXJzW2xuXSArICcgZ2l2ZW4nO1xuICAgICAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoZXh0LmZpbHRlcikge1xuICAgICAgaWYgKHR5cGVvZiBleHQuZmlsdGVyICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIHJldC52YWxpZCA9IGZhbHNlO1xuICAgICAgICByZXQuZXJyb3IgPSBiYXNlTXNnICsgJ1wiZmlsdGVyXCIgbXVzdCBiZSBhIGZ1bmN0aW9uLCBidXQgJyArIHR5cGVvZiBleHQuZmlsdGVyICsgJyBnaXZlbic7XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChleHQucmVnZXgpIHtcbiAgICAgIGlmIChzaG93ZG93bi5oZWxwZXIuaXNTdHJpbmcoZXh0LnJlZ2V4KSkge1xuICAgICAgICBleHQucmVnZXggPSBuZXcgUmVnRXhwKGV4dC5yZWdleCwgJ2cnKTtcbiAgICAgIH1cbiAgICAgIGlmICghKGV4dC5yZWdleCBpbnN0YW5jZW9mIFJlZ0V4cCkpIHtcbiAgICAgICAgcmV0LnZhbGlkID0gZmFsc2U7XG4gICAgICAgIHJldC5lcnJvciA9IGJhc2VNc2cgKyAnXCJyZWdleFwiIHByb3BlcnR5IG11c3QgZWl0aGVyIGJlIGEgc3RyaW5nIG9yIGEgUmVnRXhwIG9iamVjdCwgYnV0ICcgKyB0eXBlb2YgZXh0LnJlZ2V4ICsgJyBnaXZlbic7XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgICB9XG4gICAgICBpZiAoc2hvd2Rvd24uaGVscGVyLmlzVW5kZWZpbmVkKGV4dC5yZXBsYWNlKSkge1xuICAgICAgICByZXQudmFsaWQgPSBmYWxzZTtcbiAgICAgICAgcmV0LmVycm9yID0gYmFzZU1zZyArICdcInJlZ2V4XCIgZXh0ZW5zaW9ucyBtdXN0IGltcGxlbWVudCBhIHJlcGxhY2Ugc3RyaW5nIG9yIGZ1bmN0aW9uJztcbiAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJldDtcbn1cblxuLyoqXG4gKiBWYWxpZGF0ZSBleHRlbnNpb25cbiAqIEBwYXJhbSB7b2JqZWN0fSBleHRcbiAqIEByZXR1cm5zIHtib29sZWFufVxuICovXG5zaG93ZG93bi52YWxpZGF0ZUV4dGVuc2lvbiA9IGZ1bmN0aW9uIChleHQpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIHZhciB2YWxpZGF0ZUV4dGVuc2lvbiA9IHZhbGlkYXRlKGV4dCwgbnVsbCk7XG4gIGlmICghdmFsaWRhdGVFeHRlbnNpb24udmFsaWQpIHtcbiAgICBjb25zb2xlLndhcm4odmFsaWRhdGVFeHRlbnNpb24uZXJyb3IpO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn07XG5cclxuLyoqXG4gKiBzaG93ZG93bmpzIGhlbHBlciBmdW5jdGlvbnNcbiAqL1xuXG5pZiAoIXNob3dkb3duLmhhc093blByb3BlcnR5KCdoZWxwZXInKSkge1xuICBzaG93ZG93bi5oZWxwZXIgPSB7fTtcbn1cblxuLyoqXG4gKiBDaGVjayBpZiB2YXIgaXMgc3RyaW5nXG4gKiBAc3RhdGljXG4gKiBAcGFyYW0ge3N0cmluZ30gYVxuICogQHJldHVybnMge2Jvb2xlYW59XG4gKi9cbnNob3dkb3duLmhlbHBlci5pc1N0cmluZyA9IGZ1bmN0aW9uIChhKSB7XG4gICd1c2Ugc3RyaWN0JztcbiAgcmV0dXJuICh0eXBlb2YgYSA9PT0gJ3N0cmluZycgfHwgYSBpbnN0YW5jZW9mIFN0cmluZyk7XG59O1xuXG4vKipcbiAqIENoZWNrIGlmIHZhciBpcyBhIGZ1bmN0aW9uXG4gKiBAc3RhdGljXG4gKiBAcGFyYW0geyp9IGFcbiAqIEByZXR1cm5zIHtib29sZWFufVxuICovXG5zaG93ZG93bi5oZWxwZXIuaXNGdW5jdGlvbiA9IGZ1bmN0aW9uIChhKSB7XG4gICd1c2Ugc3RyaWN0JztcbiAgdmFyIGdldFR5cGUgPSB7fTtcbiAgcmV0dXJuIGEgJiYgZ2V0VHlwZS50b1N0cmluZy5jYWxsKGEpID09PSAnW29iamVjdCBGdW5jdGlvbl0nO1xufTtcblxuLyoqXG4gKiBpc0FycmF5IGhlbHBlciBmdW5jdGlvblxuICogQHN0YXRpY1xuICogQHBhcmFtIHsqfSBhXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqL1xuc2hvd2Rvd24uaGVscGVyLmlzQXJyYXkgPSBmdW5jdGlvbiAoYSkge1xuICAndXNlIHN0cmljdCc7XG4gIHJldHVybiBhLmNvbnN0cnVjdG9yID09PSBBcnJheTtcbn07XG5cbi8qKlxuICogQ2hlY2sgaWYgdmFsdWUgaXMgdW5kZWZpbmVkXG4gKiBAc3RhdGljXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBgdmFsdWVgIGlzIGB1bmRlZmluZWRgLCBlbHNlIGBmYWxzZWAuXG4gKi9cbnNob3dkb3duLmhlbHBlci5pc1VuZGVmaW5lZCA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAndXNlIHN0cmljdCc7XG4gIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICd1bmRlZmluZWQnO1xufTtcblxuLyoqXG4gKiBGb3JFYWNoIGhlbHBlciBmdW5jdGlvblxuICogSXRlcmF0ZXMgb3ZlciBBcnJheXMgYW5kIE9iamVjdHMgKG93biBwcm9wZXJ0aWVzIG9ubHkpXG4gKiBAc3RhdGljXG4gKiBAcGFyYW0geyp9IG9ialxuICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgQWNjZXB0cyAzIHBhcmFtczogMS4gdmFsdWUsIDIuIGtleSwgMy4gdGhlIG9yaWdpbmFsIGFycmF5L29iamVjdFxuICovXG5zaG93ZG93bi5oZWxwZXIuZm9yRWFjaCA9IGZ1bmN0aW9uIChvYmosIGNhbGxiYWNrKSB7XG4gICd1c2Ugc3RyaWN0JztcbiAgLy8gY2hlY2sgaWYgb2JqIGlzIGRlZmluZWRcbiAgaWYgKHNob3dkb3duLmhlbHBlci5pc1VuZGVmaW5lZChvYmopKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdvYmogcGFyYW0gaXMgcmVxdWlyZWQnKTtcbiAgfVxuXG4gIGlmIChzaG93ZG93bi5oZWxwZXIuaXNVbmRlZmluZWQoY2FsbGJhY2spKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdjYWxsYmFjayBwYXJhbSBpcyByZXF1aXJlZCcpO1xuICB9XG5cbiAgaWYgKCFzaG93ZG93bi5oZWxwZXIuaXNGdW5jdGlvbihjYWxsYmFjaykpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2NhbGxiYWNrIHBhcmFtIG11c3QgYmUgYSBmdW5jdGlvbi9jbG9zdXJlJyk7XG4gIH1cblxuICBpZiAodHlwZW9mIG9iai5mb3JFYWNoID09PSAnZnVuY3Rpb24nKSB7XG4gICAgb2JqLmZvckVhY2goY2FsbGJhY2spO1xuICB9IGVsc2UgaWYgKHNob3dkb3duLmhlbHBlci5pc0FycmF5KG9iaikpIHtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG9iai5sZW5ndGg7IGkrKykge1xuICAgICAgY2FsbGJhY2sob2JqW2ldLCBpLCBvYmopO1xuICAgIH1cbiAgfSBlbHNlIGlmICh0eXBlb2YgKG9iaikgPT09ICdvYmplY3QnKSB7XG4gICAgZm9yICh2YXIgcHJvcCBpbiBvYmopIHtcbiAgICAgIGlmIChvYmouaGFzT3duUHJvcGVydHkocHJvcCkpIHtcbiAgICAgICAgY2FsbGJhY2sob2JqW3Byb3BdLCBwcm9wLCBvYmopO1xuICAgICAgfVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ29iaiBkb2VzIG5vdCBzZWVtIHRvIGJlIGFuIGFycmF5IG9yIGFuIGl0ZXJhYmxlIG9iamVjdCcpO1xuICB9XG59O1xuXG4vKipcbiAqIFN0YW5kYXJkaWRpemUgZXh0ZW5zaW9uIG5hbWVcbiAqIEBzdGF0aWNcbiAqIEBwYXJhbSB7c3RyaW5nfSBzIGV4dGVuc2lvbiBuYW1lXG4gKiBAcmV0dXJucyB7c3RyaW5nfVxuICovXG5zaG93ZG93bi5oZWxwZXIuc3RkRXh0TmFtZSA9IGZ1bmN0aW9uIChzKSB7XG4gICd1c2Ugc3RyaWN0JztcbiAgcmV0dXJuIHMucmVwbGFjZSgvW18/KitcXC9cXFxcLl4tXS9nLCAnJykucmVwbGFjZSgvXFxzL2csICcnKS50b0xvd2VyQ2FzZSgpO1xufTtcblxuZnVuY3Rpb24gZXNjYXBlQ2hhcmFjdGVyc0NhbGxiYWNrICh3aG9sZU1hdGNoLCBtMSkge1xuICAndXNlIHN0cmljdCc7XG4gIHZhciBjaGFyQ29kZVRvRXNjYXBlID0gbTEuY2hhckNvZGVBdCgwKTtcbiAgcmV0dXJuICfCqEUnICsgY2hhckNvZGVUb0VzY2FwZSArICdFJztcbn1cblxuLyoqXG4gKiBDYWxsYmFjayB1c2VkIHRvIGVzY2FwZSBjaGFyYWN0ZXJzIHdoZW4gcGFzc2luZyB0aHJvdWdoIFN0cmluZy5yZXBsYWNlXG4gKiBAc3RhdGljXG4gKiBAcGFyYW0ge3N0cmluZ30gd2hvbGVNYXRjaFxuICogQHBhcmFtIHtzdHJpbmd9IG0xXG4gKiBAcmV0dXJucyB7c3RyaW5nfVxuICovXG5zaG93ZG93bi5oZWxwZXIuZXNjYXBlQ2hhcmFjdGVyc0NhbGxiYWNrID0gZXNjYXBlQ2hhcmFjdGVyc0NhbGxiYWNrO1xuXG4vKipcbiAqIEVzY2FwZSBjaGFyYWN0ZXJzIGluIGEgc3RyaW5nXG4gKiBAc3RhdGljXG4gKiBAcGFyYW0ge3N0cmluZ30gdGV4dFxuICogQHBhcmFtIHtzdHJpbmd9IGNoYXJzVG9Fc2NhcGVcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gYWZ0ZXJCYWNrc2xhc2hcbiAqIEByZXR1cm5zIHtYTUx8c3RyaW5nfHZvaWR8Kn1cbiAqL1xuc2hvd2Rvd24uaGVscGVyLmVzY2FwZUNoYXJhY3RlcnMgPSBmdW5jdGlvbiAodGV4dCwgY2hhcnNUb0VzY2FwZSwgYWZ0ZXJCYWNrc2xhc2gpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuICAvLyBGaXJzdCB3ZSBoYXZlIHRvIGVzY2FwZSB0aGUgZXNjYXBlIGNoYXJhY3RlcnMgc28gdGhhdFxuICAvLyB3ZSBjYW4gYnVpbGQgYSBjaGFyYWN0ZXIgY2xhc3Mgb3V0IG9mIHRoZW1cbiAgdmFyIHJlZ2V4U3RyaW5nID0gJyhbJyArIGNoYXJzVG9Fc2NhcGUucmVwbGFjZSgvKFtcXFtcXF1cXFxcXSkvZywgJ1xcXFwkMScpICsgJ10pJztcblxuICBpZiAoYWZ0ZXJCYWNrc2xhc2gpIHtcbiAgICByZWdleFN0cmluZyA9ICdcXFxcXFxcXCcgKyByZWdleFN0cmluZztcbiAgfVxuXG4gIHZhciByZWdleCA9IG5ldyBSZWdFeHAocmVnZXhTdHJpbmcsICdnJyk7XG4gIHRleHQgPSB0ZXh0LnJlcGxhY2UocmVnZXgsIGVzY2FwZUNoYXJhY3RlcnNDYWxsYmFjayk7XG5cbiAgcmV0dXJuIHRleHQ7XG59O1xuXG52YXIgcmd4RmluZE1hdGNoUG9zID0gZnVuY3Rpb24gKHN0ciwgbGVmdCwgcmlnaHQsIGZsYWdzKSB7XG4gICd1c2Ugc3RyaWN0JztcbiAgdmFyIGYgPSBmbGFncyB8fCAnJyxcbiAgICAgIGcgPSBmLmluZGV4T2YoJ2cnKSA+IC0xLFxuICAgICAgeCA9IG5ldyBSZWdFeHAobGVmdCArICd8JyArIHJpZ2h0LCAnZycgKyBmLnJlcGxhY2UoL2cvZywgJycpKSxcbiAgICAgIGwgPSBuZXcgUmVnRXhwKGxlZnQsIGYucmVwbGFjZSgvZy9nLCAnJykpLFxuICAgICAgcG9zID0gW10sXG4gICAgICB0LCBzLCBtLCBzdGFydCwgZW5kO1xuXG4gIGRvIHtcbiAgICB0ID0gMDtcbiAgICB3aGlsZSAoKG0gPSB4LmV4ZWMoc3RyKSkpIHtcbiAgICAgIGlmIChsLnRlc3QobVswXSkpIHtcbiAgICAgICAgaWYgKCEodCsrKSkge1xuICAgICAgICAgIHMgPSB4Lmxhc3RJbmRleDtcbiAgICAgICAgICBzdGFydCA9IHMgLSBtWzBdLmxlbmd0aDtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIGlmICh0KSB7XG4gICAgICAgIGlmICghLS10KSB7XG4gICAgICAgICAgZW5kID0gbS5pbmRleCArIG1bMF0ubGVuZ3RoO1xuICAgICAgICAgIHZhciBvYmogPSB7XG4gICAgICAgICAgICBsZWZ0OiB7c3RhcnQ6IHN0YXJ0LCBlbmQ6IHN9LFxuICAgICAgICAgICAgbWF0Y2g6IHtzdGFydDogcywgZW5kOiBtLmluZGV4fSxcbiAgICAgICAgICAgIHJpZ2h0OiB7c3RhcnQ6IG0uaW5kZXgsIGVuZDogZW5kfSxcbiAgICAgICAgICAgIHdob2xlTWF0Y2g6IHtzdGFydDogc3RhcnQsIGVuZDogZW5kfVxuICAgICAgICAgIH07XG4gICAgICAgICAgcG9zLnB1c2gob2JqKTtcbiAgICAgICAgICBpZiAoIWcpIHtcbiAgICAgICAgICAgIHJldHVybiBwb3M7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9IHdoaWxlICh0ICYmICh4Lmxhc3RJbmRleCA9IHMpKTtcblxuICByZXR1cm4gcG9zO1xufTtcblxuLyoqXG4gKiBtYXRjaFJlY3Vyc2l2ZVJlZ0V4cFxuICpcbiAqIChjKSAyMDA3IFN0ZXZlbiBMZXZpdGhhbiA8c3RldmVubGV2aXRoYW4uY29tPlxuICogTUlUIExpY2Vuc2VcbiAqXG4gKiBBY2NlcHRzIGEgc3RyaW5nIHRvIHNlYXJjaCwgYSBsZWZ0IGFuZCByaWdodCBmb3JtYXQgZGVsaW1pdGVyXG4gKiBhcyByZWdleCBwYXR0ZXJucywgYW5kIG9wdGlvbmFsIHJlZ2V4IGZsYWdzLiBSZXR1cm5zIGFuIGFycmF5XG4gKiBvZiBtYXRjaGVzLCBhbGxvd2luZyBuZXN0ZWQgaW5zdGFuY2VzIG9mIGxlZnQvcmlnaHQgZGVsaW1pdGVycy5cbiAqIFVzZSB0aGUgXCJnXCIgZmxhZyB0byByZXR1cm4gYWxsIG1hdGNoZXMsIG90aGVyd2lzZSBvbmx5IHRoZVxuICogZmlyc3QgaXMgcmV0dXJuZWQuIEJlIGNhcmVmdWwgdG8gZW5zdXJlIHRoYXQgdGhlIGxlZnQgYW5kXG4gKiByaWdodCBmb3JtYXQgZGVsaW1pdGVycyBwcm9kdWNlIG11dHVhbGx5IGV4Y2x1c2l2ZSBtYXRjaGVzLlxuICogQmFja3JlZmVyZW5jZXMgYXJlIG5vdCBzdXBwb3J0ZWQgd2l0aGluIHRoZSByaWdodCBkZWxpbWl0ZXJcbiAqIGR1ZSB0byBob3cgaXQgaXMgaW50ZXJuYWxseSBjb21iaW5lZCB3aXRoIHRoZSBsZWZ0IGRlbGltaXRlci5cbiAqIFdoZW4gbWF0Y2hpbmcgc3RyaW5ncyB3aG9zZSBmb3JtYXQgZGVsaW1pdGVycyBhcmUgdW5iYWxhbmNlZFxuICogdG8gdGhlIGxlZnQgb3IgcmlnaHQsIHRoZSBvdXRwdXQgaXMgaW50ZW50aW9uYWxseSBhcyBhXG4gKiBjb252ZW50aW9uYWwgcmVnZXggbGlicmFyeSB3aXRoIHJlY3Vyc2lvbiBzdXBwb3J0IHdvdWxkXG4gKiBwcm9kdWNlLCBlLmcuIFwiPDx4PlwiIGFuZCBcIjx4Pj5cIiBib3RoIHByb2R1Y2UgW1wieFwiXSB3aGVuIHVzaW5nXG4gKiBcIjxcIiBhbmQgXCI+XCIgYXMgdGhlIGRlbGltaXRlcnMgKGJvdGggc3RyaW5ncyBjb250YWluIGEgc2luZ2xlLFxuICogYmFsYW5jZWQgaW5zdGFuY2Ugb2YgXCI8eD5cIikuXG4gKlxuICogZXhhbXBsZXM6XG4gKiBtYXRjaFJlY3Vyc2l2ZVJlZ0V4cChcInRlc3RcIiwgXCJcXFxcKFwiLCBcIlxcXFwpXCIpXG4gKiByZXR1cm5zOiBbXVxuICogbWF0Y2hSZWN1cnNpdmVSZWdFeHAoXCI8dDw8ZT4+PHM+PnQ8PlwiLCBcIjxcIiwgXCI+XCIsIFwiZ1wiKVxuICogcmV0dXJuczogW1widDw8ZT4+PHM+XCIsIFwiXCJdXG4gKiBtYXRjaFJlY3Vyc2l2ZVJlZ0V4cChcIjxkaXYgaWQ9XFxcInhcXFwiPnRlc3Q8L2Rpdj5cIiwgXCI8ZGl2XFxcXGJbXj5dKj5cIiwgXCI8L2Rpdj5cIiwgXCJnaVwiKVxuICogcmV0dXJuczogW1widGVzdFwiXVxuICovXG5zaG93ZG93bi5oZWxwZXIubWF0Y2hSZWN1cnNpdmVSZWdFeHAgPSBmdW5jdGlvbiAoc3RyLCBsZWZ0LCByaWdodCwgZmxhZ3MpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIHZhciBtYXRjaFBvcyA9IHJneEZpbmRNYXRjaFBvcyAoc3RyLCBsZWZ0LCByaWdodCwgZmxhZ3MpLFxuICAgICAgcmVzdWx0cyA9IFtdO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbWF0Y2hQb3MubGVuZ3RoOyArK2kpIHtcbiAgICByZXN1bHRzLnB1c2goW1xuICAgICAgc3RyLnNsaWNlKG1hdGNoUG9zW2ldLndob2xlTWF0Y2guc3RhcnQsIG1hdGNoUG9zW2ldLndob2xlTWF0Y2guZW5kKSxcbiAgICAgIHN0ci5zbGljZShtYXRjaFBvc1tpXS5tYXRjaC5zdGFydCwgbWF0Y2hQb3NbaV0ubWF0Y2guZW5kKSxcbiAgICAgIHN0ci5zbGljZShtYXRjaFBvc1tpXS5sZWZ0LnN0YXJ0LCBtYXRjaFBvc1tpXS5sZWZ0LmVuZCksXG4gICAgICBzdHIuc2xpY2UobWF0Y2hQb3NbaV0ucmlnaHQuc3RhcnQsIG1hdGNoUG9zW2ldLnJpZ2h0LmVuZClcbiAgICBdKTtcbiAgfVxuICByZXR1cm4gcmVzdWx0cztcbn07XG5cbi8qKlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBzdHJcbiAqIEBwYXJhbSB7c3RyaW5nfGZ1bmN0aW9ufSByZXBsYWNlbWVudFxuICogQHBhcmFtIHtzdHJpbmd9IGxlZnRcbiAqIEBwYXJhbSB7c3RyaW5nfSByaWdodFxuICogQHBhcmFtIHtzdHJpbmd9IGZsYWdzXG4gKiBAcmV0dXJucyB7c3RyaW5nfVxuICovXG5zaG93ZG93bi5oZWxwZXIucmVwbGFjZVJlY3Vyc2l2ZVJlZ0V4cCA9IGZ1bmN0aW9uIChzdHIsIHJlcGxhY2VtZW50LCBsZWZ0LCByaWdodCwgZmxhZ3MpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIGlmICghc2hvd2Rvd24uaGVscGVyLmlzRnVuY3Rpb24ocmVwbGFjZW1lbnQpKSB7XG4gICAgdmFyIHJlcFN0ciA9IHJlcGxhY2VtZW50O1xuICAgIHJlcGxhY2VtZW50ID0gZnVuY3Rpb24gKCkge1xuICAgICAgcmV0dXJuIHJlcFN0cjtcbiAgICB9O1xuICB9XG5cbiAgdmFyIG1hdGNoUG9zID0gcmd4RmluZE1hdGNoUG9zKHN0ciwgbGVmdCwgcmlnaHQsIGZsYWdzKSxcbiAgICAgIGZpbmFsU3RyID0gc3RyLFxuICAgICAgbG5nID0gbWF0Y2hQb3MubGVuZ3RoO1xuXG4gIGlmIChsbmcgPiAwKSB7XG4gICAgdmFyIGJpdHMgPSBbXTtcbiAgICBpZiAobWF0Y2hQb3NbMF0ud2hvbGVNYXRjaC5zdGFydCAhPT0gMCkge1xuICAgICAgYml0cy5wdXNoKHN0ci5zbGljZSgwLCBtYXRjaFBvc1swXS53aG9sZU1hdGNoLnN0YXJ0KSk7XG4gICAgfVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbG5nOyArK2kpIHtcbiAgICAgIGJpdHMucHVzaChcbiAgICAgICAgcmVwbGFjZW1lbnQoXG4gICAgICAgICAgc3RyLnNsaWNlKG1hdGNoUG9zW2ldLndob2xlTWF0Y2guc3RhcnQsIG1hdGNoUG9zW2ldLndob2xlTWF0Y2guZW5kKSxcbiAgICAgICAgICBzdHIuc2xpY2UobWF0Y2hQb3NbaV0ubWF0Y2guc3RhcnQsIG1hdGNoUG9zW2ldLm1hdGNoLmVuZCksXG4gICAgICAgICAgc3RyLnNsaWNlKG1hdGNoUG9zW2ldLmxlZnQuc3RhcnQsIG1hdGNoUG9zW2ldLmxlZnQuZW5kKSxcbiAgICAgICAgICBzdHIuc2xpY2UobWF0Y2hQb3NbaV0ucmlnaHQuc3RhcnQsIG1hdGNoUG9zW2ldLnJpZ2h0LmVuZClcbiAgICAgICAgKVxuICAgICAgKTtcbiAgICAgIGlmIChpIDwgbG5nIC0gMSkge1xuICAgICAgICBiaXRzLnB1c2goc3RyLnNsaWNlKG1hdGNoUG9zW2ldLndob2xlTWF0Y2guZW5kLCBtYXRjaFBvc1tpICsgMV0ud2hvbGVNYXRjaC5zdGFydCkpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAobWF0Y2hQb3NbbG5nIC0gMV0ud2hvbGVNYXRjaC5lbmQgPCBzdHIubGVuZ3RoKSB7XG4gICAgICBiaXRzLnB1c2goc3RyLnNsaWNlKG1hdGNoUG9zW2xuZyAtIDFdLndob2xlTWF0Y2guZW5kKSk7XG4gICAgfVxuICAgIGZpbmFsU3RyID0gYml0cy5qb2luKCcnKTtcbiAgfVxuICByZXR1cm4gZmluYWxTdHI7XG59O1xuXG4vKipcbiAqIE9iZnVzY2F0ZSBhbiBlLW1haWwgYWRkcmVzcyB0aHJvdWdoIHRoZSB1c2Ugb2YgQ2hhcmFjdGVyIEVudGl0aWVzLFxuICogdHJhbnNmb3JtaW5nIEFTQ0lJIGNoYXJhY3RlcnMgaW50byB0aGVpciBlcXVpdmFsZW50IGRlY2ltYWwgb3IgaGV4IGVudGl0aWVzLlxuICpcbiAqIFNpbmNlIGl0IGhhcyBhIHJhbmRvbSBjb21wb25lbnQsIHN1YnNlcXVlbnQgY2FsbHMgdG8gdGhpcyBmdW5jdGlvbiBwcm9kdWNlIGRpZmZlcmVudCByZXN1bHRzXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IG1haWxcbiAqIEByZXR1cm5zIHtzdHJpbmd9XG4gKi9cbnNob3dkb3duLmhlbHBlci5lbmNvZGVFbWFpbEFkZHJlc3MgPSBmdW5jdGlvbiAobWFpbCkge1xuICAndXNlIHN0cmljdCc7XG4gIHZhciBlbmNvZGUgPSBbXG4gICAgZnVuY3Rpb24gKGNoKSB7XG4gICAgICByZXR1cm4gJyYjJyArIGNoLmNoYXJDb2RlQXQoMCkgKyAnOyc7XG4gICAgfSxcbiAgICBmdW5jdGlvbiAoY2gpIHtcbiAgICAgIHJldHVybiAnJiN4JyArIGNoLmNoYXJDb2RlQXQoMCkudG9TdHJpbmcoMTYpICsgJzsnO1xuICAgIH0sXG4gICAgZnVuY3Rpb24gKGNoKSB7XG4gICAgICByZXR1cm4gY2g7XG4gICAgfVxuICBdO1xuXG4gIG1haWwgPSBtYWlsLnJlcGxhY2UoLy4vZywgZnVuY3Rpb24gKGNoKSB7XG4gICAgaWYgKGNoID09PSAnQCcpIHtcbiAgICAgIC8vIHRoaXMgKm11c3QqIGJlIGVuY29kZWQuIEkgaW5zaXN0LlxuICAgICAgY2ggPSBlbmNvZGVbTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMildKGNoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIHIgPSBNYXRoLnJhbmRvbSgpO1xuICAgICAgLy8gcm91Z2hseSAxMCUgcmF3LCA0NSUgaGV4LCA0NSUgZGVjXG4gICAgICBjaCA9IChcbiAgICAgICAgciA+IDAuOSA/IGVuY29kZVsyXShjaCkgOiByID4gMC40NSA/IGVuY29kZVsxXShjaCkgOiBlbmNvZGVbMF0oY2gpXG4gICAgICApO1xuICAgIH1cbiAgICByZXR1cm4gY2g7XG4gIH0pO1xuXG4gIHJldHVybiBtYWlsO1xufTtcblxuLyoqXG4gKiBQT0xZRklMTFNcbiAqL1xuLy8gdXNlIHRoaXMgaW5zdGVhZCBvZiBidWlsdGluIGlzIHVuZGVmaW5lZCBmb3IgSUU4IGNvbXBhdGliaWxpdHlcbmlmICh0eXBlb2YoY29uc29sZSkgPT09ICd1bmRlZmluZWQnKSB7XG4gIGNvbnNvbGUgPSB7XG4gICAgd2FybjogZnVuY3Rpb24gKG1zZykge1xuICAgICAgJ3VzZSBzdHJpY3QnO1xuICAgICAgYWxlcnQobXNnKTtcbiAgICB9LFxuICAgIGxvZzogZnVuY3Rpb24gKG1zZykge1xuICAgICAgJ3VzZSBzdHJpY3QnO1xuICAgICAgYWxlcnQobXNnKTtcbiAgICB9LFxuICAgIGVycm9yOiBmdW5jdGlvbiAobXNnKSB7XG4gICAgICAndXNlIHN0cmljdCc7XG4gICAgICB0aHJvdyBtc2c7XG4gICAgfVxuICB9O1xufVxuXG4vKipcbiAqIENvbW1vbiByZWdleGVzLlxuICogV2UgZGVjbGFyZSBzb21lIGNvbW1vbiByZWdleGVzIHRvIGltcHJvdmUgcGVyZm9ybWFuY2VcbiAqL1xuc2hvd2Rvd24uaGVscGVyLnJlZ2V4ZXMgPSB7XG4gIGFzdGVyaXNrQW5kRGFzaDogLyhbKl9dKS9nXG59O1xuXHJcbi8qKlxuICogQ3JlYXRlZCBieSBFc3RldmFvIG9uIDMxLTA1LTIwMTUuXG4gKi9cblxuLyoqXG4gKiBTaG93ZG93biBDb252ZXJ0ZXIgY2xhc3NcbiAqIEBjbGFzc1xuICogQHBhcmFtIHtvYmplY3R9IFtjb252ZXJ0ZXJPcHRpb25zXVxuICogQHJldHVybnMge0NvbnZlcnRlcn1cbiAqL1xuc2hvd2Rvd24uQ29udmVydGVyID0gZnVuY3Rpb24gKGNvbnZlcnRlck9wdGlvbnMpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIHZhclxuICAgICAgLyoqXG4gICAgICAgKiBPcHRpb25zIHVzZWQgYnkgdGhpcyBjb252ZXJ0ZXJcbiAgICAgICAqIEBwcml2YXRlXG4gICAgICAgKiBAdHlwZSB7e319XG4gICAgICAgKi9cbiAgICAgIG9wdGlvbnMgPSB7fSxcblxuICAgICAgLyoqXG4gICAgICAgKiBMYW5ndWFnZSBleHRlbnNpb25zIHVzZWQgYnkgdGhpcyBjb252ZXJ0ZXJcbiAgICAgICAqIEBwcml2YXRlXG4gICAgICAgKiBAdHlwZSB7QXJyYXl9XG4gICAgICAgKi9cbiAgICAgIGxhbmdFeHRlbnNpb25zID0gW10sXG5cbiAgICAgIC8qKlxuICAgICAgICogT3V0cHV0IG1vZGlmaWVycyBleHRlbnNpb25zIHVzZWQgYnkgdGhpcyBjb252ZXJ0ZXJcbiAgICAgICAqIEBwcml2YXRlXG4gICAgICAgKiBAdHlwZSB7QXJyYXl9XG4gICAgICAgKi9cbiAgICAgIG91dHB1dE1vZGlmaWVycyA9IFtdLFxuXG4gICAgICAvKipcbiAgICAgICAqIEV2ZW50IGxpc3RlbmVyc1xuICAgICAgICogQHByaXZhdGVcbiAgICAgICAqIEB0eXBlIHt7fX1cbiAgICAgICAqL1xuICAgICAgbGlzdGVuZXJzID0ge30sXG5cbiAgICAgIC8qKlxuICAgICAgICogVGhlIGZsYXZvciBzZXQgaW4gdGhpcyBjb252ZXJ0ZXJcbiAgICAgICAqL1xuICAgICAgc2V0Q29udkZsYXZvciA9IHNldEZsYXZvcjtcblxuICBfY29uc3RydWN0b3IoKTtcblxuICAvKipcbiAgICogQ29udmVydGVyIGNvbnN0cnVjdG9yXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBmdW5jdGlvbiBfY29uc3RydWN0b3IgKCkge1xuICAgIGNvbnZlcnRlck9wdGlvbnMgPSBjb252ZXJ0ZXJPcHRpb25zIHx8IHt9O1xuXG4gICAgZm9yICh2YXIgZ09wdCBpbiBnbG9iYWxPcHRpb25zKSB7XG4gICAgICBpZiAoZ2xvYmFsT3B0aW9ucy5oYXNPd25Qcm9wZXJ0eShnT3B0KSkge1xuICAgICAgICBvcHRpb25zW2dPcHRdID0gZ2xvYmFsT3B0aW9uc1tnT3B0XTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBNZXJnZSBvcHRpb25zXG4gICAgaWYgKHR5cGVvZiBjb252ZXJ0ZXJPcHRpb25zID09PSAnb2JqZWN0Jykge1xuICAgICAgZm9yICh2YXIgb3B0IGluIGNvbnZlcnRlck9wdGlvbnMpIHtcbiAgICAgICAgaWYgKGNvbnZlcnRlck9wdGlvbnMuaGFzT3duUHJvcGVydHkob3B0KSkge1xuICAgICAgICAgIG9wdGlvbnNbb3B0XSA9IGNvbnZlcnRlck9wdGlvbnNbb3B0XTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBFcnJvcignQ29udmVydGVyIGV4cGVjdHMgdGhlIHBhc3NlZCBwYXJhbWV0ZXIgdG8gYmUgYW4gb2JqZWN0LCBidXQgJyArIHR5cGVvZiBjb252ZXJ0ZXJPcHRpb25zICtcbiAgICAgICcgd2FzIHBhc3NlZCBpbnN0ZWFkLicpO1xuICAgIH1cblxuICAgIGlmIChvcHRpb25zLmV4dGVuc2lvbnMpIHtcbiAgICAgIHNob3dkb3duLmhlbHBlci5mb3JFYWNoKG9wdGlvbnMuZXh0ZW5zaW9ucywgX3BhcnNlRXh0ZW5zaW9uKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUGFyc2UgZXh0ZW5zaW9uXG4gICAqIEBwYXJhbSB7Kn0gZXh0XG4gICAqIEBwYXJhbSB7c3RyaW5nfSBbbmFtZT0nJ11cbiAgICogQHByaXZhdGVcbiAgICovXG4gIGZ1bmN0aW9uIF9wYXJzZUV4dGVuc2lvbiAoZXh0LCBuYW1lKSB7XG5cbiAgICBuYW1lID0gbmFtZSB8fCBudWxsO1xuICAgIC8vIElmIGl0J3MgYSBzdHJpbmcsIHRoZSBleHRlbnNpb24gd2FzIHByZXZpb3VzbHkgbG9hZGVkXG4gICAgaWYgKHNob3dkb3duLmhlbHBlci5pc1N0cmluZyhleHQpKSB7XG4gICAgICBleHQgPSBzaG93ZG93bi5oZWxwZXIuc3RkRXh0TmFtZShleHQpO1xuICAgICAgbmFtZSA9IGV4dDtcblxuICAgICAgLy8gTEVHQUNZX1NVUFBPUlQgQ09ERVxuICAgICAgaWYgKHNob3dkb3duLmV4dGVuc2lvbnNbZXh0XSkge1xuICAgICAgICBjb25zb2xlLndhcm4oJ0RFUFJFQ0FUSU9OIFdBUk5JTkc6ICcgKyBleHQgKyAnIGlzIGFuIG9sZCBleHRlbnNpb24gdGhhdCB1c2VzIGEgZGVwcmVjYXRlZCBsb2FkaW5nIG1ldGhvZC4nICtcbiAgICAgICAgICAnUGxlYXNlIGluZm9ybSB0aGUgZGV2ZWxvcGVyIHRoYXQgdGhlIGV4dGVuc2lvbiBzaG91bGQgYmUgdXBkYXRlZCEnKTtcbiAgICAgICAgbGVnYWN5RXh0ZW5zaW9uTG9hZGluZyhzaG93ZG93bi5leHRlbnNpb25zW2V4dF0sIGV4dCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIC8vIEVORCBMRUdBQ1kgU1VQUE9SVCBDT0RFXG5cbiAgICAgIH0gZWxzZSBpZiAoIXNob3dkb3duLmhlbHBlci5pc1VuZGVmaW5lZChleHRlbnNpb25zW2V4dF0pKSB7XG4gICAgICAgIGV4dCA9IGV4dGVuc2lvbnNbZXh0XTtcblxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgRXJyb3IoJ0V4dGVuc2lvbiBcIicgKyBleHQgKyAnXCIgY291bGQgbm90IGJlIGxvYWRlZC4gSXQgd2FzIGVpdGhlciBub3QgZm91bmQgb3IgaXMgbm90IGEgdmFsaWQgZXh0ZW5zaW9uLicpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmICh0eXBlb2YgZXh0ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBleHQgPSBleHQoKTtcbiAgICB9XG5cbiAgICBpZiAoIXNob3dkb3duLmhlbHBlci5pc0FycmF5KGV4dCkpIHtcbiAgICAgIGV4dCA9IFtleHRdO1xuICAgIH1cblxuICAgIHZhciB2YWxpZEV4dCA9IHZhbGlkYXRlKGV4dCwgbmFtZSk7XG4gICAgaWYgKCF2YWxpZEV4dC52YWxpZCkge1xuICAgICAgdGhyb3cgRXJyb3IodmFsaWRFeHQuZXJyb3IpO1xuICAgIH1cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZXh0Lmxlbmd0aDsgKytpKSB7XG4gICAgICBzd2l0Y2ggKGV4dFtpXS50eXBlKSB7XG5cbiAgICAgICAgY2FzZSAnbGFuZyc6XG4gICAgICAgICAgbGFuZ0V4dGVuc2lvbnMucHVzaChleHRbaV0pO1xuICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGNhc2UgJ291dHB1dCc6XG4gICAgICAgICAgb3V0cHV0TW9kaWZpZXJzLnB1c2goZXh0W2ldKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgIGlmIChleHRbaV0uaGFzT3duUHJvcGVydHkoJ2xpc3RlbmVycycpKSB7XG4gICAgICAgIGZvciAodmFyIGxuIGluIGV4dFtpXS5saXN0ZW5lcnMpIHtcbiAgICAgICAgICBpZiAoZXh0W2ldLmxpc3RlbmVycy5oYXNPd25Qcm9wZXJ0eShsbikpIHtcbiAgICAgICAgICAgIGxpc3RlbihsbiwgZXh0W2ldLmxpc3RlbmVyc1tsbl0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICB9XG5cbiAgLyoqXG4gICAqIExFR0FDWV9TVVBQT1JUXG4gICAqIEBwYXJhbSB7Kn0gZXh0XG4gICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lXG4gICAqL1xuICBmdW5jdGlvbiBsZWdhY3lFeHRlbnNpb25Mb2FkaW5nIChleHQsIG5hbWUpIHtcbiAgICBpZiAodHlwZW9mIGV4dCA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgZXh0ID0gZXh0KG5ldyBzaG93ZG93bi5Db252ZXJ0ZXIoKSk7XG4gICAgfVxuICAgIGlmICghc2hvd2Rvd24uaGVscGVyLmlzQXJyYXkoZXh0KSkge1xuICAgICAgZXh0ID0gW2V4dF07XG4gICAgfVxuICAgIHZhciB2YWxpZCA9IHZhbGlkYXRlKGV4dCwgbmFtZSk7XG5cbiAgICBpZiAoIXZhbGlkLnZhbGlkKSB7XG4gICAgICB0aHJvdyBFcnJvcih2YWxpZC5lcnJvcik7XG4gICAgfVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBleHQubGVuZ3RoOyArK2kpIHtcbiAgICAgIHN3aXRjaCAoZXh0W2ldLnR5cGUpIHtcbiAgICAgICAgY2FzZSAnbGFuZyc6XG4gICAgICAgICAgbGFuZ0V4dGVuc2lvbnMucHVzaChleHRbaV0pO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdvdXRwdXQnOlxuICAgICAgICAgIG91dHB1dE1vZGlmaWVycy5wdXNoKGV4dFtpXSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6Ly8gc2hvdWxkIG5ldmVyIHJlYWNoIGhlcmVcbiAgICAgICAgICB0aHJvdyBFcnJvcignRXh0ZW5zaW9uIGxvYWRlciBlcnJvcjogVHlwZSB1bnJlY29nbml6ZWQhISEnKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogTGlzdGVuIHRvIGFuIGV2ZW50XG4gICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lXG4gICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrXG4gICAqL1xuICBmdW5jdGlvbiBsaXN0ZW4gKG5hbWUsIGNhbGxiYWNrKSB7XG4gICAgaWYgKCFzaG93ZG93bi5oZWxwZXIuaXNTdHJpbmcobmFtZSkpIHtcbiAgICAgIHRocm93IEVycm9yKCdJbnZhbGlkIGFyZ3VtZW50IGluIGNvbnZlcnRlci5saXN0ZW4oKSBtZXRob2Q6IG5hbWUgbXVzdCBiZSBhIHN0cmluZywgYnV0ICcgKyB0eXBlb2YgbmFtZSArICcgZ2l2ZW4nKTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIGNhbGxiYWNrICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICB0aHJvdyBFcnJvcignSW52YWxpZCBhcmd1bWVudCBpbiBjb252ZXJ0ZXIubGlzdGVuKCkgbWV0aG9kOiBjYWxsYmFjayBtdXN0IGJlIGEgZnVuY3Rpb24sIGJ1dCAnICsgdHlwZW9mIGNhbGxiYWNrICsgJyBnaXZlbicpO1xuICAgIH1cblxuICAgIGlmICghbGlzdGVuZXJzLmhhc093blByb3BlcnR5KG5hbWUpKSB7XG4gICAgICBsaXN0ZW5lcnNbbmFtZV0gPSBbXTtcbiAgICB9XG4gICAgbGlzdGVuZXJzW25hbWVdLnB1c2goY2FsbGJhY2spO1xuICB9XG5cbiAgZnVuY3Rpb24gclRyaW1JbnB1dFRleHQgKHRleHQpIHtcbiAgICB2YXIgcnNwID0gdGV4dC5tYXRjaCgvXlxccyovKVswXS5sZW5ndGgsXG4gICAgICAgIHJneCA9IG5ldyBSZWdFeHAoJ15cXFxcc3swLCcgKyByc3AgKyAnfScsICdnbScpO1xuICAgIHJldHVybiB0ZXh0LnJlcGxhY2Uocmd4LCAnJyk7XG4gIH1cblxuICAvKipcbiAgICogRGlzcGF0Y2ggYW4gZXZlbnRcbiAgICogQHByaXZhdGVcbiAgICogQHBhcmFtIHtzdHJpbmd9IGV2dE5hbWUgRXZlbnQgbmFtZVxuICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCBUZXh0XG4gICAqIEBwYXJhbSB7e319IG9wdGlvbnMgQ29udmVydGVyIE9wdGlvbnNcbiAgICogQHBhcmFtIHt7fX0gZ2xvYmFsc1xuICAgKiBAcmV0dXJucyB7c3RyaW5nfVxuICAgKi9cbiAgdGhpcy5fZGlzcGF0Y2ggPSBmdW5jdGlvbiBkaXNwYXRjaCAoZXZ0TmFtZSwgdGV4dCwgb3B0aW9ucywgZ2xvYmFscykge1xuICAgIGlmIChsaXN0ZW5lcnMuaGFzT3duUHJvcGVydHkoZXZ0TmFtZSkpIHtcbiAgICAgIGZvciAodmFyIGVpID0gMDsgZWkgPCBsaXN0ZW5lcnNbZXZ0TmFtZV0ubGVuZ3RoOyArK2VpKSB7XG4gICAgICAgIHZhciBuVGV4dCA9IGxpc3RlbmVyc1tldnROYW1lXVtlaV0oZXZ0TmFtZSwgdGV4dCwgdGhpcywgb3B0aW9ucywgZ2xvYmFscyk7XG4gICAgICAgIGlmIChuVGV4dCAmJiB0eXBlb2YgblRleHQgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgdGV4dCA9IG5UZXh0O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0ZXh0O1xuICB9O1xuXG4gIC8qKlxuICAgKiBMaXN0ZW4gdG8gYW4gZXZlbnRcbiAgICogQHBhcmFtIHtzdHJpbmd9IG5hbWVcbiAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2tcbiAgICogQHJldHVybnMge3Nob3dkb3duLkNvbnZlcnRlcn1cbiAgICovXG4gIHRoaXMubGlzdGVuID0gZnVuY3Rpb24gKG5hbWUsIGNhbGxiYWNrKSB7XG4gICAgbGlzdGVuKG5hbWUsIGNhbGxiYWNrKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuICAvKipcbiAgICogQ29udmVydHMgYSBtYXJrZG93biBzdHJpbmcgaW50byBIVE1MXG4gICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0XG4gICAqIEByZXR1cm5zIHsqfVxuICAgKi9cbiAgdGhpcy5tYWtlSHRtbCA9IGZ1bmN0aW9uICh0ZXh0KSB7XG4gICAgLy9jaGVjayBpZiB0ZXh0IGlzIG5vdCBmYWxzeVxuICAgIGlmICghdGV4dCkge1xuICAgICAgcmV0dXJuIHRleHQ7XG4gICAgfVxuXG4gICAgdmFyIGdsb2JhbHMgPSB7XG4gICAgICBnSHRtbEJsb2NrczogICAgIFtdLFxuICAgICAgZ0h0bWxNZEJsb2NrczogICBbXSxcbiAgICAgIGdIdG1sU3BhbnM6ICAgICAgW10sXG4gICAgICBnVXJsczogICAgICAgICAgIHt9LFxuICAgICAgZ1RpdGxlczogICAgICAgICB7fSxcbiAgICAgIGdEaW1lbnNpb25zOiAgICAge30sXG4gICAgICBnTGlzdExldmVsOiAgICAgIDAsXG4gICAgICBoYXNoTGlua0NvdW50czogIHt9LFxuICAgICAgbGFuZ0V4dGVuc2lvbnM6ICBsYW5nRXh0ZW5zaW9ucyxcbiAgICAgIG91dHB1dE1vZGlmaWVyczogb3V0cHV0TW9kaWZpZXJzLFxuICAgICAgY29udmVydGVyOiAgICAgICB0aGlzLFxuICAgICAgZ2hDb2RlQmxvY2tzOiAgICBbXVxuICAgIH07XG5cbiAgICAvLyBUaGlzIGxldHMgdXMgdXNlIMKoIHRyZW1hIGFzIGFuIGVzY2FwZSBjaGFyIHRvIGF2b2lkIG1kNSBoYXNoZXNcbiAgICAvLyBUaGUgY2hvaWNlIG9mIGNoYXJhY3RlciBpcyBhcmJpdHJhcnk7IGFueXRoaW5nIHRoYXQgaXNuJ3RcbiAgICAvLyBtYWdpYyBpbiBNYXJrZG93biB3aWxsIHdvcmsuXG4gICAgdGV4dCA9IHRleHQucmVwbGFjZSgvwqgvZywgJ8KoVCcpO1xuXG4gICAgLy8gUmVwbGFjZSAkIHdpdGggwqhEXG4gICAgLy8gUmVnRXhwIGludGVycHJldHMgJCBhcyBhIHNwZWNpYWwgY2hhcmFjdGVyXG4gICAgLy8gd2hlbiBpdCdzIGluIGEgcmVwbGFjZW1lbnQgc3RyaW5nXG4gICAgdGV4dCA9IHRleHQucmVwbGFjZSgvXFwkL2csICfCqEQnKTtcblxuICAgIC8vIFN0YW5kYXJkaXplIGxpbmUgZW5kaW5nc1xuICAgIHRleHQgPSB0ZXh0LnJlcGxhY2UoL1xcclxcbi9nLCAnXFxuJyk7IC8vIERPUyB0byBVbml4XG4gICAgdGV4dCA9IHRleHQucmVwbGFjZSgvXFxyL2csICdcXG4nKTsgLy8gTWFjIHRvIFVuaXhcblxuICAgIC8vIFN0YXJkYXJkaXplIGxpbmUgc3BhY2VzIChuYnNwIGNhdXNlcyB0cm91YmxlIGluIG9sZGVyIGJyb3dzZXJzIGFuZCBzb21lIHJlZ2V4IGZsYXZvcnMpXG4gICAgdGV4dCA9IHRleHQucmVwbGFjZSgvXFx1MDBBMC9nLCAnICcpO1xuXG4gICAgaWYgKG9wdGlvbnMuc21hcnRJbmRlbnRhdGlvbkZpeCkge1xuICAgICAgdGV4dCA9IHJUcmltSW5wdXRUZXh0KHRleHQpO1xuICAgIH1cblxuICAgIC8vIE1ha2Ugc3VyZSB0ZXh0IGJlZ2lucyBhbmQgZW5kcyB3aXRoIGEgY291cGxlIG9mIG5ld2xpbmVzOlxuICAgIHRleHQgPSAnXFxuXFxuJyArIHRleHQgKyAnXFxuXFxuJztcblxuICAgIC8vIGRldGFiXG4gICAgdGV4dCA9IHNob3dkb3duLnN1YlBhcnNlcignZGV0YWInKSh0ZXh0LCBvcHRpb25zLCBnbG9iYWxzKTtcblxuICAgIC8qKlxuICAgICAqIFN0cmlwIGFueSBsaW5lcyBjb25zaXN0aW5nIG9ubHkgb2Ygc3BhY2VzIGFuZCB0YWJzLlxuICAgICAqIFRoaXMgbWFrZXMgc3Vic2VxdWVudCByZWdleHMgZWFzaWVyIHRvIHdyaXRlLCBiZWNhdXNlIHdlIGNhblxuICAgICAqIG1hdGNoIGNvbnNlY3V0aXZlIGJsYW5rIGxpbmVzIHdpdGggL1xcbisvIGluc3RlYWQgb2Ygc29tZXRoaW5nXG4gICAgICogY29udG9ydGVkIGxpa2UgL1sgXFx0XSpcXG4rL1xuICAgICAqL1xuICAgIHRleHQgPSB0ZXh0LnJlcGxhY2UoL15bIFxcdF0rJC9tZywgJycpO1xuXG4gICAgLy9ydW4gbGFuZ3VhZ2VFeHRlbnNpb25zXG4gICAgc2hvd2Rvd24uaGVscGVyLmZvckVhY2gobGFuZ0V4dGVuc2lvbnMsIGZ1bmN0aW9uIChleHQpIHtcbiAgICAgIHRleHQgPSBzaG93ZG93bi5zdWJQYXJzZXIoJ3J1bkV4dGVuc2lvbicpKGV4dCwgdGV4dCwgb3B0aW9ucywgZ2xvYmFscyk7XG4gICAgfSk7XG5cbiAgICAvLyBydW4gdGhlIHN1YiBwYXJzZXJzXG4gICAgdGV4dCA9IHNob3dkb3duLnN1YlBhcnNlcignaGFzaFByZUNvZGVUYWdzJykodGV4dCwgb3B0aW9ucywgZ2xvYmFscyk7XG4gICAgdGV4dCA9IHNob3dkb3duLnN1YlBhcnNlcignZ2l0aHViQ29kZUJsb2NrcycpKHRleHQsIG9wdGlvbnMsIGdsb2JhbHMpO1xuICAgIHRleHQgPSBzaG93ZG93bi5zdWJQYXJzZXIoJ2hhc2hIVE1MQmxvY2tzJykodGV4dCwgb3B0aW9ucywgZ2xvYmFscyk7XG4gICAgdGV4dCA9IHNob3dkb3duLnN1YlBhcnNlcignaGFzaENvZGVUYWdzJykodGV4dCwgb3B0aW9ucywgZ2xvYmFscyk7XG4gICAgdGV4dCA9IHNob3dkb3duLnN1YlBhcnNlcignc3RyaXBMaW5rRGVmaW5pdGlvbnMnKSh0ZXh0LCBvcHRpb25zLCBnbG9iYWxzKTtcbiAgICB0ZXh0ID0gc2hvd2Rvd24uc3ViUGFyc2VyKCdibG9ja0dhbXV0JykodGV4dCwgb3B0aW9ucywgZ2xvYmFscyk7XG4gICAgdGV4dCA9IHNob3dkb3duLnN1YlBhcnNlcigndW5oYXNoSFRNTFNwYW5zJykodGV4dCwgb3B0aW9ucywgZ2xvYmFscyk7XG4gICAgdGV4dCA9IHNob3dkb3duLnN1YlBhcnNlcigndW5lc2NhcGVTcGVjaWFsQ2hhcnMnKSh0ZXh0LCBvcHRpb25zLCBnbG9iYWxzKTtcblxuICAgIC8vIGF0dGFja2xhYjogUmVzdG9yZSBkb2xsYXIgc2lnbnNcbiAgICB0ZXh0ID0gdGV4dC5yZXBsYWNlKC/CqEQvZywgJyQkJyk7XG5cbiAgICAvLyBhdHRhY2tsYWI6IFJlc3RvcmUgdHJlbWFzXG4gICAgdGV4dCA9IHRleHQucmVwbGFjZSgvwqhUL2csICfCqCcpO1xuXG4gICAgLy8gUnVuIG91dHB1dCBtb2RpZmllcnNcbiAgICBzaG93ZG93bi5oZWxwZXIuZm9yRWFjaChvdXRwdXRNb2RpZmllcnMsIGZ1bmN0aW9uIChleHQpIHtcbiAgICAgIHRleHQgPSBzaG93ZG93bi5zdWJQYXJzZXIoJ3J1bkV4dGVuc2lvbicpKGV4dCwgdGV4dCwgb3B0aW9ucywgZ2xvYmFscyk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gdGV4dDtcbiAgfTtcblxuICAvKipcbiAgICogU2V0IGFuIG9wdGlvbiBvZiB0aGlzIENvbnZlcnRlciBpbnN0YW5jZVxuICAgKiBAcGFyYW0ge3N0cmluZ30ga2V5XG4gICAqIEBwYXJhbSB7Kn0gdmFsdWVcbiAgICovXG4gIHRoaXMuc2V0T3B0aW9uID0gZnVuY3Rpb24gKGtleSwgdmFsdWUpIHtcbiAgICBvcHRpb25zW2tleV0gPSB2YWx1ZTtcbiAgfTtcblxuICAvKipcbiAgICogR2V0IHRoZSBvcHRpb24gb2YgdGhpcyBDb252ZXJ0ZXIgaW5zdGFuY2VcbiAgICogQHBhcmFtIHtzdHJpbmd9IGtleVxuICAgKiBAcmV0dXJucyB7Kn1cbiAgICovXG4gIHRoaXMuZ2V0T3B0aW9uID0gZnVuY3Rpb24gKGtleSkge1xuICAgIHJldHVybiBvcHRpb25zW2tleV07XG4gIH07XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgb3B0aW9ucyBvZiB0aGlzIENvbnZlcnRlciBpbnN0YW5jZVxuICAgKiBAcmV0dXJucyB7e319XG4gICAqL1xuICB0aGlzLmdldE9wdGlvbnMgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIG9wdGlvbnM7XG4gIH07XG5cbiAgLyoqXG4gICAqIEFkZCBleHRlbnNpb24gdG8gVEhJUyBjb252ZXJ0ZXJcbiAgICogQHBhcmFtIHt7fX0gZXh0ZW5zaW9uXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBbbmFtZT1udWxsXVxuICAgKi9cbiAgdGhpcy5hZGRFeHRlbnNpb24gPSBmdW5jdGlvbiAoZXh0ZW5zaW9uLCBuYW1lKSB7XG4gICAgbmFtZSA9IG5hbWUgfHwgbnVsbDtcbiAgICBfcGFyc2VFeHRlbnNpb24oZXh0ZW5zaW9uLCBuYW1lKTtcbiAgfTtcblxuICAvKipcbiAgICogVXNlIGEgZ2xvYmFsIHJlZ2lzdGVyZWQgZXh0ZW5zaW9uIHdpdGggVEhJUyBjb252ZXJ0ZXJcbiAgICogQHBhcmFtIHtzdHJpbmd9IGV4dGVuc2lvbk5hbWUgTmFtZSBvZiB0aGUgcHJldmlvdXNseSByZWdpc3RlcmVkIGV4dGVuc2lvblxuICAgKi9cbiAgdGhpcy51c2VFeHRlbnNpb24gPSBmdW5jdGlvbiAoZXh0ZW5zaW9uTmFtZSkge1xuICAgIF9wYXJzZUV4dGVuc2lvbihleHRlbnNpb25OYW1lKTtcbiAgfTtcblxuICAvKipcbiAgICogU2V0IHRoZSBmbGF2b3IgVEhJUyBjb252ZXJ0ZXIgc2hvdWxkIHVzZVxuICAgKiBAcGFyYW0ge3N0cmluZ30gbmFtZVxuICAgKi9cbiAgdGhpcy5zZXRGbGF2b3IgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIGlmICghZmxhdm9yLmhhc093blByb3BlcnR5KG5hbWUpKSB7XG4gICAgICB0aHJvdyBFcnJvcihuYW1lICsgJyBmbGF2b3Igd2FzIG5vdCBmb3VuZCcpO1xuICAgIH1cbiAgICB2YXIgcHJlc2V0ID0gZmxhdm9yW25hbWVdO1xuICAgIHNldENvbnZGbGF2b3IgPSBuYW1lO1xuICAgIGZvciAodmFyIG9wdGlvbiBpbiBwcmVzZXQpIHtcbiAgICAgIGlmIChwcmVzZXQuaGFzT3duUHJvcGVydHkob3B0aW9uKSkge1xuICAgICAgICBvcHRpb25zW29wdGlvbl0gPSBwcmVzZXRbb3B0aW9uXTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgY3VycmVudGx5IHNldCBmbGF2b3Igb2YgdGhpcyBjb252ZXJ0ZXJcbiAgICogQHJldHVybnMge3N0cmluZ31cbiAgICovXG4gIHRoaXMuZ2V0Rmxhdm9yID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiBzZXRDb252Rmxhdm9yO1xuICB9O1xuXG4gIC8qKlxuICAgKiBSZW1vdmUgYW4gZXh0ZW5zaW9uIGZyb20gVEhJUyBjb252ZXJ0ZXIuXG4gICAqIE5vdGU6IFRoaXMgaXMgYSBjb3N0bHkgb3BlcmF0aW9uLiBJdCdzIGJldHRlciB0byBpbml0aWFsaXplIGEgbmV3IGNvbnZlcnRlclxuICAgKiBhbmQgc3BlY2lmeSB0aGUgZXh0ZW5zaW9ucyB5b3Ugd2lzaCB0byB1c2VcbiAgICogQHBhcmFtIHtBcnJheX0gZXh0ZW5zaW9uXG4gICAqL1xuICB0aGlzLnJlbW92ZUV4dGVuc2lvbiA9IGZ1bmN0aW9uIChleHRlbnNpb24pIHtcbiAgICBpZiAoIXNob3dkb3duLmhlbHBlci5pc0FycmF5KGV4dGVuc2lvbikpIHtcbiAgICAgIGV4dGVuc2lvbiA9IFtleHRlbnNpb25dO1xuICAgIH1cbiAgICBmb3IgKHZhciBhID0gMDsgYSA8IGV4dGVuc2lvbi5sZW5ndGg7ICsrYSkge1xuICAgICAgdmFyIGV4dCA9IGV4dGVuc2lvblthXTtcbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGFuZ0V4dGVuc2lvbnMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgaWYgKGxhbmdFeHRlbnNpb25zW2ldID09PSBleHQpIHtcbiAgICAgICAgICBsYW5nRXh0ZW5zaW9uc1tpXS5zcGxpY2UoaSwgMSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGZvciAodmFyIGlpID0gMDsgaWkgPCBvdXRwdXRNb2RpZmllcnMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgaWYgKG91dHB1dE1vZGlmaWVyc1tpaV0gPT09IGV4dCkge1xuICAgICAgICAgIG91dHB1dE1vZGlmaWVyc1tpaV0uc3BsaWNlKGksIDEpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBHZXQgYWxsIGV4dGVuc2lvbiBvZiBUSElTIGNvbnZlcnRlclxuICAgKiBAcmV0dXJucyB7e2xhbmd1YWdlOiBBcnJheSwgb3V0cHV0OiBBcnJheX19XG4gICAqL1xuICB0aGlzLmdldEFsbEV4dGVuc2lvbnMgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGxhbmd1YWdlOiBsYW5nRXh0ZW5zaW9ucyxcbiAgICAgIG91dHB1dDogb3V0cHV0TW9kaWZpZXJzXG4gICAgfTtcbiAgfTtcbn07XG5cclxuLyoqXG4gKiBUdXJuIE1hcmtkb3duIGxpbmsgc2hvcnRjdXRzIGludG8gWEhUTUwgPGE+IHRhZ3MuXG4gKi9cbnNob3dkb3duLnN1YlBhcnNlcignYW5jaG9ycycsIGZ1bmN0aW9uICh0ZXh0LCBvcHRpb25zLCBnbG9iYWxzKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICB0ZXh0ID0gZ2xvYmFscy5jb252ZXJ0ZXIuX2Rpc3BhdGNoKCdhbmNob3JzLmJlZm9yZScsIHRleHQsIG9wdGlvbnMsIGdsb2JhbHMpO1xuXG4gIHZhciB3cml0ZUFuY2hvclRhZyA9IGZ1bmN0aW9uICh3aG9sZU1hdGNoLCBtMSwgbTIsIG0zLCBtNCwgbTUsIG02LCBtNykge1xuICAgIGlmIChzaG93ZG93bi5oZWxwZXIuaXNVbmRlZmluZWQobTcpKSB7XG4gICAgICBtNyA9ICcnO1xuICAgIH1cbiAgICB3aG9sZU1hdGNoID0gbTE7XG4gICAgdmFyIGxpbmtUZXh0ID0gbTIsXG4gICAgICAgIGxpbmtJZCA9IG0zLnRvTG93ZXJDYXNlKCksXG4gICAgICAgIHVybCA9IG00LFxuICAgICAgICB0aXRsZSA9IG03O1xuXG4gICAgaWYgKCF1cmwpIHtcbiAgICAgIGlmICghbGlua0lkKSB7XG4gICAgICAgIC8vIGxvd2VyLWNhc2UgYW5kIHR1cm4gZW1iZWRkZWQgbmV3bGluZXMgaW50byBzcGFjZXNcbiAgICAgICAgbGlua0lkID0gbGlua1RleHQudG9Mb3dlckNhc2UoKS5yZXBsYWNlKC8gP1xcbi9nLCAnICcpO1xuICAgICAgfVxuICAgICAgdXJsID0gJyMnICsgbGlua0lkO1xuXG4gICAgICBpZiAoIXNob3dkb3duLmhlbHBlci5pc1VuZGVmaW5lZChnbG9iYWxzLmdVcmxzW2xpbmtJZF0pKSB7XG4gICAgICAgIHVybCA9IGdsb2JhbHMuZ1VybHNbbGlua0lkXTtcbiAgICAgICAgaWYgKCFzaG93ZG93bi5oZWxwZXIuaXNVbmRlZmluZWQoZ2xvYmFscy5nVGl0bGVzW2xpbmtJZF0pKSB7XG4gICAgICAgICAgdGl0bGUgPSBnbG9iYWxzLmdUaXRsZXNbbGlua0lkXTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKHdob2xlTWF0Y2guc2VhcmNoKC9cXChcXHMqXFwpJC9tKSA+IC0xKSB7XG4gICAgICAgICAgLy8gU3BlY2lhbCBjYXNlIGZvciBleHBsaWNpdCBlbXB0eSB1cmxcbiAgICAgICAgICB1cmwgPSAnJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gd2hvbGVNYXRjaDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vdXJsID0gc2hvd2Rvd24uaGVscGVyLmVzY2FwZUNoYXJhY3RlcnModXJsLCAnKl8nLCBmYWxzZSk7IC8vIHJlcGxhY2VkIGxpbmUgdG8gaW1wcm92ZSBwZXJmb3JtYW5jZVxuICAgIHVybCA9IHVybC5yZXBsYWNlKHNob3dkb3duLmhlbHBlci5yZWdleGVzLmFzdGVyaXNrQW5kRGFzaCwgc2hvd2Rvd24uaGVscGVyLmVzY2FwZUNoYXJhY3RlcnNDYWxsYmFjayk7XG5cbiAgICB2YXIgcmVzdWx0ID0gJzxhIGhyZWY9XCInICsgdXJsICsgJ1wiJztcblxuICAgIGlmICh0aXRsZSAhPT0gJycgJiYgdGl0bGUgIT09IG51bGwpIHtcbiAgICAgIHRpdGxlID0gdGl0bGUucmVwbGFjZSgvXCIvZywgJyZxdW90OycpO1xuICAgICAgLy90aXRsZSA9IHNob3dkb3duLmhlbHBlci5lc2NhcGVDaGFyYWN0ZXJzKHRpdGxlLCAnKl8nLCBmYWxzZSk7IC8vIHJlcGxhY2VkIGxpbmUgdG8gaW1wcm92ZSBwZXJmb3JtYW5jZVxuICAgICAgdGl0bGUgPSB0aXRsZS5yZXBsYWNlKHNob3dkb3duLmhlbHBlci5yZWdleGVzLmFzdGVyaXNrQW5kRGFzaCwgc2hvd2Rvd24uaGVscGVyLmVzY2FwZUNoYXJhY3RlcnNDYWxsYmFjayk7XG4gICAgICByZXN1bHQgKz0gJyB0aXRsZT1cIicgKyB0aXRsZSArICdcIic7XG4gICAgfVxuXG4gICAgcmVzdWx0ICs9ICc+JyArIGxpbmtUZXh0ICsgJzwvYT4nO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvLyBGaXJzdCwgaGFuZGxlIHJlZmVyZW5jZS1zdHlsZSBsaW5rczogW2xpbmsgdGV4dF0gW2lkXVxuICB0ZXh0ID0gdGV4dC5yZXBsYWNlKC8oXFxbKCg/OlxcW1teXFxdXSpdfFteXFxbXFxdXSkqKV1bIF0/KD86XFxuWyBdKik/XFxbKC4qPyldKSgpKCkoKSgpL2csIHdyaXRlQW5jaG9yVGFnKTtcblxuICAvLyBOZXh0LCBpbmxpbmUtc3R5bGUgbGlua3M6IFtsaW5rIHRleHRdKHVybCBcIm9wdGlvbmFsIHRpdGxlXCIpXG4gIHRleHQgPSB0ZXh0LnJlcGxhY2UoLyhcXFsoKD86XFxbW15cXF1dKl18W15cXFtcXF1dKSopXVxcKFsgXFx0XSooKTw/KC4qPyg/OlxcKC4qP1xcKS4qPyk/KT4/WyBcXHRdKigoWydcIl0pKC4qPylcXDZbIFxcdF0qKT9cXCkpL2csXG4gICAgICAgICAgICAgICAgICAgICAgd3JpdGVBbmNob3JUYWcpO1xuXG4gIC8vIGhhbmRsZSByZWZlcmVuY2Utc3R5bGUgc2hvcnRjdXRzOiBbbGluayB0ZXh0XVxuICAvLyBUaGVzZSBtdXN0IGNvbWUgbGFzdCBpbiBjYXNlIHlvdSd2ZSBhbHNvIGdvdCBbbGluayB0ZXN0XVsxXVxuICAvLyBvciBbbGluayB0ZXN0XSgvZm9vKVxuICB0ZXh0ID0gdGV4dC5yZXBsYWNlKC8oXFxbKFteXFxbXFxdXSspXSkoKSgpKCkoKSgpL2csIHdyaXRlQW5jaG9yVGFnKTtcblxuICAvLyBMYXN0bHkgaGFuZGxlIEdpdGh1Yk1lbnRpb25zIGlmIG9wdGlvbiBpcyBlbmFibGVkXG4gIGlmIChvcHRpb25zLmdoTWVudGlvbnMpIHtcbiAgICB0ZXh0ID0gdGV4dC5yZXBsYWNlKC8oXnxcXHMpKFxcXFwpPyhAKFthLXpcXGRcXC1dKykpKD89Wy4hPzssW1xcXSgpXXxcXHN8JCkvZ21pLCBmdW5jdGlvbiAod20sIHN0LCBlc2NhcGUsIG1lbnRpb25zLCB1c2VybmFtZSkge1xuICAgICAgaWYgKGVzY2FwZSA9PT0gJ1xcXFwnKSB7XG4gICAgICAgIHJldHVybiBzdCArIG1lbnRpb25zO1xuICAgICAgfVxuXG4gICAgICAvL2NoZWNrIGlmIG9wdGlvbnMuZ2hNZW50aW9uc0xpbmsgaXMgYSBzdHJpbmdcbiAgICAgIGlmICghc2hvd2Rvd24uaGVscGVyLmlzU3RyaW5nKG9wdGlvbnMuZ2hNZW50aW9uc0xpbmspKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignZ2hNZW50aW9uc0xpbmsgb3B0aW9uIG11c3QgYmUgYSBzdHJpbmcnKTtcbiAgICAgIH1cbiAgICAgIHZhciBsbmsgPSBvcHRpb25zLmdoTWVudGlvbnNMaW5rLnJlcGxhY2UoL1xce3V9L2csIHVzZXJuYW1lKTtcbiAgICAgIHJldHVybiBzdCArICc8YSBocmVmPVwiJyArIGxuayArICdcIj4nICsgbWVudGlvbnMgKyAnPC9hPic7XG4gICAgfSk7XG4gIH1cblxuICB0ZXh0ID0gZ2xvYmFscy5jb252ZXJ0ZXIuX2Rpc3BhdGNoKCdhbmNob3JzLmFmdGVyJywgdGV4dCwgb3B0aW9ucywgZ2xvYmFscyk7XG4gIHJldHVybiB0ZXh0O1xufSk7XG5cclxuc2hvd2Rvd24uc3ViUGFyc2VyKCdhdXRvTGlua3MnLCBmdW5jdGlvbiAodGV4dCwgb3B0aW9ucywgZ2xvYmFscykge1xuICAndXNlIHN0cmljdCc7XG5cbiAgdGV4dCA9IGdsb2JhbHMuY29udmVydGVyLl9kaXNwYXRjaCgnYXV0b0xpbmtzLmJlZm9yZScsIHRleHQsIG9wdGlvbnMsIGdsb2JhbHMpO1xuXG4gIHZhciBzaW1wbGVVUkxSZWdleCAgPSAvXFxiKCgoaHR0cHM/fGZ0cHxkaWN0KTpcXC9cXC98d3d3XFwuKVteJ1wiPlxcc10rXFwuW14nXCI+XFxzXSspKCkoPz1cXHN8JCkoPyFbXCI8Pl0pL2dpLFxuICAgICAgc2ltcGxlVVJMUmVnZXgyID0gL1xcYigoKGh0dHBzP3xmdHB8ZGljdCk6XFwvXFwvfHd3d1xcLilbXidcIj5cXHNdK1xcLlteJ1wiPlxcc10rPykoWy4hPygpXT8pKD89XFxzfCQpKD8hW1wiPD5dKS9naSxcbiAgICAgIGRlbGltVXJsUmVnZXggICA9IC88KCgoaHR0cHM/fGZ0cHxkaWN0KTpcXC9cXC98d3d3XFwuKVteJ1wiPlxcc10rKT4vZ2ksXG4gICAgICBzaW1wbGVNYWlsUmVnZXggPSAvKF58XFxzKSg/Om1haWx0bzopPyhbQS1aYS16MC05ISMkJSYnKistLz0/Xl9ge3x9fi5dK0BbLWEtejAtOV0rKFxcLlstYS16MC05XSspKlxcLlthLXpdKykoPz0kfFxccykvZ21pLFxuICAgICAgZGVsaW1NYWlsUmVnZXggID0gLzwoKSg/Om1haWx0bzopPyhbLS5cXHddK0BbLWEtejAtOV0rKFxcLlstYS16MC05XSspKlxcLlthLXpdKyk+L2dpO1xuXG4gIHRleHQgPSB0ZXh0LnJlcGxhY2UoZGVsaW1VcmxSZWdleCwgcmVwbGFjZUxpbmspO1xuICB0ZXh0ID0gdGV4dC5yZXBsYWNlKGRlbGltTWFpbFJlZ2V4LCByZXBsYWNlTWFpbCk7XG4gIC8vIHNpbXBsZVVSTFJlZ2V4ICA9IC9cXGIoKChodHRwcz98ZnRwfGRpY3QpOlxcL1xcL3x3d3dcXC4pWy0uK346PyNAISQmJygpKiw7PVtcXF1cXHddKylcXGIvZ2ksXG4gIC8vIEVtYWlsIGFkZHJlc3NlczogPGFkZHJlc3NAZG9tYWluLmZvbz5cblxuICBpZiAob3B0aW9ucy5zaW1wbGlmaWVkQXV0b0xpbmspIHtcbiAgICBpZiAob3B0aW9ucy5leGNsdWRlVHJhaWxpbmdQdW5jdHVhdGlvbkZyb21VUkxzKSB7XG4gICAgICB0ZXh0ID0gdGV4dC5yZXBsYWNlKHNpbXBsZVVSTFJlZ2V4MiwgcmVwbGFjZUxpbmspO1xuICAgIH0gZWxzZSB7XG4gICAgICB0ZXh0ID0gdGV4dC5yZXBsYWNlKHNpbXBsZVVSTFJlZ2V4LCByZXBsYWNlTGluayk7XG4gICAgfVxuICAgIHRleHQgPSB0ZXh0LnJlcGxhY2Uoc2ltcGxlTWFpbFJlZ2V4LCByZXBsYWNlTWFpbCk7XG4gIH1cblxuICBmdW5jdGlvbiByZXBsYWNlTGluayAod20sIGxpbmssIG0yLCBtMywgdHJhaWxpbmdQdW5jdHVhdGlvbikge1xuICAgIHZhciBsbmtUeHQgPSBsaW5rLFxuICAgICAgICBhcHBlbmQgPSAnJztcbiAgICBpZiAoL153d3dcXC4vaS50ZXN0KGxpbmspKSB7XG4gICAgICBsaW5rID0gbGluay5yZXBsYWNlKC9ed3d3XFwuL2ksICdodHRwOi8vd3d3LicpO1xuICAgIH1cbiAgICBpZiAob3B0aW9ucy5leGNsdWRlVHJhaWxpbmdQdW5jdHVhdGlvbkZyb21VUkxzICYmIHRyYWlsaW5nUHVuY3R1YXRpb24pIHtcbiAgICAgIGFwcGVuZCA9IHRyYWlsaW5nUHVuY3R1YXRpb247XG4gICAgfVxuICAgIHJldHVybiAnPGEgaHJlZj1cIicgKyBsaW5rICsgJ1wiPicgKyBsbmtUeHQgKyAnPC9hPicgKyBhcHBlbmQ7XG4gIH1cblxuICBmdW5jdGlvbiByZXBsYWNlTWFpbCAod2hvbGVNYXRjaCwgYiwgbWFpbCkge1xuICAgIHZhciBocmVmID0gJ21haWx0bzonO1xuICAgIGIgPSBiIHx8ICcnO1xuICAgIG1haWwgPSBzaG93ZG93bi5zdWJQYXJzZXIoJ3VuZXNjYXBlU3BlY2lhbENoYXJzJykobWFpbCwgb3B0aW9ucywgZ2xvYmFscyk7XG4gICAgaWYgKG9wdGlvbnMuZW5jb2RlRW1haWxzKSB7XG4gICAgICBocmVmID0gc2hvd2Rvd24uaGVscGVyLmVuY29kZUVtYWlsQWRkcmVzcyhocmVmICsgbWFpbCk7XG4gICAgICBtYWlsID0gc2hvd2Rvd24uaGVscGVyLmVuY29kZUVtYWlsQWRkcmVzcyhtYWlsKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaHJlZiA9IGhyZWYgKyBtYWlsO1xuICAgIH1cbiAgICByZXR1cm4gYiArICc8YSBocmVmPVwiJyArIGhyZWYgKyAnXCI+JyArIG1haWwgKyAnPC9hPic7XG4gIH1cblxuICB0ZXh0ID0gZ2xvYmFscy5jb252ZXJ0ZXIuX2Rpc3BhdGNoKCdhdXRvTGlua3MuYWZ0ZXInLCB0ZXh0LCBvcHRpb25zLCBnbG9iYWxzKTtcblxuICByZXR1cm4gdGV4dDtcbn0pO1xuXHJcbi8qKlxuICogVGhlc2UgYXJlIGFsbCB0aGUgdHJhbnNmb3JtYXRpb25zIHRoYXQgZm9ybSBibG9jay1sZXZlbFxuICogdGFncyBsaWtlIHBhcmFncmFwaHMsIGhlYWRlcnMsIGFuZCBsaXN0IGl0ZW1zLlxuICovXG5zaG93ZG93bi5zdWJQYXJzZXIoJ2Jsb2NrR2FtdXQnLCBmdW5jdGlvbiAodGV4dCwgb3B0aW9ucywgZ2xvYmFscykge1xuICAndXNlIHN0cmljdCc7XG5cbiAgdGV4dCA9IGdsb2JhbHMuY29udmVydGVyLl9kaXNwYXRjaCgnYmxvY2tHYW11dC5iZWZvcmUnLCB0ZXh0LCBvcHRpb25zLCBnbG9iYWxzKTtcblxuICAvLyB3ZSBwYXJzZSBibG9ja3F1b3RlcyBmaXJzdCBzbyB0aGF0IHdlIGNhbiBoYXZlIGhlYWRpbmdzIGFuZCBocnNcbiAgLy8gaW5zaWRlIGJsb2NrcXVvdGVzXG4gIHRleHQgPSBzaG93ZG93bi5zdWJQYXJzZXIoJ2Jsb2NrUXVvdGVzJykodGV4dCwgb3B0aW9ucywgZ2xvYmFscyk7XG4gIHRleHQgPSBzaG93ZG93bi5zdWJQYXJzZXIoJ2hlYWRlcnMnKSh0ZXh0LCBvcHRpb25zLCBnbG9iYWxzKTtcblxuICAvLyBEbyBIb3Jpem9udGFsIFJ1bGVzOlxuICB0ZXh0ID0gc2hvd2Rvd24uc3ViUGFyc2VyKCdob3Jpem9udGFsUnVsZScpKHRleHQsIG9wdGlvbnMsIGdsb2JhbHMpO1xuXG4gIHRleHQgPSBzaG93ZG93bi5zdWJQYXJzZXIoJ2xpc3RzJykodGV4dCwgb3B0aW9ucywgZ2xvYmFscyk7XG4gIHRleHQgPSBzaG93ZG93bi5zdWJQYXJzZXIoJ2NvZGVCbG9ja3MnKSh0ZXh0LCBvcHRpb25zLCBnbG9iYWxzKTtcbiAgdGV4dCA9IHNob3dkb3duLnN1YlBhcnNlcigndGFibGVzJykodGV4dCwgb3B0aW9ucywgZ2xvYmFscyk7XG5cbiAgLy8gV2UgYWxyZWFkeSByYW4gX0hhc2hIVE1MQmxvY2tzKCkgYmVmb3JlLCBpbiBNYXJrZG93bigpLCBidXQgdGhhdFxuICAvLyB3YXMgdG8gZXNjYXBlIHJhdyBIVE1MIGluIHRoZSBvcmlnaW5hbCBNYXJrZG93biBzb3VyY2UuIFRoaXMgdGltZSxcbiAgLy8gd2UncmUgZXNjYXBpbmcgdGhlIG1hcmt1cCB3ZSd2ZSBqdXN0IGNyZWF0ZWQsIHNvIHRoYXQgd2UgZG9uJ3Qgd3JhcFxuICAvLyA8cD4gdGFncyBhcm91bmQgYmxvY2stbGV2ZWwgdGFncy5cbiAgdGV4dCA9IHNob3dkb3duLnN1YlBhcnNlcignaGFzaEhUTUxCbG9ja3MnKSh0ZXh0LCBvcHRpb25zLCBnbG9iYWxzKTtcbiAgdGV4dCA9IHNob3dkb3duLnN1YlBhcnNlcigncGFyYWdyYXBocycpKHRleHQsIG9wdGlvbnMsIGdsb2JhbHMpO1xuXG4gIHRleHQgPSBnbG9iYWxzLmNvbnZlcnRlci5fZGlzcGF0Y2goJ2Jsb2NrR2FtdXQuYWZ0ZXInLCB0ZXh0LCBvcHRpb25zLCBnbG9iYWxzKTtcblxuICByZXR1cm4gdGV4dDtcbn0pO1xuXHJcbnNob3dkb3duLnN1YlBhcnNlcignYmxvY2tRdW90ZXMnLCBmdW5jdGlvbiAodGV4dCwgb3B0aW9ucywgZ2xvYmFscykge1xuICAndXNlIHN0cmljdCc7XG5cbiAgdGV4dCA9IGdsb2JhbHMuY29udmVydGVyLl9kaXNwYXRjaCgnYmxvY2tRdW90ZXMuYmVmb3JlJywgdGV4dCwgb3B0aW9ucywgZ2xvYmFscyk7XG5cbiAgdGV4dCA9IHRleHQucmVwbGFjZSgvKCheIHswLDN9PlsgXFx0XT8uK1xcbiguK1xcbikqXFxuKikrKS9nbSwgZnVuY3Rpb24gKHdob2xlTWF0Y2gsIG0xKSB7XG4gICAgdmFyIGJxID0gbTE7XG5cbiAgICAvLyBhdHRhY2tsYWI6IGhhY2sgYXJvdW5kIEtvbnF1ZXJvciAzLjUuNCBidWc6XG4gICAgLy8gXCItLS0tLS0tLS0tYnVnXCIucmVwbGFjZSgvXi0vZyxcIlwiKSA9PSBcImJ1Z1wiXG4gICAgYnEgPSBicS5yZXBsYWNlKC9eWyBcXHRdKj5bIFxcdF0/L2dtLCAnwqgwJyk7IC8vIHRyaW0gb25lIGxldmVsIG9mIHF1b3RpbmdcblxuICAgIC8vIGF0dGFja2xhYjogY2xlYW4gdXAgaGFja1xuICAgIGJxID0gYnEucmVwbGFjZSgvwqgwL2csICcnKTtcblxuICAgIGJxID0gYnEucmVwbGFjZSgvXlsgXFx0XSskL2dtLCAnJyk7IC8vIHRyaW0gd2hpdGVzcGFjZS1vbmx5IGxpbmVzXG4gICAgYnEgPSBzaG93ZG93bi5zdWJQYXJzZXIoJ2dpdGh1YkNvZGVCbG9ja3MnKShicSwgb3B0aW9ucywgZ2xvYmFscyk7XG4gICAgYnEgPSBzaG93ZG93bi5zdWJQYXJzZXIoJ2Jsb2NrR2FtdXQnKShicSwgb3B0aW9ucywgZ2xvYmFscyk7IC8vIHJlY3Vyc2VcblxuICAgIGJxID0gYnEucmVwbGFjZSgvKF58XFxuKS9nLCAnJDEgICcpO1xuICAgIC8vIFRoZXNlIGxlYWRpbmcgc3BhY2VzIHNjcmV3IHdpdGggPHByZT4gY29udGVudCwgc28gd2UgbmVlZCB0byBmaXggdGhhdDpcbiAgICBicSA9IGJxLnJlcGxhY2UoLyhcXHMqPHByZT5bXlxccl0rPzxcXC9wcmU+KS9nbSwgZnVuY3Rpb24gKHdob2xlTWF0Y2gsIG0xKSB7XG4gICAgICB2YXIgcHJlID0gbTE7XG4gICAgICAvLyBhdHRhY2tsYWI6IGhhY2sgYXJvdW5kIEtvbnF1ZXJvciAzLjUuNCBidWc6XG4gICAgICBwcmUgPSBwcmUucmVwbGFjZSgvXiAgL21nLCAnwqgwJyk7XG4gICAgICBwcmUgPSBwcmUucmVwbGFjZSgvwqgwL2csICcnKTtcbiAgICAgIHJldHVybiBwcmU7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gc2hvd2Rvd24uc3ViUGFyc2VyKCdoYXNoQmxvY2snKSgnPGJsb2NrcXVvdGU+XFxuJyArIGJxICsgJ1xcbjwvYmxvY2txdW90ZT4nLCBvcHRpb25zLCBnbG9iYWxzKTtcbiAgfSk7XG5cbiAgdGV4dCA9IGdsb2JhbHMuY29udmVydGVyLl9kaXNwYXRjaCgnYmxvY2tRdW90ZXMuYWZ0ZXInLCB0ZXh0LCBvcHRpb25zLCBnbG9iYWxzKTtcbiAgcmV0dXJuIHRleHQ7XG59KTtcblxyXG4vKipcbiAqIFByb2Nlc3MgTWFya2Rvd24gYDxwcmU+PGNvZGU+YCBibG9ja3MuXG4gKi9cbnNob3dkb3duLnN1YlBhcnNlcignY29kZUJsb2NrcycsIGZ1bmN0aW9uICh0ZXh0LCBvcHRpb25zLCBnbG9iYWxzKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICB0ZXh0ID0gZ2xvYmFscy5jb252ZXJ0ZXIuX2Rpc3BhdGNoKCdjb2RlQmxvY2tzLmJlZm9yZScsIHRleHQsIG9wdGlvbnMsIGdsb2JhbHMpO1xuXG4gIC8vIHNlbnRpbmVsIHdvcmthcm91bmRzIGZvciBsYWNrIG9mIFxcQSBhbmQgXFxaLCBzYWZhcmlcXGtodG1sIGJ1Z1xuICB0ZXh0ICs9ICfCqDAnO1xuXG4gIHZhciBwYXR0ZXJuID0gLyg/OlxcblxcbnxeKSgoPzooPzpbIF17NH18XFx0KS4qXFxuKykrKShcXG4qWyBdezAsM31bXiBcXHRcXG5dfCg/PcKoMCkpL2c7XG4gIHRleHQgPSB0ZXh0LnJlcGxhY2UocGF0dGVybiwgZnVuY3Rpb24gKHdob2xlTWF0Y2gsIG0xLCBtMikge1xuICAgIHZhciBjb2RlYmxvY2sgPSBtMSxcbiAgICAgICAgbmV4dENoYXIgPSBtMixcbiAgICAgICAgZW5kID0gJ1xcbic7XG5cbiAgICBjb2RlYmxvY2sgPSBzaG93ZG93bi5zdWJQYXJzZXIoJ291dGRlbnQnKShjb2RlYmxvY2ssIG9wdGlvbnMsIGdsb2JhbHMpO1xuICAgIGNvZGVibG9jayA9IHNob3dkb3duLnN1YlBhcnNlcignZW5jb2RlQ29kZScpKGNvZGVibG9jaywgb3B0aW9ucywgZ2xvYmFscyk7XG4gICAgY29kZWJsb2NrID0gc2hvd2Rvd24uc3ViUGFyc2VyKCdkZXRhYicpKGNvZGVibG9jaywgb3B0aW9ucywgZ2xvYmFscyk7XG4gICAgY29kZWJsb2NrID0gY29kZWJsb2NrLnJlcGxhY2UoL15cXG4rL2csICcnKTsgLy8gdHJpbSBsZWFkaW5nIG5ld2xpbmVzXG4gICAgY29kZWJsb2NrID0gY29kZWJsb2NrLnJlcGxhY2UoL1xcbiskL2csICcnKTsgLy8gdHJpbSB0cmFpbGluZyBuZXdsaW5lc1xuXG4gICAgaWYgKG9wdGlvbnMub21pdEV4dHJhV0xJbkNvZGVCbG9ja3MpIHtcbiAgICAgIGVuZCA9ICcnO1xuICAgIH1cblxuICAgIGNvZGVibG9jayA9ICc8cHJlPjxjb2RlPicgKyBjb2RlYmxvY2sgKyBlbmQgKyAnPC9jb2RlPjwvcHJlPic7XG5cbiAgICByZXR1cm4gc2hvd2Rvd24uc3ViUGFyc2VyKCdoYXNoQmxvY2snKShjb2RlYmxvY2ssIG9wdGlvbnMsIGdsb2JhbHMpICsgbmV4dENoYXI7XG4gIH0pO1xuXG4gIC8vIHN0cmlwIHNlbnRpbmVsXG4gIHRleHQgPSB0ZXh0LnJlcGxhY2UoL8KoMC8sICcnKTtcblxuICB0ZXh0ID0gZ2xvYmFscy5jb252ZXJ0ZXIuX2Rpc3BhdGNoKCdjb2RlQmxvY2tzLmFmdGVyJywgdGV4dCwgb3B0aW9ucywgZ2xvYmFscyk7XG4gIHJldHVybiB0ZXh0O1xufSk7XG5cclxuLyoqXG4gKlxuICogICAqICBCYWNrdGljayBxdW90ZXMgYXJlIHVzZWQgZm9yIDxjb2RlPjwvY29kZT4gc3BhbnMuXG4gKlxuICogICAqICBZb3UgY2FuIHVzZSBtdWx0aXBsZSBiYWNrdGlja3MgYXMgdGhlIGRlbGltaXRlcnMgaWYgeW91IHdhbnQgdG9cbiAqICAgICBpbmNsdWRlIGxpdGVyYWwgYmFja3RpY2tzIGluIHRoZSBjb2RlIHNwYW4uIFNvLCB0aGlzIGlucHV0OlxuICpcbiAqICAgICAgICAgSnVzdCB0eXBlIGBgZm9vIGBiYXJgIGJhemBgIGF0IHRoZSBwcm9tcHQuXG4gKlxuICogICAgICAgV2lsbCB0cmFuc2xhdGUgdG86XG4gKlxuICogICAgICAgICA8cD5KdXN0IHR5cGUgPGNvZGU+Zm9vIGBiYXJgIGJhejwvY29kZT4gYXQgdGhlIHByb21wdC48L3A+XG4gKlxuICogICAgVGhlcmUncyBubyBhcmJpdHJhcnkgbGltaXQgdG8gdGhlIG51bWJlciBvZiBiYWNrdGlja3MgeW91XG4gKiAgICBjYW4gdXNlIGFzIGRlbGltdGVycy4gSWYgeW91IG5lZWQgdGhyZWUgY29uc2VjdXRpdmUgYmFja3RpY2tzXG4gKiAgICBpbiB5b3VyIGNvZGUsIHVzZSBmb3VyIGZvciBkZWxpbWl0ZXJzLCBldGMuXG4gKlxuICogICogIFlvdSBjYW4gdXNlIHNwYWNlcyB0byBnZXQgbGl0ZXJhbCBiYWNrdGlja3MgYXQgdGhlIGVkZ2VzOlxuICpcbiAqICAgICAgICAgLi4uIHR5cGUgYGAgYGJhcmAgYGAgLi4uXG4gKlxuICogICAgICAgVHVybnMgdG86XG4gKlxuICogICAgICAgICAuLi4gdHlwZSA8Y29kZT5gYmFyYDwvY29kZT4gLi4uXG4gKi9cbnNob3dkb3duLnN1YlBhcnNlcignY29kZVNwYW5zJywgZnVuY3Rpb24gKHRleHQsIG9wdGlvbnMsIGdsb2JhbHMpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIHRleHQgPSBnbG9iYWxzLmNvbnZlcnRlci5fZGlzcGF0Y2goJ2NvZGVTcGFucy5iZWZvcmUnLCB0ZXh0LCBvcHRpb25zLCBnbG9iYWxzKTtcblxuICBpZiAodHlwZW9mKHRleHQpID09PSAndW5kZWZpbmVkJykge1xuICAgIHRleHQgPSAnJztcbiAgfVxuICB0ZXh0ID0gdGV4dC5yZXBsYWNlKC8oXnxbXlxcXFxdKShgKykoW15cXHJdKj9bXmBdKVxcMig/IWApL2dtLFxuICAgIGZ1bmN0aW9uICh3aG9sZU1hdGNoLCBtMSwgbTIsIG0zKSB7XG4gICAgICB2YXIgYyA9IG0zO1xuICAgICAgYyA9IGMucmVwbGFjZSgvXihbIFxcdF0qKS9nLCAnJyk7XHQvLyBsZWFkaW5nIHdoaXRlc3BhY2VcbiAgICAgIGMgPSBjLnJlcGxhY2UoL1sgXFx0XSokL2csICcnKTtcdC8vIHRyYWlsaW5nIHdoaXRlc3BhY2VcbiAgICAgIGMgPSBzaG93ZG93bi5zdWJQYXJzZXIoJ2VuY29kZUNvZGUnKShjLCBvcHRpb25zLCBnbG9iYWxzKTtcbiAgICAgIHJldHVybiBtMSArICc8Y29kZT4nICsgYyArICc8L2NvZGU+JztcbiAgICB9XG4gICk7XG5cbiAgdGV4dCA9IGdsb2JhbHMuY29udmVydGVyLl9kaXNwYXRjaCgnY29kZVNwYW5zLmFmdGVyJywgdGV4dCwgb3B0aW9ucywgZ2xvYmFscyk7XG4gIHJldHVybiB0ZXh0O1xufSk7XG5cclxuLyoqXG4gKiBDb252ZXJ0IGFsbCB0YWJzIHRvIHNwYWNlc1xuICovXG5zaG93ZG93bi5zdWJQYXJzZXIoJ2RldGFiJywgZnVuY3Rpb24gKHRleHQsIG9wdGlvbnMsIGdsb2JhbHMpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuICB0ZXh0ID0gZ2xvYmFscy5jb252ZXJ0ZXIuX2Rpc3BhdGNoKCdkZXRhYi5iZWZvcmUnLCB0ZXh0LCBvcHRpb25zLCBnbG9iYWxzKTtcblxuICAvLyBleHBhbmQgZmlyc3Qgbi0xIHRhYnNcbiAgdGV4dCA9IHRleHQucmVwbGFjZSgvXFx0KD89XFx0KS9nLCAnICAgICcpOyAvLyBnX3RhYl93aWR0aFxuXG4gIC8vIHJlcGxhY2UgdGhlIG50aCB3aXRoIHR3byBzZW50aW5lbHNcbiAgdGV4dCA9IHRleHQucmVwbGFjZSgvXFx0L2csICfCqEHCqEInKTtcblxuICAvLyB1c2UgdGhlIHNlbnRpbmVsIHRvIGFuY2hvciBvdXIgcmVnZXggc28gaXQgZG9lc24ndCBleHBsb2RlXG4gIHRleHQgPSB0ZXh0LnJlcGxhY2UoL8KoQiguKz8pwqhBL2csIGZ1bmN0aW9uICh3aG9sZU1hdGNoLCBtMSkge1xuICAgIHZhciBsZWFkaW5nVGV4dCA9IG0xLFxuICAgICAgICBudW1TcGFjZXMgPSA0IC0gbGVhZGluZ1RleHQubGVuZ3RoICUgNDsgIC8vIGdfdGFiX3dpZHRoXG5cbiAgICAvLyB0aGVyZSAqbXVzdCogYmUgYSBiZXR0ZXIgd2F5IHRvIGRvIHRoaXM6XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBudW1TcGFjZXM7IGkrKykge1xuICAgICAgbGVhZGluZ1RleHQgKz0gJyAnO1xuICAgIH1cblxuICAgIHJldHVybiBsZWFkaW5nVGV4dDtcbiAgfSk7XG5cbiAgLy8gY2xlYW4gdXAgc2VudGluZWxzXG4gIHRleHQgPSB0ZXh0LnJlcGxhY2UoL8KoQS9nLCAnICAgICcpOyAgLy8gZ190YWJfd2lkdGhcbiAgdGV4dCA9IHRleHQucmVwbGFjZSgvwqhCL2csICcnKTtcblxuICB0ZXh0ID0gZ2xvYmFscy5jb252ZXJ0ZXIuX2Rpc3BhdGNoKCdkZXRhYi5hZnRlcicsIHRleHQsIG9wdGlvbnMsIGdsb2JhbHMpO1xuICByZXR1cm4gdGV4dDtcbn0pO1xuXHJcbi8qKlxuICogU21hcnQgcHJvY2Vzc2luZyBmb3IgYW1wZXJzYW5kcyBhbmQgYW5nbGUgYnJhY2tldHMgdGhhdCBuZWVkIHRvIGJlIGVuY29kZWQuXG4gKi9cbnNob3dkb3duLnN1YlBhcnNlcignZW5jb2RlQW1wc0FuZEFuZ2xlcycsIGZ1bmN0aW9uICh0ZXh0LCBvcHRpb25zLCBnbG9iYWxzKSB7XG4gICd1c2Ugc3RyaWN0JztcbiAgdGV4dCA9IGdsb2JhbHMuY29udmVydGVyLl9kaXNwYXRjaCgnZW5jb2RlQW1wc0FuZEFuZ2xlcy5iZWZvcmUnLCB0ZXh0LCBvcHRpb25zLCBnbG9iYWxzKTtcblxuICAvLyBBbXBlcnNhbmQtZW5jb2RpbmcgYmFzZWQgZW50aXJlbHkgb24gTmF0IElyb25zJ3MgQW1wdXRhdG9yIE1UIHBsdWdpbjpcbiAgLy8gaHR0cDovL2J1bXBwby5uZXQvcHJvamVjdHMvYW1wdXRhdG9yL1xuICB0ZXh0ID0gdGV4dC5yZXBsYWNlKC8mKD8hIz9beFhdPyg/OlswLTlhLWZBLUZdK3xcXHcrKTspL2csICcmYW1wOycpO1xuXG4gIC8vIEVuY29kZSBuYWtlZCA8J3NcbiAgdGV4dCA9IHRleHQucmVwbGFjZSgvPCg/IVthLXpcXC8/JCFdKS9naSwgJyZsdDsnKTtcblxuICAvLyBFbmNvZGUgPFxuICB0ZXh0ID0gdGV4dC5yZXBsYWNlKC88L2csICcmbHQ7Jyk7XG5cbiAgLy8gRW5jb2RlID5cbiAgdGV4dCA9IHRleHQucmVwbGFjZSgvPi9nLCAnJmd0OycpO1xuXG4gIHRleHQgPSBnbG9iYWxzLmNvbnZlcnRlci5fZGlzcGF0Y2goJ2VuY29kZUFtcHNBbmRBbmdsZXMuYWZ0ZXInLCB0ZXh0LCBvcHRpb25zLCBnbG9iYWxzKTtcbiAgcmV0dXJuIHRleHQ7XG59KTtcblxyXG4vKipcbiAqIFJldHVybnMgdGhlIHN0cmluZywgd2l0aCBhZnRlciBwcm9jZXNzaW5nIHRoZSBmb2xsb3dpbmcgYmFja3NsYXNoIGVzY2FwZSBzZXF1ZW5jZXMuXG4gKlxuICogYXR0YWNrbGFiOiBUaGUgcG9saXRlIHdheSB0byBkbyB0aGlzIGlzIHdpdGggdGhlIG5ldyBlc2NhcGVDaGFyYWN0ZXJzKCkgZnVuY3Rpb246XG4gKlxuICogICAgdGV4dCA9IGVzY2FwZUNoYXJhY3RlcnModGV4dCxcIlxcXFxcIix0cnVlKTtcbiAqICAgIHRleHQgPSBlc2NhcGVDaGFyYWN0ZXJzKHRleHQsXCJgKl97fVtdKCk+IystLiFcIix0cnVlKTtcbiAqXG4gKiAuLi5idXQgd2UncmUgc2lkZXN0ZXBwaW5nIGl0cyB1c2Ugb2YgdGhlIChzbG93KSBSZWdFeHAgY29uc3RydWN0b3JcbiAqIGFzIGFuIG9wdGltaXphdGlvbiBmb3IgRmlyZWZveC4gIFRoaXMgZnVuY3Rpb24gZ2V0cyBjYWxsZWQgYSBMT1QuXG4gKi9cbnNob3dkb3duLnN1YlBhcnNlcignZW5jb2RlQmFja3NsYXNoRXNjYXBlcycsIGZ1bmN0aW9uICh0ZXh0LCBvcHRpb25zLCBnbG9iYWxzKSB7XG4gICd1c2Ugc3RyaWN0JztcbiAgdGV4dCA9IGdsb2JhbHMuY29udmVydGVyLl9kaXNwYXRjaCgnZW5jb2RlQmFja3NsYXNoRXNjYXBlcy5iZWZvcmUnLCB0ZXh0LCBvcHRpb25zLCBnbG9iYWxzKTtcblxuICB0ZXh0ID0gdGV4dC5yZXBsYWNlKC9cXFxcKFxcXFwpL2csIHNob3dkb3duLmhlbHBlci5lc2NhcGVDaGFyYWN0ZXJzQ2FsbGJhY2spO1xuICB0ZXh0ID0gdGV4dC5yZXBsYWNlKC9cXFxcKFtgKl97fVxcW1xcXSgpPiMrLiF+PS1dKS9nLCBzaG93ZG93bi5oZWxwZXIuZXNjYXBlQ2hhcmFjdGVyc0NhbGxiYWNrKTtcblxuICB0ZXh0ID0gZ2xvYmFscy5jb252ZXJ0ZXIuX2Rpc3BhdGNoKCdlbmNvZGVCYWNrc2xhc2hFc2NhcGVzLmFmdGVyJywgdGV4dCwgb3B0aW9ucywgZ2xvYmFscyk7XG4gIHJldHVybiB0ZXh0O1xufSk7XG5cclxuLyoqXG4gKiBFbmNvZGUvZXNjYXBlIGNlcnRhaW4gY2hhcmFjdGVycyBpbnNpZGUgTWFya2Rvd24gY29kZSBydW5zLlxuICogVGhlIHBvaW50IGlzIHRoYXQgaW4gY29kZSwgdGhlc2UgY2hhcmFjdGVycyBhcmUgbGl0ZXJhbHMsXG4gKiBhbmQgbG9zZSB0aGVpciBzcGVjaWFsIE1hcmtkb3duIG1lYW5pbmdzLlxuICovXG5zaG93ZG93bi5zdWJQYXJzZXIoJ2VuY29kZUNvZGUnLCBmdW5jdGlvbiAodGV4dCwgb3B0aW9ucywgZ2xvYmFscykge1xuICAndXNlIHN0cmljdCc7XG5cbiAgdGV4dCA9IGdsb2JhbHMuY29udmVydGVyLl9kaXNwYXRjaCgnZW5jb2RlQ29kZS5iZWZvcmUnLCB0ZXh0LCBvcHRpb25zLCBnbG9iYWxzKTtcblxuICAvLyBFbmNvZGUgYWxsIGFtcGVyc2FuZHM7IEhUTUwgZW50aXRpZXMgYXJlIG5vdFxuICAvLyBlbnRpdGllcyB3aXRoaW4gYSBNYXJrZG93biBjb2RlIHNwYW4uXG4gIHRleHQgPSB0ZXh0XG4gICAgLnJlcGxhY2UoLyYvZywgJyZhbXA7JylcbiAgLy8gRG8gdGhlIGFuZ2xlIGJyYWNrZXQgc29uZyBhbmQgZGFuY2U6XG4gICAgLnJlcGxhY2UoLzwvZywgJyZsdDsnKVxuICAgIC5yZXBsYWNlKC8+L2csICcmZ3Q7JylcbiAgLy8gTm93LCBlc2NhcGUgY2hhcmFjdGVycyB0aGF0IGFyZSBtYWdpYyBpbiBNYXJrZG93bjpcbiAgICAucmVwbGFjZSgvKFsqX3t9XFxbXFxdXFxcXD1+LV0pL2csIHNob3dkb3duLmhlbHBlci5lc2NhcGVDaGFyYWN0ZXJzQ2FsbGJhY2spO1xuXG4gIHRleHQgPSBnbG9iYWxzLmNvbnZlcnRlci5fZGlzcGF0Y2goJ2VuY29kZUNvZGUuYWZ0ZXInLCB0ZXh0LCBvcHRpb25zLCBnbG9iYWxzKTtcbiAgcmV0dXJuIHRleHQ7XG59KTtcblxyXG4vKipcbiAqIFdpdGhpbiB0YWdzIC0tIG1lYW5pbmcgYmV0d2VlbiA8IGFuZCA+IC0tIGVuY29kZSBbXFwgYCAqIF8gfiA9XSBzbyB0aGV5XG4gKiBkb24ndCBjb25mbGljdCB3aXRoIHRoZWlyIHVzZSBpbiBNYXJrZG93biBmb3IgY29kZSwgaXRhbGljcyBhbmQgc3Ryb25nLlxuICovXG5zaG93ZG93bi5zdWJQYXJzZXIoJ2VzY2FwZVNwZWNpYWxDaGFyc1dpdGhpblRhZ0F0dHJpYnV0ZXMnLCBmdW5jdGlvbiAodGV4dCwgb3B0aW9ucywgZ2xvYmFscykge1xuICAndXNlIHN0cmljdCc7XG4gIHRleHQgPSBnbG9iYWxzLmNvbnZlcnRlci5fZGlzcGF0Y2goJ2VzY2FwZVNwZWNpYWxDaGFyc1dpdGhpblRhZ0F0dHJpYnV0ZXMuYmVmb3JlJywgdGV4dCwgb3B0aW9ucywgZ2xvYmFscyk7XG5cbiAgLy8gQnVpbGQgYSByZWdleCB0byBmaW5kIEhUTUwgdGFncyBhbmQgY29tbWVudHMuICBTZWUgRnJpZWRsJ3NcbiAgLy8gXCJNYXN0ZXJpbmcgUmVndWxhciBFeHByZXNzaW9uc1wiLCAybmQgRWQuLCBwcC4gMjAwLTIwMS5cbiAgdmFyIHJlZ2V4ID0gLyg8W2EtelxcLyEkXShcIlteXCJdKlwifCdbXiddKid8W14nXCI+XSkqPnw8ISgtLS4qPy0tXFxzKikrPikvZ2k7XG5cbiAgdGV4dCA9IHRleHQucmVwbGFjZShyZWdleCwgZnVuY3Rpb24gKHdob2xlTWF0Y2gpIHtcbiAgICByZXR1cm4gd2hvbGVNYXRjaFxuICAgICAgLnJlcGxhY2UoLyguKTxcXC8/Y29kZT4oPz0uKS9nLCAnJDFgJylcbiAgICAgIC5yZXBsYWNlKC8oW1xcXFxgKl9+PV0pL2csIHNob3dkb3duLmhlbHBlci5lc2NhcGVDaGFyYWN0ZXJzQ2FsbGJhY2spO1xuICB9KTtcblxuICB0ZXh0ID0gZ2xvYmFscy5jb252ZXJ0ZXIuX2Rpc3BhdGNoKCdlc2NhcGVTcGVjaWFsQ2hhcnNXaXRoaW5UYWdBdHRyaWJ1dGVzLmFmdGVyJywgdGV4dCwgb3B0aW9ucywgZ2xvYmFscyk7XG4gIHJldHVybiB0ZXh0O1xufSk7XG5cclxuLyoqXG4gKiBIYW5kbGUgZ2l0aHViIGNvZGVibG9ja3MgcHJpb3IgdG8gcnVubmluZyBIYXNoSFRNTCBzbyB0aGF0XG4gKiBIVE1MIGNvbnRhaW5lZCB3aXRoaW4gdGhlIGNvZGVibG9jayBnZXRzIGVzY2FwZWQgcHJvcGVybHlcbiAqIEV4YW1wbGU6XG4gKiBgYGBydWJ5XG4gKiAgICAgZGVmIGhlbGxvX3dvcmxkKHgpXG4gKiAgICAgICBwdXRzIFwiSGVsbG8sICN7eH1cIlxuICogICAgIGVuZFxuICogYGBgXG4gKi9cbnNob3dkb3duLnN1YlBhcnNlcignZ2l0aHViQ29kZUJsb2NrcycsIGZ1bmN0aW9uICh0ZXh0LCBvcHRpb25zLCBnbG9iYWxzKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICAvLyBlYXJseSBleGl0IGlmIG9wdGlvbiBpcyBub3QgZW5hYmxlZFxuICBpZiAoIW9wdGlvbnMuZ2hDb2RlQmxvY2tzKSB7XG4gICAgcmV0dXJuIHRleHQ7XG4gIH1cblxuICB0ZXh0ID0gZ2xvYmFscy5jb252ZXJ0ZXIuX2Rpc3BhdGNoKCdnaXRodWJDb2RlQmxvY2tzLmJlZm9yZScsIHRleHQsIG9wdGlvbnMsIGdsb2JhbHMpO1xuXG4gIHRleHQgKz0gJ8KoMCc7XG5cbiAgdGV4dCA9IHRleHQucmVwbGFjZSgvKD86XnxcXG4pYGBgKC4qKVxcbihbXFxzXFxTXSo/KVxcbmBgYC9nLCBmdW5jdGlvbiAod2hvbGVNYXRjaCwgbGFuZ3VhZ2UsIGNvZGVibG9jaykge1xuICAgIHZhciBlbmQgPSAob3B0aW9ucy5vbWl0RXh0cmFXTEluQ29kZUJsb2NrcykgPyAnJyA6ICdcXG4nO1xuXG4gICAgLy8gRmlyc3QgcGFyc2UgdGhlIGdpdGh1YiBjb2RlIGJsb2NrXG4gICAgY29kZWJsb2NrID0gc2hvd2Rvd24uc3ViUGFyc2VyKCdlbmNvZGVDb2RlJykoY29kZWJsb2NrLCBvcHRpb25zLCBnbG9iYWxzKTtcbiAgICBjb2RlYmxvY2sgPSBzaG93ZG93bi5zdWJQYXJzZXIoJ2RldGFiJykoY29kZWJsb2NrLCBvcHRpb25zLCBnbG9iYWxzKTtcbiAgICBjb2RlYmxvY2sgPSBjb2RlYmxvY2sucmVwbGFjZSgvXlxcbisvZywgJycpOyAvLyB0cmltIGxlYWRpbmcgbmV3bGluZXNcbiAgICBjb2RlYmxvY2sgPSBjb2RlYmxvY2sucmVwbGFjZSgvXFxuKyQvZywgJycpOyAvLyB0cmltIHRyYWlsaW5nIHdoaXRlc3BhY2VcblxuICAgIGNvZGVibG9jayA9ICc8cHJlPjxjb2RlJyArIChsYW5ndWFnZSA/ICcgY2xhc3M9XCInICsgbGFuZ3VhZ2UgKyAnIGxhbmd1YWdlLScgKyBsYW5ndWFnZSArICdcIicgOiAnJykgKyAnPicgKyBjb2RlYmxvY2sgKyBlbmQgKyAnPC9jb2RlPjwvcHJlPic7XG5cbiAgICBjb2RlYmxvY2sgPSBzaG93ZG93bi5zdWJQYXJzZXIoJ2hhc2hCbG9jaycpKGNvZGVibG9jaywgb3B0aW9ucywgZ2xvYmFscyk7XG5cbiAgICAvLyBTaW5jZSBHSENvZGVibG9ja3MgY2FuIGJlIGZhbHNlIHBvc2l0aXZlcywgd2UgbmVlZCB0b1xuICAgIC8vIHN0b3JlIHRoZSBwcmltaXRpdmUgdGV4dCBhbmQgdGhlIHBhcnNlZCB0ZXh0IGluIGEgZ2xvYmFsIHZhcixcbiAgICAvLyBhbmQgdGhlbiByZXR1cm4gYSB0b2tlblxuICAgIHJldHVybiAnXFxuXFxuwqhHJyArIChnbG9iYWxzLmdoQ29kZUJsb2Nrcy5wdXNoKHt0ZXh0OiB3aG9sZU1hdGNoLCBjb2RlYmxvY2s6IGNvZGVibG9ja30pIC0gMSkgKyAnR1xcblxcbic7XG4gIH0pO1xuXG4gIC8vIGF0dGFja2xhYjogc3RyaXAgc2VudGluZWxcbiAgdGV4dCA9IHRleHQucmVwbGFjZSgvwqgwLywgJycpO1xuXG4gIHJldHVybiBnbG9iYWxzLmNvbnZlcnRlci5fZGlzcGF0Y2goJ2dpdGh1YkNvZGVCbG9ja3MuYWZ0ZXInLCB0ZXh0LCBvcHRpb25zLCBnbG9iYWxzKTtcbn0pO1xuXHJcbnNob3dkb3duLnN1YlBhcnNlcignaGFzaEJsb2NrJywgZnVuY3Rpb24gKHRleHQsIG9wdGlvbnMsIGdsb2JhbHMpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuICB0ZXh0ID0gZ2xvYmFscy5jb252ZXJ0ZXIuX2Rpc3BhdGNoKCdoYXNoQmxvY2suYmVmb3JlJywgdGV4dCwgb3B0aW9ucywgZ2xvYmFscyk7XG4gIHRleHQgPSB0ZXh0LnJlcGxhY2UoLyheXFxuK3xcXG4rJCkvZywgJycpO1xuICB0ZXh0ID0gJ1xcblxcbsKoSycgKyAoZ2xvYmFscy5nSHRtbEJsb2Nrcy5wdXNoKHRleHQpIC0gMSkgKyAnS1xcblxcbic7XG4gIHRleHQgPSBnbG9iYWxzLmNvbnZlcnRlci5fZGlzcGF0Y2goJ2hhc2hCbG9jay5hZnRlcicsIHRleHQsIG9wdGlvbnMsIGdsb2JhbHMpO1xuICByZXR1cm4gdGV4dDtcbn0pO1xuXHJcbi8qKlxuICogSGFzaCBhbmQgZXNjYXBlIDxjb2RlPiBlbGVtZW50cyB0aGF0IHNob3VsZCBub3QgYmUgcGFyc2VkIGFzIG1hcmtkb3duXG4gKi9cbnNob3dkb3duLnN1YlBhcnNlcignaGFzaENvZGVUYWdzJywgZnVuY3Rpb24gKHRleHQsIG9wdGlvbnMsIGdsb2JhbHMpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuICB0ZXh0ID0gZ2xvYmFscy5jb252ZXJ0ZXIuX2Rpc3BhdGNoKCdoYXNoQ29kZVRhZ3MuYmVmb3JlJywgdGV4dCwgb3B0aW9ucywgZ2xvYmFscyk7XG5cbiAgdmFyIHJlcEZ1bmMgPSBmdW5jdGlvbiAod2hvbGVNYXRjaCwgbWF0Y2gsIGxlZnQsIHJpZ2h0KSB7XG4gICAgdmFyIGNvZGVibG9jayA9IGxlZnQgKyBzaG93ZG93bi5zdWJQYXJzZXIoJ2VuY29kZUNvZGUnKShtYXRjaCwgb3B0aW9ucywgZ2xvYmFscykgKyByaWdodDtcbiAgICByZXR1cm4gJ8KoQycgKyAoZ2xvYmFscy5nSHRtbFNwYW5zLnB1c2goY29kZWJsb2NrKSAtIDEpICsgJ0MnO1xuICB9O1xuXG4gIC8vIEhhc2ggbmFrZWQgPGNvZGU+XG4gIHRleHQgPSBzaG93ZG93bi5oZWxwZXIucmVwbGFjZVJlY3Vyc2l2ZVJlZ0V4cCh0ZXh0LCByZXBGdW5jLCAnPGNvZGVcXFxcYltePl0qPicsICc8L2NvZGU+JywgJ2dpbScpO1xuXG4gIHRleHQgPSBnbG9iYWxzLmNvbnZlcnRlci5fZGlzcGF0Y2goJ2hhc2hDb2RlVGFncy5hZnRlcicsIHRleHQsIG9wdGlvbnMsIGdsb2JhbHMpO1xuICByZXR1cm4gdGV4dDtcbn0pO1xuXHJcbnNob3dkb3duLnN1YlBhcnNlcignaGFzaEVsZW1lbnQnLCBmdW5jdGlvbiAodGV4dCwgb3B0aW9ucywgZ2xvYmFscykge1xuICAndXNlIHN0cmljdCc7XG5cbiAgcmV0dXJuIGZ1bmN0aW9uICh3aG9sZU1hdGNoLCBtMSkge1xuICAgIHZhciBibG9ja1RleHQgPSBtMTtcblxuICAgIC8vIFVuZG8gZG91YmxlIGxpbmVzXG4gICAgYmxvY2tUZXh0ID0gYmxvY2tUZXh0LnJlcGxhY2UoL1xcblxcbi9nLCAnXFxuJyk7XG4gICAgYmxvY2tUZXh0ID0gYmxvY2tUZXh0LnJlcGxhY2UoL15cXG4vLCAnJyk7XG5cbiAgICAvLyBzdHJpcCB0cmFpbGluZyBibGFuayBsaW5lc1xuICAgIGJsb2NrVGV4dCA9IGJsb2NrVGV4dC5yZXBsYWNlKC9cXG4rJC9nLCAnJyk7XG5cbiAgICAvLyBSZXBsYWNlIHRoZSBlbGVtZW50IHRleHQgd2l0aCBhIG1hcmtlciAoXCLCqEt4S1wiIHdoZXJlIHggaXMgaXRzIGtleSlcbiAgICBibG9ja1RleHQgPSAnXFxuXFxuwqhLJyArIChnbG9iYWxzLmdIdG1sQmxvY2tzLnB1c2goYmxvY2tUZXh0KSAtIDEpICsgJ0tcXG5cXG4nO1xuXG4gICAgcmV0dXJuIGJsb2NrVGV4dDtcbiAgfTtcbn0pO1xuXHJcbnNob3dkb3duLnN1YlBhcnNlcignaGFzaEhUTUxCbG9ja3MnLCBmdW5jdGlvbiAodGV4dCwgb3B0aW9ucywgZ2xvYmFscykge1xuICAndXNlIHN0cmljdCc7XG4gIHRleHQgPSBnbG9iYWxzLmNvbnZlcnRlci5fZGlzcGF0Y2goJ2hhc2hIVE1MQmxvY2tzLmJlZm9yZScsIHRleHQsIG9wdGlvbnMsIGdsb2JhbHMpO1xuXG4gIHZhciBibG9ja1RhZ3MgPSBbXG4gICAgICAgICdwcmUnLFxuICAgICAgICAnZGl2JyxcbiAgICAgICAgJ2gxJyxcbiAgICAgICAgJ2gyJyxcbiAgICAgICAgJ2gzJyxcbiAgICAgICAgJ2g0JyxcbiAgICAgICAgJ2g1JyxcbiAgICAgICAgJ2g2JyxcbiAgICAgICAgJ2Jsb2NrcXVvdGUnLFxuICAgICAgICAndGFibGUnLFxuICAgICAgICAnZGwnLFxuICAgICAgICAnb2wnLFxuICAgICAgICAndWwnLFxuICAgICAgICAnc2NyaXB0JyxcbiAgICAgICAgJ25vc2NyaXB0JyxcbiAgICAgICAgJ2Zvcm0nLFxuICAgICAgICAnZmllbGRzZXQnLFxuICAgICAgICAnaWZyYW1lJyxcbiAgICAgICAgJ21hdGgnLFxuICAgICAgICAnc3R5bGUnLFxuICAgICAgICAnc2VjdGlvbicsXG4gICAgICAgICdoZWFkZXInLFxuICAgICAgICAnZm9vdGVyJyxcbiAgICAgICAgJ25hdicsXG4gICAgICAgICdhcnRpY2xlJyxcbiAgICAgICAgJ2FzaWRlJyxcbiAgICAgICAgJ2FkZHJlc3MnLFxuICAgICAgICAnYXVkaW8nLFxuICAgICAgICAnY2FudmFzJyxcbiAgICAgICAgJ2ZpZ3VyZScsXG4gICAgICAgICdoZ3JvdXAnLFxuICAgICAgICAnb3V0cHV0JyxcbiAgICAgICAgJ3ZpZGVvJyxcbiAgICAgICAgJ3AnXG4gICAgICBdLFxuICAgICAgcmVwRnVuYyA9IGZ1bmN0aW9uICh3aG9sZU1hdGNoLCBtYXRjaCwgbGVmdCwgcmlnaHQpIHtcbiAgICAgICAgdmFyIHR4dCA9IHdob2xlTWF0Y2g7XG4gICAgICAgIC8vIGNoZWNrIGlmIHRoaXMgaHRtbCBlbGVtZW50IGlzIG1hcmtlZCBhcyBtYXJrZG93blxuICAgICAgICAvLyBpZiBzbywgaXQncyBjb250ZW50cyBzaG91bGQgYmUgcGFyc2VkIGFzIG1hcmtkb3duXG4gICAgICAgIGlmIChsZWZ0LnNlYXJjaCgvXFxibWFya2Rvd25cXGIvKSAhPT0gLTEpIHtcbiAgICAgICAgICB0eHQgPSBsZWZ0ICsgZ2xvYmFscy5jb252ZXJ0ZXIubWFrZUh0bWwobWF0Y2gpICsgcmlnaHQ7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICdcXG5cXG7CqEsnICsgKGdsb2JhbHMuZ0h0bWxCbG9ja3MucHVzaCh0eHQpIC0gMSkgKyAnS1xcblxcbic7XG4gICAgICB9O1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYmxvY2tUYWdzLmxlbmd0aDsgKytpKSB7XG4gICAgdGV4dCA9IHNob3dkb3duLmhlbHBlci5yZXBsYWNlUmVjdXJzaXZlUmVnRXhwKHRleHQsIHJlcEZ1bmMsICdeIHswLDN9PCcgKyBibG9ja1RhZ3NbaV0gKyAnXFxcXGJbXj5dKj4nLCAnPC8nICsgYmxvY2tUYWdzW2ldICsgJz4nLCAnZ2ltJyk7XG4gIH1cblxuICAvLyBIUiBTUEVDSUFMIENBU0VcbiAgdGV4dCA9IHRleHQucmVwbGFjZSgvKFxcbiB7MCwzfSg8KGhyKVxcYihbXjw+XSkqP1xcLz8+KVsgXFx0XSooPz1cXG57Mix9KSkvZyxcbiAgICBzaG93ZG93bi5zdWJQYXJzZXIoJ2hhc2hFbGVtZW50JykodGV4dCwgb3B0aW9ucywgZ2xvYmFscykpO1xuXG4gIC8vIFNwZWNpYWwgY2FzZSBmb3Igc3RhbmRhbG9uZSBIVE1MIGNvbW1lbnRzXG4gIHRleHQgPSBzaG93ZG93bi5oZWxwZXIucmVwbGFjZVJlY3Vyc2l2ZVJlZ0V4cCh0ZXh0LCBmdW5jdGlvbiAodHh0KSB7XG4gICAgcmV0dXJuICdcXG5cXG7CqEsnICsgKGdsb2JhbHMuZ0h0bWxCbG9ja3MucHVzaCh0eHQpIC0gMSkgKyAnS1xcblxcbic7XG4gIH0sICdeIHswLDN9PCEtLScsICctLT4nLCAnZ20nKTtcblxuICAvLyBQSFAgYW5kIEFTUC1zdHlsZSBwcm9jZXNzb3IgaW5zdHJ1Y3Rpb25zICg8Py4uLj8+IGFuZCA8JS4uLiU+KVxuICB0ZXh0ID0gdGV4dC5yZXBsYWNlKC8oPzpcXG5cXG4pKCB7MCwzfSg/OjwoWz8lXSlbXlxccl0qP1xcMj4pWyBcXHRdKig/PVxcbnsyLH0pKS9nLFxuICAgIHNob3dkb3duLnN1YlBhcnNlcignaGFzaEVsZW1lbnQnKSh0ZXh0LCBvcHRpb25zLCBnbG9iYWxzKSk7XG5cbiAgdGV4dCA9IGdsb2JhbHMuY29udmVydGVyLl9kaXNwYXRjaCgnaGFzaEhUTUxCbG9ja3MuYWZ0ZXInLCB0ZXh0LCBvcHRpb25zLCBnbG9iYWxzKTtcbiAgcmV0dXJuIHRleHQ7XG59KTtcblxyXG4vKipcbiAqIEhhc2ggc3BhbiBlbGVtZW50cyB0aGF0IHNob3VsZCBub3QgYmUgcGFyc2VkIGFzIG1hcmtkb3duXG4gKi9cbnNob3dkb3duLnN1YlBhcnNlcignaGFzaEhUTUxTcGFucycsIGZ1bmN0aW9uICh0ZXh0LCBvcHRpb25zLCBnbG9iYWxzKSB7XG4gICd1c2Ugc3RyaWN0JztcbiAgdGV4dCA9IGdsb2JhbHMuY29udmVydGVyLl9kaXNwYXRjaCgnaGFzaEhUTUxTcGFucy5iZWZvcmUnLCB0ZXh0LCBvcHRpb25zLCBnbG9iYWxzKTtcblxuICBmdW5jdGlvbiBoYXNoSFRNTFNwYW4gKGh0bWwpIHtcbiAgICByZXR1cm4gJ8KoQycgKyAoZ2xvYmFscy5nSHRtbFNwYW5zLnB1c2goaHRtbCkgLSAxKSArICdDJztcbiAgfVxuXG4gIC8vIEhhc2ggU2VsZiBDbG9zaW5nIHRhZ3NcbiAgdGV4dCA9IHRleHQucmVwbGFjZSgvPFtePl0rP1xcLz4vZ2ksIGZ1bmN0aW9uICh3bSkge1xuICAgIHJldHVybiBoYXNoSFRNTFNwYW4od20pO1xuICB9KTtcblxuICAvLyBIYXNoIHRhZ3Mgd2l0aG91dCBwcm9wZXJ0aWVzXG4gIHRleHQgPSB0ZXh0LnJlcGxhY2UoLzwoW14+XSs/KT5bXFxzXFxTXSo/PFxcL1xcMT4vZywgZnVuY3Rpb24gKHdtKSB7XG4gICAgcmV0dXJuIGhhc2hIVE1MU3Bhbih3bSk7XG4gIH0pO1xuXG4gIC8vIEhhc2ggdGFncyB3aXRoIHByb3BlcnRpZXNcbiAgdGV4dCA9IHRleHQucmVwbGFjZSgvPChbXj5dKz8pXFxzW14+XSs/PltcXHNcXFNdKj88XFwvXFwxPi9nLCBmdW5jdGlvbiAod20pIHtcbiAgICByZXR1cm4gaGFzaEhUTUxTcGFuKHdtKTtcbiAgfSk7XG5cbiAgLy8gSGFzaCBzZWxmIGNsb3NpbmcgdGFncyB3aXRob3V0IC8+XG4gIHRleHQgPSB0ZXh0LnJlcGxhY2UoLzxbXj5dKz8+L2dpLCBmdW5jdGlvbiAod20pIHtcbiAgICByZXR1cm4gaGFzaEhUTUxTcGFuKHdtKTtcbiAgfSk7XG5cbiAgLypzaG93ZG93bi5oZWxwZXIubWF0Y2hSZWN1cnNpdmVSZWdFeHAodGV4dCwgJzxjb2RlXFxcXGJbXj5dKj4nLCAnPC9jb2RlPicsICdnaScpOyovXG5cbiAgdGV4dCA9IGdsb2JhbHMuY29udmVydGVyLl9kaXNwYXRjaCgnaGFzaEhUTUxTcGFucy5hZnRlcicsIHRleHQsIG9wdGlvbnMsIGdsb2JhbHMpO1xuICByZXR1cm4gdGV4dDtcbn0pO1xuXG4vKipcbiAqIFVuaGFzaCBIVE1MIHNwYW5zXG4gKi9cbnNob3dkb3duLnN1YlBhcnNlcigndW5oYXNoSFRNTFNwYW5zJywgZnVuY3Rpb24gKHRleHQsIG9wdGlvbnMsIGdsb2JhbHMpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuICB0ZXh0ID0gZ2xvYmFscy5jb252ZXJ0ZXIuX2Rpc3BhdGNoKCd1bmhhc2hIVE1MU3BhbnMuYmVmb3JlJywgdGV4dCwgb3B0aW9ucywgZ2xvYmFscyk7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBnbG9iYWxzLmdIdG1sU3BhbnMubGVuZ3RoOyArK2kpIHtcbiAgICB2YXIgcmVwVGV4dCA9IGdsb2JhbHMuZ0h0bWxTcGFuc1tpXSxcbiAgICAgICAgLy8gbGltaXRlciB0byBwcmV2ZW50IGluZmluaXRlIGxvb3AgKGFzc3VtZSAxMCBhcyBsaW1pdCBmb3IgcmVjdXJzZSlcbiAgICAgICAgbGltaXQgPSAwO1xuXG4gICAgd2hpbGUgKC/CqEMoXFxkKylDLy50ZXN0KHJlcFRleHQpKSB7XG4gICAgICB2YXIgbnVtID0gUmVnRXhwLiQxO1xuICAgICAgcmVwVGV4dCA9IHJlcFRleHQucmVwbGFjZSgnwqhDJyArIG51bSArICdDJywgZ2xvYmFscy5nSHRtbFNwYW5zW251bV0pO1xuICAgICAgaWYgKGxpbWl0ID09PSAxMCkge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICAgICsrbGltaXQ7XG4gICAgfVxuICAgIHRleHQgPSB0ZXh0LnJlcGxhY2UoJ8KoQycgKyBpICsgJ0MnLCByZXBUZXh0KTtcbiAgfVxuXG4gIHRleHQgPSBnbG9iYWxzLmNvbnZlcnRlci5fZGlzcGF0Y2goJ3VuaGFzaEhUTUxTcGFucy5hZnRlcicsIHRleHQsIG9wdGlvbnMsIGdsb2JhbHMpO1xuICByZXR1cm4gdGV4dDtcbn0pO1xuXHJcbi8qKlxuICogSGFzaCBhbmQgZXNjYXBlIDxwcmU+PGNvZGU+IGVsZW1lbnRzIHRoYXQgc2hvdWxkIG5vdCBiZSBwYXJzZWQgYXMgbWFya2Rvd25cbiAqL1xuc2hvd2Rvd24uc3ViUGFyc2VyKCdoYXNoUHJlQ29kZVRhZ3MnLCBmdW5jdGlvbiAodGV4dCwgb3B0aW9ucywgZ2xvYmFscykge1xuICAndXNlIHN0cmljdCc7XG4gIHRleHQgPSBnbG9iYWxzLmNvbnZlcnRlci5fZGlzcGF0Y2goJ2hhc2hQcmVDb2RlVGFncy5iZWZvcmUnLCB0ZXh0LCBvcHRpb25zLCBnbG9iYWxzKTtcblxuICB2YXIgcmVwRnVuYyA9IGZ1bmN0aW9uICh3aG9sZU1hdGNoLCBtYXRjaCwgbGVmdCwgcmlnaHQpIHtcbiAgICAvLyBlbmNvZGUgaHRtbCBlbnRpdGllc1xuICAgIHZhciBjb2RlYmxvY2sgPSBsZWZ0ICsgc2hvd2Rvd24uc3ViUGFyc2VyKCdlbmNvZGVDb2RlJykobWF0Y2gsIG9wdGlvbnMsIGdsb2JhbHMpICsgcmlnaHQ7XG4gICAgcmV0dXJuICdcXG5cXG7CqEcnICsgKGdsb2JhbHMuZ2hDb2RlQmxvY2tzLnB1c2goe3RleHQ6IHdob2xlTWF0Y2gsIGNvZGVibG9jazogY29kZWJsb2NrfSkgLSAxKSArICdHXFxuXFxuJztcbiAgfTtcblxuICAvLyBIYXNoIDxwcmU+PGNvZGU+XG4gIHRleHQgPSBzaG93ZG93bi5oZWxwZXIucmVwbGFjZVJlY3Vyc2l2ZVJlZ0V4cCh0ZXh0LCByZXBGdW5jLCAnXiB7MCwzfTxwcmVcXFxcYltePl0qPlxcXFxzKjxjb2RlXFxcXGJbXj5dKj4nLCAnXiB7MCwzfTwvY29kZT5cXFxccyo8L3ByZT4nLCAnZ2ltJyk7XG5cbiAgdGV4dCA9IGdsb2JhbHMuY29udmVydGVyLl9kaXNwYXRjaCgnaGFzaFByZUNvZGVUYWdzLmFmdGVyJywgdGV4dCwgb3B0aW9ucywgZ2xvYmFscyk7XG4gIHJldHVybiB0ZXh0O1xufSk7XG5cclxuc2hvd2Rvd24uc3ViUGFyc2VyKCdoZWFkZXJzJywgZnVuY3Rpb24gKHRleHQsIG9wdGlvbnMsIGdsb2JhbHMpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIHRleHQgPSBnbG9iYWxzLmNvbnZlcnRlci5fZGlzcGF0Y2goJ2hlYWRlcnMuYmVmb3JlJywgdGV4dCwgb3B0aW9ucywgZ2xvYmFscyk7XG5cbiAgdmFyIGhlYWRlckxldmVsU3RhcnQgPSAoaXNOYU4ocGFyc2VJbnQob3B0aW9ucy5oZWFkZXJMZXZlbFN0YXJ0KSkpID8gMSA6IHBhcnNlSW50KG9wdGlvbnMuaGVhZGVyTGV2ZWxTdGFydCksXG4gICAgICBnaEhlYWRlcklkID0gb3B0aW9ucy5naENvbXBhdGlibGVIZWFkZXJJZCxcblxuICAvLyBTZXQgdGV4dC1zdHlsZSBoZWFkZXJzOlxuICAvL1x0SGVhZGVyIDFcbiAgLy9cdD09PT09PT09XG4gIC8vXG4gIC8vXHRIZWFkZXIgMlxuICAvL1x0LS0tLS0tLS1cbiAgLy9cbiAgICAgIHNldGV4dFJlZ2V4SDEgPSAob3B0aW9ucy5zbW9vdGhMaXZlUHJldmlldykgPyAvXiguKylbIFxcdF0qXFxuPXsyLH1bIFxcdF0qXFxuKy9nbSA6IC9eKC4rKVsgXFx0XSpcXG49K1sgXFx0XSpcXG4rL2dtLFxuICAgICAgc2V0ZXh0UmVnZXhIMiA9IChvcHRpb25zLnNtb290aExpdmVQcmV2aWV3KSA/IC9eKC4rKVsgXFx0XSpcXG4tezIsfVsgXFx0XSpcXG4rL2dtIDogL14oLispWyBcXHRdKlxcbi0rWyBcXHRdKlxcbisvZ207XG5cbiAgdGV4dCA9IHRleHQucmVwbGFjZShzZXRleHRSZWdleEgxLCBmdW5jdGlvbiAod2hvbGVNYXRjaCwgbTEpIHtcblxuICAgIHZhciBzcGFuR2FtdXQgPSBzaG93ZG93bi5zdWJQYXJzZXIoJ3NwYW5HYW11dCcpKG0xLCBvcHRpb25zLCBnbG9iYWxzKSxcbiAgICAgICAgaElEID0gKG9wdGlvbnMubm9IZWFkZXJJZCkgPyAnJyA6ICcgaWQ9XCInICsgaGVhZGVySWQobTEpICsgJ1wiJyxcbiAgICAgICAgaExldmVsID0gaGVhZGVyTGV2ZWxTdGFydCxcbiAgICAgICAgaGFzaEJsb2NrID0gJzxoJyArIGhMZXZlbCArIGhJRCArICc+JyArIHNwYW5HYW11dCArICc8L2gnICsgaExldmVsICsgJz4nO1xuICAgIHJldHVybiBzaG93ZG93bi5zdWJQYXJzZXIoJ2hhc2hCbG9jaycpKGhhc2hCbG9jaywgb3B0aW9ucywgZ2xvYmFscyk7XG4gIH0pO1xuXG4gIHRleHQgPSB0ZXh0LnJlcGxhY2Uoc2V0ZXh0UmVnZXhIMiwgZnVuY3Rpb24gKG1hdGNoRm91bmQsIG0xKSB7XG4gICAgdmFyIHNwYW5HYW11dCA9IHNob3dkb3duLnN1YlBhcnNlcignc3BhbkdhbXV0JykobTEsIG9wdGlvbnMsIGdsb2JhbHMpLFxuICAgICAgICBoSUQgPSAob3B0aW9ucy5ub0hlYWRlcklkKSA/ICcnIDogJyBpZD1cIicgKyBoZWFkZXJJZChtMSkgKyAnXCInLFxuICAgICAgICBoTGV2ZWwgPSBoZWFkZXJMZXZlbFN0YXJ0ICsgMSxcbiAgICAgICAgaGFzaEJsb2NrID0gJzxoJyArIGhMZXZlbCArIGhJRCArICc+JyArIHNwYW5HYW11dCArICc8L2gnICsgaExldmVsICsgJz4nO1xuICAgIHJldHVybiBzaG93ZG93bi5zdWJQYXJzZXIoJ2hhc2hCbG9jaycpKGhhc2hCbG9jaywgb3B0aW9ucywgZ2xvYmFscyk7XG4gIH0pO1xuXG4gIC8vIGF0eC1zdHlsZSBoZWFkZXJzOlxuICAvLyAgIyBIZWFkZXIgMVxuICAvLyAgIyMgSGVhZGVyIDJcbiAgLy8gICMjIEhlYWRlciAyIHdpdGggY2xvc2luZyBoYXNoZXMgIyNcbiAgLy8gIC4uLlxuICAvLyAgIyMjIyMjIEhlYWRlciA2XG4gIC8vXG4gIHZhciBhdHhTdHlsZSA9IChvcHRpb25zLnJlcXVpcmVTcGFjZUJlZm9yZUhlYWRpbmdUZXh0KSA/IC9eKCN7MSw2fSlbIFxcdF0rKC4rPylbIFxcdF0qIypcXG4rL2dtIDogL14oI3sxLDZ9KVsgXFx0XSooLis/KVsgXFx0XSojKlxcbisvZ207XG5cbiAgdGV4dCA9IHRleHQucmVwbGFjZShhdHhTdHlsZSwgZnVuY3Rpb24gKHdob2xlTWF0Y2gsIG0xLCBtMikge1xuICAgIHZhciBzcGFuID0gc2hvd2Rvd24uc3ViUGFyc2VyKCdzcGFuR2FtdXQnKShtMiwgb3B0aW9ucywgZ2xvYmFscyksXG4gICAgICAgIGhJRCA9IChvcHRpb25zLm5vSGVhZGVySWQpID8gJycgOiAnIGlkPVwiJyArIGhlYWRlcklkKG0yKSArICdcIicsXG4gICAgICAgIGhMZXZlbCA9IGhlYWRlckxldmVsU3RhcnQgLSAxICsgbTEubGVuZ3RoLFxuICAgICAgICBoZWFkZXIgPSAnPGgnICsgaExldmVsICsgaElEICsgJz4nICsgc3BhbiArICc8L2gnICsgaExldmVsICsgJz4nO1xuXG4gICAgcmV0dXJuIHNob3dkb3duLnN1YlBhcnNlcignaGFzaEJsb2NrJykoaGVhZGVyLCBvcHRpb25zLCBnbG9iYWxzKTtcbiAgfSk7XG5cbiAgZnVuY3Rpb24gaGVhZGVySWQgKG0pIHtcbiAgICB2YXIgdGl0bGU7XG4gICAgLy8gUHJlZml4IGlkIHRvIHByZXZlbnQgY2F1c2luZyBpbmFkdmVydGVudCBwcmUtZXhpc3Rpbmcgc3R5bGUgbWF0Y2hlcy5cbiAgICBpZiAoc2hvd2Rvd24uaGVscGVyLmlzU3RyaW5nKG9wdGlvbnMucHJlZml4SGVhZGVySWQpKSB7XG4gICAgICB0aXRsZSA9IG9wdGlvbnMucHJlZml4SGVhZGVySWQgKyBtO1xuICAgIH0gZWxzZSBpZiAob3B0aW9ucy5wcmVmaXhIZWFkZXJJZCA9PT0gdHJ1ZSkge1xuICAgICAgdGl0bGUgPSAnc2VjdGlvbiAnICsgbTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGl0bGUgPSBtO1xuICAgIH1cblxuICAgIGlmIChnaEhlYWRlcklkKSB7XG4gICAgICB0aXRsZSA9IHRpdGxlXG4gICAgICAgIC5yZXBsYWNlKC8gL2csICctJylcbiAgICAgICAgLy8gcmVwbGFjZSBwcmV2aW91c2x5IGVzY2FwZWQgY2hhcnMgKCYsIMKoIGFuZCAkKVxuICAgICAgICAucmVwbGFjZSgvJmFtcDsvZywgJycpXG4gICAgICAgIC5yZXBsYWNlKC/CqFQvZywgJycpXG4gICAgICAgIC5yZXBsYWNlKC/CqEQvZywgJycpXG4gICAgICAgIC8vIHJlcGxhY2UgcmVzdCBvZiB0aGUgY2hhcnMgKCZ+JCBhcmUgcmVwZWF0ZWQgYXMgdGhleSBtaWdodCBoYXZlIGJlZW4gZXNjYXBlZClcbiAgICAgICAgLy8gYm9ycm93ZWQgZnJvbSBnaXRodWIncyByZWRjYXJwZXQgKHNvbWUgdGhleSBzaG91bGQgcHJvZHVjZSBzaW1pbGFyIHJlc3VsdHMpXG4gICAgICAgIC5yZXBsYWNlKC9bJiskLFxcLzo7PT9AXCIje318XsKoflxcW1xcXWBcXFxcKikoJS4hJzw+XS9nLCAnJylcbiAgICAgICAgLnRvTG93ZXJDYXNlKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRpdGxlID0gdGl0bGVcbiAgICAgICAgLnJlcGxhY2UoL1teXFx3XS9nLCAnJylcbiAgICAgICAgLnRvTG93ZXJDYXNlKCk7XG4gICAgfVxuXG4gICAgaWYgKGdsb2JhbHMuaGFzaExpbmtDb3VudHNbdGl0bGVdKSB7XG4gICAgICB0aXRsZSA9IHRpdGxlICsgJy0nICsgKGdsb2JhbHMuaGFzaExpbmtDb3VudHNbdGl0bGVdKyspO1xuICAgIH0gZWxzZSB7XG4gICAgICBnbG9iYWxzLmhhc2hMaW5rQ291bnRzW3RpdGxlXSA9IDE7XG4gICAgfVxuICAgIHJldHVybiB0aXRsZTtcbiAgfVxuXG4gIHRleHQgPSBnbG9iYWxzLmNvbnZlcnRlci5fZGlzcGF0Y2goJ2hlYWRlcnMuYWZ0ZXInLCB0ZXh0LCBvcHRpb25zLCBnbG9iYWxzKTtcbiAgcmV0dXJuIHRleHQ7XG59KTtcblxyXG4vKipcbiAqIFR1cm4gTWFya2Rvd24gbGluayBzaG9ydGN1dHMgaW50byBYSFRNTCA8YT4gdGFncy5cbiAqL1xuc2hvd2Rvd24uc3ViUGFyc2VyKCdob3Jpem9udGFsUnVsZScsIGZ1bmN0aW9uICh0ZXh0LCBvcHRpb25zLCBnbG9iYWxzKSB7XG4gICd1c2Ugc3RyaWN0JztcbiAgdGV4dCA9IGdsb2JhbHMuY29udmVydGVyLl9kaXNwYXRjaCgnaG9yaXpvbnRhbFJ1bGUuYmVmb3JlJywgdGV4dCwgb3B0aW9ucywgZ2xvYmFscyk7XG5cbiAgdmFyIGtleSA9IHNob3dkb3duLnN1YlBhcnNlcignaGFzaEJsb2NrJykoJzxociAvPicsIG9wdGlvbnMsIGdsb2JhbHMpO1xuICB0ZXh0ID0gdGV4dC5yZXBsYWNlKC9eIHswLDJ9KCA/LSl7Myx9WyBcXHRdKiQvZ20sIGtleSk7XG4gIHRleHQgPSB0ZXh0LnJlcGxhY2UoL14gezAsMn0oID9cXCopezMsfVsgXFx0XSokL2dtLCBrZXkpO1xuICB0ZXh0ID0gdGV4dC5yZXBsYWNlKC9eIHswLDJ9KCA/Xyl7Myx9WyBcXHRdKiQvZ20sIGtleSk7XG5cbiAgdGV4dCA9IGdsb2JhbHMuY29udmVydGVyLl9kaXNwYXRjaCgnaG9yaXpvbnRhbFJ1bGUuYWZ0ZXInLCB0ZXh0LCBvcHRpb25zLCBnbG9iYWxzKTtcbiAgcmV0dXJuIHRleHQ7XG59KTtcblxyXG4vKipcbiAqIFR1cm4gTWFya2Rvd24gaW1hZ2Ugc2hvcnRjdXRzIGludG8gPGltZz4gdGFncy5cbiAqL1xuc2hvd2Rvd24uc3ViUGFyc2VyKCdpbWFnZXMnLCBmdW5jdGlvbiAodGV4dCwgb3B0aW9ucywgZ2xvYmFscykge1xuICAndXNlIHN0cmljdCc7XG5cbiAgdGV4dCA9IGdsb2JhbHMuY29udmVydGVyLl9kaXNwYXRjaCgnaW1hZ2VzLmJlZm9yZScsIHRleHQsIG9wdGlvbnMsIGdsb2JhbHMpO1xuXG4gIHZhciBpbmxpbmVSZWdFeHAgICAgPSAvIVxcWyguKj8pXVxccz9cXChbIFxcdF0qKCk8PyhcXFMrPyk+Pyg/OiA9KFsqXFxkXStbQS1aYS16JV17MCw0fSl4KFsqXFxkXStbQS1aYS16JV17MCw0fSkpP1sgXFx0XSooPzooWydcIl0pKC4qPylcXDZbIFxcdF0qKT9cXCkvZyxcbiAgICAgIHJlZmVyZW5jZVJlZ0V4cCA9IC8hXFxbKFteXFxdXSo/KV0gPyg/OlxcbiAqKT9cXFsoLio/KV0oKSgpKCkoKSgpL2c7XG5cbiAgZnVuY3Rpb24gd3JpdGVJbWFnZVRhZyAod2hvbGVNYXRjaCwgYWx0VGV4dCwgbGlua0lkLCB1cmwsIHdpZHRoLCBoZWlnaHQsIG01LCB0aXRsZSkge1xuXG4gICAgdmFyIGdVcmxzICAgPSBnbG9iYWxzLmdVcmxzLFxuICAgICAgICBnVGl0bGVzID0gZ2xvYmFscy5nVGl0bGVzLFxuICAgICAgICBnRGltcyAgID0gZ2xvYmFscy5nRGltZW5zaW9ucztcblxuICAgIGxpbmtJZCA9IGxpbmtJZC50b0xvd2VyQ2FzZSgpO1xuXG4gICAgaWYgKCF0aXRsZSkge1xuICAgICAgdGl0bGUgPSAnJztcbiAgICB9XG5cbiAgICBpZiAodXJsID09PSAnJyB8fCB1cmwgPT09IG51bGwpIHtcbiAgICAgIGlmIChsaW5rSWQgPT09ICcnIHx8IGxpbmtJZCA9PT0gbnVsbCkge1xuICAgICAgICAvLyBsb3dlci1jYXNlIGFuZCB0dXJuIGVtYmVkZGVkIG5ld2xpbmVzIGludG8gc3BhY2VzXG4gICAgICAgIGxpbmtJZCA9IGFsdFRleHQudG9Mb3dlckNhc2UoKS5yZXBsYWNlKC8gP1xcbi9nLCAnICcpO1xuICAgICAgfVxuICAgICAgdXJsID0gJyMnICsgbGlua0lkO1xuXG4gICAgICBpZiAoIXNob3dkb3duLmhlbHBlci5pc1VuZGVmaW5lZChnVXJsc1tsaW5rSWRdKSkge1xuICAgICAgICB1cmwgPSBnVXJsc1tsaW5rSWRdO1xuICAgICAgICBpZiAoIXNob3dkb3duLmhlbHBlci5pc1VuZGVmaW5lZChnVGl0bGVzW2xpbmtJZF0pKSB7XG4gICAgICAgICAgdGl0bGUgPSBnVGl0bGVzW2xpbmtJZF07XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFzaG93ZG93bi5oZWxwZXIuaXNVbmRlZmluZWQoZ0RpbXNbbGlua0lkXSkpIHtcbiAgICAgICAgICB3aWR0aCA9IGdEaW1zW2xpbmtJZF0ud2lkdGg7XG4gICAgICAgICAgaGVpZ2h0ID0gZ0RpbXNbbGlua0lkXS5oZWlnaHQ7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB3aG9sZU1hdGNoO1xuICAgICAgfVxuICAgIH1cblxuICAgIGFsdFRleHQgPSBhbHRUZXh0XG4gICAgICAucmVwbGFjZSgvXCIvZywgJyZxdW90OycpXG4gICAgLy9hbHRUZXh0ID0gc2hvd2Rvd24uaGVscGVyLmVzY2FwZUNoYXJhY3RlcnMoYWx0VGV4dCwgJypfJywgZmFsc2UpO1xuICAgICAgLnJlcGxhY2Uoc2hvd2Rvd24uaGVscGVyLnJlZ2V4ZXMuYXN0ZXJpc2tBbmREYXNoLCBzaG93ZG93bi5oZWxwZXIuZXNjYXBlQ2hhcmFjdGVyc0NhbGxiYWNrKTtcbiAgICAvL3VybCA9IHNob3dkb3duLmhlbHBlci5lc2NhcGVDaGFyYWN0ZXJzKHVybCwgJypfJywgZmFsc2UpO1xuICAgIHVybCA9IHVybC5yZXBsYWNlKHNob3dkb3duLmhlbHBlci5yZWdleGVzLmFzdGVyaXNrQW5kRGFzaCwgc2hvd2Rvd24uaGVscGVyLmVzY2FwZUNoYXJhY3RlcnNDYWxsYmFjayk7XG4gICAgdmFyIHJlc3VsdCA9ICc8aW1nIHNyYz1cIicgKyB1cmwgKyAnXCIgYWx0PVwiJyArIGFsdFRleHQgKyAnXCInO1xuXG4gICAgaWYgKHRpdGxlKSB7XG4gICAgICB0aXRsZSA9IHRpdGxlXG4gICAgICAgIC5yZXBsYWNlKC9cIi9nLCAnJnF1b3Q7JylcbiAgICAgIC8vdGl0bGUgPSBzaG93ZG93bi5oZWxwZXIuZXNjYXBlQ2hhcmFjdGVycyh0aXRsZSwgJypfJywgZmFsc2UpO1xuICAgICAgICAucmVwbGFjZShzaG93ZG93bi5oZWxwZXIucmVnZXhlcy5hc3Rlcmlza0FuZERhc2gsIHNob3dkb3duLmhlbHBlci5lc2NhcGVDaGFyYWN0ZXJzQ2FsbGJhY2spO1xuICAgICAgcmVzdWx0ICs9ICcgdGl0bGU9XCInICsgdGl0bGUgKyAnXCInO1xuICAgIH1cblxuICAgIGlmICh3aWR0aCAmJiBoZWlnaHQpIHtcbiAgICAgIHdpZHRoICA9ICh3aWR0aCA9PT0gJyonKSA/ICdhdXRvJyA6IHdpZHRoO1xuICAgICAgaGVpZ2h0ID0gKGhlaWdodCA9PT0gJyonKSA/ICdhdXRvJyA6IGhlaWdodDtcblxuICAgICAgcmVzdWx0ICs9ICcgd2lkdGg9XCInICsgd2lkdGggKyAnXCInO1xuICAgICAgcmVzdWx0ICs9ICcgaGVpZ2h0PVwiJyArIGhlaWdodCArICdcIic7XG4gICAgfVxuXG4gICAgcmVzdWx0ICs9ICcgLz4nO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8vIEZpcnN0LCBoYW5kbGUgcmVmZXJlbmNlLXN0eWxlIGxhYmVsZWQgaW1hZ2VzOiAhW2FsdCB0ZXh0XVtpZF1cbiAgdGV4dCA9IHRleHQucmVwbGFjZShyZWZlcmVuY2VSZWdFeHAsIHdyaXRlSW1hZ2VUYWcpO1xuXG4gIC8vIE5leHQsIGhhbmRsZSBpbmxpbmUgaW1hZ2VzOiAgIVthbHQgdGV4dF0odXJsID08d2lkdGg+eDxoZWlnaHQ+IFwib3B0aW9uYWwgdGl0bGVcIilcbiAgdGV4dCA9IHRleHQucmVwbGFjZShpbmxpbmVSZWdFeHAsIHdyaXRlSW1hZ2VUYWcpO1xuXG4gIHRleHQgPSBnbG9iYWxzLmNvbnZlcnRlci5fZGlzcGF0Y2goJ2ltYWdlcy5hZnRlcicsIHRleHQsIG9wdGlvbnMsIGdsb2JhbHMpO1xuICByZXR1cm4gdGV4dDtcbn0pO1xuXHJcbnNob3dkb3duLnN1YlBhcnNlcignaXRhbGljc0FuZEJvbGQnLCBmdW5jdGlvbiAodGV4dCwgb3B0aW9ucywgZ2xvYmFscykge1xuICAndXNlIHN0cmljdCc7XG5cbiAgdGV4dCA9IGdsb2JhbHMuY29udmVydGVyLl9kaXNwYXRjaCgnaXRhbGljc0FuZEJvbGQuYmVmb3JlJywgdGV4dCwgb3B0aW9ucywgZ2xvYmFscyk7XG5cbiAgLy8gaXQncyBmYXN0ZXIgdG8gaGF2ZSAzIHNlcGFyYXRlIHJlZ2V4ZXMgZm9yIGVhY2ggY2FzZSB0aGFuIGhhdmUganVzdCBvbmVcbiAgLy8gYmVjYXVzZSBvZiBiYWNrdHJhY2luZywgaW4gc29tZSBjYXNlcywgaXQgY291bGQgbGVhZCB0byBhbiBleHBvbmVudGlhbCBlZmZlY3RcbiAgLy8gY2FsbGVkIFwiY2F0YXN0cm9waGljIGJhY2t0cmFjZVwiLiBPbWlub3VzIVxuXG4gIC8vIFBhcnNlIHVuZGVyc2NvcmVzXG4gIGlmIChvcHRpb25zLmxpdGVyYWxNaWRXb3JkVW5kZXJzY29yZXMpIHtcbiAgICB0ZXh0ID0gdGV4dC5yZXBsYWNlKC9cXGJfX18oXFxTW1xcc1xcU10qKV9fX1xcYi9nLCAnPHN0cm9uZz48ZW0+JDE8L2VtPjwvc3Ryb25nPicpO1xuICAgIHRleHQgPSB0ZXh0LnJlcGxhY2UoL1xcYl9fKFxcU1tcXHNcXFNdKilfX1xcYi9nLCAnPHN0cm9uZz4kMTwvc3Ryb25nPicpO1xuICAgIHRleHQgPSB0ZXh0LnJlcGxhY2UoL1xcYl8oXFxTW1xcc1xcU10qPylfXFxiL2csICc8ZW0+JDE8L2VtPicpO1xuICB9IGVsc2Uge1xuICAgIHRleHQgPSB0ZXh0LnJlcGxhY2UoL19fXyhcXFNbXFxzXFxTXSo/KV9fXy9nLCBmdW5jdGlvbiAod20sIG0pIHtcbiAgICAgIHJldHVybiAoL1xcUyQvLnRlc3QobSkpID8gJzxzdHJvbmc+PGVtPicgKyBtICsgJzwvZW0+PC9zdHJvbmc+JyA6IHdtO1xuICAgIH0pO1xuICAgIHRleHQgPSB0ZXh0LnJlcGxhY2UoL19fKFxcU1tcXHNcXFNdKj8pX18vZywgZnVuY3Rpb24gKHdtLCBtKSB7XG4gICAgICByZXR1cm4gKC9cXFMkLy50ZXN0KG0pKSA/ICc8c3Ryb25nPicgKyBtICsgJzwvc3Ryb25nPicgOiB3bTtcbiAgICB9KTtcbiAgICB0ZXh0ID0gdGV4dC5yZXBsYWNlKC9fKFteXFxzX11bXFxzXFxTXSo/KV8vZywgZnVuY3Rpb24gKHdtLCBtKSB7XG4gICAgICAvLyAhL15fW15fXS8udGVzdChtKSAtIHRlc3QgaWYgaXQgZG9lc24ndCBzdGFydCB3aXRoIF9fIChzaW5jZSBpdCBzZWVtcyByZWR1bmRhbnQsIHdlIHJlbW92ZWQgaXQpXG4gICAgICByZXR1cm4gKC9cXFMkLy50ZXN0KG0pKSA/ICc8ZW0+JyArIG0gKyAnPC9lbT4nIDogd207XG4gICAgfSk7XG4gIH1cblxuICAvLyBOb3cgcGFyc2UgYXN0ZXJpc2tzXG4gIHRleHQgPSB0ZXh0LnJlcGxhY2UoL1xcKlxcKlxcKihcXFNbXFxzXFxTXSo/KVxcKlxcKlxcKi9nLCBmdW5jdGlvbiAod20sIG0pIHtcbiAgICByZXR1cm4gKC9cXFMkLy50ZXN0KG0pKSA/ICc8c3Ryb25nPjxlbT4nICsgbSArICc8L2VtPjwvc3Ryb25nPicgOiB3bTtcbiAgfSk7XG4gIHRleHQgPSB0ZXh0LnJlcGxhY2UoL1xcKlxcKihcXFNbXFxzXFxTXSo/KVxcKlxcKi9nLCBmdW5jdGlvbiAod20sIG0pIHtcbiAgICByZXR1cm4gKC9cXFMkLy50ZXN0KG0pKSA/ICc8c3Ryb25nPicgKyBtICsgJzwvc3Ryb25nPicgOiB3bTtcbiAgfSk7XG4gIHRleHQgPSB0ZXh0LnJlcGxhY2UoL1xcKihbXlxccypdW1xcc1xcU10qPylcXCovZywgZnVuY3Rpb24gKHdtLCBtKSB7XG4gICAgLy8gIS9eXFwqW14qXS8udGVzdChtKSAtIHRlc3QgaWYgaXQgZG9lc24ndCBzdGFydCB3aXRoICoqIChzaW5jZSBpdCBzZWVtcyByZWR1bmRhbnQsIHdlIHJlbW92ZWQgaXQpXG4gICAgcmV0dXJuICgvXFxTJC8udGVzdChtKSkgPyAnPGVtPicgKyBtICsgJzwvZW0+JyA6IHdtO1xuICB9KTtcblxuICB0ZXh0ID0gZ2xvYmFscy5jb252ZXJ0ZXIuX2Rpc3BhdGNoKCdpdGFsaWNzQW5kQm9sZC5hZnRlcicsIHRleHQsIG9wdGlvbnMsIGdsb2JhbHMpO1xuICByZXR1cm4gdGV4dDtcbn0pO1xuXHJcbi8qKlxuICogRm9ybSBIVE1MIG9yZGVyZWQgKG51bWJlcmVkKSBhbmQgdW5vcmRlcmVkIChidWxsZXRlZCkgbGlzdHMuXG4gKi9cbnNob3dkb3duLnN1YlBhcnNlcignbGlzdHMnLCBmdW5jdGlvbiAodGV4dCwgb3B0aW9ucywgZ2xvYmFscykge1xuICAndXNlIHN0cmljdCc7XG4gIHRleHQgPSBnbG9iYWxzLmNvbnZlcnRlci5fZGlzcGF0Y2goJ2xpc3RzLmJlZm9yZScsIHRleHQsIG9wdGlvbnMsIGdsb2JhbHMpO1xuXG4gIC8qKlxuICAgKiBQcm9jZXNzIHRoZSBjb250ZW50cyBvZiBhIHNpbmdsZSBvcmRlcmVkIG9yIHVub3JkZXJlZCBsaXN0LCBzcGxpdHRpbmcgaXRcbiAgICogaW50byBpbmRpdmlkdWFsIGxpc3QgaXRlbXMuXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBsaXN0U3RyXG4gICAqIEBwYXJhbSB7Ym9vbGVhbn0gdHJpbVRyYWlsaW5nXG4gICAqIEByZXR1cm5zIHtzdHJpbmd9XG4gICAqL1xuICBmdW5jdGlvbiBwcm9jZXNzTGlzdEl0ZW1zIChsaXN0U3RyLCB0cmltVHJhaWxpbmcpIHtcbiAgICAvLyBUaGUgJGdfbGlzdF9sZXZlbCBnbG9iYWwga2VlcHMgdHJhY2sgb2Ygd2hlbiB3ZSdyZSBpbnNpZGUgYSBsaXN0LlxuICAgIC8vIEVhY2ggdGltZSB3ZSBlbnRlciBhIGxpc3QsIHdlIGluY3JlbWVudCBpdDsgd2hlbiB3ZSBsZWF2ZSBhIGxpc3QsXG4gICAgLy8gd2UgZGVjcmVtZW50LiBJZiBpdCdzIHplcm8sIHdlJ3JlIG5vdCBpbiBhIGxpc3QgYW55bW9yZS5cbiAgICAvL1xuICAgIC8vIFdlIGRvIHRoaXMgYmVjYXVzZSB3aGVuIHdlJ3JlIG5vdCBpbnNpZGUgYSBsaXN0LCB3ZSB3YW50IHRvIHRyZWF0XG4gICAgLy8gc29tZXRoaW5nIGxpa2UgdGhpczpcbiAgICAvL1xuICAgIC8vICAgIEkgcmVjb21tZW5kIHVwZ3JhZGluZyB0byB2ZXJzaW9uXG4gICAgLy8gICAgOC4gT29wcywgbm93IHRoaXMgbGluZSBpcyB0cmVhdGVkXG4gICAgLy8gICAgYXMgYSBzdWItbGlzdC5cbiAgICAvL1xuICAgIC8vIEFzIGEgc2luZ2xlIHBhcmFncmFwaCwgZGVzcGl0ZSB0aGUgZmFjdCB0aGF0IHRoZSBzZWNvbmQgbGluZSBzdGFydHNcbiAgICAvLyB3aXRoIGEgZGlnaXQtcGVyaW9kLXNwYWNlIHNlcXVlbmNlLlxuICAgIC8vXG4gICAgLy8gV2hlcmVhcyB3aGVuIHdlJ3JlIGluc2lkZSBhIGxpc3QgKG9yIHN1Yi1saXN0KSwgdGhhdCBsaW5lIHdpbGwgYmVcbiAgICAvLyB0cmVhdGVkIGFzIHRoZSBzdGFydCBvZiBhIHN1Yi1saXN0LiBXaGF0IGEga2x1ZGdlLCBodWg/IFRoaXMgaXNcbiAgICAvLyBhbiBhc3BlY3Qgb2YgTWFya2Rvd24ncyBzeW50YXggdGhhdCdzIGhhcmQgdG8gcGFyc2UgcGVyZmVjdGx5XG4gICAgLy8gd2l0aG91dCByZXNvcnRpbmcgdG8gbWluZC1yZWFkaW5nLiBQZXJoYXBzIHRoZSBzb2x1dGlvbiBpcyB0b1xuICAgIC8vIGNoYW5nZSB0aGUgc3ludGF4IHJ1bGVzIHN1Y2ggdGhhdCBzdWItbGlzdHMgbXVzdCBzdGFydCB3aXRoIGFcbiAgICAvLyBzdGFydGluZyBjYXJkaW5hbCBudW1iZXI7IGUuZy4gXCIxLlwiIG9yIFwiYS5cIi5cbiAgICBnbG9iYWxzLmdMaXN0TGV2ZWwrKztcblxuICAgIC8vIHRyaW0gdHJhaWxpbmcgYmxhbmsgbGluZXM6XG4gICAgbGlzdFN0ciA9IGxpc3RTdHIucmVwbGFjZSgvXFxuezIsfSQvLCAnXFxuJyk7XG5cbiAgICAvLyBhdHRhY2tsYWI6IGFkZCBzZW50aW5lbCB0byBlbXVsYXRlIFxcelxuICAgIGxpc3RTdHIgKz0gJ8KoMCc7XG5cbiAgICB2YXIgcmd4ID0gLyhcXG4pPyheIHswLDN9KShbKistXXxcXGQrWy5dKVsgXFx0XSsoKFxcWyh4fFh8ICk/XSk/WyBcXHRdKlteXFxyXSs/KFxcbnsxLDJ9KSkoPz1cXG4qKMKoMHwgezAsM30oWyorLV18XFxkK1suXSlbIFxcdF0rKSkvZ20sXG4gICAgICAgIGlzUGFyYWdyYXBoZWQgPSAoL1xcblsgXFx0XSpcXG4oPyHCqDApLy50ZXN0KGxpc3RTdHIpKTtcblxuICAgIC8vIFNpbmNlIHZlcnNpb24gMS41LCBuZXN0aW5nIHN1Ymxpc3RzIHJlcXVpcmVzIDQgc3BhY2VzIChvciAxIHRhYikgaW5kZW50YXRpb24sXG4gICAgLy8gd2hpY2ggaXMgYSBzeW50YXggYnJlYWtpbmcgY2hhbmdlXG4gICAgLy8gYWN0aXZhdGluZyB0aGlzIG9wdGlvbiByZXZlcnRzIHRvIG9sZCBiZWhhdmlvclxuICAgIGlmIChvcHRpb25zLmRpc2FibGVGb3JjZWQ0U3BhY2VzSW5kZW50ZWRTdWJsaXN0cykge1xuICAgICAgcmd4ID0gLyhcXG4pPyheIHswLDN9KShbKistXXxcXGQrWy5dKVsgXFx0XSsoKFxcWyh4fFh8ICk/XSk/WyBcXHRdKlteXFxyXSs/KFxcbnsxLDJ9KSkoPz1cXG4qKMKoMHxcXDIoWyorLV18XFxkK1suXSlbIFxcdF0rKSkvZ207XG4gICAgfVxuXG4gICAgbGlzdFN0ciA9IGxpc3RTdHIucmVwbGFjZShyZ3gsIGZ1bmN0aW9uICh3aG9sZU1hdGNoLCBtMSwgbTIsIG0zLCBtNCwgdGFza2J0biwgY2hlY2tlZCkge1xuICAgICAgY2hlY2tlZCA9IChjaGVja2VkICYmIGNoZWNrZWQudHJpbSgpICE9PSAnJyk7XG5cbiAgICAgIHZhciBpdGVtID0gc2hvd2Rvd24uc3ViUGFyc2VyKCdvdXRkZW50JykobTQsIG9wdGlvbnMsIGdsb2JhbHMpLFxuICAgICAgICAgIGJ1bGxldFN0eWxlID0gJyc7XG5cbiAgICAgIC8vIFN1cHBvcnQgZm9yIGdpdGh1YiB0YXNrbGlzdHNcbiAgICAgIGlmICh0YXNrYnRuICYmIG9wdGlvbnMudGFza2xpc3RzKSB7XG4gICAgICAgIGJ1bGxldFN0eWxlID0gJyBjbGFzcz1cInRhc2stbGlzdC1pdGVtXCIgc3R5bGU9XCJsaXN0LXN0eWxlLXR5cGU6IG5vbmU7XCInO1xuICAgICAgICBpdGVtID0gaXRlbS5yZXBsYWNlKC9eWyBcXHRdKlxcWyh4fFh8ICk/XS9tLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgdmFyIG90cCA9ICc8aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgZGlzYWJsZWQgc3R5bGU9XCJtYXJnaW46IDBweCAwLjM1ZW0gMC4yNWVtIC0xLjZlbTsgdmVydGljYWwtYWxpZ246IG1pZGRsZTtcIic7XG4gICAgICAgICAgaWYgKGNoZWNrZWQpIHtcbiAgICAgICAgICAgIG90cCArPSAnIGNoZWNrZWQnO1xuICAgICAgICAgIH1cbiAgICAgICAgICBvdHAgKz0gJz4nO1xuICAgICAgICAgIHJldHVybiBvdHA7XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICAvLyBJU1NVRSAjMzEyXG4gICAgICAvLyBUaGlzIGlucHV0OiAtIC0gLSBhXG4gICAgICAvLyBjYXVzZXMgdHJvdWJsZSB0byB0aGUgcGFyc2VyLCBzaW5jZSBpdCBpbnRlcnByZXRzIGl0IGFzOlxuICAgICAgLy8gPHVsPjxsaT48bGk+PGxpPmE8L2xpPjwvbGk+PC9saT48L3VsPlxuICAgICAgLy8gaW5zdGVhZCBvZjpcbiAgICAgIC8vIDx1bD48bGk+LSAtIGE8L2xpPjwvdWw+XG4gICAgICAvLyBTbywgdG8gcHJldmVudCBpdCwgd2Ugd2lsbCBwdXQgYSBtYXJrZXIgKMKoQSlpbiB0aGUgYmVnaW5uaW5nIG9mIHRoZSBsaW5lXG4gICAgICAvLyBLaW5kIG9mIGhhY2tpc2gvbW9ua2V5IHBhdGNoaW5nLCBidXQgc2VlbXMgbW9yZSBlZmZlY3RpdmUgdGhhbiBvdmVyY29tcGxpY2F0aW5nIHRoZSBsaXN0IHBhcnNlclxuICAgICAgaXRlbSA9IGl0ZW0ucmVwbGFjZSgvXihbLSorXXxcXGRcXC4pWyBcXHRdK1tcXFNcXG4gXSovZywgZnVuY3Rpb24gKHdtMikge1xuICAgICAgICByZXR1cm4gJ8KoQScgKyB3bTI7XG4gICAgICB9KTtcblxuICAgICAgLy8gbTEgLSBMZWFkaW5nIGxpbmUgb3JcbiAgICAgIC8vIEhhcyBhIGRvdWJsZSByZXR1cm4gKG11bHRpIHBhcmFncmFwaCkgb3JcbiAgICAgIC8vIEhhcyBzdWJsaXN0XG4gICAgICBpZiAobTEgfHwgKGl0ZW0uc2VhcmNoKC9cXG57Mix9LykgPiAtMSkpIHtcbiAgICAgICAgaXRlbSA9IHNob3dkb3duLnN1YlBhcnNlcignZ2l0aHViQ29kZUJsb2NrcycpKGl0ZW0sIG9wdGlvbnMsIGdsb2JhbHMpO1xuICAgICAgICBpdGVtID0gc2hvd2Rvd24uc3ViUGFyc2VyKCdibG9ja0dhbXV0JykoaXRlbSwgb3B0aW9ucywgZ2xvYmFscyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBSZWN1cnNpb24gZm9yIHN1Yi1saXN0czpcbiAgICAgICAgaXRlbSA9IHNob3dkb3duLnN1YlBhcnNlcignbGlzdHMnKShpdGVtLCBvcHRpb25zLCBnbG9iYWxzKTtcbiAgICAgICAgaXRlbSA9IGl0ZW0ucmVwbGFjZSgvXFxuJC8sICcnKTsgLy8gY2hvbXAoaXRlbSlcbiAgICAgICAgaXRlbSA9IHNob3dkb3duLnN1YlBhcnNlcignaGFzaEhUTUxCbG9ja3MnKShpdGVtLCBvcHRpb25zLCBnbG9iYWxzKTtcbiAgICAgICAgLy8gQ29sYXBzZSBkb3VibGUgbGluZWJyZWFrc1xuICAgICAgICBpdGVtID0gaXRlbS5yZXBsYWNlKC9cXG5cXG4rL2csICdcXG5cXG4nKTtcbiAgICAgICAgLy8gcmVwbGFjZSBkb3VibGUgbGluZWJyZWFrcyB3aXRoIGEgcGxhY2Vob2xkZXJcbiAgICAgICAgaXRlbSA9IGl0ZW0ucmVwbGFjZSgvXFxuXFxuL2csICfCqEInKTtcbiAgICAgICAgaWYgKGlzUGFyYWdyYXBoZWQpIHtcbiAgICAgICAgICBpdGVtID0gc2hvd2Rvd24uc3ViUGFyc2VyKCdwYXJhZ3JhcGhzJykoaXRlbSwgb3B0aW9ucywgZ2xvYmFscyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaXRlbSA9IHNob3dkb3duLnN1YlBhcnNlcignc3BhbkdhbXV0JykoaXRlbSwgb3B0aW9ucywgZ2xvYmFscyk7XG4gICAgICAgIH1cbiAgICAgICAgaXRlbSA9IGl0ZW0ucmVwbGFjZSgvwqhCL2csICdcXG5cXG4nKTtcbiAgICAgIH1cblxuICAgICAgLy8gbm93IHdlIG5lZWQgdG8gcmVtb3ZlIHRoZSBtYXJrZXIgKMKoQSlcbiAgICAgIGl0ZW0gPSBpdGVtLnJlcGxhY2UoJ8KoQScsICcnKTtcbiAgICAgIC8vIHdlIGNhbiBmaW5hbGx5IHdyYXAgdGhlIGxpbmUgaW4gbGlzdCBpdGVtIHRhZ3NcbiAgICAgIGl0ZW0gPSAgJzxsaScgKyBidWxsZXRTdHlsZSArICc+JyArIGl0ZW0gKyAnPC9saT5cXG4nO1xuXG4gICAgICByZXR1cm4gaXRlbTtcbiAgICB9KTtcblxuICAgIC8vIGF0dGFja2xhYjogc3RyaXAgc2VudGluZWxcbiAgICBsaXN0U3RyID0gbGlzdFN0ci5yZXBsYWNlKC/CqDAvZywgJycpO1xuXG4gICAgZ2xvYmFscy5nTGlzdExldmVsLS07XG5cbiAgICBpZiAodHJpbVRyYWlsaW5nKSB7XG4gICAgICBsaXN0U3RyID0gbGlzdFN0ci5yZXBsYWNlKC9cXHMrJC8sICcnKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbGlzdFN0cjtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVjayBhbmQgcGFyc2UgY29uc2VjdXRpdmUgbGlzdHMgKGJldHRlciBmaXggZm9yIGlzc3VlICMxNDIpXG4gICAqIEBwYXJhbSB7c3RyaW5nfSBsaXN0XG4gICAqIEBwYXJhbSB7c3RyaW5nfSBsaXN0VHlwZVxuICAgKiBAcGFyYW0ge2Jvb2xlYW59IHRyaW1UcmFpbGluZ1xuICAgKiBAcmV0dXJucyB7c3RyaW5nfVxuICAgKi9cbiAgZnVuY3Rpb24gcGFyc2VDb25zZWN1dGl2ZUxpc3RzIChsaXN0LCBsaXN0VHlwZSwgdHJpbVRyYWlsaW5nKSB7XG4gICAgLy8gY2hlY2sgaWYgd2UgY2F1Z2h0IDIgb3IgbW9yZSBjb25zZWN1dGl2ZSBsaXN0cyBieSBtaXN0YWtlXG4gICAgLy8gd2UgdXNlIHRoZSBjb3VudGVyUmd4LCBtZWFuaW5nIGlmIGxpc3RUeXBlIGlzIFVMIHdlIGxvb2sgZm9yIE9MIGFuZCB2aWNlIHZlcnNhXG4gICAgdmFyIG9sUmd4ID0gKG9wdGlvbnMuZGlzYWJsZUZvcmNlZDRTcGFjZXNJbmRlbnRlZFN1Ymxpc3RzKSA/IC9eID9cXGQrXFwuWyBcXHRdL2dtIDogL14gezAsM31cXGQrXFwuWyBcXHRdL2dtLFxuICAgICAgICB1bFJneCA9IChvcHRpb25zLmRpc2FibGVGb3JjZWQ0U3BhY2VzSW5kZW50ZWRTdWJsaXN0cykgPyAvXiA/WyorLV1bIFxcdF0vZ20gOiAvXiB7MCwzfVsqKy1dWyBcXHRdL2dtLFxuICAgICAgICBjb3VudGVyUnhnID0gKGxpc3RUeXBlID09PSAndWwnKSA/IG9sUmd4IDogdWxSZ3gsXG4gICAgICAgIHJlc3VsdCA9ICcnO1xuXG4gICAgaWYgKGxpc3Quc2VhcmNoKGNvdW50ZXJSeGcpICE9PSAtMSkge1xuICAgICAgKGZ1bmN0aW9uIHBhcnNlQ0wgKHR4dCkge1xuICAgICAgICB2YXIgcG9zID0gdHh0LnNlYXJjaChjb3VudGVyUnhnKTtcbiAgICAgICAgaWYgKHBvcyAhPT0gLTEpIHtcbiAgICAgICAgICAvLyBzbGljZVxuICAgICAgICAgIHJlc3VsdCArPSAnXFxuPCcgKyBsaXN0VHlwZSArICc+XFxuJyArIHByb2Nlc3NMaXN0SXRlbXModHh0LnNsaWNlKDAsIHBvcyksICEhdHJpbVRyYWlsaW5nKSArICc8LycgKyBsaXN0VHlwZSArICc+XFxuJztcblxuICAgICAgICAgIC8vIGludmVydCBjb3VudGVyVHlwZSBhbmQgbGlzdFR5cGVcbiAgICAgICAgICBsaXN0VHlwZSA9IChsaXN0VHlwZSA9PT0gJ3VsJykgPyAnb2wnIDogJ3VsJztcbiAgICAgICAgICBjb3VudGVyUnhnID0gKGxpc3RUeXBlID09PSAndWwnKSA/IG9sUmd4IDogdWxSZ3g7XG5cbiAgICAgICAgICAvL3JlY3Vyc2VcbiAgICAgICAgICBwYXJzZUNMKHR4dC5zbGljZShwb3MpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXN1bHQgKz0gJ1xcbjwnICsgbGlzdFR5cGUgKyAnPlxcbicgKyBwcm9jZXNzTGlzdEl0ZW1zKHR4dCwgISF0cmltVHJhaWxpbmcpICsgJzwvJyArIGxpc3RUeXBlICsgJz5cXG4nO1xuICAgICAgICB9XG4gICAgICB9KShsaXN0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVzdWx0ID0gJ1xcbjwnICsgbGlzdFR5cGUgKyAnPlxcbicgKyBwcm9jZXNzTGlzdEl0ZW1zKGxpc3QsICEhdHJpbVRyYWlsaW5nKSArICc8LycgKyBsaXN0VHlwZSArICc+XFxuJztcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLy8gYWRkIHNlbnRpbmVsIHRvIGhhY2sgYXJvdW5kIGtodG1sL3NhZmFyaSBidWc6XG4gIC8vIGh0dHA6Ly9idWdzLndlYmtpdC5vcmcvc2hvd19idWcuY2dpP2lkPTExMjMxXG4gIHRleHQgKz0gJ8KoMCc7XG5cbiAgaWYgKGdsb2JhbHMuZ0xpc3RMZXZlbCkge1xuICAgIHRleHQgPSB0ZXh0LnJlcGxhY2UoL14oKCB7MCwzfShbKistXXxcXGQrWy5dKVsgXFx0XSspW15cXHJdKz8owqgwfFxcbnsyLH0oPz1cXFMpKD8hWyBcXHRdKig/OlsqKy1dfFxcZCtbLl0pWyBcXHRdKykpKS9nbSxcbiAgICAgIGZ1bmN0aW9uICh3aG9sZU1hdGNoLCBsaXN0LCBtMikge1xuICAgICAgICB2YXIgbGlzdFR5cGUgPSAobTIuc2VhcmNoKC9bKistXS9nKSA+IC0xKSA/ICd1bCcgOiAnb2wnO1xuICAgICAgICByZXR1cm4gcGFyc2VDb25zZWN1dGl2ZUxpc3RzKGxpc3QsIGxpc3RUeXBlLCB0cnVlKTtcbiAgICAgIH1cbiAgICApO1xuICB9IGVsc2Uge1xuICAgIHRleHQgPSB0ZXh0LnJlcGxhY2UoLyhcXG5cXG58Xlxcbj8pKCggezAsM30oWyorLV18XFxkK1suXSlbIFxcdF0rKVteXFxyXSs/KMKoMHxcXG57Mix9KD89XFxTKSg/IVsgXFx0XSooPzpbKistXXxcXGQrWy5dKVsgXFx0XSspKSkvZ20sXG4gICAgICBmdW5jdGlvbiAod2hvbGVNYXRjaCwgbTEsIGxpc3QsIG0zKSB7XG4gICAgICAgIHZhciBsaXN0VHlwZSA9IChtMy5zZWFyY2goL1sqKy1dL2cpID4gLTEpID8gJ3VsJyA6ICdvbCc7XG4gICAgICAgIHJldHVybiBwYXJzZUNvbnNlY3V0aXZlTGlzdHMobGlzdCwgbGlzdFR5cGUsIGZhbHNlKTtcbiAgICAgIH1cbiAgICApO1xuICB9XG5cbiAgLy8gc3RyaXAgc2VudGluZWxcbiAgdGV4dCA9IHRleHQucmVwbGFjZSgvwqgwLywgJycpO1xuICB0ZXh0ID0gZ2xvYmFscy5jb252ZXJ0ZXIuX2Rpc3BhdGNoKCdsaXN0cy5hZnRlcicsIHRleHQsIG9wdGlvbnMsIGdsb2JhbHMpO1xuICByZXR1cm4gdGV4dDtcbn0pO1xuXHJcbi8qKlxuICogUmVtb3ZlIG9uZSBsZXZlbCBvZiBsaW5lLWxlYWRpbmcgdGFicyBvciBzcGFjZXNcbiAqL1xuc2hvd2Rvd24uc3ViUGFyc2VyKCdvdXRkZW50JywgZnVuY3Rpb24gKHRleHQsIG9wdGlvbnMsIGdsb2JhbHMpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuICB0ZXh0ID0gZ2xvYmFscy5jb252ZXJ0ZXIuX2Rpc3BhdGNoKCdvdXRkZW50LmJlZm9yZScsIHRleHQsIG9wdGlvbnMsIGdsb2JhbHMpO1xuXG4gIC8vIGF0dGFja2xhYjogaGFjayBhcm91bmQgS29ucXVlcm9yIDMuNS40IGJ1ZzpcbiAgLy8gXCItLS0tLS0tLS0tYnVnXCIucmVwbGFjZSgvXi0vZyxcIlwiKSA9PSBcImJ1Z1wiXG4gIHRleHQgPSB0ZXh0LnJlcGxhY2UoL14oXFx0fFsgXXsxLDR9KS9nbSwgJ8KoMCcpOyAvLyBhdHRhY2tsYWI6IGdfdGFiX3dpZHRoXG5cbiAgLy8gYXR0YWNrbGFiOiBjbGVhbiB1cCBoYWNrXG4gIHRleHQgPSB0ZXh0LnJlcGxhY2UoL8KoMC9nLCAnJyk7XG5cbiAgdGV4dCA9IGdsb2JhbHMuY29udmVydGVyLl9kaXNwYXRjaCgnb3V0ZGVudC5hZnRlcicsIHRleHQsIG9wdGlvbnMsIGdsb2JhbHMpO1xuICByZXR1cm4gdGV4dDtcbn0pO1xuXHJcbi8qKlxuICpcbiAqL1xuc2hvd2Rvd24uc3ViUGFyc2VyKCdwYXJhZ3JhcGhzJywgZnVuY3Rpb24gKHRleHQsIG9wdGlvbnMsIGdsb2JhbHMpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIHRleHQgPSBnbG9iYWxzLmNvbnZlcnRlci5fZGlzcGF0Y2goJ3BhcmFncmFwaHMuYmVmb3JlJywgdGV4dCwgb3B0aW9ucywgZ2xvYmFscyk7XG4gIC8vIFN0cmlwIGxlYWRpbmcgYW5kIHRyYWlsaW5nIGxpbmVzOlxuICB0ZXh0ID0gdGV4dC5yZXBsYWNlKC9eXFxuKy9nLCAnJyk7XG4gIHRleHQgPSB0ZXh0LnJlcGxhY2UoL1xcbiskL2csICcnKTtcblxuICB2YXIgZ3JhZnMgPSB0ZXh0LnNwbGl0KC9cXG57Mix9L2cpLFxuICAgICAgZ3JhZnNPdXQgPSBbXSxcbiAgICAgIGVuZCA9IGdyYWZzLmxlbmd0aDsgLy8gV3JhcCA8cD4gdGFnc1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgZW5kOyBpKyspIHtcbiAgICB2YXIgc3RyID0gZ3JhZnNbaV07XG4gICAgLy8gaWYgdGhpcyBpcyBhbiBIVE1MIG1hcmtlciwgY29weSBpdFxuICAgIGlmIChzdHIuc2VhcmNoKC/CqChLfEcpKFxcZCspXFwxL2cpID49IDApIHtcbiAgICAgIGdyYWZzT3V0LnB1c2goc3RyKTtcblxuICAgIC8vIHRlc3QgZm9yIHByZXNlbmNlIG9mIGNoYXJhY3RlcnMgdG8gcHJldmVudCBlbXB0eSBsaW5lcyBiZWluZyBwYXJzZWRcbiAgICAvLyBhcyBwYXJhZ3JhcGhzIChyZXN1bHRpbmcgaW4gdW5kZXNpcmVkIGV4dHJhIGVtcHR5IHBhcmFncmFwaHMpXG4gICAgfSBlbHNlIGlmIChzdHIuc2VhcmNoKC9cXFMvKSA+PSAwKSB7XG4gICAgICBzdHIgPSBzaG93ZG93bi5zdWJQYXJzZXIoJ3NwYW5HYW11dCcpKHN0ciwgb3B0aW9ucywgZ2xvYmFscyk7XG4gICAgICBzdHIgPSBzdHIucmVwbGFjZSgvXihbIFxcdF0qKS9nLCAnPHA+Jyk7XG4gICAgICBzdHIgKz0gJzwvcD4nO1xuICAgICAgZ3JhZnNPdXQucHVzaChzdHIpO1xuICAgIH1cbiAgfVxuXG4gIC8qKiBVbmhhc2hpZnkgSFRNTCBibG9ja3MgKi9cbiAgZW5kID0gZ3JhZnNPdXQubGVuZ3RoO1xuICBmb3IgKGkgPSAwOyBpIDwgZW5kOyBpKyspIHtcbiAgICB2YXIgYmxvY2tUZXh0ID0gJycsXG4gICAgICAgIGdyYWZzT3V0SXQgPSBncmFmc091dFtpXSxcbiAgICAgICAgY29kZUZsYWcgPSBmYWxzZTtcbiAgICAvLyBpZiB0aGlzIGlzIGEgbWFya2VyIGZvciBhbiBodG1sIGJsb2NrLi4uXG4gICAgLy8gdXNlIFJlZ0V4cC50ZXN0IGluc3RlYWQgb2Ygc3RyaW5nLnNlYXJjaCBiZWNhdXNlIG9mIFFNTCBidWdcbiAgICB3aGlsZSAoL8KoKEt8RykoXFxkKylcXDEvLnRlc3QoZ3JhZnNPdXRJdCkpIHtcbiAgICAgIHZhciBkZWxpbSA9IFJlZ0V4cC4kMSxcbiAgICAgICAgICBudW0gICA9IFJlZ0V4cC4kMjtcblxuICAgICAgaWYgKGRlbGltID09PSAnSycpIHtcbiAgICAgICAgYmxvY2tUZXh0ID0gZ2xvYmFscy5nSHRtbEJsb2Nrc1tudW1dO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gd2UgbmVlZCB0byBjaGVjayBpZiBnaEJsb2NrIGlzIGEgZmFsc2UgcG9zaXRpdmVcbiAgICAgICAgaWYgKGNvZGVGbGFnKSB7XG4gICAgICAgICAgLy8gdXNlIGVuY29kZWQgdmVyc2lvbiBvZiBhbGwgdGV4dFxuICAgICAgICAgIGJsb2NrVGV4dCA9IHNob3dkb3duLnN1YlBhcnNlcignZW5jb2RlQ29kZScpKGdsb2JhbHMuZ2hDb2RlQmxvY2tzW251bV0udGV4dCwgb3B0aW9ucywgZ2xvYmFscyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgYmxvY2tUZXh0ID0gZ2xvYmFscy5naENvZGVCbG9ja3NbbnVtXS5jb2RlYmxvY2s7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGJsb2NrVGV4dCA9IGJsb2NrVGV4dC5yZXBsYWNlKC9cXCQvZywgJyQkJCQnKTsgLy8gRXNjYXBlIGFueSBkb2xsYXIgc2lnbnNcblxuICAgICAgZ3JhZnNPdXRJdCA9IGdyYWZzT3V0SXQucmVwbGFjZSgvKFxcblxcbik/wqgoS3xHKVxcZCtcXDIoXFxuXFxuKT8vLCBibG9ja1RleHQpO1xuICAgICAgLy8gQ2hlY2sgaWYgZ3JhZnNPdXRJdCBpcyBhIHByZS0+Y29kZVxuICAgICAgaWYgKC9ePHByZVxcYltePl0qPlxccyo8Y29kZVxcYltePl0qPi8udGVzdChncmFmc091dEl0KSkge1xuICAgICAgICBjb2RlRmxhZyA9IHRydWU7XG4gICAgICB9XG4gICAgfVxuICAgIGdyYWZzT3V0W2ldID0gZ3JhZnNPdXRJdDtcbiAgfVxuICB0ZXh0ID0gZ3JhZnNPdXQuam9pbignXFxuJyk7XG4gIC8vIFN0cmlwIGxlYWRpbmcgYW5kIHRyYWlsaW5nIGxpbmVzOlxuICB0ZXh0ID0gdGV4dC5yZXBsYWNlKC9eXFxuKy9nLCAnJyk7XG4gIHRleHQgPSB0ZXh0LnJlcGxhY2UoL1xcbiskL2csICcnKTtcbiAgcmV0dXJuIGdsb2JhbHMuY29udmVydGVyLl9kaXNwYXRjaCgncGFyYWdyYXBocy5hZnRlcicsIHRleHQsIG9wdGlvbnMsIGdsb2JhbHMpO1xufSk7XG5cclxuLyoqXG4gKiBSdW4gZXh0ZW5zaW9uXG4gKi9cbnNob3dkb3duLnN1YlBhcnNlcigncnVuRXh0ZW5zaW9uJywgZnVuY3Rpb24gKGV4dCwgdGV4dCwgb3B0aW9ucywgZ2xvYmFscykge1xuICAndXNlIHN0cmljdCc7XG5cbiAgaWYgKGV4dC5maWx0ZXIpIHtcbiAgICB0ZXh0ID0gZXh0LmZpbHRlcih0ZXh0LCBnbG9iYWxzLmNvbnZlcnRlciwgb3B0aW9ucyk7XG5cbiAgfSBlbHNlIGlmIChleHQucmVnZXgpIHtcbiAgICAvLyBUT0RPIHJlbW92ZSB0aGlzIHdoZW4gb2xkIGV4dGVuc2lvbiBsb2FkaW5nIG1lY2hhbmlzbSBpcyBkZXByZWNhdGVkXG4gICAgdmFyIHJlID0gZXh0LnJlZ2V4O1xuICAgIGlmICghKHJlIGluc3RhbmNlb2YgUmVnRXhwKSkge1xuICAgICAgcmUgPSBuZXcgUmVnRXhwKHJlLCAnZycpO1xuICAgIH1cbiAgICB0ZXh0ID0gdGV4dC5yZXBsYWNlKHJlLCBleHQucmVwbGFjZSk7XG4gIH1cblxuICByZXR1cm4gdGV4dDtcbn0pO1xuXHJcbi8qKlxuICogVGhlc2UgYXJlIGFsbCB0aGUgdHJhbnNmb3JtYXRpb25zIHRoYXQgb2NjdXIgKndpdGhpbiogYmxvY2stbGV2ZWxcbiAqIHRhZ3MgbGlrZSBwYXJhZ3JhcGhzLCBoZWFkZXJzLCBhbmQgbGlzdCBpdGVtcy5cbiAqL1xuc2hvd2Rvd24uc3ViUGFyc2VyKCdzcGFuR2FtdXQnLCBmdW5jdGlvbiAodGV4dCwgb3B0aW9ucywgZ2xvYmFscykge1xuICAndXNlIHN0cmljdCc7XG5cbiAgdGV4dCA9IGdsb2JhbHMuY29udmVydGVyLl9kaXNwYXRjaCgnc3BhbkdhbXV0LmJlZm9yZScsIHRleHQsIG9wdGlvbnMsIGdsb2JhbHMpO1xuICB0ZXh0ID0gc2hvd2Rvd24uc3ViUGFyc2VyKCdjb2RlU3BhbnMnKSh0ZXh0LCBvcHRpb25zLCBnbG9iYWxzKTtcbiAgdGV4dCA9IHNob3dkb3duLnN1YlBhcnNlcignZXNjYXBlU3BlY2lhbENoYXJzV2l0aGluVGFnQXR0cmlidXRlcycpKHRleHQsIG9wdGlvbnMsIGdsb2JhbHMpO1xuICB0ZXh0ID0gc2hvd2Rvd24uc3ViUGFyc2VyKCdlbmNvZGVCYWNrc2xhc2hFc2NhcGVzJykodGV4dCwgb3B0aW9ucywgZ2xvYmFscyk7XG5cbiAgLy8gUHJvY2VzcyBhbmNob3IgYW5kIGltYWdlIHRhZ3MuIEltYWdlcyBtdXN0IGNvbWUgZmlyc3QsXG4gIC8vIGJlY2F1c2UgIVtmb29dW2ZdIGxvb2tzIGxpa2UgYW4gYW5jaG9yLlxuICB0ZXh0ID0gc2hvd2Rvd24uc3ViUGFyc2VyKCdpbWFnZXMnKSh0ZXh0LCBvcHRpb25zLCBnbG9iYWxzKTtcbiAgdGV4dCA9IHNob3dkb3duLnN1YlBhcnNlcignYW5jaG9ycycpKHRleHQsIG9wdGlvbnMsIGdsb2JhbHMpO1xuXG4gIC8vIE1ha2UgbGlua3Mgb3V0IG9mIHRoaW5ncyBsaWtlIGA8aHR0cDovL2V4YW1wbGUuY29tLz5gXG4gIC8vIE11c3QgY29tZSBhZnRlciBfRG9BbmNob3JzKCksIGJlY2F1c2UgeW91IGNhbiB1c2UgPCBhbmQgPlxuICAvLyBkZWxpbWl0ZXJzIGluIGlubGluZSBsaW5rcyBsaWtlIFt0aGlzXSg8dXJsPikuXG4gIHRleHQgPSBzaG93ZG93bi5zdWJQYXJzZXIoJ2F1dG9MaW5rcycpKHRleHQsIG9wdGlvbnMsIGdsb2JhbHMpO1xuICB0ZXh0ID0gc2hvd2Rvd24uc3ViUGFyc2VyKCdpdGFsaWNzQW5kQm9sZCcpKHRleHQsIG9wdGlvbnMsIGdsb2JhbHMpO1xuICB0ZXh0ID0gc2hvd2Rvd24uc3ViUGFyc2VyKCdzdHJpa2V0aHJvdWdoJykodGV4dCwgb3B0aW9ucywgZ2xvYmFscyk7XG5cbiAgLy8gd2UgbmVlZCB0byBoYXNoIEhUTUwgdGFncyBpbnNpZGUgc3BhbnNcbiAgdGV4dCA9IHNob3dkb3duLnN1YlBhcnNlcignaGFzaEhUTUxTcGFucycpKHRleHQsIG9wdGlvbnMsIGdsb2JhbHMpO1xuXG4gIC8vIG5vdyB3ZSBlbmNvZGUgYW1wcyBhbmQgYW5nbGVzXG4gIHRleHQgPSBzaG93ZG93bi5zdWJQYXJzZXIoJ2VuY29kZUFtcHNBbmRBbmdsZXMnKSh0ZXh0LCBvcHRpb25zLCBnbG9iYWxzKTtcblxuICAvLyBEbyBoYXJkIGJyZWFrc1xuICBpZiAob3B0aW9ucy5zaW1wbGVMaW5lQnJlYWtzKSB7XG4gICAgLy8gR0ZNIHN0eWxlIGhhcmQgYnJlYWtzXG4gICAgdGV4dCA9IHRleHQucmVwbGFjZSgvXFxuL2csICc8YnIgLz5cXG4nKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBWYW5pbGxhIGhhcmQgYnJlYWtzXG4gICAgdGV4dCA9IHRleHQucmVwbGFjZSgvICArXFxuL2csICc8YnIgLz5cXG4nKTtcbiAgfVxuXG4gIHRleHQgPSBnbG9iYWxzLmNvbnZlcnRlci5fZGlzcGF0Y2goJ3NwYW5HYW11dC5hZnRlcicsIHRleHQsIG9wdGlvbnMsIGdsb2JhbHMpO1xuICByZXR1cm4gdGV4dDtcbn0pO1xuXHJcbnNob3dkb3duLnN1YlBhcnNlcignc3RyaWtldGhyb3VnaCcsIGZ1bmN0aW9uICh0ZXh0LCBvcHRpb25zLCBnbG9iYWxzKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICBpZiAob3B0aW9ucy5zdHJpa2V0aHJvdWdoKSB7XG4gICAgdGV4dCA9IGdsb2JhbHMuY29udmVydGVyLl9kaXNwYXRjaCgnc3RyaWtldGhyb3VnaC5iZWZvcmUnLCB0ZXh0LCBvcHRpb25zLCBnbG9iYWxzKTtcbiAgICB0ZXh0ID0gdGV4dC5yZXBsYWNlKC8oPzp+KXsyfShbXFxzXFxTXSs/KSg/On4pezJ9L2csICc8ZGVsPiQxPC9kZWw+Jyk7XG4gICAgdGV4dCA9IGdsb2JhbHMuY29udmVydGVyLl9kaXNwYXRjaCgnc3RyaWtldGhyb3VnaC5hZnRlcicsIHRleHQsIG9wdGlvbnMsIGdsb2JhbHMpO1xuICB9XG5cbiAgcmV0dXJuIHRleHQ7XG59KTtcblxyXG4vKipcbiAqIFN0cmlwcyBsaW5rIGRlZmluaXRpb25zIGZyb20gdGV4dCwgc3RvcmVzIHRoZSBVUkxzIGFuZCB0aXRsZXMgaW5cbiAqIGhhc2ggcmVmZXJlbmNlcy5cbiAqIExpbmsgZGVmcyBhcmUgaW4gdGhlIGZvcm06IF5baWRdOiB1cmwgXCJvcHRpb25hbCB0aXRsZVwiXG4gKi9cbnNob3dkb3duLnN1YlBhcnNlcignc3RyaXBMaW5rRGVmaW5pdGlvbnMnLCBmdW5jdGlvbiAodGV4dCwgb3B0aW9ucywgZ2xvYmFscykge1xuICAndXNlIHN0cmljdCc7XG5cbiAgdmFyIHJlZ2V4ID0gL14gezAsM31cXFsoLispXTpbIFxcdF0qXFxuP1sgXFx0XSo8PyhcXFMrPyk+Pyg/OiA9KFsqXFxkXStbQS1aYS16JV17MCw0fSl4KFsqXFxkXStbQS1aYS16JV17MCw0fSkpP1sgXFx0XSpcXG4/WyBcXHRdKig/OihcXG4qKVtcInwnKF0oLis/KVtcInwnKV1bIFxcdF0qKT8oPzpcXG4rfCg/PcKoMCkpL2dtO1xuXG4gIC8vIGF0dGFja2xhYjogc2VudGluZWwgd29ya2Fyb3VuZHMgZm9yIGxhY2sgb2YgXFxBIGFuZCBcXFosIHNhZmFyaVxca2h0bWwgYnVnXG4gIHRleHQgKz0gJ8KoMCc7XG5cbiAgdGV4dCA9IHRleHQucmVwbGFjZShyZWdleCwgZnVuY3Rpb24gKHdob2xlTWF0Y2gsIGxpbmtJZCwgdXJsLCB3aWR0aCwgaGVpZ2h0LCBibGFua0xpbmVzLCB0aXRsZSkge1xuICAgIGxpbmtJZCA9IGxpbmtJZC50b0xvd2VyQ2FzZSgpO1xuICAgIGdsb2JhbHMuZ1VybHNbbGlua0lkXSA9IHNob3dkb3duLnN1YlBhcnNlcignZW5jb2RlQW1wc0FuZEFuZ2xlcycpKHVybCwgb3B0aW9ucywgZ2xvYmFscyk7ICAvLyBMaW5rIElEcyBhcmUgY2FzZS1pbnNlbnNpdGl2ZVxuXG4gICAgaWYgKGJsYW5rTGluZXMpIHtcbiAgICAgIC8vIE9vcHMsIGZvdW5kIGJsYW5rIGxpbmVzLCBzbyBpdCdzIG5vdCBhIHRpdGxlLlxuICAgICAgLy8gUHV0IGJhY2sgdGhlIHBhcmVudGhldGljYWwgc3RhdGVtZW50IHdlIHN0b2xlLlxuICAgICAgcmV0dXJuIGJsYW5rTGluZXMgKyB0aXRsZTtcblxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAodGl0bGUpIHtcbiAgICAgICAgZ2xvYmFscy5nVGl0bGVzW2xpbmtJZF0gPSB0aXRsZS5yZXBsYWNlKC9cInwnL2csICcmcXVvdDsnKTtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRpb25zLnBhcnNlSW1nRGltZW5zaW9ucyAmJiB3aWR0aCAmJiBoZWlnaHQpIHtcbiAgICAgICAgZ2xvYmFscy5nRGltZW5zaW9uc1tsaW5rSWRdID0ge1xuICAgICAgICAgIHdpZHRoOiAgd2lkdGgsXG4gICAgICAgICAgaGVpZ2h0OiBoZWlnaHRcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9XG4gICAgLy8gQ29tcGxldGVseSByZW1vdmUgdGhlIGRlZmluaXRpb24gZnJvbSB0aGUgdGV4dFxuICAgIHJldHVybiAnJztcbiAgfSk7XG5cbiAgLy8gYXR0YWNrbGFiOiBzdHJpcCBzZW50aW5lbFxuICB0ZXh0ID0gdGV4dC5yZXBsYWNlKC/CqDAvLCAnJyk7XG5cbiAgcmV0dXJuIHRleHQ7XG59KTtcblxyXG5zaG93ZG93bi5zdWJQYXJzZXIoJ3RhYmxlcycsIGZ1bmN0aW9uICh0ZXh0LCBvcHRpb25zLCBnbG9iYWxzKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICBpZiAoIW9wdGlvbnMudGFibGVzKSB7XG4gICAgcmV0dXJuIHRleHQ7XG4gIH1cblxuICB2YXIgdGFibGVSZ3ggPSAvXiB7MCwzfVxcfD8uK1xcfC4rXFxuWyBcXHRdezAsM31cXHw/WyBcXHRdKjo/WyBcXHRdKig/Oi18PSl7Mix9WyBcXHRdKjo/WyBcXHRdKlxcfFsgXFx0XSo6P1sgXFx0XSooPzotfD0pezIsfVtcXHNcXFNdKz8oPzpcXG5cXG58wqgwKS9nbTtcblxuICBmdW5jdGlvbiBwYXJzZVN0eWxlcyAoc0xpbmUpIHtcbiAgICBpZiAoL146WyBcXHRdKi0tKiQvLnRlc3Qoc0xpbmUpKSB7XG4gICAgICByZXR1cm4gJyBzdHlsZT1cInRleHQtYWxpZ246bGVmdDtcIic7XG4gICAgfSBlbHNlIGlmICgvXi0tKlsgXFx0XSo6WyBcXHRdKiQvLnRlc3Qoc0xpbmUpKSB7XG4gICAgICByZXR1cm4gJyBzdHlsZT1cInRleHQtYWxpZ246cmlnaHQ7XCInO1xuICAgIH0gZWxzZSBpZiAoL146WyBcXHRdKi0tKlsgXFx0XSo6JC8udGVzdChzTGluZSkpIHtcbiAgICAgIHJldHVybiAnIHN0eWxlPVwidGV4dC1hbGlnbjpjZW50ZXI7XCInO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gJyc7XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gcGFyc2VIZWFkZXJzIChoZWFkZXIsIHN0eWxlKSB7XG4gICAgdmFyIGlkID0gJyc7XG4gICAgaGVhZGVyID0gaGVhZGVyLnRyaW0oKTtcbiAgICBpZiAob3B0aW9ucy50YWJsZUhlYWRlcklkKSB7XG4gICAgICBpZCA9ICcgaWQ9XCInICsgaGVhZGVyLnJlcGxhY2UoLyAvZywgJ18nKS50b0xvd2VyQ2FzZSgpICsgJ1wiJztcbiAgICB9XG4gICAgaGVhZGVyID0gc2hvd2Rvd24uc3ViUGFyc2VyKCdzcGFuR2FtdXQnKShoZWFkZXIsIG9wdGlvbnMsIGdsb2JhbHMpO1xuXG4gICAgcmV0dXJuICc8dGgnICsgaWQgKyBzdHlsZSArICc+JyArIGhlYWRlciArICc8L3RoPlxcbic7XG4gIH1cblxuICBmdW5jdGlvbiBwYXJzZUNlbGxzIChjZWxsLCBzdHlsZSkge1xuICAgIHZhciBzdWJUZXh0ID0gc2hvd2Rvd24uc3ViUGFyc2VyKCdzcGFuR2FtdXQnKShjZWxsLCBvcHRpb25zLCBnbG9iYWxzKTtcbiAgICByZXR1cm4gJzx0ZCcgKyBzdHlsZSArICc+JyArIHN1YlRleHQgKyAnPC90ZD5cXG4nO1xuICB9XG5cbiAgZnVuY3Rpb24gYnVpbGRUYWJsZSAoaGVhZGVycywgY2VsbHMpIHtcbiAgICB2YXIgdGIgPSAnPHRhYmxlPlxcbjx0aGVhZD5cXG48dHI+XFxuJyxcbiAgICAgICAgdGJsTGduID0gaGVhZGVycy5sZW5ndGg7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRibExnbjsgKytpKSB7XG4gICAgICB0YiArPSBoZWFkZXJzW2ldO1xuICAgIH1cbiAgICB0YiArPSAnPC90cj5cXG48L3RoZWFkPlxcbjx0Ym9keT5cXG4nO1xuXG4gICAgZm9yIChpID0gMDsgaSA8IGNlbGxzLmxlbmd0aDsgKytpKSB7XG4gICAgICB0YiArPSAnPHRyPlxcbic7XG4gICAgICBmb3IgKHZhciBpaSA9IDA7IGlpIDwgdGJsTGduOyArK2lpKSB7XG4gICAgICAgIHRiICs9IGNlbGxzW2ldW2lpXTtcbiAgICAgIH1cbiAgICAgIHRiICs9ICc8L3RyPlxcbic7XG4gICAgfVxuICAgIHRiICs9ICc8L3Rib2R5PlxcbjwvdGFibGU+XFxuJztcbiAgICByZXR1cm4gdGI7XG4gIH1cblxuICB0ZXh0ID0gZ2xvYmFscy5jb252ZXJ0ZXIuX2Rpc3BhdGNoKCd0YWJsZXMuYmVmb3JlJywgdGV4dCwgb3B0aW9ucywgZ2xvYmFscyk7XG5cbiAgdGV4dCA9IHRleHQucmVwbGFjZSh0YWJsZVJneCwgZnVuY3Rpb24gKHJhd1RhYmxlKSB7XG5cbiAgICB2YXIgaSwgdGFibGVMaW5lcyA9IHJhd1RhYmxlLnNwbGl0KCdcXG4nKTtcblxuICAgIC8vIHN0cmlwIHdyb25nIGZpcnN0IGFuZCBsYXN0IGNvbHVtbiBpZiB3cmFwcGVkIHRhYmxlcyBhcmUgdXNlZFxuICAgIGZvciAoaSA9IDA7IGkgPCB0YWJsZUxpbmVzLmxlbmd0aDsgKytpKSB7XG4gICAgICBpZiAoL14gezAsM31cXHwvLnRlc3QodGFibGVMaW5lc1tpXSkpIHtcbiAgICAgICAgdGFibGVMaW5lc1tpXSA9IHRhYmxlTGluZXNbaV0ucmVwbGFjZSgvXiB7MCwzfVxcfC8sICcnKTtcbiAgICAgIH1cbiAgICAgIGlmICgvXFx8WyBcXHRdKiQvLnRlc3QodGFibGVMaW5lc1tpXSkpIHtcbiAgICAgICAgdGFibGVMaW5lc1tpXSA9IHRhYmxlTGluZXNbaV0ucmVwbGFjZSgvXFx8WyBcXHRdKiQvLCAnJyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgdmFyIHJhd0hlYWRlcnMgPSB0YWJsZUxpbmVzWzBdLnNwbGl0KCd8JykubWFwKGZ1bmN0aW9uIChzKSB7IHJldHVybiBzLnRyaW0oKTt9KSxcbiAgICAgICAgcmF3U3R5bGVzID0gdGFibGVMaW5lc1sxXS5zcGxpdCgnfCcpLm1hcChmdW5jdGlvbiAocykgeyByZXR1cm4gcy50cmltKCk7fSksXG4gICAgICAgIHJhd0NlbGxzID0gW10sXG4gICAgICAgIGhlYWRlcnMgPSBbXSxcbiAgICAgICAgc3R5bGVzID0gW10sXG4gICAgICAgIGNlbGxzID0gW107XG5cbiAgICB0YWJsZUxpbmVzLnNoaWZ0KCk7XG4gICAgdGFibGVMaW5lcy5zaGlmdCgpO1xuXG4gICAgZm9yIChpID0gMDsgaSA8IHRhYmxlTGluZXMubGVuZ3RoOyArK2kpIHtcbiAgICAgIGlmICh0YWJsZUxpbmVzW2ldLnRyaW0oKSA9PT0gJycpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICByYXdDZWxscy5wdXNoKFxuICAgICAgICB0YWJsZUxpbmVzW2ldXG4gICAgICAgICAgLnNwbGl0KCd8JylcbiAgICAgICAgICAubWFwKGZ1bmN0aW9uIChzKSB7XG4gICAgICAgICAgICByZXR1cm4gcy50cmltKCk7XG4gICAgICAgICAgfSlcbiAgICAgICk7XG4gICAgfVxuXG4gICAgaWYgKHJhd0hlYWRlcnMubGVuZ3RoIDwgcmF3U3R5bGVzLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIHJhd1RhYmxlO1xuICAgIH1cblxuICAgIGZvciAoaSA9IDA7IGkgPCByYXdTdHlsZXMubGVuZ3RoOyArK2kpIHtcbiAgICAgIHN0eWxlcy5wdXNoKHBhcnNlU3R5bGVzKHJhd1N0eWxlc1tpXSkpO1xuICAgIH1cblxuICAgIGZvciAoaSA9IDA7IGkgPCByYXdIZWFkZXJzLmxlbmd0aDsgKytpKSB7XG4gICAgICBpZiAoc2hvd2Rvd24uaGVscGVyLmlzVW5kZWZpbmVkKHN0eWxlc1tpXSkpIHtcbiAgICAgICAgc3R5bGVzW2ldID0gJyc7XG4gICAgICB9XG4gICAgICBoZWFkZXJzLnB1c2gocGFyc2VIZWFkZXJzKHJhd0hlYWRlcnNbaV0sIHN0eWxlc1tpXSkpO1xuICAgIH1cblxuICAgIGZvciAoaSA9IDA7IGkgPCByYXdDZWxscy5sZW5ndGg7ICsraSkge1xuICAgICAgdmFyIHJvdyA9IFtdO1xuICAgICAgZm9yICh2YXIgaWkgPSAwOyBpaSA8IGhlYWRlcnMubGVuZ3RoOyArK2lpKSB7XG4gICAgICAgIGlmIChzaG93ZG93bi5oZWxwZXIuaXNVbmRlZmluZWQocmF3Q2VsbHNbaV1baWldKSkge1xuXG4gICAgICAgIH1cbiAgICAgICAgcm93LnB1c2gocGFyc2VDZWxscyhyYXdDZWxsc1tpXVtpaV0sIHN0eWxlc1tpaV0pKTtcbiAgICAgIH1cbiAgICAgIGNlbGxzLnB1c2gocm93KTtcbiAgICB9XG5cbiAgICByZXR1cm4gYnVpbGRUYWJsZShoZWFkZXJzLCBjZWxscyk7XG4gIH0pO1xuXG4gIHRleHQgPSBnbG9iYWxzLmNvbnZlcnRlci5fZGlzcGF0Y2goJ3RhYmxlcy5hZnRlcicsIHRleHQsIG9wdGlvbnMsIGdsb2JhbHMpO1xuXG4gIHJldHVybiB0ZXh0O1xufSk7XG5cclxuLyoqXG4gKiBTd2FwIGJhY2sgaW4gYWxsIHRoZSBzcGVjaWFsIGNoYXJhY3RlcnMgd2UndmUgaGlkZGVuLlxuICovXG5zaG93ZG93bi5zdWJQYXJzZXIoJ3VuZXNjYXBlU3BlY2lhbENoYXJzJywgZnVuY3Rpb24gKHRleHQsIG9wdGlvbnMsIGdsb2JhbHMpIHtcbiAgJ3VzZSBzdHJpY3QnO1xuICB0ZXh0ID0gZ2xvYmFscy5jb252ZXJ0ZXIuX2Rpc3BhdGNoKCd1bmVzY2FwZVNwZWNpYWxDaGFycy5iZWZvcmUnLCB0ZXh0LCBvcHRpb25zLCBnbG9iYWxzKTtcblxuICB0ZXh0ID0gdGV4dC5yZXBsYWNlKC/CqEUoXFxkKylFL2csIGZ1bmN0aW9uICh3aG9sZU1hdGNoLCBtMSkge1xuICAgIHZhciBjaGFyQ29kZVRvUmVwbGFjZSA9IHBhcnNlSW50KG0xKTtcbiAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZShjaGFyQ29kZVRvUmVwbGFjZSk7XG4gIH0pO1xuXG4gIHRleHQgPSBnbG9iYWxzLmNvbnZlcnRlci5fZGlzcGF0Y2goJ3VuZXNjYXBlU3BlY2lhbENoYXJzLmFmdGVyJywgdGV4dCwgb3B0aW9ucywgZ2xvYmFscyk7XG4gIHJldHVybiB0ZXh0O1xufSk7XG5cclxudmFyIHJvb3QgPSB0aGlzO1xuXG4vLyBDb21tb25KUy9ub2RlSlMgTG9hZGVyXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlLmV4cG9ydHMpIHtcbiAgbW9kdWxlLmV4cG9ydHMgPSBzaG93ZG93bjtcblxuLy8gQU1EIExvYWRlclxufSBlbHNlIGlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgZGVmaW5lKGZ1bmN0aW9uICgpIHtcbiAgICAndXNlIHN0cmljdCc7XG4gICAgcmV0dXJuIHNob3dkb3duO1xuICB9KTtcblxuLy8gUmVndWxhciBCcm93c2VyIGxvYWRlclxufSBlbHNlIHtcbiAgcm9vdC5zaG93ZG93biA9IHNob3dkb3duO1xufVxufSkuY2FsbCh0aGlzKTtcclxuXG4vLyMgc291cmNlTWFwcGluZ1VSTD1zaG93ZG93bi5qcy5tYXBcclxuIl19
