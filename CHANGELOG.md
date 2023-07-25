# 6.0.8

* [Fix now() sharing global state between tests #316](https://github.com/mobxjs/mobx-utils/pull/316), fixes [#306](https://github.com/mobxjs/mobx-utils/issues/306).

# 6.0.7

* [fix fromPromise typing #315](https://github.com/mobxjs/mobx-utils/pull/315)
* [Update computedFn warning to respect mobx global computedRequiresReaction #318](https://github.com/mobxjs/mobx-utils/pull/318), fixes [#268](https://github.com/mobxjs/mobx-utils/issues/268).

# 6.0.6

* [fromPromise carries forward old value from pending observable](https://github.com/mobxjs/mobx-utils/pull/311)

# 6.0.5

# 6.0.4

* [ObservableGroupMap.ts: remove console.log #289](https://github.com/mobxjs/mobx-utils/pull/289)
* [Make observable promise's values safer type wise #295](https://github.com/mobxjs/mobx-utils/pull/295) Closes [Typing IRejectedPromise and IPendingPromise to hold an unknown value](https://github.com/mobxjs/mobx-utils/issues/291) Users of fromPromise may get new compile errors for invalid code. See PR for details.

# 6.0.3

* Fixed [#214](https://github.com/mobxjs/mobx-utils/issues/214) createViewModel doesn't work correctly with setters for computed values. ([#286](https://github.com/mobxjs/mobx-utils/pull/286))
* Use computedFn name if explicitly set in options [#277](https://github.com/mobxjs/mobx-utils/pull/277).

# 6.0.2

* skipped

# 6.0.1

* Fixed build issue causing decorators in the final build version not to be picked up correctly. Fixes [#279](https://github.com/mobxjs/mobx-utils/issues/279)

# 6.0.0

* [BREAKING] Dropped previously deprecated `asyncAction`. Use `mobx.flow` instead.
* [BREAKING] Dropped previously deprecated `actionAsync`. Use `mobx.flow` + `mobx.flowResult` instead.
* [BREAKING] Dropped previously deprecated `whenAsync`. Use `mobx.when` instead.
* [BREAKING] Dropped previously deprecated `whenWithTimeout`. Use `mobx.when` instead.
* [BREAKING] Added support for MobX 6.0.0. Minimim required MobX version is 6.0.0.

# 5.6.1

* [#256](https://github.com/mobxjs/mobx-utils/pull/256) Fix [#255](https://github.com/mobxjs/mobx-utils/issues/255)

# 5.6.0

* [#245](https://github.com/mobxjs/mobx-utils/pull/245) Add [ObservableGroupMap](https://github.com/mobxjs/mobx-utils#observablegroupmap).
* [#250](https://github.com/mobxjs/mobx-utils/pull/250) Fix [#249](https://github.com/mobxjs/mobx-utils/issues/249): lazyObservable: pending.set not wrapped in allowStateChanges.
* [#251](https://github.com/mobxjs/mobx-utils/pull/251) Fix fromStream initialValue not typed correctly.

# 5.5.7

* Another fix for invalid `actionAsync` context through [#246](https://github.com/mobxjs/mobx-utils/pull/246) by [xaviergonz](https://github.com/xaviergonz)

# 5.5.6

* Another fix for invalid `actionAsync` context when promises resolve at the same time in different actionAsync calls through [#244](https://github.com/mobxjs/mobx-utils/pull/244) by [xaviergonz](https://github.com/xaviergonz)

# 5.5.5

* Fixed tree-shaking mobx-utils, see [#238](https://github.com/mobxjs/mobx-utils/pull/238) by [IgorBabkin](https://github.com/IgorBabkin)

# 5.5.4

* Fix invalid `actionAsync` context when promises resolve at the same time in different actionAsync calls, by [xaviergonz](https://github.com/xaviergonz) through [#240](https://github.com/mobxjs/mobx-utils/pull/240)

# 5.5.3

* Support all `IComputedOptions` in `createTransformer`, by [@samdroid-apps](https://github.com/samdroid-apps) through [#224](https://github.com/mobxjs/mobx-utils/pull/224)
* Make sure that transformers don't memorize when used outside a reactive context. Fixes [#116](https://github.com/mobxjs/mobx-utils/issues/116) through [#228](https://github.com/mobxjs/mobx-utils/pull/228) by [@upsuper](https://github.com/upsuper)

# 5.5.2

* Fix for `actionAsync` when awaiting promises that resolve immediately.

# 5.5.1

* Fix for `actionAsync` giving errors when it didn't await a task inside.
* `task` now supports plain values as well.

# 5.5.0

_Note: the minimum required MobX version for this release has been bumped to `"mobx": "^4.13.1 || ^5.13.1"`_

* Added `actionAsync` (not to be confused with `asyncAction`) as an alternative to flows, see [#217](https://github.com/mobxjs/mobx-utils/pull/217) by [xaviergonz](https://github.com/xaviergonz)
* Fixed a typing issue for the pending handler of `fromPromise`, see [#208](https://github.com/mobxjs/mobx-utils/pull/208) by [Ricardo-Marques](https://github.com/Ricardo-Marques)
* `computedFn` now supports the standard options accepted by classic `computed`, see [#215](https://github.com/mobxjs/mobx-utils/pull/215) by [hearnden](https://github.com/hearnden)
* Fixed [#205](https://github.com/mobxjs/mobx-utils/issues/205), something with to unobserved properties and `createViewModel`. See [#216](https://github.com/mobxjs/mobx-utils/pull/216) by [wrench7](https://github.com/wrench7)

# 5.4.1

* Fixed `cannot read property enumerable of undefined` error, [#191](https://github.com/mobxjs/mobx-utils/issues/191) through [#198](https://github.com/mobxjs/mobx-utils/pull/198) by [@dr0p](https://github.com/dr0p)
* Improved typings of `createViewModel` trough [#195](https://github.com/mobxjs/mobx-utils/pull/195) by [@jordansexton](https://github.com/jordansexton)

# 5.4.0

Introduced `computedFn`, to support using arbitrary functions as computed! Implements [#184](https://github.com/mobxjs/mobx-utils/issues/184) through [#190](https://github.com/mobxjs/mobx-utils/pull/190)

# 5.3.0

* Observable getters defined on prototype are now included in the view model. Fixes [#100](https://github.com/mobxjs/mobx-utils/issues/100#issuecomment-401765101) through [#188](https://github.com/mobxjs/mobx-utils/pull/188) by [wrench7](https://github.com/wrench7)

# 5.2.0

* `createViewModel` now has an additional field `changedValues` on the returned viewmodel, that returns a map with all the pending changes. See [#172](https://github.com/mobxjs/mobx-utils/pull/172) by [@ItamarShDev](https://github.com/ItamarShDev). Fixes [#171](https://github.com/mobxjs/mobx-utils/issues/171) and [#173](https://github.com/mobxjs/mobx-utils/issues/173)
* `fromPromise().case`: if the `onFulfilled` handler is omitted, `case` will now return the resolved value, rather than `undefined`. See [#167](https://github.com/mobxjs/mobx-utils/pull/167/) by [@JefHellemans](https://github.com/JefHellemans)
* `createViewModel` will now respect the enumerability of properties. See [#169](https://github.com/mobxjs/mobx-utils/pull/169) by [dr0p](https://github.com/dr0p)

# 5.1.0

* `fromPromise` now accepts a second argument, a previous obsevable promise, that can be used to temporarily show old values until the new promise has resolved. See [#160](https://github.com/mobxjs/mobx-utils/pull/160) by [@ItamarShDev](https://github.com/ItamarShDev)
* `createTransformer` can now also memoize on function arguments, see [#159](https://github.com/mobxjs/mobx-utils/pull/159) by [@hc-12](https://github.com/hc-12)


# 5.0.4

* Fixed [#158](https://github.com/mobxjs/mobx-utils/issues/158), `deepObserve` not being published

# 5.0.3

* Introduced `deepObserve` utility, through [#154](https://github.com/mobxjs/mobx-utils/pull/154)

# 5.0.2

* Improved typings of `toStream`, by [@pelotom](https://github.com/pelotom) through [#147](https://github.com/mobxjs/mobx-utils/pull/147)
* Improved typings of `fromStream`, `IStreamListener` is now an explicit interface. Fixes [#143](https://github.com/mobxjs/mobx-utils/issues/143)

# 5.0.1

* Add `sideEffects: false` field in package.json to enable maximal tree shaking for webpack.
* Fixed #134, prevent primitive key id collisions in createTransformer
* Fixed typing issue where the `.value` field is not available without having a type assertion of the state first

# 5.0.0

* Added MobX 5 compatibility. The package is also compatible with MobX 4.3.1+.
* `createViewModel` now also copies computed properties to the view Model. Implements [#100].(https://github.com/mobxjs/mobx-utils/issues/100). Implemented through [#126](https://github.com/mobxjs/mobx-utils/pull/126) by [@RafalFilipek](https://github.com/RafalFilipek).

# 4.0.1

* passing a `fromPromise` based promise to `fromPromise` no longer throws an exception. Fixes [#119](https://github.com/mobxjs/mobx-utils/issues/119)
* added viewModel `resetProperty` to typescript typings, fixes [#117](https://github.com/mobxjs/mobx-utils/issues/117) through [#118](https://github.com/mobxjs/mobx-utils/pull/118) by @navidjh
* Added `moveItem(array, fromIndex, toIndex)` utility, as replacement for the dropped `ObservableArray.move` in MobX 4. Trough [#121](https://github.com/mobxjs/mobx-utils/pull/121) by @jeffijoe
* Fixed incorrect peer dependency, [#115](https://github.com/mobxjs/mobx-utils/pull/115) by @xaviergonz

# 4.0.0

Updated mobx-utils to use MobX 4. No futher changes

# 3.2.2

* `toStream` now accepts a second argument, `fireImmediately=false`, which, when `true`, immediately pushes the current value to the stream. Fixes [#82](https://github.com/mobxjs/mobx-utils/issues/82)

# 3.2.1

* Fixed issue where `whenAsync` was not exposed correctly.
* Added `timeout` parameter to `whenAsync`

# 3.2.0

* Switched to rollup for bundling, bundle non-minified and include a es module based build. See [#81](https://github.com/mobxjs/mobx-utils/pull/81) by [@mijay](https://github.com/mijay)

# 3.1.1
* Introduced `whenAsync`, which is like normal `when`, except that this `when` will return a promise that resolves when the expression becomes truthy. See #66 and #68, by @daedalus28

# 3.0.0

### Revamped `fromPromise`:

* It is now possible to directly pass a `(resolve, reject) => {}` function to `fromPromise`, instead of a promise object
* **BREAKING** `fromPromise` no longer creates a wrapping object, but rather extends the given promise, #45
* **BREAKING** Fixed #54, the resolved value of a promise is no longer deeply converted to an observable
* **BREAKING** Dropped `fromPromise().reason`
* **BREAKING** Improved typings of `fromPromise`. For example, the `value` property is now only available if `.state === "resolved"` (#41)
* **BREAKING** Dropped optional `initialvalue` param from `fromPromise`. use `fromPromise.fulfilled(value)` instead to create a promise in some ready state
* Introduced `fromPromise.reject(reason)` and `fromPromise.resolve(value?)` to create a promise based observable in a certain state, see #39
* Fixed #56, observable promises attributes `state` and `value` are now explicit observables

### Introduced `asyncAction`

See the [docs](https://github.com/mobxjs/mobx-utils#asyncaction) for details, but the gist of it:

```javascript
import {asyncAction} from "mobx-utils"

mobx.configure({ enforceActions: "observed" }) // don't allow state modifications outside actions

class Store {
	@observable githubProjects = []
	@state = "pending" // "pending" / "done" / "error"

	@asyncAction
	*fetchProjects() { // <- note the star, this a generator function!
		this.githubProjects = []
		this.state = "pending"
		try {
			const projects = yield fetchGithubProjectsSomehow() // yield instead of await
			const filteredProjects = somePreprocessing(projects)
			// the asynchronous blocks will automatically be wrapped actions
			this.state = "done"
			this.githubProjects = filteredProjects
		} catch (error) {
			this.state = "error"
		}
	}
}
```


### Other

* Fixed #40, `now()` now returns current date time if invoked from outside a reactive context

# 2.0.2

* Fixed #44, lazyObservable not accepting an array as initial value.
* ViewModel methods are now automatically bound, see #59, by @tekacs
* Fixed stream issue regarding disposing already completed streams, see #57, by @rkorohu
* Improved typings of lazy observables, see #38 by @jamiewinder

# 2.0.1

* Fixed several deprecation messages related to MobX 3 upgrade (see #36 by RainerAtSpirit)
* Fixed #26: Rejected promises not playing nicely with JQuery
* Fixed #25: Refreshing a lazy observable should not accidentally refresh it if it didn't start yet

# 2.0.0

* Upgraded to MobX 3

# 1.1.6

* Fixed #34: fromStream threw when being used in strict mode
* Introduced `reset()`  on lazyObservable, see #28 by @daitr92

# 1.1.5

* Fixed #32: make sure lazyObservable and fromResources can be initiated from computed values

# 1.1.4

* Introduced `now(interval?)`, to get an observable that returns the current time at a specified interval

# 1.1.3

* Introduced `fromStream` and `toStream` for interoperability with TC 39 / RxJS observable streams, see [Mobx #677](https://github.com/mobxjs/mobx/issues/677)

# 1.1.2

* Introduced `refresh()` to lazy observables. By @voxuanthinh, see [#20](https://github.com/mobxjs/mobx-utils/pull/20)

# 1.1.1

* Introduced `chunkProcessor` by Benjamin Bock, see [#19](https://github.com/mobxjs/mobx-utils/pull/19)
* Introduced `resetProperty(propName)` for ViewModels, by Vojtech Novak, see [#17](https://github.com/mobxjs/mobx-utils/pull/17)

# 1.1.0

* observable promises now support a `.case()` method to easily switch over different promise states. See [#13](https://github.com/mobxjs/mobx-utils/pull/13) by @spion
* `createViewModel` now supports arrays and maps as well, see [#12](https://github.com/mobxjs/mobx-utils/pull/12) by @vonovak

# 1.0.1

* Implemented #4: Expose constants for promise states: `PENDING`, `REJECTED` and `FULFILLED`.
* Implemented #6: the rejection reason of `fromPromise` is now stored in `.value` instead of `.reason` (which has been deprecated).
* Improved typings of `fromPromise`, fixes #8
