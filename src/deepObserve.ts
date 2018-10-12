import {
    observe,
    isObservableMap,
    isObservableObject,
    isObservableArray,
    IObjectDidChange,
    IArrayChange,
    IArraySplice,
    IMapDidChange,
    values,
    entries
} from "mobx"
import { IDisposer } from "./utils"

type IChange = IObjectDidChange | IArrayChange | IArraySplice | IMapDidChange

type Entry = {
    dispose: IDisposer
    path: string
    parent?: Entry
}

function buildPath(entry: Entry): string {
    const res: string[] = []
    while (entry.parent) {
        res.push(entry.path)
        entry = entry.parent
    }
    return res.reverse().join("/")
}

export function deepObserve(
    target: any,
    listener: (change: IChange, path: string) => void
): IDisposer {
    const entrySet = new WeakMap<any, Entry>()

    function genericListener(change: IChange) {
        const entry = entrySet.get(change.object)
        processChange(change, entry)
        listener(change, buildPath(entry))
    }

    function processChange(change: IChange, parent: Entry) {
        switch(change.type) {
            // Object changes
            case "add": // also for map
                observeRecursively(change.newValue, parent, change.name)
                break
            case "update": // also for array and map
                unobserveRecursively(change.oldValue)
                observeRecursively(change.newValue, parent, (change as any).name || ("" + (change as any).index))
                break
            case "remove": // object
            case "delete": // map
                unobserveRecursively(change.oldValue)
                break
            // Array changes
            case "splice":
                change.removed.map(unobserveRecursively)
                change.added.forEach((value, idx) => observeRecursively(value, parent, "" + (change.index + idx)))
                // update paths
                for (let i = change.index + change.addedCount + 1; i < change.object.length; i++) {
                    const entry = entrySet.get("" + i)
                    if (entry) entry.path = "" + i
                }
                break
        }
    }

    function observeRecursively(target: any, parent: Entry, path: string) {
        if (isObservableObject(target) || isObservableArray(target) || isObservableMap(target)) {
            if (entrySet.has(target)) {
                if (entrySet.get(target).parent !== parent)
                    throw new Error(
                        `The same observable object cannot appear twice in the same tree, trying to assign it to '${buildPath(parent)}', but it already exists at '${buildPath(entrySet.get(
                            target
                        ).parent)}'`
                    )
            } else {
                const entry = {
                    parent,
                    path,
                    dispose: observe(target, genericListener)
                }
                entrySet.set(target, entry)
                entries(target).forEach(([key, value]) => observeRecursively(value, entry, key))
            }
        }
    }

    function unobserveRecursively(target: any) {
        const entry = entrySet.get(target)
        if (!entry) return
        entrySet.delete(target)
        entry.dispose()
        values(target).forEach(unobserveRecursively)
    }

    observeRecursively(target, undefined, "")

    return () => {
        unobserveRecursively(target)
    }
}
