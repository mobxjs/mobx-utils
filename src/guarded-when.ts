import { when } from "mobx"
import { IDisposer, deprecated } from "./utils"

/**
 * Like normal `when`, except that this `when` will automatically dispose if the condition isn't met within a certain amount of time.
 *
 * @example
 * test("expect store to load", t => {
 *   const store = {
 *     items: [],
 *     loaded: false
 *   }
 *   fetchDataForStore((data) => {
 *     store.items = data;
 *     store.loaded = true;
 *   })
 *   whenWithTimeout(
 *     () => store.loaded
 *     () => t.end()
 *     2000,
 *     () => t.fail("store didn't load with 2 secs")
 *   )
 * })
 *
 *
 * @export
 * @param {() => boolean} expr see when, the expression to await
 * @param {() => void} action see when, the action to execut when expr returns truthy
 * @param {number} [timeout=10000] maximum amount when spends waiting before giving up
 * @param {any} [onTimeout=() => {}] the ontimeout handler will be called if the condition wasn't met within the given time
 * @returns {IDisposer} disposer function that can be used to cancel the when prematurely. Neither action or onTimeout will be fired if disposed
 */
export function whenWithTimeout(
    expr: () => boolean,
    action: () => void,
    timeout: number = 10000,
    onTimeout = () => {}
): IDisposer {
    deprecated("whenWithTimeout is deprecated, use mobx.when with timeout option instead")
    return when(expr, action, {
        timeout,
        onError: onTimeout
    })
}
