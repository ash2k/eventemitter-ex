'use strict';

var EE = require('events').EventEmitter,
    util = require('util'),
    assert = require('assert'),
    slice = Function.prototype.call.bind(Array.prototype.slice),
    concat = Array.prototype.concat;

module.exports = EventEmitterEx;

function EventEmitterEx () {
    EE.call(this);
    this._onAllListeners = [];
}
util.inherits(EventEmitterEx, EE);

EventEmitterEx.prototype.onAllExcept = function onAllExcept (/* arguments */) {
    var f = arguments[arguments.length - 1];
    assertIsFunction(f);

    var except = slice(arguments, 0, -1);
    this._onAllListeners.push([f, except]);

    return this;
};

EventEmitterEx.prototype.emit = function emit (type /* arguments */) {
    var args = arguments,
        res = false,
        filtered = this.listenersOnAll(type);

    if (type !== 'error' || filtered.length === 0 || EE.listenerCount(this, type)) {
        res = EventEmitterEx.super_.prototype.emit.apply(this, args);
    }

    filtered.forEach(function (listener) {
        listener.apply(null, args);
    });

    return res || filtered.length > 0;
};

EventEmitterEx.prototype.emitAsync = function emitAsync (/* arguments */) {
    var args = arguments,
        self = this;

    setImmediate(function () {
        self.emit.apply(self, args);
    });

    return this;
};

EventEmitterEx.prototype.startPipeline = function startPipeline (/* arguments */) {
    var args = slice(arguments);
    args.unshift('end');

    return this.emitAsync.apply(this, args);
};

EventEmitterEx.prototype.pipeExcept = function pipeExcept (/* arguments */) {
    var ee = arguments[arguments.length - 1];
    if (! (ee instanceof EE)) {
        throw new TypeError('Expecting EventEmitter or EventEmitterEx. Given: ' + typeof ee);
    }

    var self = this,
        except = slice(arguments, 0, -1);

    if (isFunction(ee.onAllExcept)) {
        // This is an EventEmitterEx
        except.push(function (/* arguments */) {
            self.emit.apply(self, arguments);
        });
        ee.onAllExcept.apply(ee, except);
    } else {
        // This is a usual EventEmitter
        var emit = ee.emit;
        if (except.indexOf('error') === -1) {
            ee.on('error', function (/* arguments */) {
                var args = slice(arguments);
                args.unshift('error');
                self.emit.apply(self, args);
            });
        }

        ee.emit = function pipedEmit (type /* arguments */) {
            var args = arguments,
                res = emit.apply(ee, args);
            if (type !== 'error' && except.indexOf(type) === -1) {
                res = self.emit.apply(self, args) || res;
            }
            return  res;
        };
    }
    return this;
};

EventEmitterEx.prototype.pipeAsPromise = function pipeAsPromise (emitter) {
    this.pipeExcept('end', 'error', emitter);
    return EventEmitterEx.asPromise(emitter);
};

EventEmitterEx.prototype.map = function map (/* arguments */) {
    var eex = new EventEmitterEx(),
        mapArgs = slice(arguments);

    mapArgs.forEach(assertIsFunction);

    eex.pipeExcept('end', this);
    this.on('end', function (/* arguments */) {
        var result = [], firstError, len = mapArgs.length, lenLoop = len;
        var endArgs = arguments;
        for (var i = 0; i < lenLoop; i++) {
            new Promise(invokeFunc.bind(null, mapArgs[i]))
                .then(onResolved.bind(null, i), onRejected);
        }

        function invokeFunc (func, resolve) {
            resolve(func.apply(eex, endArgs));
        }

        function onResolved (idx, value) {
            result[idx] = Array.isArray(value) ? value : [value];
            maybeFinish();
        }

        function onRejected (reason) {
            if (! isError(firstError)) {
                firstError = reason;
            }
            maybeFinish();
        }

        function maybeFinish () {
            len--;
            if (! len) {
                if (isError(firstError)) {
                    eex.emit('error', firstError);
                } else {
                    // flatten the array
                    eex.emit.apply(eex, concat.apply(['end'], result));
                }
            }
        }
    });

    return eex;
};

