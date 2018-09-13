import { computed, observable, IObservableValue, action, runInAction } from "mobx"

declare var Symbol: any

function observableSymbol() {
    return (typeof Symbol === "function" && Symbol.observable) || "@@observable"
}

function self() {
    return this
}

export interface IStreamObserver<T> {
    next(value: T): void
    error(error: any): void
    complete(): void
}

export interface ISubscription {
    unsubscribe(): void
}

export interface IObservableStream<T> {
    subscribe(observer: IStreamObserver<T>): ISubscription
    subscribe(observer: (value: T) => void): ISubscription
    //   [Symbol.observable](): IObservable;
}

/**
 * Converts an expression to an observable stream (a.k.a. TC 39 Observable / RxJS observable).
 * The provided expression is tracked by mobx as long as there are subscribers, automatically
 * emitting when new values become available. The expressions respect (trans)actions.
 *
 * @example
 *
 * const user = observable({
 *   firstName: "C.S",
 *   lastName: "Lewis"
 * })
 *
 * Rx.Observable
 *   .from(mobxUtils.toStream(() => user.firstname + user.lastName))
 *   .scan(nameChanges => nameChanges + 1, 0)
 *   .subscribe(nameChanges => console.log("Changed name ", nameChanges, "times"))
 *
 * @export
 * @template T
 * @param {() => T} expression
 * @param {boolean} fireImmediately (by default false)
 * @returns {IObservableStream<T>}
 */
export function toStream<T>(
    expression: () => T,
    fireImmediately: boolean = false
): IObservableStream<T> {
    const computedValue = computed(expression)
    return {
        subscribe(observer: any): ISubscription {
            return {
                unsubscribe: computedValue.observe(
                    typeof observer === "function"
                        ? ({ newValue }: { newValue: T }) => observer(newValue)
                        : ({ newValue }: { newValue: T }) => observer.next(newValue),
                    fireImmediately
                )
            }
        },
        [observableSymbol()]: self
    }
}

class StreamListener<T> implements IStreamObserver<T> {
    @observable.ref current: T = undefined
    subscription: ISubscription

    constructor(observable: IObservableStream<T>, initialValue: T) {
        runInAction(() => {
            this.current = initialValue
            this.subscription = observable.subscribe(this)
        })
    }

    dispose() {
        if (this.subscription) {
            this.subscription.unsubscribe()
        }
    }

    @action.bound
    next(value: T) {
        this.current = value
    }

    @action.bound
    complete() {
        this.dispose()
    }

    @action.bound
    error(value: T) {
        this.current = value
        this.dispose()
    }
}

/**
 *
 * Converts a subscribable, observable stream (TC 39 observable / RxJS stream)
 * into an object which stores the current value (as `current`). The subscription can be cancelled through the `dispose` method.
 * Takes an initial value as second optional argument
 *
 * @example
 * const debouncedClickDelta = MobxUtils.fromStream(Rx.Observable.fromEvent(button, 'click')
 *     .throttleTime(1000)
 *     .map(event => event.clientX)
 *     .scan((count, clientX) => count + clientX, 0)
 * )
 *
 * autorun(() => {
 *     console.log("distance moved", debouncedClickDelta.current)
 * })
 *
 * @export
 * @template T
 * @param {IObservableStream<T>} observable
 * @returns {{
 *     current: T;
 *     dispose(): void;
 * }}
 */
export function fromStream<T>(
    observable: IObservableStream<T>,
    initialValue: T = undefined
): IStreamListener<T> {
    return new StreamListener(observable, initialValue)
}

export interface IStreamListener<T> {
    current: T
    dispose(): void
}
