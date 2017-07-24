import {IObservableValue, observable, action} from "mobx";
import {IDENTITY, deprecated} from "./utils";

export type PromiseState = "pending" | "fulfilled" | "rejected";

export const PENDING = "pending";
export const FULFILLED = "fulfilled";
export const REJECTED = "rejected";

export interface IPromiseBasedObservable<T> {
    readonly value: T;
    readonly state: PromiseState;
    readonly reason: any;
    readonly promise: PromiseLike<T>;
    case<U>(handlers: {pending?: () => U, fulfilled?: (t: T) => U, rejected?: (e: any) => U}): U;
}

class PromiseBasedObservable<T> implements IPromiseBasedObservable<T> {
    @observable.ref value: T = undefined;
    @observable.ref state: PromiseState = PENDING;
    @observable.ref _reason: any = undefined;

    constructor(public promise: PromiseLike<T>, initialValue: T = undefined) {
        this.value = initialValue;
        promise.then(
            action("observableFromPromise-resolve", (value: T) => {
                this.value = value;
                this.state = FULFILLED;
            }),
            action("observableFromPromise-reject", (reason: any) => {
                this._reason = reason;
                this.value = reason;
                this.state = REJECTED;
            })
        );
    }

    get reason(): any {
        // TODO: kill in next major
        deprecated("In `fromPromise`: `.reason` is deprecated, use `.value` instead");
        return this._reason;
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
 * @param {IThenable<T>} promise The promise which will be observed
 * @param {T} [initialValue=undefined] Optional predefined initial value
 * @returns {IPromiseBasedObservable<T>}
 */
export function fromPromise<T>(promise: PromiseLike<T>, initialValue: T = undefined): IPromiseBasedObservable<T> {
    return new PromiseBasedObservable(promise, initialValue);
}

/**
  * Returns true if the provided value is a promise-based observable.
  * @param value any
  * @returns {boolean}
  */
export function isPromiseBasedObservable(value: any): value is IPromiseBasedObservable<any> {
    return value instanceof PromiseBasedObservable;
}
