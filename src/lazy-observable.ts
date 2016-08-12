import {NOOP, IDENTITY} from "./utils";
import {Atom, observable, action} from "mobx";

export function lazyObservable<T>(
    fetch: (sink: (newValue: T) => void) => void,
    initialValue: T = undefined,
    modifier = IDENTITY
): {
    current(): T
} {
    let started = false;
    const value = observable(modifier(initialValue));

    return {
        current: () => {
            if (!started) {
                started = true;
                fetch(action("lazyObservable-fetched", (newValue: T) => {
                    value.set(newValue);
                }));
            }
            return value.get();
        }
    };
}
