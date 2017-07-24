import {IObservableValue, observable, action} from "mobx";
import {IDENTITY, deprecated, invariant} from "./utils";

export type PromiseState = "pending" | "fulfilled" | "rejected";

export const PENDING = "pending";
export const FULFILLED = "fulfilled";
export const REJECTED = "rejected";

export type IBasePromiseBasedObservable<T> = {
    readonly promise: PromiseLike<T>;
    case<U>(handlers: {pending?: () => U, fulfilled?: (t: T) => U, rejected?: (e: any) => U}): U;
}

export type IPendingPromise = {
    readonly state: "pending";
    readonly reason: any;
}

export type IFulfilledPromise<T> = {
    readonly state: "fulfilled";
    readonly value: T;
}

export type IRejectedPromise = {
    readonly state: "rejected";
    readonly value: any;
}

export type IPromiseBasedObservable<T> = IBasePromiseBasedObservable<T> & (IPendingPromise | IFulfilledPromise<T> | IRejectedPromise)

class PromiseBasedObservable<T> {
    @observable.ref value: T = undefined;
    @observable.ref state: PromiseState = PENDING;

    constructor(public promise: PromiseLike<T>) {
        promise.then(
            action("observableFromPromise-resolve", (value: T) => {
                this.value = value;
                this.state = FULFILLED;
            }),
            action("observableFromPromise-reject", (reason: any) => {
                this.value = reason;
                this.state = REJECTED;
            })
        );
    }

    public case<U>(handlers: {pending?: () => U, fulfilled?: (t: T) => U, rejected?: (e: any) => U}): U {
        switch (this.state) {
            case PENDING: return handlers.pending && handlers.pending();
            case REJECTED: return handlers.rejected && handlers.rejected(this.value);
            case FULFILLED: return handlers.fulfilled && handlers.fulfilled(this.value);
        }
    }
}

/**
 * `fromPromise` takes a Promise and returns an object with 3 observable properties that track
 * the status of the promise. The returned object has the following observable properties:
 *  - `value`: either the initial value, the value the Promise resolved to, or the value the Promise was rejected with. use `.state` if you need to be able to tell the difference
 *  - `state`: one of `"pending"`, `"fulfilled"` or `"rejected"`
 *  - `promise`: (not observable) the original promise object
 * and the following method:
 * - `case({fulfilled, rejected, pending})`: maps over the result using the provided handlers, or returns `undefined` if a handler isn't available for the current promise state.
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
 * Note that the status strings are available as constants:
 * `mobxUtils.PENDING`, `mobxUtils.REJECTED`, `mobxUtil.FULFILLED`
 *
 * For testing, promises can be created immediatly in a certain state using
 * `fromPromise.reject(reason)` or `fromPromise.resolve(reason)`
 *
 * @param {IThenable<T>} promise The promise which will be observed
 * @param {T} [initialValue=undefined] Optional predefined initial value
 * @returns {IPromiseBasedObservable<T>}
 */
export const fromPromise: {
    <T>(promise: PromiseLike<T>): IPromiseBasedObservable<T>;
    reject<T>(reason: any): IRejectedPromise & IBasePromiseBasedObservable<T>;
    resolve<T>(value?: T): IFulfilledPromise<T> & IBasePromiseBasedObservable<T>;
} = function(promise: any) {
    invariant(arguments.length === 1, "fromPromise expects exactly one argument");
    invariant(typeof promise === "object" && promise && typeof promise.then === "function", "Please pass a promise to fromPromise");
    return new PromiseBasedObservable(promise) as any;
} as any;

fromPromise.reject = action("fromPromise.reject", function(reason: any) {
    const p: any = fromPromise(Promise.reject(reason));
    p.state = REJECTED;
    p.value = reason;
    return p;
}) as any;

fromPromise.resolve = action("fromPromise.resolve", function(value: any = undefined) {
    const p: any = fromPromise(Promise.resolve(value));
    p.state = FULFILLED;
    p.value = value;
    return p;
}) as any;

/**
  * Returns true if the provided value is a promise-based observable.
  * @param value any
  * @returns {boolean}
  */
export function isPromiseBasedObservable(value: any): value is IPromiseBasedObservable<any> {
    return value instanceof PromiseBasedObservable;
}
