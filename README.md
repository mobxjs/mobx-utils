# MobX-utils

_Utility functions and common patterns for MobX_

[![Build Status](https://travis-ci.org/mobxjs/mobx-utils.svg?branch=master)](https://travis-ci.org/mobxjs/mobx-utils)
[![Coverage Status](https://coveralls.io/repos/github/mobxjs/mobx-utils/badge.svg?branch=master)](https://coveralls.io/github/mobxjs/mobx-utils?branch=master)
[![Join the chat at https://gitter.im/mobxjs/mobx](https://badges.gitter.im/mobxjs/mobx.svg)](https://gitter.im/mobxjs/mobx?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

This package provides utility functions and common MobX patterns build on top of MobX.
It is encouraged to take a peek under the hood and read the sources of these utilities.
Feel free to open a PR with your own utilities. For large new features, please open an issue first.

# Installation

NPM: `npm install mobx-utils --save`

CDN: <https://npmcdn.com/mobx-utils/mobx-utils.umd.js>

# API

## fromPromise

[lib/from-promise.js:78-82](https://github.com/mobxjs/mobx-utils/blob/b1321aea8c7aa934073a9973a73d867ce697bd04/lib/from-promise.js#L78-L82 "Source code on GitHub")

`fromPromise` takes a Promise and returns an object with 3 observable properties that track
the status of the promise. The returned object has the following observable properties:

-   `value`: either the initial value, or the value the Promise resolved to
-   `state`: one of `"pending"`, `"fulfilled"` or `"rejected"`
-   `reason`: the reject reason if the state is `"rejected"`
-   `promise`: (not observable) the original promise object

**Parameters**

-   `promise` **IThenable&lt;T>** The promise which will be observed
-   `initialValue` **\[T]** Optional predefined initial value (optional, default `undefined`)
-   `modifier` **\[any]** MobX modifier, e.g. `asFlat`, to be applied to the resolved value (optional, default `IDENTITY`)

**Examples**

```javascript
const fetchResult = fromPromise(fetch("http://someurl"))

// combine with when..
when(
  () => fetchResult.state !== "pending"
  () => {
    console.log("Got ", fetchResult.reason || fetchResult.value)
  }
)

// or a mobx-react component..
const myComponent = observer(({ fetchResult }) => {
  switch(fetchResult.state) {
     case "pending": return <div>Loading...</div>
     case "rejected": return <div>Ooops... {fetchResult.reason}</div>
     case "fulfilled": return <div>Gotcha: {fetchResult.value}</div>
  }
})
```

Returns **IPromiseBasedObservable&lt;T>**

## lazyObservable

[lib/lazy-observable.js:33-49](https://github.com/mobxjs/mobx-utils/blob/b1321aea8c7aa934073a9973a73d867ce697bd04/lib/lazy-observable.js#L33-L49 "Source code on GitHub")

`lazyObservable` creates an observable around a `fetch` method that will not be invoked
util the observable is needed the first time.
The fetch method receives a `sink` callback which can be used to replace the
current value of the lazyObservable. It is allowed to call `sink` multiple times
to keep the lazyObservable up to date with some external resource.

Note that it is the `current()` call itself which is being tracked by MobX,
so make sure that you don't dereference to early.

**Parameters**

-   `fetch`
-   `initialValue` **\[T]** optional initialValue that will be returned from `current` as long as the `sink` has not been called at least once (optional, default `undefined`)
-   `modifier` **\[any]** optional mobx modifier that determines the the comparison and recursion strategy of the observable, for example `asFlat` or `asStructure` (optional, default `IDENTITY`)

**Examples**

```javascript
const userProfile = lazyObservable(
  sink => fetch("/myprofile").then(profile => sink(profile))
)

// use the userProfile in a React component:
const Profile = observer(({ userProfile }) =>
  userProfile.current() === undefined
  ? <div>Loading user profile...</div>
  : <div>{userProfile.current().displayName}</div>
)
```

## fromResource

[lib/from-resource.js:65-99](https://github.com/mobxjs/mobx-utils/blob/b1321aea8c7aa934073a9973a73d867ce697bd04/lib/from-resource.js#L65-L99 "Source code on GitHub")

`fromResource` creates an observable which current state can be inspected using `.current()`,
and which can be kept in sync with some external datasource that can be subscribed to.

The created observable will only subscribe to the datasource if it is in use somewhere,
(un)subscribing when needed. To enable `fromResource` to do that two callbacks need to be provided,
one to subscribe, and one to unsubscribe. The subscribe callback itself will receive a `sink` callback, which can be used
to update the current state of the observable, allowing observes to react.

Whatever is passed to `sink` will be returned by `current()`. The values passed to the sink will not be converted to
observables automatically, but feel free to do so.
It is the `current()` call itself which is being tracked,
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
    }
  )
}

// usage:
const myUserObservable = createObservableUser(myDatabaseConnector.query("name = 'Michel'"))

// use the observable in autorun
autorun(() => {
  // printed everytime the database updates its records
  console.log(myUserObservable.current().displayName)
})

// ... or a component
const userComponent = observer(({ user }) =>
  <div>{user.current().displayName}</div>
)
```

## createViewModel

[lib/create-view-model.js:122-124](https://github.com/mobxjs/mobx-utils/blob/b1321aea8c7aa934073a9973a73d867ce697bd04/lib/create-view-model.js#L122-L124 "Source code on GitHub")

`createViewModel` takes an object with observable properties (model)
and wraps a view model around it. The view model proxies all enumerable property of the original model with the following behavior:

-   as long as no new value has been assigned to the viewmodel property, the original property will be returned, and any future change in the model will be visible in the view model as well
-   once a new value has been assigned to a property of the viewmodel, that value will be returned during a read of that property in the future. However, the original model remain untouched until `submit()` is called.

The viewmodel exposes the following additional methods, besides all the enumerable properties of the model:

-   `submit()`: copies all the values of the viewmodel to the model and resets the state
-   `reset()`: resets the state of the view model, abandoning all local modificatoins
-   `isDirty`: observable property indicating if the viewModel contains any modifications
-   `isPropertyDirty(propName)`: returns true if the specified property is dirty
-   `model`: The original model object for which this viewModel was created

N.B. doesn't support observable arrays and maps yet

**Parameters**

-   `model` **T**

**Examples**

```javascript
class Todo {
  \@observable title = "Test"
}

const model = new Todo()
const viewModel = createViewModel(model);

autorun(() => console.log(viewModel.model.title, ",", viewModel.title))
// prints "Test, Test"
model.title = "Get coffee"
// prints "Get coffee, Get coffee", viewModel just proxies to model
viewModel.title = "Get tea"
// prints "Get coffee, Get tea", viewModel's title is now dirty, and the local value will be printed
viewModel.submit()
// prints "Get tea, Get tea", changes submitted from the viewModel to the model, viewModel is proxying again
viewModel.title = "Get cookie"
// prints "Get tea, Get cookie" // viewModel has diverged again
viewModel.reset()
// prints "Get tea, Get tea", changes of the viewModel have been abandoned
```

## whenWithTimeout

[lib/guarded-when.js:32-51](https://github.com/mobxjs/mobx-utils/blob/b1321aea8c7aa934073a9973a73d867ce697bd04/lib/guarded-when.js#L32-L51 "Source code on GitHub")

Like normal `when`, except that this `when` will automatically dispose if the condition isn't met within a certain amount of time.

**Parameters**

-   `expr`
-   `action`
-   `timeout` **\[[number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number)]** maximum amount when spends waiting before giving up (optional, default `10000`)
-   `onTimeout` **\[any]** the ontimeout handler will be called if the condition wasn't met within the given time (optional, default `()`)

**Examples**

```javascript
test("expect store to load", t => {
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
    () => t.fail("store didn't load with 2 secs")
  )
})
```

Returns **IDisposer** disposer function that can be used to cancel the when prematurely. Neither action or onTimeout will be fired if disposed

## keepAlive

[lib/keep-alive.js:31-36](https://github.com/mobxjs/mobx-utils/blob/b1321aea8c7aa934073a9973a73d867ce697bd04/lib/keep-alive.js#L31-L36 "Source code on GitHub")

MobX normally suspends any computed value that is not in use by any reaction,
and lazily re-evaluates the expression if needed outside a reaction while not in use.
`keepAlive` marks a computed value as always in use, meaning that it will always fresh, but never disposed automatically.

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

## keepAlive

[lib/keep-alive.js:31-36](https://github.com/mobxjs/mobx-utils/blob/b1321aea8c7aa934073a9973a73d867ce697bd04/lib/keep-alive.js#L31-L36 "Source code on GitHub")

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

## queueProcessor

[lib/queue-processor.js:22-40](https://github.com/mobxjs/mobx-utils/blob/b1321aea8c7aa934073a9973a73d867ce697bd04/lib/queue-processor.js#L22-L40 "Source code on GitHub")

`queueProcessor` takes an observable array, observes it and calls `processor`
once for each item added to the observable array, optionally deboucing the action

**Parameters**

-   `observableArray` **[Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array)&lt;T>** observable array instance to track
-   `processor`
-   `debounce` **\[[number](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number)]** optional debounce time in ms. With debounce 0 the processor will run synchronously (optional, default `0`)

**Examples**

```javascript
const pendingNotifications = observable([])
const stop = queueProcessor(pendingNotifications, msg => {
  // show Desktop notification
  new Notification(msg);
})

// usage:
pendingNotifications.push("test!")
```

Returns **IDisposer** stops the processor
