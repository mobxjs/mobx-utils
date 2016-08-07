import {isAction, autorun, autorunAsync, action, isObservableArray} from "mobx";
import {IDisposer} from "./utils";

export function queueProcessor<T>(observableArray: T[], processor: (item: T) => void, debounce = 0): IDisposer {
    if (!isObservableArray(observableArray))
        throw new Error("Expected observable array as first argument");
    if (!isAction(processor))
        processor = action("queueProcessor", processor);

    const runner = () => observableArray.splice(0).forEach(processor);
    if (debounce >  0)
        return autorunAsync(runner, debounce);
    else
        return autorun(runner);
}
