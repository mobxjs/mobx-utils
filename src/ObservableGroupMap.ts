import {
    observable,
    IReactionDisposer,
    reaction,
    observe,
    IObservableArray,
    transaction,
    ObservableMap,
    Lambda,
} from "mobx"

// ObservableGroupMaps actually each use their own symbol, so that an item can be tracked by
// multiple OGMs. We declare this here so we can type the arrays properly.
declare const OGM_INFO_KEY: unique symbol

interface GroupItem {
    [OGM_INFO_KEY]?: GroupItemInfo
}

interface GroupItemInfo {
    groupByValue: any
    reaction: IReactionDisposer
    groupArrIndex: number
}

/**
 * Reactively sorts a base observable array into multiple observable arrays based on the value of a
 * `groupBy: (item: T) => G` function.
 *
 * This observes the individual computed groupBy values and only updates the source and dest arrays
 * when there is an actual change, so this is far more efficient than, for example
 * `base.filter(i => groupBy(i) === 'we')`. Call #dispose() to stop tracking.
 *
 * No guarantees are made about the order of items in the grouped arrays.
 *
 * The resulting map of arrays is read-only. clear(), set(), delete() are not supported and
 * modifying the group arrays will lead to undefined behavior.
 *
 * NB: ObservableGroupMap relies on `Symbol`s. If you are targeting a platform which doesn't
 * support these natively, you will need to provide a polyfill.
 *
 * @param {array} base The array to sort into groups.
 * @param {function} groupBy The function used for grouping.
 * @param options Object with properties:
 *  `name`: Debug name of this ObservableGroupMap.
 *  `keyToName`: Function to create the debug names of the observable group arrays.
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
    /**
     * Base observable array which is being sorted into groups.
     */
    private readonly _base: IObservableArray<T & GroupItem>

    /**
     * The ObservableGroupMap needs to track some state per-item. This is the name/symbol of the
     * property used to attach the state.
     */
    private readonly _ogmInfoKey: typeof OGM_INFO_KEY

    /**
     * The function used to group the items.
     */
    private readonly _groupBy: (x: T) => G

    /**
     * This function is used to generate the mobx debug names of the observable group arrays.
     */
    private readonly _keyToName: (group: G) => string

    private readonly _disposeBaseObserver: Lambda

    constructor(
        base: IObservableArray<T>,
        groupBy: (x: T) => G,
        {
            name = "ogm" + ((Math.random() * 1000) | 0),
            keyToName = (x) => "" + x,
        }: { name?: string; keyToName?: (group: G) => string } = {}
    ) {
        super()
        this._keyToName = keyToName
        this._groupBy = groupBy
        this._ogmInfoKey = Symbol("ogmInfo" + name) as any
        this._base = base

        for (let i = 0; i < base.length; i++) {
            this._addItem(base[i])
        }

        this._disposeBaseObserver = observe(this._base, (change) => {
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

    /**
     * Disposes all observers created during construction and removes state added to base array
     * items.
     */
    public dispose() {
        this._disposeBaseObserver()
        for (let i = 0; i < this._base.length; i++) {
            const item = this._base[i]
            const grouperItemInfo: GroupItemInfo = item[this._ogmInfoKey]!
            grouperItemInfo.reaction()

            delete item[this._ogmInfoKey]
        }
    }

    private _getGroupArr(key: G) {
        let result = super.get(key)
        if (undefined === result) {
            result = observable([], { name: `GroupArray[${this._keyToName(key)}]`, deep: false })
            super.set(key, result)
        }
        return result
    }

    private _removeFromGroupArr(key: G, itemIndex: number) {
        const arr: IObservableArray<T & GroupItem> = super.get(key)!
        if (1 === arr.length) {
            super.delete(key)
        } else if (itemIndex === arr.length - 1) {
            // last position in array
            arr.length--
        } else {
            arr[itemIndex] = arr[arr.length - 1]
            arr[itemIndex][this._ogmInfoKey]!.groupArrIndex = itemIndex
            arr.length--
        }
    }

    private _addItem(item: T & GroupItem) {
        const groupByValue = this._groupBy(item)
        const groupArr = this._getGroupArr(groupByValue)
        const value: GroupItemInfo = {
            groupByValue: groupByValue,
            groupArrIndex: groupArr.length,
            reaction: reaction(
                () => this._groupBy(item),
                (newGroupByValue, _r) => {
                    const grouperItemInfo = item[this._ogmInfoKey]!
                    this._removeFromGroupArr(
                        grouperItemInfo.groupByValue,
                        grouperItemInfo.groupArrIndex
                    )

                    const newGroupArr = this._getGroupArr(newGroupByValue)
                    const newGroupArrIndex = newGroupArr.length
                    newGroupArr.push(item)
                    grouperItemInfo.groupByValue = newGroupByValue
                    grouperItemInfo.groupArrIndex = newGroupArrIndex
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

    private _removeItem(item: GroupItem) {
        const grouperItemInfo = item[this._ogmInfoKey]!
        this._removeFromGroupArr(grouperItemInfo.groupByValue, grouperItemInfo.groupArrIndex)
        grouperItemInfo.reaction()

        delete item[this._ogmInfoKey]
    }
}
