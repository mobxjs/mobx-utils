import {IObservableValue, observable, action} from "mobx";
import {IDENTITY, IThenable} from "./utils";

export type PromiseState = "pending" | "fulfilled" | "rejected";

export interface IPromiseBasedObservable<T> {
    value: T;
    state: PromiseState;
    reason: any;
    promise: IThenable<T>;
}

class PromiseBasedObservable<T> implements IPromiseBasedObservable<T> {
    private _observable: IObservableValue<T>;
    private _state: IObservableValue<PromiseState> = observable("pending" as PromiseState);
    private _reason: IObservableValue<any> = observable(undefined as any);

    constructor(public promise: IThenable<T>, initialValue: T = undefined, private modifier = IDENTITY) {
        this._observable = observable(modifier(initialValue));
        promise.then(action("observableFromPromise-resolve", (value: T) => {
            this._observable.set(this.modifier(value));
            this._state.set("fulfilled");
        })).catch(action("observableFromPromise-reject", (reason: any) => {
            this._reason.set(reason);
            this._state.set("rejected");
        }));
    }

    get value(): T {
        return this._observable.get();
    }
    get state(): PromiseState {
        return this._state.get();
    }
    get reason(): any {
        return this._reason.get();
    }
}

/**
 *
 *
 * @param {IThenable<T>} promise
 * @param {T} [initialValue=undefined]
 * @param {any} [modifier=IDENTITY]
 * @returns {IPromiseBasedObservable<T>}
 */
export function fromPromise<T>(promise: IThenable<T>, initialValue: T = undefined, modifier =  IDENTITY): IPromiseBasedObservable<T> {
    return new PromiseBasedObservable(promise, initialValue, modifier);
}

