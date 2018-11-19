import { IObservableValue, action, extendObservable } from "mobx"
import { IDENTITY, invariant } from "./utils"

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
    readonly value: any // can be error, T or nothing at this point
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
    pending?: (t?: T) => U
    fulfilled?: (t: T) => U
    rejected?: (e: any) => U
}): U {
    switch (this.state) {
        case PENDING:
            return handlers.pending && handlers.pending(this.value)
        case REJECTED:
            return handlers.rejected && handlers.rejected(this.value)
        case FULFILLED:
            return handlers.fulfilled && handlers.fulfilled(this.value)
    }
}

function createObservablePromise(origPromise: any, oldPromise?: any) {
    invariant(arguments.length <= 2, "fromPromise expects up to two arguments")
    invariant(
        typeof origPromise === "function" ||
            (typeof origPromise === "object" &&
                origPromise &&
                typeof origPromise.then === "function"),
        "Please pass a promise or function to fromPromise"
    )
    if (origPromise.isPromiseBasedObservable === true) return origPromise

    if (typeof origPromise === "function") {
        // If it is a (reject, resolve function, wrap it)
        origPromise = new Promise(origPromise as any)
    }

    const promise = origPromise as any
    origPromise.then(
        action("observableFromPromise-resolve", (value: any) => {
            promise.value = value
            promise.state = FULFILLED
        }),
        action("observableFromPromise-reject", (reason: any) => {
            promise.value = reason
            promise.state = REJECTED
        })
    )

    promise.isPromiseBasedObservable = true
    promise.case = caseImpl
    const oldData = oldPromise && oldPromise.state === FULFILLED? oldPromise.value: undefined;
    extendObservable(
        promise,
        {
            value: oldData,
            state: PENDING
        },
        {},
        { deep: false }
    )

    return promise
}

/**
 * `fromPromise` takes a Promise and returns a new Promise wrapping the original one. The returned Promise is also extended with 2 observable properties that track
 * the status of the promise. The returned object has the following observable properties:
 *  - `value`: either the initial value, the value the Promise resolved to, or the value the Promise was rejected with. use `.state` if you need to be able to tell the difference.
 *  - `state`: one of `"pending"`, `"fulfilled"` or `"rejected"`
 *
 * And the following methods:
 * - `case({fulfilled, rejected, pending})`: maps over the result using the provided handlers, or returns `undefined` if a handler isn't available for the current promise state.
 * - `then((value: TValue) => TResult1 | PromiseLike<TResult1>, [(rejectReason: any) => any])`: chains additional handlers to the provided promise.
 *
 * The returned object implements `PromiseLike<TValue>`, so you can chain additional `Promise` handlers using `then`. You may also use it with `await` in `async` functions.
 *
 * Note that the status strings are available as constants:
 * `mobxUtils.PENDING`, `mobxUtils.REJECTED`, `mobxUtil.FULFILLED`
 *
 * fromPromise takes an optional second argument, a previously created `fromPromise` based observable.
 * This is useful to replace one promise based observable with another, without going back to an intermediate
 * "pending" promise state while fetching data. For example:
 *
 * ```javascript
 * @observer
 * class SearchResults extends React.Component {
 *   @observable searchResults
 *
 *   componentWillReceiveProps(nextProps) {
 *     if (nextProps.query !== this.props.query)
 *       this.comments = fromPromse(
 *         window.fetch("/search?q=" + nextProps.query),
 *         // by passing, we won't render a pending state if we had a successful search query before
 *         // rather, we will keep showing the previous search results, until the new promise resolves (or rejects)
 *         this.searchResults
 *       )
 *   }
 *
 *   render() {
 *     return this.searchResults.case({
 *        pending(staleValue) {
 *          return staleValue || "searching" // <- value might set to previous results while the promise is still pending
 *        },
 *        fullfilled(value) {
 *          return value // the fresh results
 *        },
 *        rejected(error) {
 *          return "Oops: " + error
 *        }
 *     })
 *   }
 * }
 * ```
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
 *   () => fetchResult.state !== "pending",
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
 *     pending:   () => <div>Loading...</div>,
 *     rejected:  error => <div>Ooops.. {error}</div>,
 *     fulfilled: value => <div>Gotcha: {value}</div>,
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
 * @param {IThenable<T>} oldPromise? The promise which will be observed
 * @returns {IPromiseBasedObservable<T>}
 */
export const fromPromise: {
    <T>(promise: PromiseLike<T>): IPromiseBasedObservable<T>
    <T>(oldPromise?: PromiseLike<T>): IPromiseBasedObservable<T>
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
