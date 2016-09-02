export type IDisposer = () => void;

export const NOOP = () => {};

export const IDENTITY = (_: any) => _;

export function invariant(cond: boolean, message = "Illegal state") {
    if (!cond)
        throw new Error("[mobx-utils] " + message);
}
