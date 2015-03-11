(function () {
    'use strict';
    var EventEmitter = require('events').EventEmitter
        , EEP = require('../EventEmitterEx')
        , source
        , emitter
        ;

    beforeEach(function () {
        source = new EventEmitter();
        emitter = new EEP();
    });

    describe('EventEmitterEx', function () {
        describe('#pipeExcept()', function () {

            it('should call corresponding callbacks on original emitter', function () {
                var spyA = sinon.spy()
                    , spyError1 = sinon.spy()
                    , spyError2 = sinon.spy()
                    , spyEnd = sinon.spy()
                    , err = new Error('123');

                emitter.pipeExcept(source, 'end');

                emitter.on('error', spyError1);

                source.on('a', spyA);
                source.on('end', spyEnd);
                source.on('error', spyError2);

                source.emit('a', 'a1').should.be.true;
                source.emit('end', 1, 2, 3).should.be.true;
                source.emit('error', err).should.be.true;

                spyA.calledWith('a1').should.be.true;
                spyEnd.calledWith(1, 2, 3).should.be.true;
                spyError1.calledWith(err).should.be.true;
                spyError2.calledWith(err).should.be.true;
            });

            it('should pipe all events except specified', function () {
                var spyA = sinon.spy()
                    , spyError1 = sinon.spy()
                    , spyError2 = sinon.spy()
                    , spyEnd = sinon.spy()
                    , err = new Error('123');

                emitter.pipeExcept(source, 'end');

                source.on('error', spyError1);

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
            });

            it('should not throw on unhandled error on original emitter', function () {
                var spyError = sinon.spy()
                    , err = new Error('123');

                emitter.pipeExcept(source);

                emitter.on('error', spyError);

                source.emit('error', err).should.be.true;

                spyError.calledWith(err).should.be.true;
            });

            it('should not throw on unhandled error on piped emitter', function () {
                var spyError = sinon.spy()
                    , err = new Error('123');

                emitter.pipeExcept(source);

                source.on('error', spyError);

                source.emit('error', err).should.be.true;

                spyError.calledWith(err).should.be.true;
            });

            it('should throw on unhandled errors', function () {
                var err = new Error('123');

                emitter.pipeExcept(source);

                expect(function () {
                    source.emit('error', err);
                }).to.throw(err);
            });
        });

        describe('#flatMap()', function () {

            it('should pipe all events and call map function', function (done) {
                var spyData = sinon.spy()
                    , spyInfo = sinon.spy()
                    , spyMsg = sinon.spy()
                    , A = 1, B = 40, C = 2, DATA = 24, MSG = 'FP (allthethings)';

                emitter
                    .flatMap(function (a, b, c) {
                        var emitter2 = new EEP();

                        setImmediate(function () {
                            emitter2.emit('info', a);
                            emitter2.emit('end', b, c);
                        });

                        return emitter2;
                    })
                    .flatMap(function (b, c) {
                        var emitter3 = new EEP();

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


            it('should propagate error event and do not call next map function', function (done) {
                var spyMapper = sinon.spy()
                    , spyInfo = sinon.spy()
                    , spyMsg = sinon.spy()
                    , A = 1, B = 40, C = 2, MSG = 'FP (allthethings)'
                    , ERR = new Error('Something fishy just happened!');

                emitter
                    .flatMap(function (a, b, c) {
                        var emitter2 = new EEP();

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
})();
