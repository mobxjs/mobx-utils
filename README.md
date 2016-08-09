# MobX-utils

Work in progress

[![Build Status](https://travis-ci.org/mobxjs/mobx-utils.svg?branch=master)](https://travis-ci.org/mobxjs/mobx-utils)
[![Coverage Status](https://coveralls.io/repos/github/mobxjs/mobx-utils/badge.svg?branch=master)](https://coveralls.io/github/mobxjs/mobx-utils?branch=master)
[![Join the chat at https://gitter.im/mobxjs/mobx](https://badges.gitter.im/mobxjs/mobx.svg)](https://gitter.im/mobxjs/mobx?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

# Installation

NPM: `npm install mobx-utils --save`

CDN: https://npmcdn.com/mobx-utils/mobx-utils.umd.js

# API

## fromPromise

[lib/from-promise.js:53-57](https://github.com/mobxjs/mobx-utils/blob/e1df0926a2e499f95a26e3230f4e67ec46fb503b/lib/from-promise.js#L53-L57 "Source code on GitHub")

**Parameters**

-   `promise` **IThenable&lt;T>**
-   `initialValue` **\[T]**  (optional, default `undefined`)
-   `modifier` **\[any]**  (optional, default `IDENTITY`)

Returns **IPromiseBasedObservable&lt;T>**

## whenWithTimeout

[lib/guarded-when.js:32-51](https://github.com/mobxjs/mobx-utils/blob/e1df0926a2e499f95a26e3230f4e67ec46fb503b/lib/guarded-when.js#L32-L51 "Source code on GitHub")

Like normal `when`, except that this `when` will automatically dispose if the condition isn't met within a certain amount of time.

**Parameters**

-   `expr`
-   `action`
-   `timeout` **\[[number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number)]** maximum amount when spends waiting before giving up (optional, default `10000`)
-   `onTimeout` **\[any]** the ontimeout handler will be called if the condition wasn't met withing the given time (optional, default `()`)

**Examples**

```javascript
test("expect store to load, t => {
  const store = {
    items: [],
    loaded: false
  }
  fetchDataForStore((data) => {
    store.items = data;
    store.loaded = true;
  })
  whenWithTimeout(
    () => store.loaded
    () => t.end()
    2000,
    () => t.fail("expected store to load")
  )
})
```

Returns **IDisposer** disposer function that can be used to cancel the when prematurely. Neither action or onTimeout will be fired if disposed

## keepAlive

[lib/keep-alive.js:35-40](https://github.com/mobxjs/mobx-utils/blob/e1df0926a2e499f95a26e3230f4e67ec46fb503b/lib/keep-alive.js#L35-L40 "Source code on GitHub")

MobX normally suspends any computed value that is not in use by any reaction,
and lazily re-evaluates the expression if needed outside a reaction while not in use.
`keepAlive` marks a computed value as always in use, meaning that it will always fresh, but never disposed.

**Parameters**

-   `computedValue` **IComputedValue&lt;any>** created using the `computed` function
-   `_1`
-   `_2`

**Examples**

```javascript
const number = observable(3)
const doubler = computed(() => number.get() * 2)
const stop = keepAlive(doubler)
// doubler will now stay in sync reactively even when there are no further observers
stop()
// normal behavior, doubler results will be recomputed if not observed but needed, but lazily
```

Returns **IDisposer** stops this keep alive so that the computed value goes back to normal behavior

## keepAlive

[lib/keep-alive.js:35-40](https://github.com/mobxjs/mobx-utils/blob/e1df0926a2e499f95a26e3230f4e67ec46fb503b/lib/keep-alive.js#L35-L40 "Source code on GitHub")

MobX normally suspends any computed value that is not in use by any reaction,
and lazily re-evaluates the expression if needed outside a reaction while not in use.
`keepAlive` marks a computed value as always in use, meaning that it will always fresh, but never disposed.

**Parameters**

-   `target` **[Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** an object that has a computed property, created by `@computed` or `extendObservable`
-   `property` **[string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** the name of the property to keep alive
-   `_1`
-   `_2`

**Examples**

```javascript
const obj = observable({
  number: 3,
  doubler: function() { return this.number * 2 }
})
const stop = keepAlive(obj, "doubler")
```

Returns **IDisposer** stops this keep alive so that the computed value goes back to normal behavior

## fromResource

[lib/from-resource.js:60-92](https://github.com/mobxjs/mobx-utils/blob/e1df0926a2e499f95a26e3230f4e67ec46fb503b/lib/from-resource.js#L60-L92 "Source code on GitHub")

fromResource creates an observable which current state can be inspected using `.get()`,
and which can be kept in sync with some external datasource that can be subscribed to.

the created observable will only subscribe to the datasource if it is in use somewhere,
(un)subscribing when needed. To enable `fromResource` to do that two callbacks need to be provided,
one to subscribe, and one to unsubscribe. The subscribe callback itself will receive a `sink` callback, which can be used
to update the current state of the observable, allowing observes to react.

Whatever is passed to `sink` will be returned by `get()`. It is the `get()` call itself which is being tracked,
so make sure that you don't dereference to early.

The following example code creates an observable that connects to a `dbUserRecord`,
which comes from an imaginary database and notifies when it has changed.

**Parameters**

-   `subscriber`
-   `unsubscriber` **\[IDisposer]**  (optional, default `NOOP`)
-   `initialValue` **\[T]** the data that will be returned by `get()` until the `sink` has emitted its first data (optional, default `undefined`)

**Examples**

```javascript
function createObservableUser(dbUserRecord) {
  let currentSubscription;
  return fromResource(
    (sink) => {
      // sink the current state
      sink(dbUserRecord.fields)
      // subscribe to the record, invoke the sink callback whenever new data arrives
      currentSubscription = dbUserRecord.onUpdated(() => {
        sink(dbUserRecord.fields)
      })
    },
    () => {
      // the user observable is not in use at the moment, unsubscribe (for now)
      dbUserRecord.unsubscribe(currentSubscription)
    },
    dbUserRecord.fields // optionally, provide initial data
  )
}

// usage:
const myUserObservable = createObservableUser(myDatabaseConnector.query("name = 'Michel'"))
autorun(() => {
  // printed everytime the database updates its records
  console.log(myUserObservable.get().displayName)
})

const userComponent = observer(({ user }) =>
  <div>{user.get().displayName}</div>
)
```
