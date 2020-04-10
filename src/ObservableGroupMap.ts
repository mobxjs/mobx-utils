import {
    observable,
    IReactionDisposer,
    reaction,
    observe,
    IObservableArray,
    transaction,
    ObservableMap,
} from "mobx"

interface GrouperItemInfo {
    groupByValue: any
    reaction: IReactionDisposer
    grouperArrIndex: number
}

/**
 * Reactively sorts a base observable array into multiple observable arrays based on the value of a
 * `groupBy: (item: T) => G` function.
 *
 * This observes the individual computed groupBy values and only updates the source and dest arrays
 * when there is an actual change, so this is far more efficient than, for example
 * `base.filter(i => groupBy(i) === 'we')`.
 *
 * No guarantees are made about the order of items in the grouped arrays.
 *
 * @example
 * const slices = observable([
 *     { day: "mo", hours: 12 },
 *     { day: "tu", hours: 2 },
 * ])
 * const slicesByDay = new ObservableGroupMap(slices, (slice) => slice.day)
 * autorun(() => console.log(
 *     slicesByDay.get("mo")?.length ?? 0,
 *     slicesByDay.get("we"))) // outputs 1, undefined
 * slices[0].day = "we" // outputs 0, [{ day: "we", hours: 12 }]
 */
export class ObservableGroupMap<G, T> extends ObservableMap<G, IObservableArray<T>> {
    private readonly keyToName: (group: G) => string

    private readonly groupBy: (x: T) => G

    private readonly grouperInfoKey: string

    private readonly base: IObservableArray<T>

    clear(): void {
        throw new Error("not supported")
    }

    delete(_key: G): boolean {
        throw new Error("not supported")
    }

    set(_key: G, _value: IObservableArray<T>): this {
        throw new Error("not supported")
    }

    private _getGroupArr(key: G) {
        let result = super.get(key)
        if (undefined === result) {
            result = observable([], { name: `GroupArray[${this.keyToName(key)}]` })
            super.set(key, result)
        }
        return result
    }

    private _removeFromGroupArr(key: G, itemIndex: number) {
        const arr = this.get(key)!
        if (1 === arr.length) {
            super.delete(key)
        } else if (itemIndex === arr.length - 1) {
            // last position in array
            arr.length--
        } else {
            arr[itemIndex] = arr[arr.length - 1]
            ;(arr[itemIndex] as any)[this.grouperInfoKey].grouperArrIndex = itemIndex
            arr.length--
        }
    }

    private checkState() {
        for (const key of Array.from(this.keys())) {
            const arr = this.get(key as any)!
            for (let i = 0; i < arr!.length; i++) {
                const item = arr[i]
                const info: GrouperItemInfo = (item as any)[this.grouperInfoKey]
                if (info.grouperArrIndex != i) {
                    throw new Error(info.grouperArrIndex + " " + i)
                }
                if (info.groupByValue != key) {
                    throw new Error(info.groupByValue + " " + key)
                }
            }
        }
    }

    private _addItem(item: any) {
        const groupByValue = this.groupBy(item)
        const groupArr = this._getGroupArr(groupByValue)
        const value: GrouperItemInfo = {
            groupByValue: groupByValue,
            grouperArrIndex: groupArr.length,
            reaction: reaction(
                () => this.groupBy(item),
                (newGroupByValue, _r) => {
                    console.log("new group by value ", newGroupByValue)
                    const grouperItemInfo = (item as any)[this.grouperInfoKey]
                    this._removeFromGroupArr(
                        grouperItemInfo.groupByValue,
                        grouperItemInfo.grouperArrIndex
                    )

                    const newGroupArr = this._getGroupArr(newGroupByValue)
                    const newGrouperArrIndex = newGroupArr.length
                    newGroupArr.push(item)
                    grouperItemInfo.groupByValue = newGroupByValue
                    grouperItemInfo.grouperArrIndex = newGrouperArrIndex
                    this.checkState()
                }
            ),
        }
        Object.defineProperty(item, this.grouperInfoKey, {
            configurable: true,
            enumerable: false,
            value,
        })
        groupArr.push(item)
        this.checkState()
    }

    private _removeItem(item: any) {
        this.checkState()
        const grouperItemInfo: GrouperItemInfo = (item as any)[this.grouperInfoKey]
        this._removeFromGroupArr(grouperItemInfo.groupByValue, grouperItemInfo.grouperArrIndex)
        grouperItemInfo.reaction()

        delete (item as any)[this.grouperInfoKey]
        this.checkState()
    }

    constructor(
        base: IObservableArray<T>,
        groupBy: (x: T) => G,
        {
            name,
            keyToName = (x) => "" + x,
        }: { name?: string; keyToName?: (group: G) => string } = {}
    ) {
        super()
        this.keyToName = keyToName
        this.groupBy = groupBy
        this.grouperInfoKey =
            "function" == typeof Symbol
                ? ((Symbol("grouperInfo" + name) as unknown) as string)
                : "__grouperInfo" + name
        this.base = base

        for (let i = 0; i < base.length; i++) {
            const item = base[i]
            this._addItem(item)
        }

        observe(base, (change) => {
            if ("splice" === change.type) {
                transaction(() => {
                    for (const removed of change.removed) {
                        this._removeItem(removed)
                    }
                    for (const added of change.added) {
                        this._addItem(added)
                    }
                })
            } else if ("update" === change.type) {
                transaction(() => {
                    this._removeItem(change.oldValue)
                    this._addItem(change.newValue)
                })
            } else {
                throw new Error("illegal state")
            }
        })
    }
    dispose() {
        for (let i = 0; i < this.base.length; i++) {
            const item = this.base[i]
            const grouperItemInfo: GrouperItemInfo = (item as any)[this.grouperInfoKey]
            grouperItemInfo.reaction()

            delete (item as any)[this.grouperInfoKey]
            this._addItem(item)
        }
    }
}
