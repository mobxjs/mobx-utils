import { DeepMap } from "./deepMap"
import { IComputedValue, computed, onBecomeUnobserved, _isComputingDerivation, isAction } from "mobx";

export function computedFn<T extends Function>(fn: T, keepAlive = false) {
  if (isAction(fn))
    throw new Error("computedFn shouldn't be used on actions")

  let memoWarned = false;
  let i = 0;
  const d = new DeepMap<IComputedValue<any>>()

  return function(...args: any[]) {
    const self = this
    const entry = d.entry(args)
    // cache hit, return
    if (entry.exists())
      return entry.get().get()
    // if function is invoked, and its a cache miss without reactive, there is no point in caching...
    if (!keepAlive && !_isComputingDerivation()) {
      if (!memoWarned) {
        console.warn("invoking a computedFn from outside an reactive context won't be memoized, unless keepAlive is set")
        memoWarned = true
      }
      return fn.apply(self, args)
    }
    // create new entry
    const c = computed(() => {
      return fn.apply(self, args)
    }, {
      name: fn.name + "#" + (++i),
      keepAlive,
      // requiresReaction: !keepAlive
    })
    entry.set(c)
    // clean up if no longer observed
    if (!keepAlive) onBecomeUnobserved(c, () => {
      d.entry(args).delete()
    })
    // return current val
    return c.get()
  }
}