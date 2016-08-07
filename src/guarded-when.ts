import {when} from "mobx";
import {IDisposer} from "./utils";

export function whenWithTimeout(expr: () => boolean, action: () => void, timeout: number = 10000, onTimeout = () => {}): IDisposer {
    let done = false;
    const handle = setTimeout(() => {
        if (!done) {
            disposer();
            onTimeout();
        }
    }, timeout);
    const disposer = when(expr,  () => {
       done = true;
       clearTimeout(handle);
       action();
    });
    return () => {
        clearTimeout(handle);
        disposer();
    };
}
