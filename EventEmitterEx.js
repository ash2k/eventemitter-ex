(function () {
    'use strict';

    var EE = require('events').EventEmitter,
        util = require('util');

    module.exports = EventEmitterEx;

    function EventEmitterEx () {
        EE.call(this);
        this._onAllListeners = [];
        this._originalEmit = this.emit;
        this.emit = emit;
    }
    util.inherits(EventEmitterEx, EE);

    EventEmitterEx.prototype.onAllExcept = function onAllExcept (f /* arguments */) {
        assertFunction(f);

        var except = Array.prototype.slice.call(arguments, 1);
        this._onAllListeners.push([f, except]);
    };

    function emit (type /* arguments */) {
        var args = arguments,
            res = false,
            filtered = this.listenersOnAll(type);

        if (type !== 'error' || filtered.length === 0 || EE.listenerCount(this, type)) {
            res = this._originalEmit.apply(this, args);
        }

        filtered.forEach(function (listener) {
            listener.apply(null, args);
        });

        return res || filtered.length > 0;
    }

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
    };

    EventEmitterEx.prototype.map = function map (/* arguments */) {
        var eex = new EventEmitterEx(),
            mapArgs = Array.prototype.slice.call(arguments);

        mapArgs.forEach(assertFunction);

        eex.pipeExcept(this, 'end');
        this.on('end', function (/* arguments */) {
            var endArgs = arguments;
            var result = mapArgs.map(function (f) {
                return f.apply(null, endArgs);
            });
            result.unshift('end');
            eex.emit.apply(eex, result);
        });

        return eex;
    };

    EventEmitterEx.prototype.flatMap = function flatMap (f) {
        assertFunction(f);

        var res = new EventEmitterEx();

        res.pipeExcept(this, 'end');
        this.on('end', function (/* arguments */) {
            res.pipeExcept(f.apply(null, arguments));
        });

        return res;
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
        return (typeof eex.listenerCountOnAll === 'function' ? eex.listenerCountOnAll(type) : 0) + EE.listenerCount(eex, type);
    };

    EventEmitterEx.startAsync = function startAsync (f) {
        assertFunction(f);

        var r = new EventEmitterEx();

        setImmediate(function () {
            try {
                f(r);
            } catch (err) {
                r.emit('error', err);
            }
        });

        return r;
    };

    function assertFunction (f) {
        if (typeof f !== 'function')
            throw new TypeError('Argument must be a function. Got ' + typeof f);
    }

})();
