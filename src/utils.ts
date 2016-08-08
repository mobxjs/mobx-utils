export type IDisposer = () => void;

export const NOOP = () => {};

export const IDENTITY = (_: any) => _;

// From: https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/promise/promise.d.ts
export interface IThenable<T> {
    then<R>(onFulfilled?: (value: T) => IThenable<R>|R, onRejected?: (error: any) => IThenable<R>|R): IThenable<R>;
    catch<R>(onRejected?: (error: any) => IThenable<R>|R): IThenable<R>;
    done<R>(onFulfilled?: (value: T) => IThenable<R>|R, onRejected?: (error: any) => IThenable<R>|R): IThenable<R>;
    nodeify<R>(callback: Function): IThenable<R>;
}

export function invariant(cond: boolean, message = "Illegal state") {
    if (!cond)
        throw new Error("[mobx-utils] " + message);
}
