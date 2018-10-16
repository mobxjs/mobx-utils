import { when } from "mobx"
import { deprecated } from "./utils"

/**
 * _deprecated_ whenAsync is deprecated, use mobx.when without effect instead.
 *
 * Like normal `when`, except that this `when` will return a promise that resolves when the expression becomes truthy
 *
 * @example
 * await whenAsync(() => !state.someBoolean)
 *
 * @export
 * @param {() => boolean} fn see when, the expression to await
 * @param {number} timeout maximum amount of time to wait, before the promise rejects
 * @returns Promise for when an observable eventually matches some condition. Rejects if timeout is provided and has expired
 */
export function whenAsync(fn: () => boolean, timeout: number = 0): Promise<void> {
    deprecated("whenAsync is deprecated, use mobx.when without effect instead")
    return when(fn, {
        timeout
    })
}
