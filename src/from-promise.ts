import { IObservableValue, extendShallowObservable, action } from "mobx"
import { IDENTITY, deprecated, invariant } from "./utils"

export type PromiseState = "pending" | "fulfilled" | "rejected"

export const PENDING = "pending"
export const FULFILLED = "fulfilled"
export const REJECTED = "rejected"

export type IBasePromiseBasedObservable<T> = {
    isPromiseBasedObservable: true
    case<U>(handlers: { pending?: () => U; fulfilled?: (t: T) => U; rejected?: (e: any) => U }): U
} & PromiseLike<T>

export type IPendingPromise = {
    readonly state: "pending"
    readonly reason: any
}

export type IFulfilledPromise<T> = {
    readonly state: "fulfilled"
    readonly value: T
}

export type IRejectedPromise = {
    readonly state: "rejected"
    readonly value: any
}

export type IPromiseBasedObservable<T> = IBasePromiseBasedObservable<T> &
    (IPendingPromise | IFulfilledPromise<T> | IRejectedPromise)

function caseImpl<U, T>(handlers: {
    pending?: () => U
    fulfilled?: (t: T) => U
    rejected?: (e: any) => U
}): U {
    switch (this.state) {
        case PENDING:
            return handlers.pending && handlers.pending()
        case REJECTED:
            return handlers.rejected && handlers.rejected(this.value)
        case FULFILLED:
            return handlers.fulfilled && handlers.fulfilled(this.value)
    }
}

function createObservablePromise(origPromise: any) {
    invariant(arguments.length === 1, "fromPromise expects exactly one argument")
    invariant(
        typeof origPromise === "function" ||
            (typeof origPromise === "object" &&
                origPromise &&
                typeof origPromise.then === "function"),
        "Please pass a promise or function to fromPromise"
    )

    if (typeof origPromise === "function") {
        // If it is a (reject, resolve function, wrap it)
        origPromise = new Promise(origPromise as any)
    }

    const promise = new Promise((resolve, reject) => {
        origPromise.then(
            action("observableFromPromise-resolve", (value: any) => {
                promise.value = value
                promise.state = FULFILLED
                resolve(value)
            }),
            action("observableFromPromise-reject", (reason: any) => {
                promise.value = reason
                promise.state = REJECTED
                reject(reason)
            })
        )
    }) as any

    promise.isPromiseBasedObservable = true
    promise.case = caseImpl
    extendShallowObservable(promise, {
        value: undefined,
        state: PENDING
    })

    // TODO: remove in next major
    Object.defineProperty(promise, "promise", {
        get() {
            deprecated(
                "fromPromise().promise is deprecated. fromPromise now directly returns a promise"
            )
            return origPromise
        }
    })

    return promise
}

/**
 * `fromPromise` takes a Promise and returns an object with 3 observable properties that track
 * the status of the promise. The returned object has the following observable properties:
 *  - `value`: either the initial value, the value the Promise resolved to, or the value the Promise was rejected with. use `.state` if you need to be able to tell the difference.
 *  - `state`: one of `"pending"`, `"fulfilled"` or `"rejected"`
 * 
 * And the following methods:
 * - `case({fulfilled, rejected, pending})`: maps over the result using the provided handlers, or returns `undefined` if a handler isn't available for the current promise state.
 * - `then((value: TValue) => TResult1 | PromiseLike<TResult1>, [(rejectReason: any) => any])`: chains additional handlers to the provided promise.
 *
 * The returned object implements `PromiseLike<TValue>`, so you can chain additional `Promise` handlers using `then`.
 * 
 * Note that the status strings are available as constants:
 * `mobxUtils.PENDING`, `mobxUtils.REJECTED`, `mobxUtil.FULFILLED`
 *
 * Observable promises can be created immediately in a certain state using
 * `fromPromise.reject(reason)` or `fromPromise.resolve(value?)`.
 * The main advantage of `fromPromise.resolve(value)` over `fromPromise(Promise.resolve(value))` is that the first _synchronously_ starts in the desired state.
 *
 * It is possible to directly create a promise using a resolve, reject function:
 * `fromPromise((resolve, reject) => setTimeout(() => resolve(true), 1000))`
 *
 * @example
 * const fetchResult = fromPromise(fetch("http://someurl"))
 *
 * // combine with when..
 * when(
 *   () => fetchResult.state !== "pending"
 *   () => {
 *     console.log("Got ", fetchResult.value)
 *   }
 * )
 *
 * // or a mobx-react component..
 * const myComponent = observer(({ fetchResult }) => {
 *   switch(fetchResult.state) {
 *      case "pending": return <div>Loading...</div>
 *      case "rejected": return <div>Ooops... {fetchResult.value}</div>
 *      case "fulfilled": return <div>Gotcha: {fetchResult.value}</div>
 *   }
 * })
 *
 * // or using the case method instead of switch:
 *
 * const myComponent = observer(({ fetchResult }) =>
 *   fetchResult.case({
 *     pending:   () => <div>Loading...</div>
 *     rejected:  error => <div>Ooops.. {error}</div>
 *     fulfilled: value => <div>Gotcha: {value}</div>
 *   }))
 * 
 * // chain additional handler(s) to the resolve/reject:
 * 
 * fetchResult.then(
 *   (result) =>  doSomeTransformation(result),
 *   (rejectReason) => console.error('fetchResult was rejected, reason: ' + rejectReason)
 * ).then(
 *   (transformedResult) => console.log('transformed fetchResult: ' + transformedResult)
 * )
 *
 * @param {IThenable<T>} promise The promise which will be observed
 * @returns {IPromiseBasedObservable<T>}
 */
export const fromPromise: {
    <T>(promise: PromiseLike<T>): IPromiseBasedObservable<T>
    reject<T>(reason: any): IRejectedPromise & IBasePromiseBasedObservable<T>
    resolve<T>(value?: T): IFulfilledPromise<T> & IBasePromiseBasedObservable<T>
} = createObservablePromise as any

fromPromise.reject = action("fromPromise.reject", function(reason: any) {
    const p: any = fromPromise(Promise.reject(reason))
    p.state = REJECTED
    p.value = reason
    return p
}) as any

fromPromise.resolve = action("fromPromise.resolve", function(value: any = undefined) {
    const p: any = fromPromise(Promise.resolve(value))
    p.state = FULFILLED
    p.value = value
    return p
}) as any

/**
 * Returns true if the provided value is a promise-based observable.
 * @param value any
 * @returns {boolean}
 */
export function isPromiseBasedObservable(value: any): value is IPromiseBasedObservable<any> {
    return value && value.isPromiseBasedObservable === true
}
