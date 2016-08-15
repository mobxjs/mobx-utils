import {NOOP, IDENTITY} from "./utils";
import {Atom, observable, action} from "mobx";

/**
 * creates an observable around a fetch method that will not be invoked
 * util the observable is needed the first time.
 * The fetch method receives a sink callback
 *
 * @export
 * @template T
 * @param {(sink: (newValue: T) => void) => void} fetch
 * @param {T} [initialValue=undefined]
 * @param {any} [modifier=IDENTITY]
 * @returns {{
 *     current(): T
 * }}
 */


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
                fetch(action("lazyObservable-fetch", (newValue: T) => {
                    value.set(newValue);
                }));
            }
            return value.get();
        }
    };
}
