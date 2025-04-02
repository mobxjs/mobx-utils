import { DeepMap } from "./deepMap"
import {
    IComputedValue,
    IComputedValueOptions,
    computed,
    onBecomeUnobserved,
    _isComputingDerivation,
    isAction,
    _getGlobalState,
} from "mobx"

export type IComputedFnOptions<F extends (...args: any[]) => any> = {
    onCleanup?: (result: ReturnType<F> | undefined, ...args: Parameters<F>) => void
} & IComputedValueOptions<ReturnType<F>>

/**
 * computedFn takes a function with an arbitrary amount of arguments,
 * and memoizes the output of the function based on the arguments passed in.
 *
 * computedFn(fn) returns a function with the very same signature. There is no limit on the amount of arguments
 * that is accepted. However, the amount of arguments must be constant and default arguments are not supported.
 *
 * By default the output of a function call will only be memoized as long as the
 * output is being observed.
 *
 * The function passes into `computedFn` should be pure, not be an action and only be relying on
 * observables.
 *
 * Setting `keepAlive` to `true` will cause the output to be forcefully cached forever.
 * Note that this might introduce memory leaks!
 *
 * @example
 * const store = observable({
    a: 1,
    b: 2,
    c: 3,
    m: computedFn(function(x) {
      return this.a * this.b * x
    })
  })

  const d = autorun(() => {
    // store.m(3) will be cached as long as this autorun is running
    console.log(store.m(3) * store.c)
  })
 *
 * @param fn
 * @param keepAliveOrOptions
 */
export function computedFn<T extends (...args: any[]) => any>(
    fn: T,
    keepAliveOrOptions: IComputedFnOptions<T> | boolean = false
): T {
    if (isAction(fn)) throw new Error("computedFn shouldn't be used on actions")

    let memoWarned = false
    let i = 0
    const opts =
        typeof keepAliveOrOptions === "boolean"
            ? { keepAlive: keepAliveOrOptions }
            : keepAliveOrOptions
    const d = new DeepMap<IComputedValue<any>>()

    return function (this: any, ...args: Parameters<T>): ReturnType<T> {
        const entry = d.entry(args)
        // cache hit, return
        if (entry.exists()) return entry.get().get()
        // if function is invoked, and its a cache miss without reactive, there is no point in caching...
        if (!opts.keepAlive && !_isComputingDerivation()) {
            if (
                !memoWarned &&
                (opts.requiresReaction ?? _getGlobalState().computedRequiresReaction)
            ) {
                console.warn(
                    "Invoking a computedFn from outside a reactive context won't be memoized unless keepAlive is set."
                )
                memoWarned = true
            }
            return fn.apply(this, args)
        }
        // create new entry
        let latestValue: ReturnType<T> | undefined
        const c = computed(
            () => {
                return (latestValue = fn.apply(this, args))
            },
            {
                ...opts,
                name: `computedFn(${opts.name || fn.name}#${++i})`,
            }
        )
        entry.set(c)
        // clean up if no longer observed
        if (!opts.keepAlive)
            onBecomeUnobserved(c, () => {
                d.entry(args).delete()
                if (opts.onCleanup) opts.onCleanup(latestValue, ...args)
                latestValue = undefined
            })
        // return current val
        return c.get()
    } as any
}
