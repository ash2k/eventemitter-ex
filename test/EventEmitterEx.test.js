(function () {
    'use strict';
    /*jshint expr: true*/

    var EventEmitter = require('events').EventEmitter,
        EEX = require('../EventEmitterEx'),
        emitter;

    beforeEach(function () {
        emitter = new EEX();
    });

    describe('EventEmitterEx', function () {

        describe('#startAsync()', function () {

            it('should throw exception on non-function arguments', function () {
                expect(function () {
                    EEX.startAsync(42);
                }).to.throw(TypeError, /Argument must be a function/);
            });

            it('should call function with a new emitter', function (done) {
                var eexResult = EEX.startAsync(function (eex) {
                    eex.should.be.equal(eexResult);
                    done();
                });
                eexResult.should.be.instanceOf(EEX);
            });

            it('should emit exceptions from function as errors', function (done) {
                var e = new Error('234');
                var eexResult = EEX.startAsync(function () {
                    throw e;
                });
                eexResult.on('error', function (err) {
                    err.should.be.equal(e);
                    done();
                });
            });

        });

        describe('#pipeExcept()', function () {

            var i = 0;
            [EventEmitter, EEX].forEach(function (SourceType) {
                i++;
                var source;

                beforeEach(function () {
                    source = new SourceType();
                });

                it('should call corresponding callbacks on original emitter #' + i, function () {
                    var spyA = sinon.spy(),
                        spyError1 = sinon.spy(),
                        spyError2 = sinon.spy(),
                        spyEnd = sinon.spy(),
                        err = new Error('123');

                    source.on('a', spyA);
                    source.on('end', spyEnd);
                    source.on('error', spyError1);

                    emitter.pipeExcept(source, 'end');

                    emitter.on('error', spyError2);

                    source.emit('a', 'a1').should.be.true;
                    source.emit('end', 1, 2, 3).should.be.true;
                    source.emit('error', err).should.be.true;

                    spyA.calledWith('a1').should.be.true;
                    spyEnd.calledWith(1, 2, 3).should.be.true;
                    spyError1.calledWith(err).should.be.true;
                    spyError2.calledWith(err).should.be.true;

                    spyEnd.calledAfter(spyA).should.be.true;
                    spyError1.calledAfter(spyEnd).should.be.true;
                    spyError2.calledAfter(spyError1).should.be.true;
                });

                it('should pipe all events except specified #' + i, function () {
                    var spyA = sinon.spy(),
                        spyError1 = sinon.spy(),
                        spyError2 = sinon.spy(),
                        spyEnd = sinon.spy(),
                        err = new Error('123');

                    source.on('error', spyError1);

                    emitter.pipeExcept(source, 'end', 'x');

                    emitter.on('a', spyA);
                    emitter.on('end', spyEnd);
                    emitter.on('error', spyError2);

                    source.emit('a', 'a1').should.be.true;
                    source.emit('end', 1, 2, 3).should.be.false;
                    source.emit('error', err).should.be.true;

                    spyA.calledWith('a1').should.be.true;
                    spyEnd.calledWith(1, 2, 3).should.be.false;
                    spyError1.calledWith(err).should.be.true;
                    spyError2.calledWith(err).should.be.true;

                    spyError1.calledAfter(spyA).should.be.true;
                    spyError2.calledAfter(spyError1).should.be.true;
                });

                it('should not throw on unhandled error on original emitter #' + i, function () {
                    var spyError = sinon.spy(),
                        err = new Error('123');

                    emitter.pipeExcept(source);

                    emitter.on('error', spyError);

                    source.emit('error', err).should.be.true;

                    spyError.calledWith(err).should.be.true;
                });

                it('should throw on unhandled error on piped emitter #' + i, function () {
                    var spyError = sinon.spy(),
                        err = new Error('123');

                    source.on('error', spyError);

                    emitter.pipeExcept(source);

                    expect(function () {
                        source.emit('error', err);
                    }).to.throw(err);

                    spyError.calledWith(err).should.be.true;
                });

                it('should not emit error if it is excepted #' + i, function () {
                    var spyError1 = sinon.spy(),
                        spyError2 = sinon.spy(),
                        err = new Error('123');

                    emitter.pipeExcept(source, 'error');

                    source.on('error', spyError1);
                    emitter.on('error', spyError2);

                    source.emit('error', err).should.be.true;

                    spyError1.calledWith(err).should.be.true;
                    spyError2.callCount.should.be.equal(0);
                });

                it('should not throw error if it is excepted #' + i, function () {
                    var spyError = sinon.spy(),
                        err = new Error('123');

                    emitter.pipeExcept(source, 'error');

                    source.on('error', spyError);

                    source.emit('error', err).should.be.true;

                    spyError.calledWith(err).should.be.true;
                });

                it('should throw on unhandled errors #' + i, function () {
                    var err = new Error('123');

                    emitter.pipeExcept(source);

                    expect(function () {
                        source.emit('error', err);
                    }).to.throw(err);
                });

                var j = 0;
                [EventEmitter, EEX].forEach(function (SourceType2) {
                    j++;
                    it('should pipe events from multiple sources #' + i + ':' + j, function () {
                        var spyError = sinon.spy(),
                            spyEnd = sinon.spy(),
                            err = new Error('123'),
                            source2 = new SourceType2();

                        emitter.pipeExcept(source);
                        emitter.pipeExcept(source2);
                        emitter.on('error', spyError);
                        emitter.on('end', spyEnd);

                        source.emit('error', err).should.be.true;
                        source2.emit('end', 1, 2, 3).should.be.true;

                        spyError.calledWith(err).should.be.true;
                        spyEnd.calledWith(1, 2, 3).should.be.true;

                        spyEnd.calledAfter(spyError).should.be.true;
                    });
                });

                it('should support multiple pipes from single source #' + i, function () {
                    var spyError = sinon.spy(),
                        spyEnd = sinon.spy(),
                        spyError2 = sinon.spy(),
                        spyEnd2 = sinon.spy(),
                        err = new Error('123'),
                        emitter2 = new EEX();

                    emitter.pipeExcept(source);
                    emitter2.pipeExcept(source);
                    emitter.on('error', spyError);
                    emitter.on('end', spyEnd);
                    emitter2.on('error', spyError2);
                    emitter2.on('end', spyEnd2);

                    source.emit('error', err).should.be.true;
                    source.emit('end', 1, 2, 3).should.be.true;

                    spyError.calledWith(err).should.be.true;
                    spyEnd.calledWith(1, 2, 3).should.be.true;
                    spyError2.calledWith(err).should.be.true;
                    spyEnd2.calledWith(1, 2, 3).should.be.true;

                    spyError2.calledAfter(spyError).should.be.true;
                    spyEnd2.calledAfter(spyEnd).should.be.true;
                });
            });

        });

        describe('#map()', function () {

            it('should throw exception on non-function arguments', function () {
                expect(function () {
                    emitter.map(function () {}, 2);
                }).to.throw(TypeError, /Argument must be a function/);
            });

            it('should call each map function and return results in order', function (done) {
                var f1 = function (a1, a2) {
                    return a1 + a2;
                };
                var f2 = function (a1, a2) {
                    return a1 * a2;
                };

                var r = emitter.map(f1, f2);
                r.on('end', function (r1, r2) {
                    r1.should.be.equal(6);
                    r2.should.be.equal(8);
                    done();
                });
                emitter.emit('end', 4, 2);
            });

        });

        describe('#flatMap()', function () {

            it('should throw exception on non-function arguments', function () {
                expect(function () {
                    emitter.flatMap(42);
                }).to.throw(TypeError, /Argument must be a function/);
            });

            var i = 0;
            [[EventEmitter, EventEmitter], [EventEmitter, EEX], [EEX, EventEmitter], [EEX, EEX]]
                .forEach(function (SourceTypes) {
                    i++;
                    it('should pipe all events and call map function #' + i, function (done) {
                        var spyData = sinon.spy(),
                            spyInfo = sinon.spy(),
                            spyMsg = sinon.spy(),
                            A = 1, B = 40, C = 2, DATA = 24, MSG = 'FP (allthethings)';

                        emitter
                            .flatMap(function (a, b, c) {
                                var emitter2 = new SourceTypes[0]();

                                setImmediate(function () {
                                    emitter2.emit('info', a);
                                    emitter2.emit('end', b, c);
                                });

                                return emitter2;
                            })
                            .flatMap(function (b, c) {
                                var emitter3 = new SourceTypes[1]();

                                setImmediate(function () {
                                    emitter3.emit('data', DATA);
                                    emitter3.emit('end', b + c);
                                });

                                return emitter3;

                            })
                            .on('error', done)
                            .on('msg', spyMsg)
                            .on('info', spyInfo)
                            .on('data', spyData)
                            .on('end', function (d) {
                                spyMsg.calledWith(MSG).should.be.true;
                                spyInfo.calledWith(A).should.be.true;
                                spyData.calledWith(DATA).should.be.true;
                                d.should.equal(B + C);
                                done();
                            });

                        emitter.emit('msg', MSG);
                        emitter.emit('end', A, B, C);
                    });
                });

            i = 0;
            [EventEmitter, EEX].forEach(function (SourceType) {
                i++;
                it('should propagate error event and do not call next map function #' + i, function (done) {
                    var spyMapper = sinon.spy(),
                        spyInfo = sinon.spy(),
                        spyMsg = sinon.spy(),
                        A = 1, B = 40, C = 2, MSG = 'FP (allthethings)',
                        ERR = new Error('Something fishy just happened!');

                    emitter
                        .flatMap(function (a, b, c) {
                            var emitter2 = new SourceType();

                            setImmediate(function () {
                                emitter2.emit('info', a);
                                emitter2.emit('error', ERR);
                            });

                            return emitter2;
                        })
                        .flatMap(spyMapper)
                        .on('error', function (err) {
                            spyMsg.calledWith(MSG).should.be.true;
                            spyInfo.calledWith(A).should.be.true;
                            spyMapper.callCount.should.be.equal(0);
                            err.should.equal(ERR);
                            done();
                        })
                        .on('msg', spyMsg)
                        .on('info', spyInfo)
                        .on('end', done.bind(null, new Error('Should not happen')));

                    emitter.emit('msg', MSG);
                    emitter.emit('end', A, B, C);
                });
            });
        });

    });
})();
