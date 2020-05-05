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
    private readonly _keyToName: (group: G) => string

    private readonly _groupBy: (x: T) => G

    private readonly _ogmInfoKey: string

    private readonly _base: IObservableArray<T>

    constructor(
        base: IObservableArray<T>,
        groupBy: (x: T) => G,
        {
            name,
            keyToName = (x) => "" + x,
        }: { name?: string; keyToName?: (group: G) => string } = {}
    ) {
        super()
        this._keyToName = keyToName
        this._groupBy = groupBy
        this._ogmInfoKey =
            "function" == typeof Symbol
                ? ((Symbol("grouperInfo" + name) as unknown) as string)
                : "__grouperInfo" + name
        this._base = base

        for (let i = 0; i < base.length; i++) {
            this._addItem(base[i])
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

    public clear(): void {
        throw new Error("not supported")
    }

    public delete(_key: G): boolean {
        throw new Error("not supported")
    }

    public set(_key: G, _value: IObservableArray<T>): this {
        throw new Error("not supported")
    }

    public dispose() {
        for (let i = 0; i < this._base.length; i++) {
            const item = this._base[i]
            const grouperItemInfo: GrouperItemInfo = (item as any)[this._ogmInfoKey]
            grouperItemInfo.reaction()

            delete (item as any)[this._ogmInfoKey]
            this._addItem(item)
        }
    }

    private _getGroupArr(key: G) {
        let result = super.get(key)
        if (undefined === result) {
            result = observable([], { name: `GroupArray[${this._keyToName(key)}]` })
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
            ;(arr[itemIndex] as any)[this._ogmInfoKey].grouperArrIndex = itemIndex
            arr.length--
        }
    }

    private _addItem(item: any) {
        const groupByValue = this._groupBy(item)
        const groupArr = this._getGroupArr(groupByValue)
        const value: GrouperItemInfo = {
            groupByValue: groupByValue,
            grouperArrIndex: groupArr.length,
            reaction: reaction(
                () => this._groupBy(item),
                (newGroupByValue, _r) => {
                    console.log("new group by value ", newGroupByValue)
                    const grouperItemInfo = (item as any)[this._ogmInfoKey]
                    this._removeFromGroupArr(
                        grouperItemInfo.groupByValue,
                        grouperItemInfo.grouperArrIndex
                    )

                    const newGroupArr = this._getGroupArr(newGroupByValue)
                    const newGrouperArrIndex = newGroupArr.length
                    newGroupArr.push(item)
                    grouperItemInfo.groupByValue = newGroupByValue
                    grouperItemInfo.grouperArrIndex = newGrouperArrIndex
                }
            ),
        }
        Object.defineProperty(item, this._ogmInfoKey, {
            configurable: true,
            enumerable: false,
            value,
        })
        groupArr.push(item)
    }

    private _removeItem(item: any) {
        const grouperItemInfo: GrouperItemInfo = (item as any)[this._ogmInfoKey]
        this._removeFromGroupArr(grouperItemInfo.groupByValue, grouperItemInfo.grouperArrIndex)
        grouperItemInfo.reaction()

        delete (item as any)[this._ogmInfoKey]
    }
}