// Takes zero or more functions and runs them in the same way as #map() but
// also providing a callback as an additional last parameter. After all functions
// had called the callback, results are emitted.
EventEmitterEx.prototype.mapAsync = function mapAsync (/* arguments */) {
    var eex = new EventEmitterEx(),
        funcs = slice(arguments);

    funcs.forEach(assertIsFunction);

    eex.pipeExcept('end', this);
    this.on('end', function (/* arguments */) {
        var result = [], firstError, len = funcs.length, lenLoop = len;
        var endArgs = slice(arguments),
            endArgsLen = endArgs.length;

        for (var i = 0; i < lenLoop; i++) {
            endArgs[endArgsLen] = callback.bind(null, i);
            funcs[i].apply(eex, endArgs);
        }

        function callback (position, err/* arguments */) {
            assert(! Array.isArray(result[position]),
                'Callback called more than once by function at position ' + position + ' (0-based)');

            if (isError(err)) {
                if (! firstError) {
                    firstError = slice(arguments, 1);
                }
                result[position] = [];
            } else {
                result[position] = slice(arguments, 2);
            }
            len--;
            if (! len) {
                if (firstError) {
                    firstError.unshift('error');
                    eex.emit.apply(eex, firstError);
                } else {
                    // flatten the array
                    eex.emit.apply(eex, concat.apply(['end'], result));
                }
            }
        }
    });

    return eex;
};

EventEmitterEx.prototype.flatMap = function flatMap (/* arguments */) {
    var eex = new EventEmitterEx(),
        funcs = slice(arguments);

    funcs.forEach(assertIsFunction);

    eex.pipeExcept('end', this);
    this.on('end', function (/* arguments */) {
        var result = [], firstError, len = funcs.length, lenLoop = len;

        for (var i = 0; i < lenLoop; i++) {
            var e = funcs[i].apply(eex, arguments);
            eex.pipeExcept('end', 'error', e);
            e.on('end', endListener.bind(null, i));
            e.on('error', errorListener.bind(null, i));
        }

        function checkUsage (position) {
            assert(! Array.isArray(result[position]),
                'end/error (or both) event emitted more than once by emitter at position ' + position + ' (0-based)');
        }

        function endListener (position/* arguments */) {
            checkUsage(position);
            result[position] = slice(arguments, 1);
            maybeNext();
        }

        function errorListener (position/* arguments */) {
            checkUsage(position);
            if (! firstError) {
                firstError = slice(arguments, 1);
            }
            result[position] = [];
            maybeNext();
        }

        function maybeNext () {
            len--;
            if (! len) {
                if (firstError) {
                    firstError.unshift('error');
                    eex.emit.apply(eex, firstError);
                } else {
                    // flatten the array
                    eex.emit.apply(eex, concat.apply(['end'], result));
                }
            }
        }
    });

    return eex;
};

EventEmitterEx.prototype.listenersOnAll = function listenersOnAll (type) {
    return this._onAllListeners
        .filter(function (listener) {
            return listener[1].indexOf(type) === -1;
        })
        .map(function (listener) {
            return listener[0];
        });
};

EventEmitterEx.prototype.listenerCountOnAll = function listenerCountOnAll (type) {
    return this.listenersOnAll(type).length;
};

EventEmitterEx.prototype.asPromise = function asPromise () {
    return EventEmitterEx.asPromise(this);
};

EventEmitterEx.listenerCount = function listenerCount (eex, type) {
    return (isFunction(eex.listenerCountOnAll) ? eex.listenerCountOnAll(type) : 0) +
        EE.listenerCount(eex, type);
};

// Should NOT emit exceptions from function as errors.
// Code should not catch exceptions, thrown by listeners for 'end' event because
// emitting 'error' in that case is wrong - it is the callback that is failed, not the original
// operation. Also calling more than one 'final' callback is wrong.
EventEmitterEx.startAsync = function startAsync (f) {
    assertIsFunction(f);

    var r = new EventEmitterEx();

    setImmediate(f.bind(null, r));

    return r;
};

EventEmitterEx.asPromise = function asPromise (emitter) {
    return new Promise(function (resolve, reject) {
        emitter.on('error', reject);
        emitter.on('end', function (value) {
            // we only consume the first argument
            resolve(value);
        });
    });
};

EventEmitterEx.fromPromise = function fromPromise (promise) {
    var eex = new EventEmitterEx();

    promise.then(eex.emit.bind(eex, 'end'), eex.emit.bind(eex, 'error'));

    return eex;
};

EventEmitterEx.fromPromiseFunc = function fromPromiseFunc (f) {
    assertIsFunction(f);

    var eex = new EventEmitterEx();

    setImmediate(function () {
        f(eex).then(eex.emit.bind(eex, 'end'), eex.emit.bind(eex, 'error'));
    });

    return eex;
};

function isFunction (f) {
    return typeof f === 'function';
}

function assertIsFunction (f) {
    if (! isFunction(f)) {
        throw new TypeError('Argument must be a function. Got ' + typeof f);
    }
}

function isError (e) {
    return e !== null && typeof e !== 'undefined';
}
