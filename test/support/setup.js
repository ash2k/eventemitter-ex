(function () {
    'use strict';

    var chai = require('chai');
    global.chai = chai;
    global.should = chai.should();
    global.expect = chai.expect;
    chai.use(require('sinon-chai'));
    global.sinon = require('sinon');

    Error.stackTraceLimit = Infinity;

})();
