import { IDENTITY } from "./utils"
import { observable, action, _allowStateChanges } from "mobx"

export interface ILazyObservable<T> {
    current(): T
    refresh(): T
    reset(): T
}

/**
 * `lazyObservable` creates an observable around a `fetch` method that will not be invoked
 * until the observable is needed the first time.
 * The fetch method receives a `sink` callback which can be used to replace the
 * current value of the lazyObservable. It is allowed to call `sink` multiple times
 * to keep the lazyObservable up to date with some external resource.
 *
 * Note that it is the `current()` call itself which is being tracked by MobX,
 * so make sure that you don't dereference to early.
 *
 * @example
 * const userProfile = lazyObservable(
 *   sink => fetch("/myprofile").then(profile => sink(profile))
 * )
 *
 * // use the userProfile in a React component:
 * const Profile = observer(({ userProfile }) =>
 *   userProfile.current() === undefined
 *   ? <div>Loading user profile...</div>
 *   : <div>{userProfile.current().displayName}</div>
 * )
 *
 * // triggers refresh the userProfile
 * userProfile.refresh()
 *
 * @param {(sink: (newValue: T) => void) => void} fetch method that will be called the first time the value of this observable is accessed. The provided sink can be used to produce a new value, synchronously or asynchronously
 * @param {T} [initialValue=undefined] optional initialValue that will be returned from `current` as long as the `sink` has not been called at least once
 * @returns {{
 *     current(): T,
 *     refresh(): T,
 *     reset(): T
 * }}
 */

export function lazyObservable<T>(
    fetch: (sink: (newValue: T) => void) => void,
    initialValue: T = undefined
): ILazyObservable<T> {
    let started = false
    const value = observable.box(initialValue, { deep: false })
    let currentFnc = () => {
        if (!started) {
            started = true
            fetch((newValue: T) => {
                _allowStateChanges(true, () => {
                    value.set(newValue)
                })
            })
        }
        return value.get()
    }
    let resetFnc = action("lazyObservable-reset", () => {
        value.set(initialValue)
        return value.get()
    })
    return {
        current: currentFnc,
        refresh: () => {
            if (started) {
                started = false
                return currentFnc()
            } else {
                return value.get()
            }
        },
        reset: () => {
            return resetFnc()
        }
    }
}
