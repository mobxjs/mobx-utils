import {extras, IComputedValue} from "mobx";
import {IDisposer} from "./utils";

export function keepAlive(computedValue: IComputedValue<any>): IDisposer;
export function keepAlive(target: Object, property: string): IDisposer;
export function keepAlive(arg1: any, arg2?: string) {
    const computed = extras.getAtom(arg1, arg2) as any as IComputedValue<any>;
    if (!computed)
        throw new Error("No computed provided, please provide an object created with `computed(() => expr)` or an object + property name");
    return computed.observe(() => {});
}