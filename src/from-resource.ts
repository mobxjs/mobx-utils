import { createAtom, _allowStateChanges } from "mobx"
import { NOOP, IDisposer, invariant } from "./utils"

export interface IResource<T> {
    current(): T
    dispose(): void
    isAlive(): boolean
}

/**
 * `fromResource` creates an observable whose current state can be inspected using `.current()`,
 * and which can be kept in sync with some external datasource that can be subscribed to.
 *
 * The created observable will only subscribe to the datasource if it is in use somewhere,
 * (un)subscribing when needed. To enable `fromResource` to do that two callbacks need to be provided,
 * one to subscribe, and one to unsubscribe. The subscribe callback itself will receive a `sink` callback, which can be used
 * to update the current state of the observable, allowing observes to react.
 *
 * Whatever is passed to `sink` will be returned by `current()`. The values passed to the sink will not be converted to
 * observables automatically, but feel free to do so.
 * It is the `current()` call itself which is being tracked,
 * so make sure that you don't dereference to early.
 *
 * For inspiration, an example integration with the apollo-client on [github](https://github.com/apollostack/apollo-client/issues/503#issuecomment-241101379),
 * or the [implementation](https://github.com/mobxjs/mobx-utils/blob/1d17cf7f7f5200937f68cc0b5e7ec7f3f71dccba/src/now.ts#L43-L57) of `mobxUtils.now`
 *
 * The following example code creates an observable that connects to a `dbUserRecord`,
 * which comes from an imaginary database and notifies when it has changed.
 *
 * @example
 * function createObservableUser(dbUserRecord) {
 *   let currentSubscription;
 *   return fromResource(
 *     (sink) => {
 *       // sink the current state
 *       sink(dbUserRecord.fields)
 *       // subscribe to the record, invoke the sink callback whenever new data arrives
 *       currentSubscription = dbUserRecord.onUpdated(() => {
 *         sink(dbUserRecord.fields)
 *       })
 *     },
 *     () => {
 *       // the user observable is not in use at the moment, unsubscribe (for now)
 *       dbUserRecord.unsubscribe(currentSubscription)
 *     }
 *   )
 * }
 *
 * // usage:
 * const myUserObservable = createObservableUser(myDatabaseConnector.query("name = 'Michel'"))
 *
 * // use the observable in autorun
 * autorun(() => {
 *   // printed everytime the database updates its records
 *   console.log(myUserObservable.current().displayName)
 * })
 *
 * // ... or a component
 * const userComponent = observer(({ user }) =>
 *   <div>{user.current().displayName}</div>
 * )
 *
 * @export
 * @template T
 * @param {(sink: (newValue: T) => void) => void} subscriber
 * @param {IDisposer} [unsubscriber=NOOP]
 * @param {T} [initialValue=undefined] the data that will be returned by `get()` until the `sink` has emitted its first data
 * @returns {{
 *     current(): T;
 *     dispose(): void;
 *     isAlive(): boolean;
 * }}
 */
export function fromResource<T>(
    subscriber: (sink: (newValue: T) => void) => void,
    unsubscriber: IDisposer = NOOP,
    initialValue: T = undefined
): IResource<T> {
    let isActive = false
    let isDisposed = false
    let value = initialValue

    const suspender = () => {
        if (isActive) {
            isActive = false
            unsubscriber()
        }
    }

    const atom = createAtom(
        "ResourceBasedObservable",
        () => {
            invariant(!isActive && !isDisposed)
            isActive = true
            subscriber((newValue: T) => {
                _allowStateChanges(true, () => {
                    value = newValue
                    atom.reportChanged()
                })
            })
        },
        suspender
    )

    return {
        current: () => {
            invariant(!isDisposed, "subscribingObservable has already been disposed")
            const isBeingTracked = atom.reportObserved()
            if (!isBeingTracked && !isActive)
                console.warn(
                    "Called `get` of a subscribingObservable outside a reaction. Current value will be returned but no new subscription has started"
                )
            return value
        },
        dispose: () => {
            isDisposed = true
            suspender()
        },
        isAlive: () => isActive
    }
}
