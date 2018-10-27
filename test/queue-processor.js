"use strict"

const utils = require("../src/mobx-utils")
const mobx = require("mobx")

mobx.configure({ enforceActions: "observed" })

test("sync processor should work", () => {
    const q = mobx.observable([1, 2])
    const res = []

    const stop = utils.queueProcessor(q, v => res.push(v * 2))

    expect(res).toEqual([2, 4])
    expect(q.length).toBe(0)

    mobx.runInAction(() => q.push(3))
    expect(res).toEqual([2, 4, 6])

    mobx.runInAction(() => q.push(4, 5))
    expect(q.length).toBe(0)
    expect(res).toEqual([2, 4, 6, 8, 10])

    mobx.runInAction(() => {
        q.unshift(6, 7)
        expect(q.length).toBe(2)
        expect(res).toEqual([2, 4, 6, 8, 10])
    })

    expect(q.length).toBe(0)
    expect(res).toEqual([2, 4, 6, 8, 10, 12, 14])

    stop()
    mobx.runInAction(() => q.push(42))
    expect(q.length).toBe(1)
    expect(res).toEqual([2, 4, 6, 8, 10, 12, 14])
})

test("async processor should work", done => {
    const q = mobx.observable([1, 2])
    const res = []

    const stop = utils.queueProcessor(q, v => res.push(v * 2), 10)

    expect(res.length).toBe(0)
    expect(q.length).toBe(2)

    setTimeout(() => {
        expect(res).toEqual([2, 4])
        expect(q.length).toBe(0)

        mobx.runInAction(() => q.push(3))
        expect(q.length).toBe(1)
        expect(res).toEqual([2, 4])

        setTimeout(() => {
            expect(q.length).toBe(0)
            expect(res).toEqual([2, 4, 6])

            stop()
            done()
        }, 50)
    }, 50)
})
