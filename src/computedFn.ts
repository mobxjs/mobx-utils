import { DeepMap } from "./deepMap"
import { IComputedValue, computed, onBecomeUnobserved } from "mobx";

export function computedFn<T extends Function>(fn: T, autoCleanup = true) {
  const d = new DeepMap<IComputedValue<any>>()

  return function(...args: any[]) {
    const self = this
    const entry = d.entry(args)
    if (entry.exists())
      return entry.get().get()

    // create new entry
    const c = computed(() => {
      return fn.apply(self, args)
    })
    if (!autoCleanup) onBecomeUnobserved(c, () => {
      d.entry(args).delete()
    })
    entry.set(c)
    return c.get()
  }
}