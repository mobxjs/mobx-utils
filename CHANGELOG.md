# 1.0.1

* Implemented #4: Expose constants for promise states: `PENDING`, `REJECTED` and `FULFILLED`.
* Implemented #6: the rejection reason of `fromPromise` is now stored in `.value` instead of `.reason` (which has been deprecated).
* Improved typings of `fromPromise`, fixes #8