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
