# eventemitter-ex

Node.js EventEmitter Extensions

[![NPM](https://nodei.co/npm/eventemitter-ex.png)](https://npmjs.org/package/eventemitter-ex)

[![NPM](https://nodei.co/npm-dl/eventemitter-ex.png)](https://nodei.co/npm-dl/eventemitter-ex/)

[![Build Status](https://travis-ci.org/ash2k/eventemitter-ex.svg?branch=master)](https://travis-ci.org/ash2k/eventemitter-ex)
[![Coverage Status](https://coveralls.io/repos/ash2k/eventemitter-ex/badge.svg?branch=master)](https://coveralls.io/r/ash2k/eventemitter-ex?branch=master)

## What is it?

It is a library for [Node.js](https://nodejs.org/) / [io.js](https://iojs.org) to compose [EventEmitters](https://nodejs.org/api/events.html#events_class_events_eventemitter).

## Documentation and usage examples

We will use the following functions in the examples below:

```javascript
var EE = require('events').EventEmitter;
var EEX = require('eventemitter-ex');

function numbers () {
  var ee = new EE();

  setImmediate(function () {
    ee.emit('data', 1);
    ee.emit('data', 2);
    ee.emit('data', 3);
    ee.emit('end', 10);
  });

  return ee;
}

function doubleUp (x) {
  return x * 2;
}

function asyncDoubleUp (x, cb) {
  setImmediate(function () {
    cb(null, doubleUp(x));
  });
  // can be implemented synchronously too
  // cb(null, doubleUp(x));
}
```

For more advanced examples please take a look at the [tests](test/EventEmitterEx.test.js).

### Basic functionality

#### onAllExcept([event, ..., ]function)

Attaches the provided listener to all events except the specified ones. Listeners will be called with the type of the event fired along with its actual payload.

```javascript
var eex = new EEX()
    .onAllExcept('end', console.log);
eex.emit('data', 42);
eex.emit('end');

// will print
data 42
```

#### emitAsync(event[, payload, ...])

Asynchronously emits an event with specified payload.

```javascript
var eex = new EEX()
    .emitAsync('end', 42)
    .on('end', console.log);

// will print
42
```

#### startPipeline([payload, ...])

Asynchronously emits `end` event with the provided payload. Useful to triger pipelines where next steps are `map()`/`mapAsync()`/`flatMap()` operations.

```javascript
var eex = new EEX()
    .startPipeline(42) // same as .emitAsync('end', 42)
    .map(doubleUp)
    .on('end', console.log);

// will print
84
```

#### pipeExcept(emitter[, event, ...])

You can pipe one or more emitters into `EEX` emitter. Events from source(s) will be fired on the target emitter.

```javascript
var eex = new EEX()
    .pipeExcept(numbers())
    .on('data', console.log)
    .on('end', console.log);

// will print
1
2
3
10
```

It is possible to specify exceptions - events that will not be piped:

```javascript
var eex = new EEX()
    .pipeExcept(numbers(), 'data')
    .on('data', console.log)
    .on('end', console.log);

// will print
10
```

#### listenersOnAll(event)

Returns an array of listeners attached via `onAllExcept()` that will be triggered for the specified type of event.

```javascript
var eex = new EEX()
    .onAllExcept('end', console.log);
console.log(eex.listenersOnAll('data').length);
console.log(eex.listenersOnAll('end').length);

// will print
1
0
```

### Chaining emitters

`end` event from emitter is triggering next stage of execution, defined by `map()`/`mapAsync()`/`flatMap()` operation. Payload of `end` event is passed as argument(s) to the next stage. `error` event terminates the pipeline by bubbling up through the chain of emitters, triggering `error` listeners.

#### map(function[, function, ...])

Returns new `EEX` that will emit all events from the source emitter except `end`. It will handle `end` event using the provided function by passing the payload to it. Result of that function will be emitted as `end` event on the returned emitter. Exception thrown from the function will be emitted as an `error` event on the returned emitter.

```javascript
var eex = new EEX()
    .pipeExcept(numbers())
    .map(doubleUp) // pass function, no invocation here
    .on('data', console.log)
    .on('end', console.log);

// will print
1
2
3
20
```

#### mapAsync(function[, function, ...])

Returns new `EEX` that will emit all events from the source emitter except `end`. It will handle `end` event using the provided function by passing the payload to it along with a callback to be called with the result of the computation or error. Callback is passed as the last argument and it follows the standard node convention `function (err, res1, res2, ...)`. When callback is called its arguments will be emitted on the returned emitter as `end` event payload or as `error` event payload if `err !== null`.

```javascript
var eex = new EEX()
    .pipeExcept(numbers())
    .mapAsync(asyncDoubleUp) // pass function, no invocation here
    .on('data', console.log)
    .on('end', console.log);

// will print
1
2
3
20
```

#### flatMap(function[, function, ...])

Returns new `EEX` that will emit all events from the source emitter except `end`. It will handle `end` event using the provided function by passing `end` payload to it. The function should return an `EventEmitter`, events from which will be piped into the returned emitter.

```javascript
var eex = new EEX()
    .pipeExcept(numbers())
    .flatMap(function (x) {
      return new EEX()
        .emitAsync('data', 3 * x)
        .pipeExcept(numbers());
    })
    .on('data', console.log)
    .on('end', console.log);

// will print
1
2
3
30
1
2
3
10
```
