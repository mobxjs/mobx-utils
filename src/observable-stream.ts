import { computed, observable, action, runInAction, observe, makeObservable } from "mobx"

declare var Symbol: any

function observableSymbol() {
    return (typeof Symbol === "function" && Symbol.observable) || "@@observable"
}

export interface IStreamObserver<T> {
    next?(value: T): void
    error?(error: any): void
    complete?(): void
}

export interface ISubscription {
    unsubscribe(): void
}

export interface IObservableStream<T> {
    subscribe(observer?: IStreamObserver<T> | null): ISubscription
    subscribe(observer?: ((value: T) => void) | null): ISubscription
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
        subscribe(observer?: IStreamObserver<T> | ((value: T) => void) | null): ISubscription {
            if ("function" === typeof observer) {
                return {
                    unsubscribe: observe(
                        computedValue,
                        ({ newValue }: { newValue: any }) => observer(newValue),
                        fireImmediately
                    ),
                }
            }
            if (observer && "object" === typeof observer && observer.next) {
                return {
                    unsubscribe: observe(
                        computedValue,
                        ({ newValue }: { newValue: any }) => observer.next!(newValue),
                        fireImmediately
                    ),
                }
            }
            return {
                unsubscribe: () => {},
            }
        },
        [observableSymbol()]: function (this: any) {
            return this
        },
    }
}

class StreamListener<T> implements IStreamObserver<T> {
    @observable.ref current!: T
    subscription!: ISubscription

    constructor(observable: IObservableStream<T>, initialValue: T) {
        makeObservable(this)
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
 */
export function fromStream<T>(observable: IObservableStream<T>): IStreamListener<T | undefined>
export function fromStream<T, I>(
    observable: IObservableStream<T>,
    initialValue: I
): IStreamListener<T | I>
export function fromStream<T>(
    observable: IObservableStream<T>,
    initialValue: T = undefined as any
): IStreamListener<T> {
    return new StreamListener(observable, initialValue)
}

export interface IStreamListener<T> {
    current: T
    dispose(): void
}
