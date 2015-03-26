(function () {
    'use strict';

    var EE = require('events').EventEmitter,
        util = require('util'),
        assert = require('assert');

    module.exports = EventEmitterEx;

    function EventEmitterEx () {
        EE.call(this);
        this._onAllListeners = [];
    }
    util.inherits(EventEmitterEx, EE);

    EventEmitterEx.prototype.onAllExcept = function onAllExcept (f /* arguments */) {
        assertIsFunction(f);

        var except = Array.prototype.slice.call(arguments, 1);
        this._onAllListeners.push([f, except]);
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
        var args = Array.prototype.slice.call(arguments);
        args.unshift('end');

        return this.emitAsync.apply(this, args);
    };

    EventEmitterEx.prototype.pipeExcept = function pipeExcept (ee) {
        var self = this,
            except = Array.prototype.slice.call(arguments, 1);

        if (typeof ee.onAllExcept === 'function') {
            // This is an EventEmitterEx
            except.unshift(function (/* arguments */) {
                self.emit.apply(self, arguments);
            });
            ee.onAllExcept.apply(ee, except);
        } else if (typeof ee.emit === 'function') {
            // This is a usual EventEmitter
            var emit = ee.emit;
            if (except.indexOf('error') === -1) {
                ee.on('error', function (/* arguments */) {
                    var args = Array.prototype.slice.call(arguments);
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
        } else {
            throw new TypeError('Expecting EventEmitter or EventEmitterEx. Given: ' + typeof ee);
        }
        return this;
    };

    EventEmitterEx.prototype.map = function map (/* arguments */) {
        var eex = new EventEmitterEx(),
            mapArgs = Array.prototype.slice.call(arguments);

        mapArgs.forEach(assertIsFunction);

        eex.pipeExcept(this, 'end');
        this.on('end', function (/* arguments */) {
            var result;
            try {
                var endArgs = arguments;
                result = mapArgs.map(function (f) {
                    var res = f.apply(eex, endArgs);
                    return Array.isArray(res) ? res : [res];
                });
                // flatten the array
                result = [].concat.apply(['end'], result);
            } catch (err) {
                eex.emit('error', err);
                return;
            }
            eex.emit.apply(eex, result);
        });

        return eex;
    };

    // Takes zero or more functions and runs them in the same way as #map() but
    // also providing a callback as an additional last parameter. After all functions
    // had called the callback, results are emitted.
    EventEmitterEx.prototype.mapAsync = function mapAsync (/* arguments */) {
        var eex = new EventEmitterEx(),
            funcs = Array.prototype.slice.call(arguments);

        funcs.forEach(assertIsFunction);

        eex.pipeExcept(this, 'end');
        this.on('end', function (/* arguments */) {
            var result = [], firstError, len = funcs.length;
            var endArgs = Array.prototype.slice.call(arguments);
            endArgs.push(callback);

            funcs.forEach(function (f) {
                f.apply(eex, endArgs);
            });

            function callback (err/* arguments */) {
                if (err) {
                    firstError = firstError || err;
                } else {
                    result.push(Array.prototype.slice.call(arguments, 1));
                }
                len--;
                assert(len >= 0, 'Callback called more than once for each mapAsync() function!');
                if (! len) {
                    if (firstError) {
                        eex.emit('error', firstError);
                    } else {
                        // flatten the array
                        eex.emit.apply(eex, [].concat.apply(['end'], result));
                    }
                }
            }
        });

        return eex;
    };

    EventEmitterEx.prototype.flatMap = function flatMap (f) {
        assertIsFunction(f);

        var eex = new EventEmitterEx();

        eex.pipeExcept(this, 'end');
        this.on('end', function (/* arguments */) {
            eex.pipeExcept(f.apply(eex, arguments));
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

    EventEmitterEx.listenerCount = function listenerCount (eex, type) {
        return (typeof eex.listenerCountOnAll === 'function' ? eex.listenerCountOnAll(type) : 0) +
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

    function assertIsFunction (f) {
        if (typeof f !== 'function')
            throw new TypeError('Argument must be a function. Got ' + typeof f);
    }

})();
