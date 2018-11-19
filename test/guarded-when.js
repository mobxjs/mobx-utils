"use strict"

const utils = require("../src/mobx-utils")
const mobx = require("mobx")

mobx.configure({ enforceActions: "observed" })

test("whenWithTimeout should operate normally", done => {
    var a = mobx.observable.box(1)

    utils.whenWithTimeout(() => a.get() === 2, () => done(), 500, () => done.fail())

    setTimeout(mobx.action(() => a.set(2)), 200)
})

test("whenWithTimeout should timeout", done => {
    const a = mobx.observable.box(1)

    utils.whenWithTimeout(() => a.get() === 2, () => done.fail("should have timed out"), 500, () =>
        done()
    )

    setTimeout(mobx.action(() => a.set(2)), 1000)
})

test("whenWithTimeout should dispose", done => {
    const a = mobx.observable.box(1)

    const d1 = utils.whenWithTimeout(
        () => a.get() === 2,
        () => done.fail("1 should not finsih"),
        100,
        () => done.fail("1 should not timeout")
    )

    const d2 = utils.whenWithTimeout(
        () => a.get() === 2,
        () => done.fail("2 should not finsih"),
        200,
        () => done.fail("2 should not timeout")
    )

    d1()
    d2()

    setTimeout(
        mobx.action(() => {
            a.set(2)
            done()
        }),
        150
    )
})
