import { observable, IObservableArray } from "mobx"
import * as assert from "assert"

import { ObservableGroupMap } from "../src/mobx-utils"

const json = <G>(ogm: ObservableGroupMap<string, G>): { [k: string]: G } =>
    Array.from(ogm.keys()).reduce((r, k) => ((r[k] = ogm.get(k)?.toJS()), r), {} as any)

describe("ObservableGroupMap", () => {
    type Slice = { day: string; hours: number }
    let base: IObservableArray<Slice>
    let ogm: ObservableGroupMap<string, Slice>

    beforeEach((done) => {
        base = observable([
            { day: "mo", hours: 12 },
            { day: "tu", hours: 2 },
        ])
        ogm = new ObservableGroupMap(base, (x) => x.day)
        done()
    })

    it("initializes correctly", (done) => {
        assert.deepEqual(json(ogm), {
            mo: [{ day: "mo", hours: 12 }],
            tu: [{ day: "tu", hours: 2 }],
        })
        done()
    })

    it("updates groups correctly when an item is removed from the base", (done) => {
        base[0] = base.pop()!
        assert.deepEqual(json(ogm), {
            tu: [{ day: "tu", hours: 2 }],
        })
        done()
    })

    it("updates groups correctly when an item is added to the base (new group)", (done) => {
        base.push({ day: "we", hours: 3 })
        assert.deepEqual(json(ogm), {
            mo: [{ day: "mo", hours: 12 }],
            tu: [{ day: "tu", hours: 2 }],
            we: [{ day: "we", hours: 3 }],
        })
        done()
    })

    it("updates groups correctly when an item is added to the base (existing group)", (done) => {
        base.push({ day: "tu", hours: 3 })
        assert.deepEqual(json(ogm), {
            mo: [{ day: "mo", hours: 12 }],
            tu: [
                { day: "tu", hours: 2 },
                { day: "tu", hours: 3 },
            ],
        })
        done()
    })

    it("moves item from group array to new one when groupBy value changes to a new one", (done) => {
        base[1].day = "we"
        assert.deepEqual(json(ogm), {
            mo: [{ day: "mo", hours: 12 }],
            we: [{ day: "we", hours: 2 }],
        })
        done()
    })

    it("works correctly with example from #255", (done) => {
        const data = observable([
            { id: 1, a: "x" },
            { id: 2, a: "x" },
            { id: 3, a: "x" },
            { id: 4, a: "x" },
        ])

        const ogm = new ObservableGroupMap(data, (e) => e.a)

        data.replace([{ id: 5, a: "x" }])
        assert.deepEqual(json(ogm), {
            x: [{ id: 5, a: "x" }],
        })
        done()
    })
})
