"use strict"

const utils = require("../src/mobx-utils")
const mobx = require("mobx")

mobx.configure({ enforceActions: "observed" })

test("sync processor should work with max", () => {
    const q = mobx.observable([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    const res = []

    const stop = utils.chunkProcessor(q, v => res.push(v), 0, 3)

    expect(res).toEqual([[1, 2, 3], [4, 5, 6], [7, 8, 9], [10]])
    expect(q.length).toBe(0)

    mobx.runInAction(() => q.push(1, 2, 3, 4, 5))
    expect(res).toEqual([[1, 2, 3], [4, 5, 6], [7, 8, 9], [10], [1, 2, 3], [4, 5]])
    expect(q.length).toBe(0)

    mobx.runInAction(() => q.push(3))
    expect(res).toEqual([[1, 2, 3], [4, 5, 6], [7, 8, 9], [10], [1, 2, 3], [4, 5], [3]])
    expect(q.length).toBe(0)

    mobx.runInAction(() => q.push(8, 9))
    expect(res).toEqual([[1, 2, 3], [4, 5, 6], [7, 8, 9], [10], [1, 2, 3], [4, 5], [3], [8, 9]])
    expect(q.length).toBe(0)

    mobx.runInAction(() => {
        q.unshift(6, 7)
        expect(q.length).toBe(2)
        expect(res).toEqual([[1, 2, 3], [4, 5, 6], [7, 8, 9], [10], [1, 2, 3], [4, 5], [3], [8, 9]])
    })
    expect(q.length).toBe(0)
    expect(res).toEqual([
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
        [10],
        [1, 2, 3],
        [4, 5],
        [3],
        [8, 9],
        [6, 7]
    ])

    stop()
    mobx.runInAction(() => q.push(42))
    expect(q.length).toBe(1)
    expect(res).toEqual([
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
        [10],
        [1, 2, 3],
        [4, 5],
        [3],
        [8, 9],
        [6, 7]
    ])
})

test("sync processor should work with default max", () => {
    const q = mobx.observable([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    const res = []

    utils.chunkProcessor(q, v => res.push(v))

    expect(res).toEqual([[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]])
    expect(q.length).toBe(0)

    mobx.runInAction(() => q.push(1, 2, 3, 4, 5))
    expect(res).toEqual([[1, 2, 3, 4, 5, 6, 7, 8, 9, 10], [1, 2, 3, 4, 5]])
    expect(q.length).toBe(0)
})

test("async processor should work", done => {
    const q = mobx.observable([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    const res = []

    const stop = utils.chunkProcessor(q, v => res.push(v), 10, 3)

    expect(res.length).toBe(0)
    expect(q.length).toBe(10)

    setTimeout(() => {
        expect(res).toEqual([[1, 2, 3], [4, 5, 6], [7, 8, 9], [10]])
        expect(q.length).toBe(0)

        mobx.runInAction(() => q.push(3))
        expect(q.length).toBe(1)
        expect(res).toEqual([[1, 2, 3], [4, 5, 6], [7, 8, 9], [10]])

        setTimeout(() => {
            expect(q.length).toBe(0)
            expect(res).toEqual([[1, 2, 3], [4, 5, 6], [7, 8, 9], [10], [3]])

            stop()
            done()
        }, 50)
    }, 50)
})

test("async processor should combine smaller chunks to max size", done => {
    const q = mobx.observable([1, 2])
    const res = []

    const stop = utils.chunkProcessor(q, v => res.push(v), 10, 3)

    expect(res.length).toBe(0)
    expect(q.length).toBe(2)
    mobx.runInAction(() => q.push(3))
    mobx.runInAction(() => q.push(4))
    mobx.runInAction(() => q.push(5))
    mobx.runInAction(() => q.push(6))
    mobx.runInAction(() => q.push(7))

    setTimeout(() => {
        expect(res).toEqual([[1, 2, 3], [4, 5, 6], [7]])
        expect(q.length).toBe(0)

        mobx.runInAction(() => q.push(8, 9))
        setTimeout(() => {
            mobx.runInAction(() => q.push(10, 11))
            expect(q.length).toBe(4)
            expect(res).toEqual([[1, 2, 3], [4, 5, 6], [7]])
        }, 2)
        setTimeout(() => {
            mobx.runInAction(() => q.push(12, 13))
            expect(q.length).toBe(6)
            expect(res).toEqual([[1, 2, 3], [4, 5, 6], [7]])
        }, 4)

        expect(q.length).toBe(2)
        expect(res).toEqual([[1, 2, 3], [4, 5, 6], [7]])

        setTimeout(() => {
            expect(q.length).toBe(0)
            expect(res).toEqual([[1, 2, 3], [4, 5, 6], [7], [8, 9, 10], [11, 12, 13]])

            stop()
            done()
        }, 50)
    }, 50)
})
