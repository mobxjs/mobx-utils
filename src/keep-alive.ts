import {extras, IComputedValue} from "mobx";
import {IDisposer} from "./utils";

export function keepAlive(computedValue: IComputedValue<any>): IDisposer;
export function keepAlive(target: Object, property: string): IDisposer;
/**
 * MobX normally suspends any computed value that is not in use by any reaction,
 * and lazily re-evaluates the expression if needed outside a reaction while not in use.
 * `keepAlive` marks a computed value as always in use, meaning that it will always fresh, but never disposed.
 *
 * @param {IComputedValue<any>} computedValue created using the `computed` function
 * @returns {IDisposer} stops this keep alive so that the computed value goes back to normal behavior
 */
/**
 * MobX normally suspends any computed value that is not in use by any reaction,
 * and lazily re-evaluates the expression if needed outside a reaction while not in use.
 * `keepAlive` marks a computed value as always in use, meaning that it will always fresh, but never disposed.
 *
 * @param {Object} target an object that has a computed property, created by `@computed` or `extendObservable`
 * @param {string} property the name of the property to keep alive
 * @returns {IDisposer} stops this keep alive so that the computed value goes back to normal behavior
 */
export function keepAlive(_1: any, _2?: string) {
    const computed = extras.getAtom(_1, _2) as any as IComputedValue<any>;
    if (!computed)
        throw new Error("No computed provided, please provide an object created with `computed(() => expr)` or an object + property name");
    return computed.observe(() => {});
}