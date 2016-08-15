import {isAction, autorun, autorunAsync, action, isObservableArray} from "mobx";
import {IDisposer} from "./utils";

/**
 * `queueProcessor` takes an observable array, observes it and calls `processor`
 * for each new item added to the observable array, optionally deboucing the action
 *
 * @param {T[]} observableArray observable array instance to track
 * @param {(item: T) => void} processor action to call per item
 * @param {number} [debounce=0] optional debounce time in ms. With debounce 0 the processor will run synchronously
 * @returns {IDisposer} stops the processor
 */
export function queueProcessor<T>(observableArray: T[], processor: (item: T) => void, debounce = 0): IDisposer {
    if (!isObservableArray(observableArray))
        throw new Error("Expected observable array as first argument");
    if (!isAction(processor))
        processor = action("queueProcessor", processor);

    const runner = () => {
        // construct a final set
        const items = observableArray.slice(0);
        // clear the queue for next iteration
        observableArray.splice(0);
        // fire processor
        items.forEach(processor);
    };
    if (debounce >  0)
        return autorunAsync(runner, debounce);
    else
        return autorun(runner);
}
