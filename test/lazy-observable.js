"use strict"

const utils = require("../src/mobx-utils")
const mobx = require("mobx")

mobx.configure({ enforceActions: "observed" })

test("lazy observable should work", done => {
    let started = false
    const lo = utils.lazyObservable(sink => {
        started = true
        setTimeout(() => sink(4), 50)
        setTimeout(() => sink(5), 100)
        setTimeout(() => sink(6), 150)
    }, 3)

    const values = []
    expect(started).toBe(false)

    lo.refresh()
    expect(started).toBe(false)

    mobx.autorun(() => values.push(lo.current()))

    expect(started).toBe(true)
    expect(values).toEqual([3])
    expect(lo.current()).toBe(3)

    setTimeout(() => {
        expect(lo.current()).toBe(6)
        expect(values).toEqual([3, 4, 5, 6])
        done()
    }, 200)
})

test("lazy observable refresh", done => {
    let started = 0
    let i = 10

    const lo = utils.lazyObservable(
        sink =>
            new Promise(resolve => {
                started = started + 1
                resolve(i)
                i++
            }).then(value => {
                sink(value)
            }),
        1
    )

    let values = []
    mobx.autorun(() => values.push(lo.current()))

    expect(started).toBe(1)
    expect(values).toEqual([1])
    expect(lo.current()).toBe(1)

    setTimeout(() => lo.refresh(), 50)

    setTimeout(() => {
        expect(started).toBe(2)
        expect(lo.current()).toBe(11)
        expect(values).toEqual([1, 10, 11])
        done()
    }, 200)
})

test("lazy observable reset", done => {
    const lo = utils.lazyObservable(
        sink =>
            new Promise(resolve => {
                resolve(2)
            }).then(value => {
                sink(value)
            }),
        1
    )

    lo.current()

    setTimeout(() => {
        expect(lo.current()).toBe(2)
    }, 50)

    setTimeout(() => lo.reset(), 150)

    setTimeout(() => {
        expect(lo.current()).toBe(1)
        done()
    }, 200)
})
