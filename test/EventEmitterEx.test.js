'use strict';
/*jshint expr: true*/

var EventEmitter = require('events').EventEmitter,
    EEX = require('../EventEmitterEx'),
    co = require('co'),
    emitter;

beforeEach(function () {
    emitter = new EEX();
});

describe('EventEmitterEx', function () {

    describe('#onAllExcept()', function () {

        it('should return self', function () {
            emitter.onAllExcept('data', function () {}).should.be.equal(emitter);
        });

    });

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

    });

    describe('#emitAsync()', function () {

        it('should call emit() asynchronously', function (done) {
            var spyEnd = sinon.spy();

            emitter
                .on('error', done)
                .on('end1', spyEnd)
                .on('end', function () {
                    spyEnd.calledWithExactly(1, 2, 3).should.be.true;
                    done();
                })
                .emitAsync('end1', 1, 2, 3)
                .emitAsync('end')
                .should.be.equal(emitter);

            spyEnd.callCount.should.be.equal(0);
        });

        it('should return self', function (done) {
            emitter
                .on('error', done)
                .on('end', done)
                .emitAsync('end').should.be.equal(emitter);
        });

    });

    describe('#startPipeline()', function () {

        it('should call emitAsync() with "end" event type', function () {
            var A = 42, B = 17, mockEmitter = sinon.mock(emitter);

            mockEmitter
                .expects('emitAsync')
                .withExactArgs('end', A, B);

            emitter.startPipeline(A, B);
        });

        it('should return self', function () {
            var mockEmitter = sinon.mock(emitter);

            mockEmitter
                .expects('emitAsync')
                .withExactArgs('end')
                .returnsThis();

            emitter.startPipeline().should.be.equal(emitter);
        });

    });

    describe('#pipeExcept()', function () {

        it('should throw on invalid argument', function () {
            expect(function () {
                emitter.pipeExcept({});
            }).to.throw(TypeError, /Expecting EventEmitter or EventEmitterEx/);
        });

        var i = 0;
        [EventEmitter, EEX].forEach(function (SourceType) {
            i++;
            var source;

            beforeEach(function () {
                source = new SourceType();
            });

            it('should return self #' + i, function () {
                emitter.pipeExcept(source).should.be.equal(emitter);
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

                emitter.pipeExcept('end', source);

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

                emitter.pipeExcept('end', 'x', source);

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

                emitter.pipeExcept('error', source);

                source.on('error', spyError1);
                emitter.on('error', spyError2);

                source.emit('error', err).should.be.true;

                spyError1.calledWith(err).should.be.true;
                spyError2.callCount.should.be.equal(0);
            });

            it('should not throw error if it is excepted #' + i, function () {
                var spyError = sinon.spy(),
                    err = new Error('123');

                emitter.pipeExcept('error', source);

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

        it('should set this to emitter', function (done) {
            var mapped = emitter.map(function () { return this; });
            mapped
                .on('end', function (result) {
                    result.should.be.equal(mapped);
                    done();
                })
                .on('error', done);
            emitter.emit('end');
        });

        it('should support returning multiple values as array', function (done) {
            var A = 1, B = 2;
            var mapped = emitter.map(function () { return [A, B]; });
            mapped
                .on('end', function (a, b) {
                    a.should.be.equal(A);
                    b.should.be.equal(B);
                    done();
                })
                .on('error', done);
            emitter.emit('end');
        });

        it('should emit exceptions as error', function (done) {
            var err = new Error('234');
            emitter
                .map(function () { throw err; })
                .on('end', function () {
                    done(new Error('Expecting error'));
                })
                .on('error', function (error) {
                    error.should.be.equal(err);
                    done();
                });
            emitter.emit('end');
        });

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

    describe('#mapAsync()', function () {

        it('should emit error if no arguments passed to callback', function (done) {
            var mapped = emitter.mapAsync(function (cb) {
                cb();
            });
            mapped.on('error', function () {
                done();
            });
            mapped.on('end', function () { throw new Error('Should not emit end'); });
            emitter.emit('end');
        });

        // this is to check type strictness of the err check
        it('should emit error on false as first argument to callback', function (done) {
            var A = 1, B = 40, C = 2;
            var mapped = emitter.mapAsync(function (cb) {
                cb(false, A, B, C);
            });
            mapped.on('error', function (err, a, b, c) {
                err.should.be.false;
                a.should.be.equal(A);
                b.should.be.equal(B);
                c.should.be.equal(C);
                done();
            });
            mapped.on('end', function () { throw new Error('Should not emit end'); });
            emitter.emit('end');
        });

        // this is to check type strictness of the err check
        it('should emit error on true as first argument to callback', function (done) {
            var A = 1, B = 40, C = 2;
            var mapped = emitter.mapAsync(function (cb) {
                cb(true, A, B, C);
            });
            mapped.on('error', function (err, a, b, c) {
                err.should.be.true;
                a.should.be.equal(A);
                b.should.be.equal(B);
                c.should.be.equal(C);
                done();
            });
            mapped.on('end', function () { throw new Error('Should not emit end'); });
            emitter.emit('end');
        });

        // this is to check type strictness of the err check
        it('should emit end on null as first argument to callback', function (done) {
            var A = 1, B = 40, C = 2;
            var mapped = emitter.mapAsync(function (cb) {
                cb(null, A, B, C);
            });
            mapped.on('error', function () { throw new Error('Should not emit error'); });
            mapped.on('end', function (a, b, c) {
                a.should.be.equal(A);
                b.should.be.equal(B);
                c.should.be.equal(C);
                done();
            });
            emitter.emit('end');
        });

        it('should throw if callback called too many times', function (done) {
            var mapped = emitter.mapAsync(function (cb) {
                cb(null);
                expect(function () {
                    cb(null);
                }).to.throw(Error, 'Callback called more than once by function at position 0 (0-based)');
                done();
            });
            mapped.on('error', done);
            emitter.emit('end');
        });

        it('should throw if callback called too many times (with misbehaving callback)', function (done) {
            var mapped = emitter.mapAsync(function () {/* bad function, does not call cb() */}, function (cb) {
                cb(null);
                expect(function () {
                    cb(null);
                }).to.throw(Error, 'Callback called more than once by function at position 1 (0-based)');
                done();
            });
            mapped.on('error', done);
            emitter.emit('end');
        });

        it('should support synchronous call of callback', function (done) {
            var A = 42;
            var mapped = emitter.mapAsync(function (param, cb) { cb(null, param); });
            mapped
                .on('end', function (result) {
                    result.should.be.equal(A);
                    done();
                })
                .on('error', done);
            emitter.emit('end', A);
        });

        it('should support asynchronous call of callback', function (done) {
            var A = 42;
            var mapped = emitter.mapAsync(function (param, cb) { setImmediate(cb.bind(null, null, param)); });
            mapped
                .on('end', function (result) {
                    result.should.be.equal(A);
                    done();
                })
                .on('error', done);
            emitter.emit('end', A);
        });

        it('should set this to emitter', function (done) {
            var mapped = emitter.mapAsync(function (cb) { cb(null, this); });
            mapped
                .on('end', function (result) {
                    result.should.be.equal(mapped);
                    done();
                })
                .on('error', done);
            emitter.emit('end');
        });

        it('should support returning multiple values as multiple arguments', function (done) {
            var A = 1, B = 2;
            var mapped = emitter.mapAsync(function (cb) { cb(null, A, B); });
            mapped
                .on('end', function (a, b) {
                    a.should.be.equal(A);
                    b.should.be.equal(B);
                    done();
                })
                .on('error', done);
            emitter.emit('end');
        });

        it('should emit exceptions as error', function (done) {
            var err = new Error('234');
            emitter
                .mapAsync(function (cb) { cb(err); })
                .on('end', function () {
                    done(new Error('Expecting error'));
                })
                .on('error', function (error) {
                    error.should.be.equal(err);
                    done();
                });
            emitter.emit('end');
        });

        it('should throw exception on non-function arguments', function () {
            expect(function () {
                emitter.mapAsync(function () {}, 2);
            }).to.throw(TypeError, /Argument must be a function/);
        });

        it('should call each map function and return results in order (sync)', function (done) {
            var f1 = function (a1, a2, cb) {
                cb(null, a1 + a2);
            };
            var f2 = function (a1, a2, cb) {
                cb(null, a1 * a2);
            };

            var r = emitter.mapAsync(f1, f2);
            r.on('end', function (r1, r2) {
                r1.should.be.equal(6);
                r2.should.be.equal(8);
                done();
            });
            emitter.emit('end', 4, 2);
        });

        it('should call each map function and return results in order (async)', function (done) {
            var f1 = function (a1, a2, cb) {
                setImmediate(cb.bind(null, null, a1 + a2));
            };
            var f2 = function (a1, a2, cb) {
                cb(null, a1 * a2);
            };

            var r = emitter.mapAsync(f1, f2);
            r.on('end', function (r1, r2) {
                r1.should.be.equal(6);
                r2.should.be.equal(8);
                done();
            });
            emitter.emit('end', 4, 2);
        });

    });

    describe('#flatMap()', function () {

        it('should set this to emitter', function (done) {
            var mapped = emitter
                .flatMap(function () {
                    var self = this;
                    return EEX.startAsync(function (eex) {
                        eex.emit('end', self);
                    });
                })
                .on('end', function (result) {
                    result.should.be.equal(mapped);
                    done();
                })
                .on('error', done);
            emitter.emit('end');
        });

        it('should throw if emitter emit end more than once', function () {
            var e = new EEX();
            emitter
                .flatMap(function () {
                    return e;
                });
            emitter.emit('end');
            e.emit('end');
            expect(function () {
                e.emit('end');
            }).to.throw(Error, 'end/error (or both) event emitted more than once by emitter at position 0 (0-based)');
        });

        it('should throw if emitter emit error more than once', function () {
            var e = new EEX();
            emitter
                .flatMap(function () {
                    return e;
                })
                .on('error', function () {
                    // ignore
                });
            emitter.emit('end');
            e.emit('error', new Error('123'));
            expect(function () {
                e.emit('error', new Error('234'));
            }).to.throw(Error, 'end/error (or both) event emitted more than once by emitter at position 0 (0-based)');
        });

        it('should throw if emitter emit end and error', function () {
            var e = new EEX();
            emitter
                .flatMap(function () {
                    return e;
                });
            emitter.emit('end');
            e.emit('end');
            expect(function () {
                e.emit('error', new Error('234'));
            }).to.throw(Error, 'end/error (or both) event emitted more than once by emitter at position 0 (0-based)');
        });

        it('should collect results and emit all together in order', function (done) {
            var A = 1, B = 40, C = 2, e = new EEX();
            emitter
                .flatMap(
                function () {
                    return e;
                },
                function () {
                    return new EEX()
                        .startPipeline(C)
                        .on('end', function () { e.startPipeline(A, B); } );
                })
                .on('end', function (r1, r2, r3, r4) {
                    r1.should.be.equal(A);
                    r2.should.be.equal(B);
                    r3.should.be.equal(C);
                    expect(r4).to.be.undefined;
                    done();
                })
                .on('error', done);
            emitter.emit('end');
        });

        it('should emit error after all emitters finished', function (done) {
            var e = new EEX(), error = new Error('error!');
            emitter
                .flatMap(
                function () {
                    return e;
                },
                function () {
                    return new EEX()
                        .startPipeline()
                        .on('end', e.emit.bind(e, 'error', error));
                })
                .on('end', function () {
                    fail('end emitted', 'end emitted');
                })
                .on('error', function (err) {
                    err.should.be.equal(error);
                    done();
                });
            emitter.emit('end');
        });

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
                    .flatMap(function (a /* , b, c */) {
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

    describe('#asPromise()', function () {

        var i = 0;
        [EventEmitter, EEX].forEach(function (SourceType) {
            i++;
            it('should return a Promise that is bound to end event #' + i, function (done) {
                var e = new SourceType();
                var p = EEX.asPromise(e);
                var A = 42;

                co(function* () {
                    return yield p;
                }).then(function (value) {
                    value.should.equals(A);
                    done();
                }, done);

                setImmediate(e.emit.bind(e, 'end', A));
            });

            it('should return a Promise that is bound to error event #' + i, function (done) {
                var e = new SourceType();
                var p = EEX.asPromise(e);
                var ERR = new Error('Something fishy just happened!');

                co(function* () {
                    return yield p;
                }).then(function () {
                    done(new Error('What?'));
                }, function (err) {
                    err.should.equals(ERR);
                    done();
                });

                setImmediate(e.emit.bind(e, 'error', ERR));
            });

        });
    });

});
