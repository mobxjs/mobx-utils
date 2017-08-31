import {when} from "mobx";

/**
 * Like normal `when`, except that this `when` will return a promise that resolves when the expression becomes truthy
 *
 * @example
 * await whenAsync(() => !state.someBoolean)
 *
 * @export
 * @param {() => boolean} fn see when, the expression to await
 * @returns Promise for when an observable eventually matches some condition
 */
export let whenAsync = fn => new Promise(resolve => when(fn, resolve))
