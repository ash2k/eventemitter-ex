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
    });
})();
