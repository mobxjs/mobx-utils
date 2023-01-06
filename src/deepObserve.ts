import {
    observe,
    isObservableMap,
    isObservableObject,
    isObservableArray,
    IObjectDidChange,
    IArrayDidChange,
    IMapDidChange,
    values,
    entries,
    isObservableSet,
    IArraySplice,
    _getAdministration
} from "mobx"
import { IDisposer } from "./utils"

type IChange = IObjectDidChange | IArrayDidChange | IMapDidChange | IArraySplice

type Entry = {
    dispose: IDisposer
    path: string
    parent: Entry | undefined
}

function buildPath(entry: Entry | undefined): string {
    if (!entry) return "ROOT"
    const res: string[] = []
    while (entry.parent) {
        res.push(entry.path)
        entry = entry.parent
    }
    return res.reverse().join("/")
}

function isRecursivelyObservable(thing: any) {
    return isObservableObject(thing) || isObservableArray(thing) || isObservableMap(thing) || isObservableSet(thing)
}

/**
 * Given an object, deeply observes the given object.
 * It is like `observe` from mobx, but applied recursively, including all future children.
 *
 * Note that the given object cannot ever contain cycles and should be a tree.
 *
 * As benefit: path and root will be provided in the callback, so the signature of the listener is
 * (change, path, root) => void
 *
 * The returned disposer can be invoked to clean up the listener
 *
 * deepObserve cannot be used on computed values.
 *
 * @example
 * const disposer = deepObserve(target, (change, path) => {
 *    console.dir(change)
 * })
 */
export function deepObserve<T = any>(
    target: T,
    listener: (change: IChange, path: string, root: T) => void,
    respectAnnotations = false
): IDisposer {
    const entrySet = new WeakMap<any, Entry>()

    function shallowListener(change: IChange) {
        const entry = entrySet.get(change.object)!
        listener(change, buildPath(entry), target)
    }

    function deepListener(change: IChange) {
        const entry = entrySet.get(change.object)!
        processChange(change, entry)
        listener(change, buildPath(entry), target)
    }

    function processChange(change: IChange, parent: Entry) {
        switch (change.type) {
            // Object changes
            case "add": // also for map
                observeRecursively(change.newValue, parent, change.name, true)
                break
            case "update": // also for array and map
                unobserveRecursively(change.oldValue)
                observeRecursively(
                    change.newValue,
                    parent,
                    (change as any).name || "" + (change as any).index,
                    true
                )
                break
            case "remove": // object
            case "delete": // map
                unobserveRecursively(change.oldValue)
                break
            // Array changes
            case "splice":
                change.removed.map(unobserveRecursively)
                change.added.forEach((value, idx) =>
                    observeRecursively(value, parent, "" + (change.index + idx), true)
                )
                // update paths
                for (let i = change.index + change.addedCount; i < change.object.length; i++) {
                    if (isRecursivelyObservable(change.object[i])) {
                        const entry = entrySet.get(change.object[i])
                        if (entry) entry.path = "" + i
                    }
                }
                break
        }
    }

    function observeRecursively(thing: any, parent: Entry | undefined, path: string, deep: boolean) {
        // sets can't be observed deeply
        deep = deep && !isObservableSet(thing)

        if (isRecursivelyObservable(thing)) {
            const entry = entrySet.get(thing)
            if (entry) {
                if (entry.parent !== parent || entry.path !== path)
                    // MWE: this constraint is artificial, and this tool could be made to work with cycles,
                    // but it increases administration complexity, has tricky edge cases and the meaning of 'path'
                    // would become less clear. So doesn't seem to be needed for now
                    throw new Error(
                        `The same observable object cannot appear twice in the same tree,` +
                            ` trying to assign it to '${buildPath(parent)}/${path}',` +
                            ` but it already exists at '${buildPath(entry.parent)}/${entry.path}'`
                    )
            } else {
                const entry = {
                    parent,
                    path,
                    dispose: observe(thing, deep ? deepListener : shallowListener)
                }
                entrySet.set(thing, entry)

                if (deep) {
                    entries(thing).forEach(([key, value]) => {
                        if (respectAnnotations) {
                            const appliedAnnotationType =
                                _getAdministration(thing)?.appliedAnnotations_?.[key]?.annotationType_

                            if (appliedAnnotationType === "observable.shallow") {
                                observeRecursively(value, entry, key, false)
                            } else if (appliedAnnotationType !== "observable.ref") {
                                observeRecursively(value, entry, key, true)
                            }
                        } else {
                            observeRecursively(value, entry, key, true)
                        }
                    })
                }
            }
        }
    }

    function unobserveRecursively(thing: any) {
        if (isRecursivelyObservable(thing)) {
            const entry = entrySet.get(thing)
            if (!entry) return
            entrySet.delete(thing)
            entry.dispose()
            values(thing).forEach(unobserveRecursively)
        }
    }

    observeRecursively(target, undefined, "", true)

    return () => {
        unobserveRecursively(target)
    }
}
