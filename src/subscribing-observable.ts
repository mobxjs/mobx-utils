import {Atom, observable, action} from "mobx";
import {NOOP, IDENTITY, IDisposer} from "./utils";

export function subscribingObservable<T>(
    subscriber: (sink: (newValue: T) => void) => void,
    unsubscriber: IDisposer = NOOP,
    initialValue: T = undefined,
    modifier = IDENTITY
): {
    get(): T;
    dispose(): void;
} {
    let isActive = false;
    let isDisposed = false;
    const value = observable(modifier(initialValue));

    const atom = new Atom(
        "SyncedObservable",
        () => {
            isActive = true;
            subscriber(action((newValue: T) => {
                value.set(newValue);
                atom.reportChanged();
            }));
        },
        () => {
            if (isActive)
                unsubscriber();
            isActive = false;
        }
    );

    return {
        get: () => {
            if (isDisposed)
                throw new Error("subscribingObservable has already been disposed");
            const beingTracked = atom.reportObserved();
            if (!beingTracked && !isActive)
                console.warn("Called `get` of an subscribingObservable outside a reaction. Current value will be returned but no new subscription has started");
            return value.get();
        },
        dispose: () => {
            isDisposed = true;
            if (isActive)
                unsubscriber();
        }
    };
}
