(function () {
    'use strict';

    var EE = require('events').EventEmitter;

    module.exports = EventEmitterEx;

    function EventEmitterEx () {
        EE.call(this);
    }
    require('util').inherits(EventEmitterEx, EE);

    EventEmitterEx.prototype.pipeExcept = function pipeExcept (ee, except) {
        var self = this;
        var emit = ee.emit;
        except = except || [];
        ee.emit = function (event /* arguments */) {
            var res = false;
            if (event === 'error') {
                if (EE.listenerCount(ee, event)) res = emit.apply(ee, arguments);
                if (! res || EE.listenerCount(self, event)) res = self.emit.apply(self, arguments);
            } else {
                res = emit.apply(ee, arguments);
                res = except.indexOf(event) === -1 ? self.emit.apply(self, arguments) || res : res;
            }
            return  res;
        };
    };

})();
