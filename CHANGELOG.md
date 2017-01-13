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
