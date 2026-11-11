import { DeepMap } from "./deepMap"
import {
    IAtom,
    IComputedValue,
    IComputedValueOptions,
    computed,
    createAtom,
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
 * output is being observed. Like a `computed`, a call made inside an action (or any other batch)
 * is memoized until that batch ends.
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
        const globalState = _getGlobalState()
        // if function is invoked, and its a cache miss outside of a batch, there is no point in caching...
        // (like a computed: a derivation, an action and a transaction all run inside a batch)
        if (!opts.keepAlive && globalState.inBatch === 0) {
            if (!memoWarned && (opts.requiresReaction ?? globalState.computedRequiresReaction)) {
                console.warn(
                    "Invoking a computedFn from outside a reactive context won't be memoized " +
                        "and is cleaned up immediately, unless keepAlive is set."
                )
                memoWarned = true
            }
            const value = fn.apply(this, args)
            if (opts.onCleanup) opts.onCleanup(value, ...args)
            return value
        }
        // create new entry
        let latestValue: ReturnType<T> | undefined
        const name = `computedFn(${opts.name || fn.name}#${++i})`
        // mobx only marks the entry as observed when a derivation reads it inside a tracking context,
        // that is on behalf of a reaction. Otherwise (e.g. a call inside an action, directly or through
        // a computed) onBecomeUnobserved would never fire for it. Such an entry depends on an always
        // observed sentinel instead, which gets unobserved once mobx suspends the entry, at the end of
        // the batch unless a reaction started observing it. See #319
        const sentinel =
            !opts.keepAlive && !(_isComputingDerivation() && globalState.trackingContext)
                ? createAtom(`${name}.sentinel`)
                : undefined
        const c: IComputedValue<ReturnType<T>> = computed(
            () => {
                if (sentinel) reportObservedAlways(sentinel, c)
                return (latestValue = fn.apply(this, args))
            },
            {
                ...opts,
                name,
            }
        )
        entry.set(c)
        // clean up if no longer observed
        if (!opts.keepAlive)
            onBecomeUnobserved(sentinel || c, () => {
                d.entry(args).delete()
                if (opts.onCleanup) opts.onCleanup(latestValue, ...args)
                latestValue = undefined
            })
        // return current val
        return c.get()
    } as any
}

// mobx only marks an atom as observed when it is read inside a tracking context, so provide one,
// like mobx does for keepAlive computeds
function reportObservedAlways(atom: IAtom, context: IComputedValue<any>) {
    const globalState = _getGlobalState()
    const prevTrackingContext = globalState.trackingContext
    globalState.trackingContext = prevTrackingContext || context
    try {
        atom.reportObserved()
    } finally {
        globalState.trackingContext = prevTrackingContext
    }
}
