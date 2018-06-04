import { IObservableArray, $mobx } from "mobx"

/**
 * Moves an item from one position to another, checking that the indexes given are within bounds.
 *
 * @example
 * const source = observable([1, 2, 3])
 * moveItem(source, 0, 1)
 * console.log(source.map(x => x)) // [2, 1, 3]
 *
 * @export
 * @param {ObservableArray<T>} target
 * @param {number} fromIndex
 * @param {number} toIndex
 * @returns {ObservableArray<T>}
 */
export function moveItem<T>(target: IObservableArray<T>, fromIndex: number, toIndex: number) {
    checkIndex(target, fromIndex)
    checkIndex(target, toIndex)
    if (fromIndex === toIndex) {
        return
    }
    const oldItems = (target as any)[$mobx].values
    let newItems: T[]
    if (fromIndex < toIndex) {
        newItems = [
            ...oldItems.slice(0, fromIndex),
            ...oldItems.slice(fromIndex + 1, toIndex + 1),
            oldItems[fromIndex],
            ...oldItems.slice(toIndex + 1)
        ]
    } else {
        // toIndex < fromIndex
        newItems = [
            ...oldItems.slice(0, toIndex),
            oldItems[fromIndex],
            ...oldItems.slice(toIndex, fromIndex),
            ...oldItems.slice(fromIndex + 1)
        ]
    }
    target.replace(newItems)
    return target
}

/**
 * Checks whether the specified index is within bounds. Throws if not.
 *
 * @private
 * @param {ObservableArray<any>} target
 * @param {number }index
 */
function checkIndex(target: IObservableArray<any>, index: number) {
    if (index < 0) {
        throw new Error(`[mobx.array] Index out of bounds: ${index} is negative`)
    }
    const length = (target as any)[$mobx].values.length
    if (index >= length) {
        throw new Error(`[mobx.array] Index out of bounds: ${index} is not smaller than ${length}`)
    }
}
