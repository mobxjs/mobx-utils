import { DeepMap } from "./deepMap"
import {
    IComputedValue,
    IComputedValueOptions,
    computed,
    onBecomeUnobserved,
    _isComputingDerivation,
    isAction,
} from "mobx"

/**
 * computedFn takes a function with an arbitrarily amount of arguments, 
 * and memoized the output of the function based on the arguments passed in. 
 * 
 * computedFn(fn) returns a function with the very same signature. There is no limit on the amount of arguments
 * that is accepted. However, the amount of arguments must be consistent and default arguments are not supported.
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
    console.log((store.m(3) * store.c))
  })
 * 
 * @param fn 
 * @param keepAliveOrOptions
 */
export function computedFn<T extends (...args: any[]) => any>(
    fn: T,
    keepAliveOrOptions: IComputedValueOptions<ReturnType<T>> | boolean = false
) {
    if (isAction(fn)) throw new Error("computedFn shouldn't be used on actions")

    let memoWarned = false
    let i = 0
    const opts =
        typeof keepAliveOrOptions === "boolean"
            ? { keepAlive: keepAliveOrOptions }
            : keepAliveOrOptions
    const d = new DeepMap<IComputedValue<any>>()

    return function (...args: Parameters<T>): ReturnType<T> {
        const self = this
        const entry = d.entry(args)
        // cache hit, return
        if (entry.exists()) return entry.get().get()
        // if function is invoked, and its a cache miss without reactive, there is no point in caching...
        if (!opts.keepAlive && !_isComputingDerivation()) {
            if (!memoWarned) {
                console.warn(
                    "invoking a computedFn from outside an reactive context won't be memoized, unless keepAlive is set"
                )
                memoWarned = true
            }
            return fn.apply(self, args)
        }
        // create new entry
        const c = computed(
            () => {
                return fn.apply(self, args)
            },
            {
                ...opts,
                name: `computedFn(${fn.name}#${++i})`,
            }
        )
        entry.set(c)
        // clean up if no longer observed
        if (!opts.keepAlive)
            onBecomeUnobserved(c, () => {
                d.entry(args).delete()
            })
        // return current val
        return c.get()
    }
}
