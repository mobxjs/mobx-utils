import { IComputedValue, getAtom } from "mobx"
import { IDisposer } from "./utils"

export function keepAlive(target: Object, property: string): IDisposer
export function keepAlive(computedValue: IComputedValue<any>): IDisposer
/**
 * MobX normally suspends any computed value that is not in use by any reaction,
 * and lazily re-evaluates the expression if needed outside a reaction while not in use.
 * `keepAlive` marks a computed value as always in use, meaning that it will always fresh, but never disposed automatically.
 *
 * @example
 * const obj = observable({
 *   number: 3,
 *   doubler: function() { return this.number * 2 }
 * })
 * const stop = keepAlive(obj, "doubler")
 *
 * @param {Object} target an object that has a computed property, created by `@computed` or `extendObservable`
 * @param {string} property the name of the property to keep alive
 * @returns {IDisposer} stops this keep alive so that the computed value goes back to normal behavior
 */
/**
 * @example
 * const number = observable(3)
 * const doubler = computed(() => number.get() * 2)
 * const stop = keepAlive(doubler)
 * // doubler will now stay in sync reactively even when there are no further observers
 * stop()
 * // normal behavior, doubler results will be recomputed if not observed but needed, but lazily
 *
 * @param {IComputedValue<any>} computedValue created using the `computed` function
 * @returns {IDisposer} stops this keep alive so that the computed value goes back to normal behavior
 */
export function keepAlive(_1: any, _2?: string) {
    const computed = (getAtom(_1, _2) as any) as IComputedValue<any>
    if (!computed)
        throw new Error(
            "No computed provided, please provide an object created with `computed(() => expr)` or an object + property name"
        )
    return computed.observe(() => {})
}
